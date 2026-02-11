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
  const startTimeRef = useRef(0);

  useEffect(() => {
    Tone.getTransport().bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    Tone.getDestination().volume.value = volume;
  }, [volume]);

  const stop = () => {
    Tone.getTransport().stop();
    Tone.getTransport().cancel();
    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (totalIntervalRef.current) clearInterval(totalIntervalRef.current);
    setIsActive(false);
    setCurrentBeat(1);
    setStepProgress(0);
    setTotalProgress(0);
  };

  const start = async (settings, startBpm) => {
    // 1. Initial Setup
    Tone.getTransport().cancel();
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
    Tone.getTransport().timeSignature = settings.timeSigTop;
    setBeatsPerMeasure(settings.timeSigTop);
    setBpm(startBpm);

    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();

    // 2. Schedule the main metronome loop
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

    // 3. Dynamic Countdown Logic based on settings.countdownBars
    const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;

    for (let i = 0; i < totalCountdownBeats; i++) {
      const clickTime = now + (i * secondsPerBeat);
      // Determine if it's the start of a bar in the countdown
      const isStartOfBar = i % settings.timeSigTop === 0;
      const freq = isStartOfBar ? 1800 : 1200;
      clickSynth.current.triggerAttackRelease(freq, "32n", clickTime);
    }

    // 4. Start Transport after the countdown duration
    const countdownDuration = totalCountdownBeats * secondsPerBeat;
    Tone.getTransport().start(`+${countdownDuration}`);

    // 5. Setup Trainer Intervals (wrapped in countdown duration)
    setTimeout(() => {
       // ... existing trainer logic (setIntervals for progress, etc.)
    }, countdownDuration * 1000);
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop, beatsPerMeasure, volume, setVolume };
};