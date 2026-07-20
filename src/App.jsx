import React, {useCallback, useState, useEffect} from 'react';
import {Menu} from 'lucide-react'; // Fixed: Correctly importing Menu icon
import packageJson from '../package.json';
import {useMetronome} from './hooks/useMetronome';
import {useKeyboardControls} from './hooks/useKeyboardControls';
import {useLocalStorage} from './hooks/useLocalStorage';
import {useWakeLock} from './hooks/useWakeLock';

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
import SoundConfig from './components/SoundConfig';


export default function App() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [mode, setMode] = useLocalStorage('metronome_app_mode', 'trainer');
    useEffect(() => {
        // Check if this is a new session (not a refresh)
        const hasSeenLanding = sessionStorage.getItem('metronome_session_active');

        if (!hasSeenLanding) {
            // 1. This is the first time accessing the page in this tab
            setMode('trainer');
            // 2. Set the flag so refreshes are recognized later
            sessionStorage.setItem('metronome_session_active', 'true');
        }
    }, []); // Empty dependency array so it only runs once on mount

    // Shared tempo across Trainer (its start BPM) and Constant (its tempo) — one
    // value, so the tempo carries over when switching between the two modes.
    const [startBpm, setStartBpm] = useLocalStorage('metronome_start_bpm', 120);
    const [increment, setIncrement] = useState(2);
    const [negativeIncrement, setNegativeIncrement] = useState(0);
    const [stepSeconds, setStepSeconds] = useState(10);
    const [totalSeconds, setTotalSeconds] = useState(120);
    const [intervalUnit, setIntervalUnit] = useLocalStorage('metronome_interval_unit', 'time');
    const [intervalBars, setIntervalBars] = useState(8);
    const [totalReps, setTotalReps] = useState(10);
    const [restSeconds, setRestSeconds] = useState(0);   // rest between intervals (time mode)
    const [restBars, setRestBars] = useState(0);         // rest between intervals (bars mode)
    const [timeSigTop, setTimeSigTop] = useLocalStorage('top_time_sign', 4);
    const [timeSigBottom, setTimeSigBottom] = useLocalStorage('bottom_time_sign', 4);
    const [countdownBars, setCountdownBars] = useLocalStorage('countdown_bars', 1);
    const [lockFinalBpm, setLockFinalBpm] = useLocalStorage('metronome_lock_final', false);

    // Save local settings
    const [activePack, setActivePack] = useLocalStorage('metronome_active_pack', 'synth');
    const [soundSettings, setSoundSettings] = useLocalStorage('metronome_sound_settings', {
        synth: {
            metronomeAccent: 987.77, // B5
            metronomeClick: 493.88,  // B4
            countInAccent: 1174.66,  // D6
            countInClick: 587.33     // D5
        },
        natural: {
            metronomeAccent: 'up',
            metronomeClick: 'down',
            countInAccent: 'hi_hat',
            countInClick: 'hi_hat'
        }
    });

    // FIX: Provide the full default object instead of the non-existent initialSettings
    useEffect(() => {
        if (soundSettings && !soundSettings.synth) {
            setSoundSettings({
                synth: {
                    metronomeAccent: 987.77,
                    metronomeClick: 493.88,
                    countInAccent: 1174.66,
                    countInClick: 587.33
                },
                natural: {
                    metronomeAccent: 'up',
                    metronomeClick: 'down',
                    countInAccent: 'hi_hat',
                    countInClick: 'hi_hat'
                }
            });
        }
    }, [soundSettings, setSoundSettings]);

    const {
        bpm,
        setBpm,
        isActive,
        currentBeat,
        stepProgress,
        totalProgress,
        isResting,
        start,
        stop,
        beatsPerMeasure,
        volume,
        setVolume,
        isAccentEnabled,
        setIsAccentEnabled
    } = useMetronome(startBpm, soundSettings[activePack]);


    const handleStart = useCallback(() => {

        const startTempo = startBpm;
        start({
            mode,
            increment,
            negativeIncrement,
            intervalUnit,
            stepSeconds,
            totalSeconds,
            intervalBars,
            totalReps,
            restSeconds,
            restBars,
            timeSigTop,
            timeSigBottom,
            countdownBars,
            lockFinalBpm
        }, startTempo, soundSettings[activePack]); // FIX: Pass only the active pack
    }, [mode, startBpm, increment, negativeIncrement, intervalUnit, stepSeconds, totalSeconds, intervalBars, totalReps, restSeconds, restBars, timeSigTop, timeSigBottom, countdownBars, start, soundSettings, activePack, lockFinalBpm]);

    const handleStop = useCallback(() => {
        if (mode === 'constant') setStartBpm(bpm);
        stop();
    }, [mode, bpm, stop]);

    const toggleMetronome = useCallback(() => {
        isActive ? handleStop() : handleStart();
    }, [isActive, handleStart, handleStop]);

    // Changing screens from the menu always stops a running session first.
    const handleMenuSelect = useCallback((newMode) => {
        if (isActive) handleStop();
        setMode(newMode);
    }, [isActive, handleStop, setMode]);

    useKeyboardControls(toggleMetronome);

    // Keep the screen awake while the metronome is playing.
    useWakeLock(isActive);

    const displayBpm = isActive ? bpm : startBpm;

    const displaySetter = (val) => {
        setStartBpm(val);
        // Reflect on the live click only when it should: always in Constant, and
        // in Trainer only before a session starts (a running ramp owns the tempo).
        if (mode === 'constant' || !isActive) setBpm(val);
    };

    // Keep the negative increment from ever exceeding the positive one,
    // so the see-saw ramp can never lower the net tempo.
    const handleIncrementChange = (val) => {
        setIncrement(val);
        if (negativeIncrement > val) setNegativeIncrement(val);
    };

    const formatDuration = (sec) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return m === 0 ? `${s}s` : s === 0 ? `${m}m` : `${m}m ${s}s`;
    };

    const isSettingsMode = mode === 'info' || mode === 'sound';

    // In Trainer mode a running session is locked — no parameter changes mid-drill.
    // (Constant mode stays live-editable so the tempo can be adjusted while playing.)
    const trainerLock = isActive && mode === 'trainer';

    // Number of BPM changes the ramp will make. In both units the final step
    // coincides with the session stop, so we subtract one (mirrors the engine).
    const totalIncrements = intervalUnit === 'bars'
        ? Math.max(0, totalReps - 1)
        : Math.max(0, Math.floor(totalSeconds / stepSeconds) - 1);

    // Estimated wall-clock length of a bar-mode session. Because the tempo ramps,
    // each rep's duration depends on its BPM, so we walk the see-saw trajectory
    // (mirroring the engine) and sum each interval's real time.
    const barModeSeconds = (() => {
        if (intervalUnit !== 'bars') return 0;
        const beatScale = 4 / timeSigBottom;
        const beatsPerInterval = intervalBars * timeSigTop;
        let bpmVal = startBpm;
        let seconds = 0;
        for (let i = 0; i < totalReps; i++) {
            seconds += beatsPerInterval * (60 / bpmVal) * beatScale;
            const goingUp = negativeIncrement === 0 || i % 2 === 0;
            bpmVal += goingUp ? increment : -negativeIncrement;
            // Rest after each interval except the last, timed at the upcoming tempo.
            if (restBars > 0 && i < totalReps - 1) {
                seconds += restBars * timeSigTop * (60 / bpmVal) * beatScale;
            }
        }
        return seconds;
    })();

    return (<div
        className="fixed inset-0 w-full h-[100svh] bg-black text-white flex items-center justify-center overflow-hidden touch-none p-2 sm:p-4">
        <SideMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            mode={mode}
            setMode={handleMenuSelect}
        />

        <div
            className="bg-[#1E1E1E] w-full max-w-md h-full max-h-full sm:h-auto rounded-2xl border border-white/5 flex flex-col shadow-2xl overflow-hidden">

            {/* Header */}
            <div className="p-4 sm:p-6 pb-1 flex-none flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setIsMenuOpen(true)}
                        className="group p-2 -ml-2 text-white/40 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Menu size={24}/>
                        <span
                            className="text-[10px] font-black tracking-[0.2em] uppercase mt-0.5 group-hover:text-white transition-colors">
                Menu
            </span>
                    </button>
                    {!isSettingsMode ? (
                        <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                            {['trainer', 'constant'].map((m) => (
                                <button
                                    key={m}
                                    onClick={() => { if (m !== mode) handleMenuSelect(m); }}
                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                        mode === m ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:text-white'
                                    }`}
                                >
                                    {m}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <span className="text-[10px] font-black tracking-[0.3em] uppercase text-[#FF820C]">
                            {mode === 'sound' ? 'Sound Config' : mode} Mode
                        </span>
                    )}
                </div>

                {!isSettingsMode && (<div className="flex items-center justify-between mt-2 px-1">
                    <div className="flex-1 max-w-[80%]">
                        <VolumeSlider volume={volume} setVolume={setVolume}/>
                    </div>
                    <AccentSwitch
                        isOn={isAccentEnabled}
                        onToggle={() => setIsAccentEnabled(!isAccentEnabled)}
                    />
                </div>)}
            </div>

            {/* Main Content */}
            <div className="px-4 sm:px-6 flex-1 overflow-y-auto no-scrollbar flex flex-col touch-pan-y">
                {!isSettingsMode ? (<div className="flex-1 flex flex-col justify-center pt-2 pb-4 space-y-3">
                    <div className="flex items-center justify-between mb-0">
                        <CountdownSelector value={countdownBars} setter={setCountdownBars} isActive={isActive}/>
                        <div className="flex-1">
                            <BPMDisplay bpm={displayBpm} setBpm={displaySetter} isActive={isActive}
                                        locked={trainerLock}/>
                        </div>
                        <TimeSignatureSelector top={timeSigTop} bottom={timeSigBottom} setTop={setTimeSigTop}
                                               setBottom={setTimeSigBottom} isActive={isActive}/>
                    </div>

                    <BeatIndicators isActive={isActive} currentBeat={currentBeat}
                                    beatsPerMeasure={isActive ? beatsPerMeasure : timeSigTop}/>

                    <TrainerProgress isActive={isActive} progress={stepProgress} totalProgress={totalProgress}
                                     isResting={isResting} mode={mode}/>

                    <div className="flex flex-col gap-1">
                        <StartBPMSlider
                            label={mode === 'trainer' ? "Start BPM" : "Tempo"}
                            value={isActive && mode === 'constant' ? bpm : startBpm}
                            setter={displaySetter}
                            min={40} max={300} unit="bpm" defaultValue={120}
                            disabled={trainerLock}
                        />


                        {mode === 'trainer' && (
                            <div className={`mt-2 pt-4 border-t border-white/5 flex flex-col gap-1 ${isActive ? 'opacity-50 pointer-events-none' : ''}`}>
                                {/* Interval unit toggle: ramp by wall-clock time or by bars played */}
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[14px] font-bold text-white/40 tracking-wider"
                                          style={{fontFamily: "'K2D', sans-serif"}}>Interval Type</span>
                                    <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                                        {['time', 'bars'].map((u) => (
                                            <button key={u} onClick={() => setIntervalUnit(u)}
                                                    className={`px-3 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${intervalUnit === u ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:text-white'}`}
                                                    style={{fontFamily: "'K2D', sans-serif"}}>
                                                {u === 'time' ? 'Time' : 'Bars'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <MarkedSlider label="Pos. Increment" value={increment} setter={handleIncrementChange}
                                              min={0}
                                              max={10} unit="bpm" defaultValue={2}/>
                                {intervalUnit === 'time' ? (<>
                                    <MarkedSlider label="Interval" value={stepSeconds} setter={setStepSeconds}
                                                  min={5} max={90} step={5}
                                                  displayValue={formatDuration(stepSeconds)} defaultValue={10}/>
                                    <MarkedSlider label="Duration" value={totalSeconds} setter={setTotalSeconds}
                                                  min={30} max={600} step={30}
                                                  displayValue={formatDuration(totalSeconds)} defaultValue={120}/>
                                    <MarkedSlider label="Rest" value={restSeconds} setter={setRestSeconds}
                                                  min={0} max={60} step={5}
                                                  displayValue={formatDuration(restSeconds)} defaultValue={0}/>
                                </>) : (<>
                                    <MarkedSlider label="Interval" value={intervalBars} setter={setIntervalBars}
                                                  min={1} max={32} step={1}
                                                  displayValue={`${intervalBars} ${intervalBars === 1 ? 'bar' : 'bars'}`}
                                                  defaultValue={8}/>
                                    <MarkedSlider label="Reps" value={totalReps} setter={setTotalReps}
                                                  min={2} max={30} step={1}
                                                  displayValue={`${totalReps} reps`} defaultValue={10}/>
                                    <MarkedSlider label="Rest" value={restBars} setter={setRestBars}
                                                  min={0} max={8} step={1}
                                                  displayValue={`${restBars} ${restBars === 1 ? 'bar' : 'bars'}`}
                                                  defaultValue={0}/>
                                </>)}
                                <MarkedSlider label="Neg. Increment" value={negativeIncrement}
                                              setter={setNegativeIncrement} min={0}
                                              max={increment} unit="bpm" defaultValue={0}/>

                                {/* Row Container: Component on Left, Button on Right */}
                                <div
                                    className="mt-6 pt-3 border-t border-white/5 flex items-center justify-between gap-3">

                                    <BpmRangeDisplay
                                        startBpm={startBpm}
                                        increment={increment}
                                        negativeIncrement={negativeIncrement}
                                        totalIncrements={totalIncrements}
                                        duration={intervalUnit === 'bars' ? formatDuration(Math.round(barModeSeconds)) : null}
                                        mode={mode}
                                    />

                                    <button
                                        onClick={() => setLockFinalBpm(!lockFinalBpm)}
                                        disabled={isActive}
                                        className={`
            group relative flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-300 whitespace-nowrap
            ${lockFinalBpm
                                            ? "bg-[#FF820C]/10 border-[#FF820C] text-[#FF820C] shadow-[0_0_15px_rgba(255,130,12,0.1)]"
                                            : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/[0.07]"
                                        }
            ${isActive ? "opacity-30 cursor-not-allowed" : "active:scale-95"}
        `}
                                    >
                                        {/* Dynamic Icon with slight bounce animation */}
                                        <div
                                            className={`transition-transform duration-300 ${lockFinalBpm ? "scale-110" : "scale-100"}`}>
                                            {lockFinalBpm ? (
                                                <div className="relative">
                                                    <div
                                                        className="absolute inset-0 blur-sm bg-[#FF820C]/30 rounded-full"/>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                                    </svg>
                                                </div>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                                                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                                                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                                                </svg>
                                            )}
                                        </div>

                                        <span
                                            className="text-[10px] font-black uppercase tracking-[0.08em] leading-none mt-0.5"
                                            style={{fontFamily: "'K2D', sans-serif"}}>
            {lockFinalBpm ? "Locked" : "Lock Final BPM"}
        </span>

                                        {/* Subtle inner glow for active state */}
                                        {lockFinalBpm && (
                                            <div
                                                className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none"/>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                    </div>
                </div>) : mode === 'info' ? (<div className="flex-1">
                    <Info/>
                </div>) : (<div className="flex-1">
                    <SoundConfig
                        activePack={activePack}
                        setActivePack={setActivePack}
                        settings={soundSettings[activePack]}
                        setAllSettings={setSoundSettings}
                        volume={volume}
                        setVolume={setVolume}
                        isAccentEnabled={isAccentEnabled}
                        setIsAccentEnabled={setIsAccentEnabled}
                    />
                </div>)}
            </div>

            {/* Footer */}
            <div
                className="p-4 sm:p-6 pt-2 flex-none flex flex-col items-center gap-2 border-t border-white/5 bg-[#1E1E1E]">
                {!isSettingsMode && <PlayButton isActive={isActive} onClick={toggleMetronome}/>}
                <span className="text-[9px] text-white/20 font-mono tracking-widest uppercase">
                        v{packageJson.version}
                    </span>
            </div>
        </div>
    </div>);
}