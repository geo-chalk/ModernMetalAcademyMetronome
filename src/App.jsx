import React, {useCallback, useState} from 'react';
import { Menu } from 'lucide-react'; // Fixed: Correctly importing Menu icon
import packageJson from '../package.json';
import {useMetronome} from './hooks/useMetronome';
import {useKeyboardControls} from './hooks/useKeyboardControls';

// Components
import MarkedSlider from './components/MarkedSlider';
import BeatIndicators from './components/BeatIndicators';
import BPMDisplay from './components/BPMDisplay';
import TrainerProgress from './components/TrainerProgress';
import TimeSignatureSelector from './components/TimeSignatureSelector';
import VolumeSlider from './components/VolumeSlider';
import PlayButton from './components/PlayButton';
import CountdownSelector from './components/CountdownSelector';
import BpmRangeDisplay from './components/BpmRangeDisplay';
import Info from './components/Info';
import StartBPMSlider from './components/StartBPMSlider';
import AccentSwitch from './components/AccentSwitch.jsx';
import SideMenu from './components/SideMenu';

export default function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mode, setMode] = useState('trainer');
    const [trainerStartBpm, setTrainerStartBpm] = useState(120);
    const [constantBpm, setConstantBpm] = useState(120);
    const [increment, setIncrement] = useState(2);
    const [stepSeconds, setStepSeconds] = useState(10);
    const [totalSeconds, setTotalSeconds] = useState(120);
    const [timeSigTop, setTimeSigTop] = useState(4);
    const [timeSigBottom, setTimeSigBottom] = useState(4);
    const [countdownBars, setCountdownBars] = useState(1);

    const {
        bpm, setBpm, isActive, currentBeat, stepProgress, totalProgress,
        start, stop, beatsPerMeasure, volume, setVolume,
        isAccentEnabled, setIsAccentEnabled
    } = useMetronome(mode === 'trainer' ? trainerStartBpm : constantBpm);

    const handleStart = useCallback(() => {
        const startTempo = mode === 'trainer' ? trainerStartBpm : constantBpm;
        start({
            mode,
            increment,
            stepSeconds,
            totalSeconds,
            timeSigTop,
            timeSigBottom,
            countdownBars
        }, startTempo);
    }, [mode, trainerStartBpm, constantBpm, increment, stepSeconds, totalSeconds, timeSigTop, timeSigBottom, countdownBars, start]);

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
        return m === 0 ? `${s}s` : s === 0 ? `${m}m` : `${m}m ${s}s`;
    };

    const isInfoMode = mode === 'info';

    return (
        <div className="fixed inset-0 w-full h-[100svh] bg-black text-white flex items-center justify-center overflow-hidden touch-none p-2 sm:p-4">
            <SideMenu
                isOpen={isMenuOpen}
                onClose={() => setIsMenuOpen(false)}
                mode={mode}
                setMode={setMode}
            />

            <div className="bg-[#1E1E1E] w-full max-w-md h-full max-h-full sm:h-auto rounded-2xl border border-white/5 flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="p-4 sm:p-6 pb-1 flex-none flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setIsMenuOpen(true)}
                            className="p-2 -ml-2 text-white/40 hover:text-white transition-colors"
                        >
                            <Menu size={24} />
                        </button>
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#FF820C]">
                            {mode} Mode
                        </span>
                    </div>

                    {!isInfoMode && (
                        <div className="flex items-center justify-between mt-2 px-1">
                            <div className="flex-1 max-w-[80%]">
                                <VolumeSlider volume={volume} setVolume={setVolume}/>
                            </div>
                            <AccentSwitch
                                isOn={isAccentEnabled}
                                onToggle={() => setIsAccentEnabled(!isAccentEnabled)}
                            />
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="px-4 sm:px-6 flex-1 overflow-y-auto no-scrollbar flex flex-col touch-pan-y">
                    {!isInfoMode ? (
                        <div className="my-auto pt-0 pb-4 space-y-4">
                            <div className="flex items-center justify-between mb-0">
                                <CountdownSelector value={countdownBars} setter={setCountdownBars} isActive={isActive}/>
                                <div className="flex-1">
                                    <BPMDisplay bpm={displayBpm} setBpm={displaySetter} isActive={isActive}/>
                                </div>
                                <TimeSignatureSelector top={timeSigTop} bottom={timeSigBottom} setTop={setTimeSigTop}
                                                       setBottom={setTimeSigBottom} isActive={isActive}/>
                            </div>

                            <BeatIndicators isActive={isActive} currentBeat={currentBeat}
                                            beatsPerMeasure={isActive ? beatsPerMeasure : timeSigTop}/>

                            <TrainerProgress isActive={isActive} progress={stepProgress} totalProgress={totalProgress}
                                             mode={mode}/>

                            <div className="flex flex-col gap-1">
                                <StartBPMSlider
                                    label={mode === 'trainer' ? "Start BPM" : "Tempo"}
                                    value={mode === 'trainer' ? trainerStartBpm : (isActive ? bpm : constantBpm)}
                                    setter={displaySetter}
                                    min={40} max={300} unit="bpm" defaultValue={120}
                                />

                                {mode === 'trainer' && (
                                    <div className="mt-2 pt-4 border-t border-white/5 flex flex-col gap-1">
                                        <MarkedSlider label="Increment" value={increment} setter={setIncrement} min={0}
                                                      max={10} unit="bpm" defaultValue={2}/>
                                        <MarkedSlider label="Interval" value={stepSeconds} setter={setStepSeconds}
                                                      min={5} max={90} step={5}
                                                      displayValue={formatDuration(stepSeconds)} defaultValue={10}/>
                                        <MarkedSlider label="Duration" value={totalSeconds} setter={setTotalSeconds}
                                                      min={30} max={600} step={30}
                                                      displayValue={formatDuration(totalSeconds)} defaultValue={120}/>
                                        <BpmRangeDisplay startBpm={trainerStartBpm} increment={increment}
                                                         stepSeconds={stepSeconds} totalSeconds={totalSeconds}
                                                         mode={mode}/>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1">
                            <Info/>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 pt-2 flex-none flex flex-col items-center gap-2 border-t border-white/5 bg-[#1E1E1E]">
                    {!isInfoMode && <PlayButton isActive={isActive} onClick={toggleMetronome}/>}
                    <span className="text-[9px] text-white/20 font-mono tracking-widest uppercase">
                        v{packageJson.version}
                    </span>
                </div>
            </div>
        </div>
    );
}