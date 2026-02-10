import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

export const useMetronome = (initialBpm) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isActive, setIsActive] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(1);
  const [stepProgress, setStepProgress] = useState(0);
  const [totalProgress, setTotalProgress] = useState(0);

  const clickSynth = useRef(null);
  const progressIntervalRef = useRef(null);
  const totalIntervalRef = useRef(null);
  const startTimeRef = useRef(0);

  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const stop = () => {
    Tone.Transport.stop();
    Tone.Transport.cancel();

    if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    if (totalIntervalRef.current) clearInterval(totalIntervalRef.current);

    setIsActive(false);
    setCurrentBeat(1);
    setStepProgress(0);
    setTotalProgress(0);
  };

  const start = async (settings, startBpm) => {
    await Tone.start();

    Tone.Transport.cancel();
    Tone.Transport.stop();
    Tone.Transport.position = 0; // Reset to 0:0:0

    setBpm(startBpm);
    Tone.Transport.bpm.value = startBpm;
    startTimeRef.current = Date.now();

    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();

    // The most stable scheduling method:
    Tone.Transport.scheduleRepeat((time) => {
      // Get the beat directly from the Transport position string "0:0:0"
      // The middle number is the beat (0, 1, 2, or 3)
      const position = Tone.Transport.position.split(':');
      const beat = parseInt(position[1]);

      const freq = beat === 0 ? 1500 : 800;
      clickSynth.current.triggerAttackRelease(freq, "32n", time);

      Tone.Draw.schedule(() => {
        setCurrentBeat(beat + 1);
      }, time);
    }, "4n");

    // Start with a look-ahead buffer
    Tone.Transport.start("+0.1");
    setIsActive(true);

    if (settings.mode === 'trainer') {
      const stepMs = settings.stepSeconds * 1000;
      const totalMs = settings.totalSeconds * 1000;
      let nextJumpTime = Date.now() + stepMs;

      progressIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const remainingMs = nextJumpTime - now;
        if (remainingMs <= 0) {
          setStepProgress(0);
          setBpm(prev => prev + settings.increment);
          nextJumpTime = Date.now() + stepMs;
        } else {
          setStepProgress(((stepMs - remainingMs) / stepMs) * 100);
        }
      }, 50);

      totalIntervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = (elapsed / totalMs) * 100;
        if (progress >= 100) {
          stop();
        } else {
          setTotalProgress(progress);
        }
      }, 100);
    }
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop };
};