import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

export const useMetronome = (initialBpm) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isActive, setIsActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);
  const [beatsPerMeasure, setBeatsPerMeasure] = useState(4);
  const [volume, setVolume] = useState(-6);

  const clickSynth = useRef(null);
  const progressIntervalRef = useRef(null);
  const totalIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null); // Ref to track the countdown timeout
  const startTimeRef = useRef(0);

  // Keep Tone.js BPM in sync with React state
  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  // Keep Tone.js Volume in sync
  useEffect(() => {
    Tone.getDestination().volume.value = volume;
  }, [volume]);

  const stop = () => {
    // 1. Stop Audio
    Tone.getTransport().stop();
    Tone.getTransport().cancel();

    // 2. Clear all Timers/Intervals
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (totalIntervalRef.current) clearInterval(totalIntervalRef.current);
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);

    // 3. Reset State
    setIsActive(false);
    setCurrentBeat(1);
    setStepProgress(0);
    setTotalProgress(0);
  };

  const start = async (settings, startBpm) => {
    await Tone.start();

    // Reset everything before starting
    stop();

    Tone.getTransport().timeSignature = settings.timeSigTop;
    setBeatsPerMeasure(settings.timeSigTop);
    setBpm(startBpm);

    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();

    // Schedule the main metronome loop
    Tone.getTransport().scheduleRepeat((time) => {
      const position = Tone.getTransport().position.split(':');
      const beat = parseInt(position[1]);
      const freq = beat === 0 ? 1500 : 800;

      clickSynth.current.triggerAttackRelease(freq, "32n", time);

      Tone.Draw.schedule(() => {
        setCurrentBeat(beat + 1);
      }, time);
    }, "4n");

    setIsActive(true);

    const secondsPerBeat = 60 / startBpm;
    const now = Tone.now();
    const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;

    // Play Countdown Clicks
    for (let i = 0; i < totalCountdownBeats; i++) {
      const clickTime = now + (i * secondsPerBeat);
      const isStartOfBar = i % settings.timeSigTop === 0;
      const freq = isStartOfBar ? 1800 : 1200;
      clickSynth.current.triggerAttackRelease(freq, "32n", clickTime);
    }

    const countdownDurationSeconds = totalCountdownBeats * secondsPerBeat;
    Tone.getTransport().start(`+${countdownDurationSeconds}`);

    // Start UI logic exactly when countdown finishes
    countdownTimeoutRef.current = setTimeout(() => {
      startTimeRef.current = Date.now();

      if (settings.mode === 'trainer') {
        const stepMs = settings.stepSeconds * 1000;
        const totalMs = settings.totalSeconds * 1000;
        let stepStartTime = Date.now();

        progressIntervalRef.current = setInterval(() => {
          const now = Date.now();
          const elapsedInStep = now - stepStartTime;

          if (elapsedInStep >= stepMs) {
            stepStartTime = now; // Reset step anchor
            setStepProgress(0);
            setBpm(prev => prev + settings.increment);
          } else {
            setStepProgress((elapsedInStep / stepMs) * 100);
          }
        }, 32);

        totalIntervalRef.current = setInterval(() => {
          const elapsedTotal = Date.now() - startTimeRef.current;
          const progressTotal = (elapsedTotal / totalMs) * 100;

          if (progressTotal >= 100) {
            stop();
          } else {
            setTotalProgress(progressTotal);
          }
        }, 100);
      }
    }, countdownDurationSeconds * 1000);
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop, beatsPerMeasure, volume, setVolume };
};