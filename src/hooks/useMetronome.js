import {useState, useRef, useEffect, useCallback} from 'react';
import * as Tone from 'tone';
import {useLocalStorage} from './useLocalStorage';
import {SOUND_ASSETS} from '../constants/sounds';

const ACCENT_MAP = {
    "7/8": [1, 4, 6], "5/8": [1, 4], "6/8": [1, 4], "9/8": [1, 4, 7], "12/8": [1, 4, 7, 10],
};

export const useMetronome = (initialBpm, initialSoundSettings) => {
    const [bpm, setBpm] = useState(initialBpm);
    const [isActive, setIsActive] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(1);
    const [stepProgress, setStepProgress] = useState(0);
    const [totalProgress, setTotalProgress] = useState(0);
    const [isResting, setIsResting] = useState(false);
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
    const settingsRef = useRef(null);

    // --- SCHEDULER REFS ---
    const nextNoteTimeRef = useRef(0);
    const beatCounterRef = useRef(0);
    const countdownRemainingRef = useRef(0); // count-in beats left to schedule
    const countdownIndexRef = useRef(0);     // count-in beat position (for accents)
    const notesInQueue = useRef([]); // Visual sync queue
    const LOOKAHEAD_MS = 100.0; // How far to schedule into the future
    const SCHEDULE_INTERVAL_MS = 25.0; // How often to check for new notes
    const timerIDRef = useRef(null);

    const isAccentEnabledRef = useRef(isAccentEnabled);
    const soundSettingsRef = useRef(initialSoundSettings);
    const bpmRef = useRef(initialBpm);

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

    // --- CORE SCHEDULER LOGIC ---
    const scheduleNote = (beatNumber, time) => {
        const settings = settingsRef.current;
        const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
        const accents = ACCENT_MAP[sigKey] || [1];
        const isAccented = accents.includes(beatNumber);

        // Push to visual queue
        notesInQueue.current.push({beat: beatNumber, time: time});

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
        const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
        const accents = ACCENT_MAP[sigKey] || [1];
        const countdownBeat = (countdownIndexRef.current % settings.timeSigTop) + 1;
        const isAccented = accents.includes(countdownBeat);

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
                const currentBeatInLoop = (beatCounterRef.current % settingsRef.current.timeSigTop) + 1;
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
        const toneNow = Tone.now();
        const settings = settingsRef.current;

        // Visual Sync: Only update the UI beat when the audio time is reached
        while (notesInQueue.current.length > 0 && notesInQueue.current[0].time < toneNow) {
            setCurrentBeat(notesInQueue.current[0].beat);
            lastBeatTimeRef.current = notesInQueue.current[0].time;
            notesInQueue.current.shift();
            playedBeatsRef.current++;
        }

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
                    ? Math.min(Math.max((toneNow - lastBeatTimeRef.current) / secPerBeat, 0), 1)
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
        setCurrentBeat(1);
        setStepProgress(0);
        setTotalProgress(0);
        notesInQueue.current = [];
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
        setIsResting(false);

        // Start scheduler heartbeat
        timerIDRef.current = setInterval(scheduler, SCHEDULE_INTERVAL_MS);

        sessionStartTimeRef.current = Date.now() + (countdownDurationSec * 1000);
        stepStartTimeRef.current = sessionStartTimeRef.current;

        setIsActive(true);
        requestRef.current = requestAnimationFrame(animate);
    };

    return {
        bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, isResting, start, stop,
        beatsPerMeasure, volume, setVolume, isAccentEnabled, setIsAccentEnabled
    };
};