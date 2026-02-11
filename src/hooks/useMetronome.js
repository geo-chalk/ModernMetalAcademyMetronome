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
    await Tone.start();
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

    // Schedule the clicks BEFORE starting transport for better stability
    Tone.getTransport().scheduleRepeat((time) => {
      // Logic inside scheduleRepeat is precise to the audio clock
      const position = Tone.getTransport().position.split(':');
      const beat = parseInt(position[1]);
      const freq = beat === 0 ? 1500 : 800;

      clickSynth.current.triggerAttackRelease(freq, "32n", time);

      // Tone.Draw syncs React updates to the specific audio "time"
      Tone.Draw.schedule(() => {
        setCurrentBeat(beat + 1);
      }, time);
    }, "4n");

    setIsActive(true);
    const secondsPerBeat = 60 / startBpm;
    const now = Tone.now();

    // 1. Play Countdown
    for (let i = 0; i < settings.timeSigTop; i++) {
      const clickTime = now + (i * secondsPerBeat);
      const freq = i === 0 ? 1800 : 1200;
      clickSynth.current.triggerAttackRelease(freq, "32n", clickTime);
    }

    // 2. Start Transport after countdown with a small buffer (+0.1)
    const countdownDuration = settings.timeSigTop * secondsPerBeat;
    Tone.getTransport().start(`+${countdownDuration}`);

    // 3. Setup Trainer Intervals
    setTimeout(() => {
      startTimeRef.current = Date.now();
      if (settings.mode === 'trainer') {
        const stepMs = settings.stepSeconds * 1000;
        const totalMs = settings.totalSeconds * 1000;
        let nextJumpTime = Date.now() + stepMs;

        progressIntervalRef.current = setInterval(() => {
          const currentTime = Date.now();
          const remainingMs = nextJumpTime - currentTime;
          if (remainingMs <= 0) {
            setStepProgress(0);
            setBpm(prev => prev + settings.increment);
            nextJumpTime = Date.now() + stepMs;
          } else {
            setStepProgress(((stepMs - remainingMs) / stepMs) * 100);
          }
        }, 32); // Slightly faster interval (32ms ~ 30fps) for smoother progress bars

        totalIntervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          const progress = (elapsed / totalMs) * 100;
          if (progress >= 100) stop();
          else setTotalProgress(progress);
        }, 100);
      }
    }, countdownDuration * 1000);
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop, beatsPerMeasure, volume, setVolume };
};