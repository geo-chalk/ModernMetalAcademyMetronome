import { useState, useRef, useEffect } from 'react';
import * as Tone from 'tone';

// Define custom accent patterns here
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
  const progressIntervalRef = useRef(null);
  const totalIntervalRef = useRef(null);
  const countdownTimeoutRef = useRef(null);
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
    if (countdownTimeoutRef.current) clearTimeout(countdownTimeoutRef.current);
    setIsActive(false);
    setCurrentBeat(1);
    setStepProgress(0);
    setTotalProgress(0);
  };

const start = async (settings, startBpm) => {
    await Tone.start();
    stop();

    Tone.getTransport().timeSignature = 4; // Keep internal transport stable
    setBeatsPerMeasure(settings.timeSigTop);
    setBpm(startBpm);

    clickSynth.current = new Tone.Synth({
      oscillator: { type: "square" },
      envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 }
    }).toDestination();

    const subdivision = `${settings.timeSigBottom}n`;
    const sigKey = `${settings.timeSigTop}/${settings.timeSigBottom}`;
    let beatCounter = 0;

    Tone.getTransport().scheduleRepeat((time) => {
      const displayBeat = (beatCounter % settings.timeSigTop) + 1; // 1-indexed

      // Determine if current beat should be accented based on the map
      const accents = ACCENT_MAP[sigKey] || [1];
      const isAccented = accents.includes(displayBeat);

      const freq = isAccented ? 1500 : 800;
      clickSynth.current.triggerAttackRelease(freq, "32n", time);

      Tone.Draw.schedule(() => {
        setCurrentBeat(displayBeat);
      }, time);

      beatCounter++;
    }, subdivision);

    setIsActive(true);

    const beatDuration = Tone.Time(subdivision).toSeconds();
    const now = Tone.now();
    const totalCountdownBeats = settings.timeSigTop * settings.countdownBars;

    // Countdown logic also uses manual top/bottom values
    for (let i = 0; i < totalCountdownBeats; i++) {
      const clickTime = now + (i * beatDuration);
      const isStartOfBar = i % settings.timeSigTop === 0;
      const freq = isStartOfBar ? 1800 : 1200;
      clickSynth.current.triggerAttackRelease(freq, "32n", clickTime);
    }

    const countdownDurationSeconds = totalCountdownBeats * beatDuration;
    Tone.getTransport().start(`+${countdownDurationSeconds}`);

    countdownTimeoutRef.current = setTimeout(() => {
      if (Tone.getTransport().state !== "started") return;
      startTimeRef.current = Date.now();

      if (settings.mode === 'trainer') {
        const stepMs = settings.stepSeconds * 1000;
        const totalMs = settings.totalSeconds * 1000;
        let stepStartTime = Date.now();

        progressIntervalRef.current = setInterval(() => {
          const nowMs = Date.now();
          const elapsedInStep = nowMs - stepStartTime;
          if (elapsedInStep >= stepMs) {
            stepStartTime = nowMs;
            setStepProgress(0);
            setBpm(prev => prev + settings.increment);
          } else {
            setStepProgress((elapsedInStep / stepMs) * 100);
          }
        }, 32);

        totalIntervalRef.current = setInterval(() => {
          const elapsedTotal = Date.now() - startTimeRef.current;
          const progressTotal = (elapsedTotal / totalMs) * 100;
          if (progressTotal >= 100) stop();
          else setTotalProgress(progressTotal);
        }, 100);
      }
    }, countdownDurationSeconds * 1000);
  };

  return { bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop, beatsPerMeasure, volume, setVolume };
};