import {useState, useRef, useEffect, useCallback} from 'react';
import {flushSync} from 'react-dom';
import * as Tone from 'tone';
import {useLocalStorage} from './useLocalStorage';
import {SOUND_ASSETS} from '../constants/sounds';
import {INITIAL_MUTE_STATE, nextBarMute} from '../constants/barMute';

export const useMetronome = (initialBpm, initialSoundSettings, initialAccentPattern, muteSettings) => {
    const [bpm, setBpm] = useState(initialBpm);
    const [isActive, setIsActive] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(1);
    const [stepProgress, setStepProgress] = useState(0);
    const [totalProgress, setTotalProgress] = useState(0);
    const [isResting, setIsResting] = useState(false);
    const [isBarMuted, setIsBarMuted] = useState(false);   // the bar being heard right now is silent
    const [segmentIndex, setSegmentIndex] = useState(-1);   // Sequence mode: which timeline entry is playing (-1 = none)
    const [elapsedSeconds, setElapsedSeconds] = useState(0);   // whole seconds played (count-in and rests excluded)
    const [beatTick, setBeatTick] = useState(0);   // increments each beat — restarts the pulse
    const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
    const [volume, setVolume] = useLocalStorage('metronome_volume', -6);
    const [isAccentEnabled, setIsAccentEnabled] = useLocalStorage('metronome_accents', true);

    const clickSynth = useRef(null);
    const playersRef = useRef(null);
    const requestRef = useRef(null);
    const sessionStartTimeRef = useRef(null);
    const stepStartTimeRef = useRef(null);
    const stepCountRef = useRef(0);
    const playedBeatsRef = useRef(0);      // beats actually heard (bar-mode timing)
    const stepStartBeatRef = useRef(0);    // playedBeats at the start of the current step
    const lastBeatTimeRef = useRef(null);  // audio time of the last played beat (smooth progress)
    const restingRef = useRef(false);      // currently in a (silent) rest between intervals
    const restStartTimeRef = useRef(0);    // Date.now() when the current rest began
    const restDurationMsRef = useRef(0);   // length of the current rest
    const completedRestMsRef = useRef(0);  // total rest already taken (excluded from playing time)
    const seqIndexRef = useRef(0);         // Sequence mode: timeline entry being played
    const seqStartMsRef = useRef(0);       // wall-clock start of that entry (carried forward, so it can't drift)
    const seqStartBeatRef = useRef(0);     // bars-mode entries: elapsed-beat count at their start
    const seqDoneSecRef = useRef(0);       // total length (s) of the entries already finished
    const settingsRef = useRef(null);

    // --- SCHEDULER REFS ---
    const nextNoteTimeRef = useRef(0);
    const beatCounterRef = useRef(0);
    const countdownRemainingRef = useRef(0); // count-in beats left to schedule
    const countdownIndexRef = useRef(0);     // count-in beat position (for accents)
    const notesInQueue = useRef([]); // Engine queue: beats scheduled but not yet due on the context clock
    const visualQueue = useRef([]);  // Beat-light queue: the same beats, drained on the *heard* clock
    const LOOKAHEAD_MS = 100.0; // How far to schedule into the future
    const SCHEDULE_INTERVAL_MS = 25.0; // How often to check for new notes
    const timerIDRef = useRef(null);

    const isAccentEnabledRef = useRef(isAccentEnabled);
    const accentPatternRef = useRef(initialAccentPattern);
    const soundSettingsRef = useRef(initialSoundSettings);
    const bpmRef = useRef(initialBpm);

    // Bar muting: {enabled, style: 'random'|'pattern', chance, on, off}. Mirrored into a
    // ref so edits are heard on the next bar, even mid-run.
    const muteSettingsRef = useRef(muteSettings);
    const muteStateRef = useRef(INITIAL_MUTE_STATE);   // see constants/barMute.js

    useEffect(() => {
        clickSynth.current = new Tone.Synth({
            oscillator: {type: "triangle"}, envelope: {
                attack: 0.002, decay: 0.08, sustain: 0, release: 0.08
            }
        }).toDestination();

        playersRef.current = new Tone.Players(SOUND_ASSETS).toDestination();

        return () => {
            stop();
            if (clickSynth.current) clickSynth.current.dispose();
            if (playersRef.current) playersRef.current.dispose();
        };
    }, []);

    const playClick = useCallback((source, time) => {
        if (typeof source === 'number') {
            clickSynth.current.triggerAttackRelease(source, "32n", time);
        } else if (typeof source === 'string') {
            if (playersRef.current?.has(source)) {
                const player = playersRef.current.player(source);
                if (player?.loaded) player.start(time);
            }
        }
    }, []);

    // Keep BPM ref in sync for the scheduler to use without closures
    useEffect(() => {
        bpmRef.current = bpm;
    }, [bpm]);

    useEffect(() => {
        Tone.getDestination().volume.value = volume;
    }, [volume]);

    useEffect(() => {
        soundSettingsRef.current = initialSoundSettings;
    }, [initialSoundSettings]);

    useEffect(() => {
        isAccentEnabledRef.current = isAccentEnabled;
    }, [isAccentEnabled]);

    // The clicked accent pattern, mirrored for the scheduler. Like the accent
    // switch, it stays live mid-run: the bars are clickable while playing, and
    // the next scheduled beat should already hear the change.
    useEffect(() => {
        accentPatternRef.current = initialAccentPattern;
    }, [initialAccentPattern]);

    useEffect(() => {
        muteSettingsRef.current = muteSettings;
    }, [muteSettings]);

    // Tone wraps the AudioContext in standardized-audio-context, which exposes
    // neither outputLatency nor getOutputTimestamp. The native context sits
    // behind the wrapper's (private) _nativeAudioContext; should that field ever
    // go away, this degrades to the wrapper, i.e. no latency compensation.
    const nativeAudioContext = () => {
        const raw = Tone.getContext().rawContext;
        const native = raw._nativeAudioContext;
        return (native && typeof native.currentTime === 'number') ? native : raw;
    };

    // Audio-context time that is being heard *right now*. The context clock
    // (currentTime) runs ahead of the speakers by the device's output latency —
    // ~30ms on built-in speakers, 100-250ms on Bluetooth — so a light fired on
    // currentTime leads the click by that much. Prefers the spec'd output
    // timestamp (extrapolated from performance.now()), falls back to
    // currentTime - outputLatency, then to currentTime where neither exists.
    const heardNow = () => {
        const ctx = nativeAudioContext();
        if (typeof ctx.getOutputTimestamp === 'function') {
            const ts = ctx.getOutputTimestamp();
            // Zeros while the context is suspended.
            if (ts && ts.performanceTime > 0) {
                return ts.contextTime + (performance.now() - ts.performanceTime) / 1000;
            }
        }
        return ctx.currentTime - (ctx.outputLatency || 0);
    };

    const decideBarMute = () => {
        muteStateRef.current = nextBarMute(muteSettingsRef.current, muteStateRef.current);
    };

    // --- CORE SCHEDULER LOGIC ---
    const scheduleNote = (beatNumber, time) => {
        const isAccented = accentPatternRef.current?.includes(beatNumber) ?? false;

        if (beatNumber === 1) decideBarMute();
        const muted = muteStateRef.current.muted;

        // Queue for the engine (progress, interval boundaries) and for the beat
        // light. A muted bar is still queued: the beat bars and bars-mode
        // progress keep running, only the click is skipped.
        const note = {beat: beatNumber, time: time, muted};
        notesInQueue.current.push(note);
        visualQueue.current.push(note);

        if (muted) return;

        const source = (isAccentEnabledRef.current && isAccented)
            ? soundSettingsRef.current.metronomeAccent
            : soundSettingsRef.current.metronomeClick;

        playClick(source, time);
    };

    const advanceTime = () => {
        // Determine the scaling factor: 4 / bottom number (e.g., 4/8 = 0.5x duration)
        const timeSigBottom = settingsRef.current?.timeSigBottom || 4;
        const beatScale = 4 / timeSigBottom;

        // Calculate actual seconds per beat adjusted for the denominator
        const secondsPerBeat = (60.0 / bpmRef.current) * beatScale;

        nextNoteTimeRef.current += secondsPerBeat;
    };

    const advanceNote = () => {
        advanceTime();
        beatCounterRef.current++;
    };

    // Count-in click: same lookahead scheduling as the main loop (so Stop can
    // interrupt it), but it plays the count-in sounds and drives no beat indicator.
    const scheduleCountdownNote = (time) => {
        const settings = settingsRef.current;
        const countdownBeat = (countdownIndexRef.current % settings.timeSigTop) + 1;
        const isAccented = accentPatternRef.current?.includes(countdownBeat) ?? false;

        const source = (isAccentEnabledRef.current && isAccented)
            ? soundSettingsRef.current.countInAccent
            : soundSettingsRef.current.countInClick;

        playClick(source, time);
    };

    const scheduler = () => {
        // Schedule notes until the next note is beyond our lookahead window
        while (nextNoteTimeRef.current < Tone.now() + (LOOKAHEAD_MS / 1000.0)) {
            if (countdownRemainingRef.current > 0) {
                // Still in the count-in: schedule a count-in click and advance the
                // clock without touching the main beat counter.
                scheduleCountdownNote(nextNoteTimeRef.current);
                countdownIndexRef.current++;
                countdownRemainingRef.current--;
                advanceTime();
            } else {
                const s = settingsRef.current;
                // In bars mode with a rest, stop scheduling at the interval boundary so
                // no main clicks leak into the rest. beatCounterRef resets to 0 each
                // interval (in the rest branch of animate), so it counts 0..stepBeats-1.
                if (s.mode === 'trainer' && s.intervalUnit === 'bars' && (s.restBars || 0) > 0
                    && beatCounterRef.current >= s.intervalBars * s.timeSigTop) {
                    break;
                }
                const currentBeatInLoop = (beatCounterRef.current % s.timeSigTop) + 1;
                scheduleNote(currentBeatInLoop, nextNoteTimeRef.current);
                advanceNote();
            }
        }
    };

    const animate = () => {
        if (!sessionStartTimeRef.current || !settingsRef.current) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        const now = Date.now();
        const toneNow = Tone.now();          // scheduling clock (includes look-ahead)
        const audioNow = Tone.immediate();   // context time without look-ahead — engine bookkeeping (the light uses heardNow)
        const settings = settingsRef.current;

        // Engine bookkeeping runs on the context clock: a beat counts as played
        // as soon as it is due there. Interval/segment boundaries derive from this
        // and race the look-ahead scheduler, so they must not wait for the speaker.
        while (notesInQueue.current.length > 0 && notesInQueue.current[0].time < audioNow) {
            lastBeatTimeRef.current = notesInQueue.current[0].time;
            notesInQueue.current.shift();
            playedBeatsRef.current++;
        }

        // Beat light runs on the *heard* clock (see heardNow), with a small lead
        // for rAF quantisation + display latency so the flash lands *with* the click.
        // A backlog (e.g. tab was hidden) collapses to the latest due beat, and the
        // state is flushed synchronously so the DOM change paints on this frame
        // rather than the next.
        const VISUAL_LEAD = 0.03;
        const heard = heardNow();
        let dueNote = null;
        while (visualQueue.current.length > 0 && visualQueue.current[0].time - VISUAL_LEAD < heard) {
            dueNote = visualQueue.current.shift();
        }
        if (dueNote) {
            flushSync(() => {
                setCurrentBeat(dueNote.beat);
                setIsBarMuted(dueNote.muted);
                setBeatTick(t => t + 1);
            });
        }

        // Elapsed play time. The session clock starts in the future during the count-in
        // (hence the clamp to 0); React skips the re-render while the second is unchanged.
        const pausedMs = completedRestMsRef.current + (restingRef.current ? now - restStartTimeRef.current : 0);
        setElapsedSeconds(Math.max(0, Math.floor((now - sessionStartTimeRef.current - pausedMs) / 1000)));

        // --- FIXED LOGIC ---
        // We check for trainer mode OR if we are currently in the "Locked" state
        // (where the session is finished but we want to keep the UI at 100%)
        if (settings.mode === 'trainer') {
            // Resolve "elapsed vs threshold" for the current step and the whole session
            // in whichever unit is active. Bar mode counts beats actually played
            // (audio-accurate, via playedBeatsRef); time mode uses the wall clock.
            const isBarMode = settings.intervalUnit === 'bars';
            const restVal = isBarMode ? (settings.restBars || 0) : (settings.restSeconds || 0);
            let stepElapsed, stepThreshold, totalElapsed, totalThreshold;

            if (isBarMode) {
                const stepBeats = settings.intervalBars * settings.timeSigTop;
                // Beats elapsed since the first beat *started*. A beat sounding marks
                // 0 elapsed at its onset (hence playedBeats - 1) and grows to 1 as the
                // next beat becomes due; we interpolate within the current beat from the
                // audio time so progress advances smoothly, reads 0% on the downbeat, and
                // reaches 100% exactly as the bar's final beat ends.
                const beatScale = 4 / settings.timeSigBottom;
                const secPerBeat = (60.0 / bpmRef.current) * beatScale;
                const frac = (lastBeatTimeRef.current != null && secPerBeat > 0)
                    ? Math.min(Math.max((audioNow - lastBeatTimeRef.current) / secPerBeat, 0), 1)
                    : 0;
                const elapsedBeats = Math.max(0, playedBeatsRef.current - 1 + frac);

                stepThreshold = stepBeats;
                stepElapsed = elapsedBeats - stepStartBeatRef.current;
                // Reps = number of intervals played; the last interval's increment
                // coincides with the stop, so the ramp does (totalReps - 1) increments.
                totalThreshold = settings.totalReps * stepBeats;
                // No beats play during a rest, so elapsedBeats naturally freezes then.
                totalElapsed = elapsedBeats;
            } else {
                // Rests don't count toward playing time, so the session (Duration) and
                // the Total bar track playing time only — they pause during a rest.
                const restAccum = completedRestMsRef.current
                    + (restingRef.current ? (now - restStartTimeRef.current) : 0);
                stepThreshold = settings.stepSeconds * 1000;
                stepElapsed = now - stepStartTimeRef.current;
                totalThreshold = settings.totalSeconds * 1000;
                totalElapsed = (now - sessionStartTimeRef.current) - restAccum;
            }

            const newTotalProgress = totalThreshold > 0
                ? Math.min((totalElapsed / totalThreshold) * 100, 100)
                : 100;
            setTotalProgress(newTotalProgress);

            if (newTotalProgress >= 100) {
                if (settings.lockFinalBpm) {
                    // Update state to 100% one last time and switch mode to prevent further BPM increases
                    setStepProgress(100);
                    setTotalProgress(100);
                    settingsRef.current = {...settings, mode: 'constant'};
                    // We keep the loop running so the metronome keeps clicking,
                    // but the "trainer" block won't be entered again.
                } else {
                    stop();
                    return;
                }
            } else if (restingRef.current) {
                // REST phase — counted by wall clock. Audio stays silent until the
                // scheduler's parked count-in (set up in the boundary branch) fires
                // near the end; the Cycle bar shows the rest filling up.
                const restElapsed = now - restStartTimeRef.current;
                if (restElapsed >= restDurationMsRef.current) {
                    completedRestMsRef.current += restDurationMsRef.current;
                    restingRef.current = false;
                    setIsResting(false);
                    if (isBarMode) stepStartBeatRef.current = playedBeatsRef.current;
                    else stepStartTimeRef.current = now;
                    setStepProgress(0);
                } else {
                    setStepProgress((restElapsed / restDurationMsRef.current) * 100);
                }
            } else if (stepElapsed >= stepThreshold) {
                // Interval finished: ramp the BPM (see-saw), then rest if one is set.
                setStepProgress(0);
                const negIncr = settings.negativeIncrement || 0;
                const goingUp = negIncr === 0 || stepCountRef.current % 2 === 0;
                const newBpm = bpmRef.current + (goingUp ? settings.increment : -negIncr);
                bpmRef.current = newBpm;   // sync now so a rest count-in uses the new tempo
                muteStateRef.current = {...muteStateRef.current, resync: true};   // let the new tempo (or the return from a rest) be heard
                setBpm(newBpm);
                stepCountRef.current++;

                if (restVal > 0) {
                    // --- enter REST ---
                    restingRef.current = true;
                    setIsResting(true);
                    setCurrentBeat(0);          // no beat lit while resting
                    restStartTimeRef.current = now;

                    const beatScale = 4 / settings.timeSigBottom;
                    const secPerBeat = (60.0 / newBpm) * beatScale;
                    const restSec = isBarMode ? restVal * settings.timeSigTop * secPerBeat : restVal;
                    restDurationMsRef.current = restSec * 1000;

                    // Count-in leading back in, at the upcoming tempo. Use the full
                    // count-in when it fits; if it doesn't, fill as much of the rest as
                    // whole beats allow (instead of muting), still ending on the downbeat.
                    const countInBeats = settings.countdownBars * settings.timeSigTop;
                    const maxFit = secPerBeat > 0 ? Math.floor(restSec / secPerBeat) : 0;
                    const scheduled = Math.min(countInBeats, maxFit);
                    // Park the scheduler: silence until the count-in start, then it plays
                    // the count-in and rolls straight into the next interval.
                    nextNoteTimeRef.current = toneNow + (restSec - scheduled * secPerBeat);
                    countdownRemainingRef.current = scheduled;
                    countdownIndexRef.current = 0;
                    beatCounterRef.current = 0;    // resumed interval starts on beat 1
                    lastBeatTimeRef.current = null;
                } else {
                    // No rest: roll straight into the next interval.
                    if (isBarMode) stepStartBeatRef.current += stepThreshold;
                    else stepStartTimeRef.current = now;
                }
            } else {
                setStepProgress((stepElapsed / stepThreshold) * 100);
            }
        }

        // --- SEQUENCE MODE ---
        // Walks the timeline built by expandSteps(): play entries set the tempo, rest
        // entries go silent with a count-in leading back. Everything is wall-clock.
        if (settings.mode === 'sequence') {
            const segs = settings.segments;
            const seg = segs[seqIndexRef.current];
            const totalSec = segs.reduce((sum, g) => sum + g.seconds, 0);

            // Bars-mode play entries end on the beat count, so the tempo change lands
            // on the downbeat; everything else (time entries, rests) runs off the clock.
            // The beat maths is the Trainer's bars mode: a sounding beat is 0 elapsed at
            // its onset, growing to 1 as the next falls due.
            const inBars = seg.type === 'play' && seg.bars != null;
            const beatScale = 4 / settings.timeSigBottom;
            const secPerBeat = (60.0 / bpmRef.current) * beatScale;
            const beatFrac = (lastBeatTimeRef.current != null && secPerBeat > 0)
                ? Math.min(Math.max((audioNow - lastBeatTimeRef.current) / secPerBeat, 0), 1)
                : 0;
            const elapsedBeats = Math.max(0, playedBeatsRef.current - 1 + beatFrac);

            const segThreshold = inBars ? seg.bars * settings.timeSigTop : seg.seconds * 1000;
            const segElapsed = inBars
                ? elapsedBeats - seqStartBeatRef.current
                : Math.max(0, now - seqStartMsRef.current);
            const segFraction = Math.min(Math.max(segElapsed / segThreshold, 0), 1);

            setTotalProgress(Math.min(100, ((seqDoneSecRef.current + segFraction * seg.seconds) / totalSec) * 100));

            if (segElapsed >= segThreshold) {
                const next = seqIndexRef.current + 1;
                if (next >= segs.length) {
                    stop();
                    return;
                }
                const nextSeg = segs[next];
                seqIndexRef.current = next;
                seqDoneSecRef.current += seg.seconds;
                // Where the next entry starts, on whichever ruler it uses. Carrying the
                // previous start forward (rather than reading "now") keeps a run of
                // same-kind entries from drifting; crossing between rulers re-anchors.
                seqStartMsRef.current = inBars ? now : seqStartMsRef.current + segThreshold;
                if (nextSeg.type === 'play' && nextSeg.bars != null) {
                    seqStartBeatRef.current = inBars ? seqStartBeatRef.current + segThreshold
                        : seg.type === 'rest' ? playedBeatsRef.current
                        : elapsedBeats;
                }
                setSegmentIndex(next);
                setStepProgress(0);

                if (nextSeg.type === 'rest') {
                    // The step structure guarantees a play entry follows a rest.
                    const upcomingBpm = segs[next + 1].bpm;
                    bpmRef.current = upcomingBpm;   // the rest's count-in runs at the next tempo
                    setBpm(upcomingBpm);
                    muteStateRef.current = {...muteStateRef.current, resync: true};

                    restingRef.current = true;
                    setIsResting(true);
                    setCurrentBeat(0);
                    restStartTimeRef.current = now;

                    const secPerBeat = (60.0 / upcomingBpm) * (4 / settings.timeSigBottom);
                    const restSec = nextSeg.seconds;
                    restDurationMsRef.current = restSec * 1000;

                    // Same shape as the Trainer's rest: park the scheduler until the
                    // count-in starts, then it rolls straight into the next step.
                    const countInBeats = settings.countdownBars * settings.timeSigTop;
                    const maxFit = secPerBeat > 0 ? Math.floor(restSec / secPerBeat) : 0;
                    const scheduled = Math.min(countInBeats, maxFit);
                    nextNoteTimeRef.current = toneNow + (restSec - scheduled * secPerBeat);
                    countdownRemainingRef.current = scheduled;
                    countdownIndexRef.current = 0;
                    beatCounterRef.current = 0;
                    lastBeatTimeRef.current = null;
                } else {
                    // A play entry: leaving a rest, or rolling on from the previous step.
                    restingRef.current = false;
                    setIsResting(false);
                    bpmRef.current = nextSeg.bpm;
                    setBpm(nextSeg.bpm);
                    muteStateRef.current = {...muteStateRef.current, resync: true};
                }
            } else {
                setStepProgress(segFraction * 100);
            }
        }

        requestRef.current = requestAnimationFrame(animate);
    };

    const stop = () => {
        if (timerIDRef.current) clearInterval(timerIDRef.current);
        cancelAnimationFrame(requestRef.current);
        countdownRemainingRef.current = 0;
        countdownIndexRef.current = 0;
        restingRef.current = false;
        completedRestMsRef.current = 0;

        setIsActive(false);
        setIsResting(false);
        setIsBarMuted(false);
        setCurrentBeat(0);   // 0 = no beat lit (nothing lights during the count-in)
        setStepProgress(0);
        setTotalProgress(0);
        setElapsedSeconds(0);
        setSegmentIndex(-1);
        notesInQueue.current = [];
        visualQueue.current = [];
        sessionStartTimeRef.current = null;
    };

    const start = async (settings, startBpm, soundConfigs) => {
        await Tone.start();
        stop();

        soundSettingsRef.current = soundConfigs;
        settingsRef.current = settings;
        setBeatsPerMeasure(settings.timeSigTop);
        setBpm(startBpm);
        bpmRef.current = startBpm;

        // Calculate initial timing for the countdown
        const beatScale = 4 / settings.timeSigBottom;
        const secondsPerBeat = (60.0 / startBpm) * beatScale;

        const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;
        const countdownDurationSec = totalCountdownBeats * secondsPerBeat;

        const nowTone = Tone.now();

        // --- PREPARE THE SCHEDULER ---
        // The count-in is now scheduled beat-by-beat by the lookahead scheduler,
        // immediately ahead of the main loop, so a Stop mid-count-in interrupts it.
        nextNoteTimeRef.current = nowTone;
        countdownRemainingRef.current = totalCountdownBeats;
        countdownIndexRef.current = 0;
        beatCounterRef.current = 0;
        stepCountRef.current = 0;
        playedBeatsRef.current = 0;
        stepStartBeatRef.current = 0;
        lastBeatTimeRef.current = null;
        restingRef.current = false;
        completedRestMsRef.current = 0;
        muteStateRef.current = INITIAL_MUTE_STATE;
        seqIndexRef.current = 0;
        seqDoneSecRef.current = 0;
        seqStartBeatRef.current = 0;
        setSegmentIndex(settings.mode === 'sequence' ? 0 : -1);
        setIsResting(false);

        // Start scheduler heartbeat
        timerIDRef.current = setInterval(scheduler, SCHEDULE_INTERVAL_MS);

        sessionStartTimeRef.current = Date.now() + (countdownDurationSec * 1000);
        stepStartTimeRef.current = sessionStartTimeRef.current;
        seqStartMsRef.current = sessionStartTimeRef.current;

        setIsActive(true);
        requestRef.current = requestAnimationFrame(animate);
    };

    return {
        bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, isResting, isBarMuted, elapsedSeconds, segmentIndex, beatTick, start, stop,
        beatsPerMeasure, volume, setVolume, isAccentEnabled, setIsAccentEnabled
    };
};