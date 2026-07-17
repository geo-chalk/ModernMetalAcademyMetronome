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
    const settingsRef = useRef(null);

    // --- SCHEDULER REFS ---
    const nextNoteTimeRef = useRef(0);
    const beatCounterRef = useRef(0);
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

    const advanceNote = () => {
        // Determine the scaling factor: 4 / bottom number (e.g., 4/8 = 0.5x duration)
        const timeSigBottom = settingsRef.current?.timeSigBottom || 4;
        const beatScale = 4 / timeSigBottom;

        // Calculate actual seconds per beat adjusted for the denominator
        const secondsPerBeat = (60.0 / bpmRef.current) * beatScale;

        nextNoteTimeRef.current += secondsPerBeat;
        beatCounterRef.current++;
    };

    const scheduler = () => {
        // Schedule notes until the next note is beyond our lookahead window
        while (nextNoteTimeRef.current < Tone.now() + (LOOKAHEAD_MS / 1000.0)) {
            const currentBeatInLoop = (beatCounterRef.current % settingsRef.current.timeSigTop) + 1;
            scheduleNote(currentBeatInLoop, nextNoteTimeRef.current);
            advanceNote();
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
                totalElapsed = elapsedBeats;
            } else {
                stepThreshold = settings.stepSeconds * 1000;
                stepElapsed = now - stepStartTimeRef.current;
                totalThreshold = settings.totalSeconds * 1000;
                totalElapsed = now - sessionStartTimeRef.current;
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
            } else if (stepElapsed >= stepThreshold) {
                // Step boundary: advance the step marker and ramp the BPM.
                if (isBarMode) stepStartBeatRef.current += stepThreshold;
                else stepStartTimeRef.current = now;
                setStepProgress(0);
                // See-saw ramp: alternate +increment then -negativeIncrement each step.
                // negativeIncrement is capped at increment (see App.jsx), so net drift is
                // never negative and BPM can't fall below the start tempo. When it's 0 the
                // down-steps are skipped entirely, giving a pure monotonic ramp.
                const negIncr = settings.negativeIncrement || 0;
                const goingUp = negIncr === 0 || stepCountRef.current % 2 === 0;
                setBpm(prev => prev + (goingUp ? settings.increment : -negIncr));
                stepCountRef.current++;
            } else {
                setStepProgress((stepElapsed / stepThreshold) * 100);
            }
        }
        requestRef.current = requestAnimationFrame(animate);
    };

    const stop = () => {
        if (timerIDRef.current) clearInterval(timerIDRef.current);
        cancelAnimationFrame(requestRef.current);

        setIsActive(false);
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
        const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
        const accents = ACCENT_MAP[sigKey] || [1];

        for (let i = 0; i < totalCountdownBeats; i++) {
            const clickTime = nowTone + (i * secondsPerBeat);
            const countdownBeat = (i % settings.timeSigTop) + 1;
            const isAccented = accents.includes(countdownBeat);

            const source = (isAccentEnabledRef.current && isAccented)
                ? soundSettingsRef.current.countInAccent
                : soundSettingsRef.current.countInClick;

            playClick(source, clickTime);
        }

        // --- PREPARE MAIN LOOP ---
        nextNoteTimeRef.current = nowTone + countdownDurationSec;
        beatCounterRef.current = 0;
        stepCountRef.current = 0;
        playedBeatsRef.current = 0;
        stepStartBeatRef.current = 0;
        lastBeatTimeRef.current = null;

        // Start scheduler heartbeat
        timerIDRef.current = setInterval(scheduler, SCHEDULE_INTERVAL_MS);

        sessionStartTimeRef.current = Date.now() + (countdownDurationSec * 1000);
        stepStartTimeRef.current = sessionStartTimeRef.current;

        setIsActive(true);
        requestRef.current = requestAnimationFrame(animate);
    };

    return {
        bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop,
        beatsPerMeasure, volume, setVolume, isAccentEnabled, setIsAccentEnabled
    };
};