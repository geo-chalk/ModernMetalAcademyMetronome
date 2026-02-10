import React, { useState, useCallback } from 'react';
import { Square, Play } from 'lucide-react';
import packageJson from '../package.json';
import { useMetronome } from './hooks/useMetronome';
import { useKeyboardControls } from './hooks/useKeyboardControls';
import MarkedSlider from './components/MarkedSlider';
import BeatIndicators from './components/BeatIndicators';
import ModeSelector from './components/ModeSelector';
import BPMDisplay from './components/BPMDisplay';
import TrainerProgress from './components/TrainerProgress';

export default function App() {
  const [mode, setMode] = useState('trainer');
  const [trainerStartBpm, setTrainerStartBpm] = useState(120);
  const [constantBpm, setConstantBpm] = useState(120);
  const [increment, setIncrement] = useState(2);
  const [stepSeconds, setStepSeconds] = useState(10);
  const [totalSeconds, setTotalSeconds] = useState(120);

  const {
    bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress, start, stop
  } = useMetronome(mode === 'trainer' ? trainerStartBpm : constantBpm);

  const handleStart = useCallback(() => {
    const startTempo = mode === 'trainer' ? trainerStartBpm : constantBpm;
    start({ mode, increment, stepSeconds, totalSeconds }, startTempo);
  }, [mode, trainerStartBpm, constantBpm, increment, stepSeconds, totalSeconds, start]);

  const handleStop = useCallback(() => {
    if (mode === 'constant') setConstantBpm(bpm);
    stop();
  }, [mode, bpm, stop]);

  const toggleMetronome = useCallback(() => {
    isActive ? handleStop() : handleStart();
  }, [isActive, handleStart, handleStop]);

  useKeyboardControls(toggleMetronome);

  const displayBpm = isActive ? bpm : (mode === 'trainer' ? trainerStartBpm : constantBpm);

  const displaySetter = (val) => {
    if (mode === 'trainer') {
      setTrainerStartBpm(val);
      if (!isActive) setBpm(val);
    } else {
      setConstantBpm(val);
      setBpm(val);
    }
  };

  const formatDuration = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    if (s === 0) return `${m}m`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="fixed inset-0 w-full h-[100svh] bg-black text-white flex items-center justify-center overflow-hidden touch-none p-2 sm:p-4">
      <div className="bg-[#1E1E1E] w-full max-w-md h-full max-h-full sm:h-auto rounded-2xl border border-white/5 flex flex-col shadow-2xl overflow-hidden">

        {/* Header - Fixed */}
        <div className="p-4 sm:p-6 pb-0 flex-none">
          <ModeSelector mode={mode} setMode={setMode} onStop={handleStop} />
        </div>

        {/* Scrollable Middle Area - FIX: Removed justify-center */}
        <div className="px-4 sm:px-6 flex-1 overflow-y-auto no-scrollbar flex flex-col touch-pan-y">
          {/* Content Wrapper with auto-margin to center when there is space */}
          <div className="my-auto py-4 space-y-4">
            <div className="flex-none">
              <BPMDisplay bpm={displayBpm} setBpm={displaySetter} isActive={isActive} />
              <BeatIndicators isActive={isActive} currentBeat={currentBeat} />
            </div>

            <TrainerProgress isActive={isActive} progress={stepProgress} totalProgress={totalProgress} mode={mode} />

            <div className="flex flex-col gap-1">
              <MarkedSlider
                label={mode === 'trainer' ? "Start BPM" : "Tempo"}
                value={mode === 'trainer' ? trainerStartBpm : (isActive ? bpm : constantBpm)}
                setter={displaySetter}
                min={40} max={280} unit="bpm" defaultValue={120}
              />

              {mode === 'trainer' && (
                <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-1">
                  <MarkedSlider label="Increment" value={increment} setter={setIncrement} min={1} max={10} unit="bpm" defaultValue={2} />
                  <MarkedSlider label="Interval" value={stepSeconds} setter={setStepSeconds} min={5} max={50} unit="s" defaultValue={10} />
                  <MarkedSlider
                    label="Duration" value={totalSeconds} setter={setTotalSeconds}
                    min={30} max={600} step={30} displayValue={formatDuration(totalSeconds)} defaultValue={120}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 sm:p-6 pt-2 flex-none flex flex-col items-center gap-2 border-t border-white/5 bg-[#1E1E1E]">
          <button
            onClick={toggleMetronome}
            className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-[0.2em] transition-all duration-200
              ${isActive ? 'bg-[#CC0000]' : 'bg-[#FF5500]'}
              text-white active:scale-[0.97]`}
          >
            {isActive ? <Square size={16} fill="currentColor"/> : <Play size={16} fill="currentColor"/>}
            {isActive ? 'Stop' : 'Start'}
          </button>

          <span className="text-[9px] text-white/20 font-mono tracking-widest uppercase">
            v{packageJson.version}
          </span>
        </div>
      </div>
    </div>
  );
}