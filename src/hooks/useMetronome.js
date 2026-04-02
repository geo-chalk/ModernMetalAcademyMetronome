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
            notesInQueue.current.shift();
        }

        if (now >= sessionStartTimeRef.current && settings.mode === 'trainer') {
            const totalMs = settings.totalSeconds * 1000;
            const elapsedTotal = now - sessionStartTimeRef.current;
            const newTotalProgress = Math.min((elapsedTotal / totalMs) * 100, 100);
            setTotalProgress(newTotalProgress);

            if (newTotalProgress >= 100) {
                if (settings.lockFinalBpm) {
                    settingsRef.current = {...settings, mode: 'constant'};
                    setStepProgress(100);
                    setTotalProgress(100);
                    return;
                } else {
                    stop();
                    return;
                }
            }

            const stepMs = settings.stepSeconds * 1000;
            const elapsedInStep = now - stepStartTimeRef.current;

            if (elapsedInStep >= stepMs) {
                stepStartTimeRef.current = now;
                setStepProgress(0);
                setBpm(prev => prev + settings.increment);
            } else {
                setStepProgress((elapsedInStep / stepMs) * 100);
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