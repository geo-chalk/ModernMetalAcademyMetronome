import {useState, useRef, useEffect} from 'react';
import * as Tone from 'tone';

// Defines which beats receive a higher pitch based on complex time signatures
const ACCENT_MAP = {
    "7/8": [1, 4, 6],
    "5/8": [1, 4],
    "6/8": [1, 4],
    "9/8": [1, 4, 7],
    "12/8": [1, 4, 7, 10],
};

export const useMetronome = (initialBpm) => {
    const [bpm, setBpm] = useState(initialBpm);
    const [isActive, setIsActive] = useState(false);
    const [currentBeat, setCurrentBeat] = useState(1);
    const [stepProgress, setStepProgress] = useState(0);
    const [totalProgress, setTotalProgress] = useState(0);
    const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
    const [volume, setVolume] = useState(-6);

    const clickSynth = useRef(null);
    const requestRef = useRef(null);
    const sessionStartTimeRef = useRef(null);
    const stepStartTimeRef = useRef(null);
    const settingsRef = useRef(null);

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

    useEffect(() => {
        Tone.getDestination().volume.value = volume;
    }, [volume]);

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

    const start = async (settings, startBpm) => {
        // Browsers require a user gesture to start the AudioContext
        await Tone.start();
        stop(); // Ensure a clean slate

        Tone.getTransport().bpm.value = startBpm;

        settingsRef.current = settings;
        setBeatsPerMeasure(settings.timeSigTop);
        setBpm(startBpm);

        const subdivision = `${settings.timeSigBottom}n`;
        const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;

        // Counter initialized inside start() so it resets to 0 every session
        let beatCounter = 0;

        // Main Audio Loop: Scheduled on the Transport for high-precision timing
        Tone.getTransport().scheduleRepeat((time) => {
            const displayBeat = (beatCounter % settings.timeSigTop) + 1;
            const accents = ACCENT_MAP[sigKey] || [1];
            const isAccented = accents.includes(displayBeat);
            const freq = isAccented ? 1000 : 500;

            // Trigger audio precisely at the Transport's 'time'
            clickSynth.current.triggerAttackRelease(freq, "32n", time);

            // Tone.Draw schedules visual updates to happen on the next
            // animation frame relative to the audio time, keeping them in sync.
            Tone.Draw.schedule(() => setCurrentBeat(displayBeat), time);
            beatCounter++;
        }, subdivision);

        // Countdown Logic: manually schedule clicks for the initial bars
        const beatDuration = Tone.Time(subdivision).toSeconds();
        const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;
        const countdownDurationMs = totalCountdownBeats * beatDuration * 1000;

        // Play countdown clicks
        const nowTone = Tone.now();
        for (let i = 0; i < totalCountdownBeats; i++) {
            const clickTime = nowTone + (i * beatDuration);
            const isStartOfBar = i % settings.timeSigTop === 0;
            clickSynth.current.triggerAttackRelease(isStartOfBar ? 1200 : 800, "32n", clickTime);
        }

        // Delay the start of the repeating transport until after the countdown
        Tone.getTransport().start(`+${totalCountdownBeats * beatDuration}`);

        // Set anchors for the React progress animation
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
        setVolume
    };
};