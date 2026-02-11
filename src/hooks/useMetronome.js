import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

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

  // Sync Tone.js BPM
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // Sync Tone.js Volume
  useEffect(() => {
    Tone.getDestination().volume.value = volume;
  }, [volume]);

  // Main animation loop for progress bars
  const animate = () => {
    if (!sessionStartTimeRef.current || !settingsRef.current) {
      requestRef.current = requestAnimationFrame(animate);
      return;
    }

    const now = Date.now();
    const settings = settingsRef.current;

    // Only update progress if the countdown is finished
    if (now >= sessionStartTimeRef.current && settings.mode === 'trainer') {
      // 1. Total Progress
      const totalMs = settings.totalSeconds * 1000;
      const elapsedTotal = now - sessionStartTimeRef.current;
      const newTotalProgress = Math.min((elapsedTotal / totalMs) * 100, 100);
      setTotalProgress(newTotalProgress);

      if (newTotalProgress >= 100) {
        stop();
        return;
      }

      // 2. Cycle (Step) Progress
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
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
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
    await Tone.start();
    stop(); // Ensure clean state

    settingsRef.current = settings;
    setBeatsPerMeasure(settings.timeSigTop);
    setBpm(startBpm);

    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();

    const subdivision = `${settings.timeSigBottom}n`;
    const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
    let beatCounter = 0;

    // Metronome Repeat
    Tone.getTransport().scheduleRepeat((time) => {
      const displayBeat = (beatCounter % settings.timeSigTop) + 1;
      const accents = ACCENT_MAP[sigKey] || [1];
      const isAccented = accents.includes(displayBeat);
      const freq = isAccented ? 1500 : 800;

      clickSynth.current.triggerAttackRelease(freq, "32n", time);
      Tone.Draw.schedule(() => setCurrentBeat(displayBeat), time);
      beatCounter++;
    }, subdivision);

    // Calculate countdown timing
    const beatDuration = Tone.Time(subdivision).toSeconds();
    const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;
    const countdownDurationMs = totalCountdownBeats * beatDuration * 1000;

    // Play countdown clicks
    const nowTone = Tone.now();
    for (let i = 0; i < totalCountdownBeats; i++) {
      const clickTime = nowTone + (i * beatDuration);
      const isStartOfBar = i % settings.timeSigTop === 0;
      clickSynth.current.triggerAttackRelease(isStartOfBar ? 1800 : 1200, "32n", clickTime);
    }

    // Schedule actual start
    Tone.getTransport().start(`+${totalCountdownBeats * beatDuration}`);

    // Set anchor times for the animation loop
    sessionStartTimeRef.current = Date.now() + countdownDurationMs;
    stepStartTimeRef.current = sessionStartTimeRef.current;

    setIsActive(true);
    requestRef.current = requestAnimationFrame(animate);
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop, beatsPerMeasure, volume, setVolume };
};