import {useState, useRef, useEffect} from 'react';
import * as Tone from 'tone';
import { useLocalStorage } from './useLocalStorage'; // Import your new hook

// Defines which beats receive a higher pitch based on complex time signatures
const ACCENT_MAP = {
    "7/8": [1, 4, 6],
    "5/8": [1, 4],
    "6/8": [1, 4],
    "9/8": [1, 4, 7],
    "12/8": [1, 4, 7, 10],
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
    const requestRef = useRef(null);
    const sessionStartTimeRef = useRef(null);
    const stepStartTimeRef = useRef(null);
    const settingsRef = useRef(null);
    const isAccentEnabledRef = useRef(isAccentEnabled);
    const soundSettingsRef = useRef(initialSoundSettings);

    // Initialize the synth with a 'right-skewed' feel.
    // Triangle waves and ultra-fast attack ensure the sound 'peaks'
    // exactly when the visual indicator triggers.
    useEffect(() => {
        clickSynth.current = new Tone.Synth({
            oscillator: {type: "triangle"},
            envelope: {
                attack: 0.002, // 2ms attack eliminates 'pop' but feels instant
                decay: 0.08,
                sustain: 0,
                release: 0.08
            }
        }).toDestination();

        return () => {
            if (clickSynth.current) clickSynth.current.dispose();
        };
    }, []);


    // Sync state changes to the Tone.js Transport global clock
    useEffect(() => {
        Tone.getTransport().bpm.value = bpm;
    }, [bpm]);

    // 2. FORCE SYNC: Ensure Tone.js matches the loaded volume immediately on mount
    useEffect(() => {
        Tone.getDestination().volume.value = volume;
    }, []); // Run once on mount

    // Keep the Ref in sync with the state from App.jsx
    useEffect(() => {
        soundSettingsRef.current = initialSoundSettings;
    }, [initialSoundSettings]);

    // Handle progress bars and Speed Trainer logic
    const animate = () => {
        if (!sessionStartTimeRef.current || !settingsRef.current) {
            requestRef.current = requestAnimationFrame(animate);
            return;
        }

        const now = Date.now();
        const settings = settingsRef.current;

        // Logic only runs if the 'trainer' mode is active and countdown is over
        if (now >= sessionStartTimeRef.current && settings.mode === 'trainer') {
            // Calculate overall session completion
            const totalMs = settings.totalSeconds * 1000;
            const elapsedTotal = now - sessionStartTimeRef.current;
            const newTotalProgress = Math.min((elapsedTotal / totalMs) * 100, 100);
            setTotalProgress(newTotalProgress);

            if (newTotalProgress >= 100) {
                stop();
                return;
            }

            // Calculate progress within the current BPM 'step'
            const stepMs = settings.stepSeconds * 1000;
            const elapsedInStep = now - stepStartTimeRef.current;

            if (elapsedInStep >= stepMs) {
                // Step complete: reset step timer and increment BPM
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
        // Crucial: Stop and clear the schedule, then reset 'seconds' to 0
        // to ensure the next 'start' begins exactly on Beat 1.
        Tone.getTransport().stop();
        Tone.getTransport().cancel(0);
        Tone.getTransport().seconds = 0;

        if (clickSynth.current) {
            clickSynth.current.triggerRelease();
        }

        cancelAnimationFrame(requestRef.current);
        sessionStartTimeRef.current = null;
        stepStartTimeRef.current = null;
        settingsRef.current = null;
        setIsActive(false);
        setCurrentBeat(1);
        setStepProgress(0);
        setTotalProgress(0);
    };

    const start = async (settings, startBpm, soundConfigs) => {
        // Browsers require a user gesture to start the AudioContext
        await Tone.start();
        stop(); // Ensure a clean slate

        Tone.getTransport().bpm.value = startBpm;
        settingsRef.current = settings;
        setBeatsPerMeasure(settings.timeSigTop);
        setBpm(startBpm);

        const subdivision = `${settings.timeSigBottom}n`;
        const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
        const accents = ACCENT_MAP[sigKey] || [1];

        // Counter initialized inside start() so it resets to 0 every session
        let beatCounter = 0;

        // Main Audio Loop: Scheduled on the Transport for high-precision timing
        Tone.getTransport().scheduleRepeat((time) => {
            const displayBeat = (beatCounter % settings.timeSigTop) + 1;
            const isAccented = accents.includes(displayBeat);

            // If accents are disabled, every beat uses the standard 500Hz frequency
            const freq = (isAccentEnabledRef.current && isAccented)
                ? soundSettingsRef.current.metronomeAccent
                : soundSettingsRef.current.metronomeClick;

            // Trigger audio precisely at the Transport's 'time'
            clickSynth.current.triggerAttackRelease(freq, "32n", time);

            // Tone.Draw schedules visual updates to happen on the next
            // animation frame relative to the audio time, keeping them in sync.
            Tone.Draw.schedule(() => setCurrentBeat(displayBeat), time);
            beatCounter++;
        }, subdivision);

        // --- 2. Corrected Countdown & Start Logic ---
        const beatDuration = Tone.Time(subdivision).toSeconds();
        const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;
        const countdownDurationMs = totalCountdownBeats * beatDuration * 1000;
        const nowTone = Tone.now();

        // Play countdown clicks manually
        for (let i = 0; i < totalCountdownBeats; i++) {
            const clickTime = nowTone + (i * beatDuration);
            const countdownBeat = (i % settings.timeSigTop) + 1;
            const isAccented = accents.includes(countdownBeat);

            // Use slightly higher frequencies (1200/800) than the main loop
            // to audibly distinguish the countdown phase.
            const freq = (isAccentEnabledRef.current && isAccented)
                ? soundSettingsRef.current.countInAccent
                : soundSettingsRef.current.countInClick;

            clickSynth.current.triggerAttackRelease(freq, "32n", clickTime);
        }

        // CRITICAL FIX: Schedule a reset of the beatCounter to 0
        // at the exact moment the Transport is scheduled to start.
        const transportStartTime = totalCountdownBeats * beatDuration;
        Tone.getTransport().scheduleOnce(() => {
            beatCounter = 0;
        }, transportStartTime);

        // Start transport relative to 'now'
        Tone.getTransport().start(`+${transportStartTime}`);

        sessionStartTimeRef.current = Date.now() + countdownDurationMs;
        stepStartTimeRef.current = sessionStartTimeRef.current;

        setIsActive(true);
        requestRef.current = requestAnimationFrame(animate);
    };

    return {
        bpm,
        setBpm,
        isActive,
        currentBeat,
        stepProgress,
        totalProgress,
        start,
        stop,
        beatsPerMeasure,
        volume,
        setVolume,
        isAccentEnabled,
        setIsAccentEnabled
    };
};