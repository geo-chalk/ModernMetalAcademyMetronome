import {useCallback, useEffect, useRef, useState} from 'react';

// Plays the current track through its speed ladder: the whole file once per
// rate, then the next rate. Nothing here touches the click engine — the song
// is the only sound.
//
// Timing comes from the element itself. A pass ends when the file does, and
// what happens next is settled by how the element is set up for that pass:
//
//   loop = true   the element wraps to 0 on its own, gapless. Used when the
//                 boundary needs no silence: the next pass follows straight on
//                 (we only change playbackRate, caught on the wrap in the rAF
//                 loop), or the final pass repeats under Lock final.
//   loop = false  the element stops and fires `ended`: a rest follows (pause,
//                 wait, play from 0), or this was the last pass and the session
//                 is over. Letting the element end rather than catching the
//                 wrap means not a sample of the next pass leaks out first.
//
// Status: idle | playing | resting | previewing. Preview plays the file at its
// own speed, looping, for tapping the tempo along to it.

const RESTART_DETECT_SEC = 0.5;   // currentTime dropped by this much: the loop wrapped

export const useTrackTrainer = ({audioRef, duration, volume = 80}) => {
    const [status, setStatus] = useState('idle');
    const [passIndex, setPassIndex] = useState(0);
    const [passCount, setPassCount] = useState(0);
    const [passProgress, setPassProgress] = useState(0);
    const [totalProgress, setTotalProgress] = useState(0);
    const [position, setPosition] = useState(0);        // whole seconds into the file
    const [currentRate, setCurrentRate] = useState(1);
    const [playError, setPlayError] = useState(null);

    const statusRef = useRef('idle');
    const planRef = useRef(null);       // {rates, restSeconds, lockFinal}
    const passRef = useRef(0);
    const lastTimeRef = useRef(0);
    const restRef = useRef(null);       // {startedAt, ms, next}
    const rafRef = useRef(null);
    const listenersRef = useRef(null);
    const durationRef = useRef(duration);

    useEffect(() => {
        durationRef.current = duration;
    }, [duration]);

    useEffect(() => {
        const a = audioRef.current;
        if (a) a.volume = volume / 100;
    }, [volume, audioRef]);

    const setStatusBoth = (s) => {
        statusRef.current = s;
        setStatus(s);
    };

    const detach = () => {
        const a = audioRef.current;
        const l = listenersRef.current;
        if (a && l) {
            a.removeEventListener('ended', l.ended);
            a.removeEventListener('pause', l.pause);
        }
        listenersRef.current = null;
    };

    const stop = useCallback(() => {
        const a = audioRef.current;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        detach();
        if (a) {
            a.pause();
            a.loop = false;
            a.playbackRate = 1;
            try {
                a.currentTime = 0;
            } catch {
                // No metadata yet: nothing to rewind.
            }
        }
        planRef.current = null;
        restRef.current = null;
        passRef.current = 0;
        setStatusBoth('idle');
        setPassIndex(0);
        setPassProgress(0);
        setTotalProgress(0);
        setPosition(0);
        setCurrentRate(1);
    }, [audioRef]);

    const isFinal = (i) => i >= planRef.current.rates.length - 1;

    // Point the element at pass i: its rate, and whether it should wrap by itself.
    const applyPass = (i) => {
        const a = audioRef.current;
        const plan = planRef.current;
        passRef.current = i;
        setPassIndex(i);
        a.playbackRate = plan.rates[i];
        setCurrentRate(plan.rates[i]);
        a.loop = plan.restSeconds === 0 && (!isFinal(i) || plan.lockFinal);
    };

    const fail = (err) => {
        setPlayError(err?.message || 'Playback failed.');
        stop();
    };

    const startPass = (i) => {
        const a = audioRef.current;
        a.currentTime = 0;
        lastTimeRef.current = 0;
        applyPass(i);
        setStatusBoth('playing');
        a.play().catch(fail);
    };

    // loop = true wrapped round: carry on at the next rate.
    const onWrap = () => {
        const next = passRef.current + 1;
        if (next < planRef.current.rates.length) applyPass(next);
    };

    // loop = false reached the end: rest, repeat (Lock final) or finish.
    const onEnded = () => {
        const plan = planRef.current;
        if (!plan || statusRef.current !== 'playing') return;
        const i = passRef.current;
        if (isFinal(i) && !plan.lockFinal) {
            stop();
            return;
        }
        const next = isFinal(i) ? i : i + 1;
        if (plan.restSeconds > 0) {
            restRef.current = {startedAt: performance.now(), ms: plan.restSeconds * 1000, next};
            setStatusBoth('resting');
            setPassProgress(0);
        } else {
            startPass(next);
        }
    };

    // A pause we didn't ask for — a phone call, headphones pulled out, another
    // app taking the audio — ends the session rather than resuming mid-pass
    // later. Our own pauses change status first, so they fall through here.
    const onPause = () => {
        const a = audioRef.current;
        const s = statusRef.current;
        if (!a || (s !== 'playing' && s !== 'previewing')) return;
        // The pause that precedes `ended` is the element's own; `ended` is the
        // spec'd tell, the position check covers a browser that flips it late.
        const dur = durationRef.current;
        const atEnd = a.ended || (dur > 0 && a.currentTime >= dur - 0.25);
        if (!atEnd) stop();
    };

    const tick = () => {
        const a = audioRef.current;
        const dur = durationRef.current;
        const s = statusRef.current;
        if (!a || s === 'idle') return;

        if (s === 'resting') {
            const r = restRef.current;
            const elapsed = performance.now() - r.startedAt;
            if (elapsed >= r.ms) {
                restRef.current = null;
                startPass(r.next);
            } else {
                setPassProgress((elapsed / r.ms) * 100);
            }
        } else {
            const t = a.currentTime;
            if (s === 'playing') {
                if (a.loop && t + RESTART_DETECT_SEC < lastTimeRef.current) onWrap();
                const frac = dur > 0 ? Math.min(t / dur, 1) : 0;
                setPassProgress(frac * 100);
                const plan = planRef.current;
                const n = plan.rates.length;
                const i = passRef.current;
                setTotalProgress(plan.lockFinal && isFinal(i) ? 100 : Math.min(100, ((i + frac) / n) * 100));
            }
            lastTimeRef.current = t;
            setPosition(Math.floor(t));
        }
        rafRef.current = requestAnimationFrame(tick);
    };

    const attach = () => {
        const a = audioRef.current;
        detach();
        const l = {ended: onEnded, pause: onPause};
        a.addEventListener('ended', l.ended);
        a.addEventListener('pause', l.pause);
        listenersRef.current = l;
    };

    // Begins the session. Synchronous up to play(), so a call from the Start
    // button or the Space key still counts as the user gesture autoplay needs.
    const start = (rates, {restSeconds = 0, lockFinal = false} = {}) => {
        const a = audioRef.current;
        if (!a || !rates?.length || !(durationRef.current > 0)) return false;
        if (statusRef.current !== 'idle') stop();
        planRef.current = {rates, restSeconds, lockFinal};
        setPassCount(rates.length);
        setPlayError(null);
        setTotalProgress(0);
        a.volume = volume / 100;
        attach();
        startPass(0);
        rafRef.current = requestAnimationFrame(tick);
        return true;
    };

    const togglePreview = () => {
        const a = audioRef.current;
        if (statusRef.current === 'previewing') {
            stop();
            return;
        }
        if (!a || !(durationRef.current > 0)) return;
        if (statusRef.current !== 'idle') stop();
        a.loop = true;
        a.playbackRate = 1;
        a.volume = volume / 100;
        lastTimeRef.current = 0;
        attach();
        setStatusBoth('previewing');
        a.play().catch(fail);
        rafRef.current = requestAnimationFrame(tick);
    };

    // Stop with the app.
    useEffect(() => () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        detach();
    }, []);

    return {
        status,
        isActive: status === 'playing' || status === 'resting',
        isResting: status === 'resting',
        isPreviewing: status === 'previewing',
        passIndex, passCount, passProgress, totalProgress, position, currentRate, playError,
        start, stop, togglePreview
    };
};
