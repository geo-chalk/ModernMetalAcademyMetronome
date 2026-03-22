import React, {useState, useEffect, useRef} from 'react';
import * as Tone from 'tone';
import {Play, Square} from 'lucide-react';
import MarkedSlider from './MarkedSlider';
import VolumeSlider from './VolumeSlider';
import AccentSwitch from './AccentSwitch';

const SoundConfig = ({
                         settings,
                         setSettings,
                         volume,
                         setVolume,
                         isAccentEnabled,
                         setIsAccentEnabled
                     }) => {
    const k2dStack = {fontFamily: "'K2D', sans-serif"};
    const [playingType, setPlayingType] = useState(null);

    const synthRef = useRef(null);
    const intervalRef = useRef(null);
    const stepRef = useRef(0);
    const settingsRef = useRef(settings);
    const isAccentEnabledRef = useRef(isAccentEnabled);

    // Keep Refs in sync so the audio interval always has the latest values
    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    useEffect(() => {
        isAccentEnabledRef.current = isAccentEnabled;
    }, [isAccentEnabled]);

    useEffect(() => {
        synthRef.current = new Tone.Synth({
            oscillator: {type: "triangle"},
            envelope: {attack: 0.002, decay: 0.08, sustain: 0, release: 0.08}
        }).toDestination();

        return () => {
            stopTest();
            if (synthRef.current) synthRef.current.dispose();
        };
    }, []);

    const stopTest = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        setPlayingType(null);
        stepRef.current = 0;
    };

    const toggleTest = async (type) => {
        await Tone.start();
        if (playingType === type) {
            stopTest();
        } else {
            stopTest();
            setPlayingType(type);
            intervalRef.current = setInterval(() => {
                if (!synthRef.current) return;

                const isBeatOne = stepRef.current % 4 === 0;
                // Use the global accent toggle to decide frequency
                const useAccentFreq = isAccentEnabledRef.current && isBeatOne;

                const current = settingsRef.current;
                const freq = type === 'metronome'
                    ? (useAccentFreq ? current.metronomeAccent : current.metronomeClick)
                    : (useAccentFreq ? current.countInAccent : current.countInClick);

                synthRef.current.triggerAttackRelease(freq, "32n", Tone.now());
                stepRef.current++;
            }, 500);
        }
    };

    const updateFrequency = (key, value) => {
        setSettings(prev => ({...prev, [key]: value}));
    };

    return (
        <div className="space-y-6 pt-0 pb-8 overflow-y-auto no-scrollbar">
            <h1 className="text-[#FF820C] text-sm font-black tracking-[0.2em] uppercase border-b border-white/5 pb-4"
                style={k2dStack}>
                Sound Configuration
            </h1>

            {/* Shared Global Controls */}
            <section className="bg-white/[0.03] p-4 rounded-lg border border-white/5">
                <div className="flex items-center justify-between gap-6">
                    <div className="flex-1">
                        <span className="text-[10px] font-black tracking-widest text-white/40 uppercase mb-2 block"
                              style={k2dStack}>
                            Master Volume
                        </span>
                        <VolumeSlider volume={volume} setVolume={setVolume}/>
                    </div>
                    <div className="pt-1">
                        <AccentSwitch
                            isOn={isAccentEnabled}
                            onToggle={() => setIsAccentEnabled(!isAccentEnabled)}
                        />
                    </div>
                </div>
            </section>

            {/* Metronome Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-white/30 text-[10px] font-black tracking-widest uppercase"
                        style={k2dStack}>Metronome</h2>
                    <button
                        onClick={() => toggleTest('metronome')}
                        className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${playingType === 'metronome' ? 'text-red-500' : 'text-[#FF820C] hover:text-white'}`}
                        style={k2dStack}
                    >
                        {playingType === 'metronome' ? <><Square size={12} fill="currentColor"/> Stop</> : <><Play
                            size={12} fill="currentColor"/> Test Loop</>}
                    </button>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 space-y-2">
                    <MarkedSlider label="Accents" value={settings.metronomeAccent}
                                  setter={(val) => updateFrequency('metronomeAccent', val)} min={200} max={2000}
                                  step={10} unit="Hz" defaultValue={1000}/>
                    <MarkedSlider label="Clicks" value={settings.metronomeClick}
                                  setter={(val) => updateFrequency('metronomeClick', val)} min={200} max={2000}
                                  step={10} unit="Hz" defaultValue={500}/>
                </div>
            </section>

            {/* Count-in Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-white/30 text-[10px] font-black tracking-widest uppercase"
                        style={k2dStack}>Count-in</h2>
                    <button
                        onClick={() => toggleTest('countIn')}
                        className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${playingType === 'countIn' ? 'text-red-500' : 'text-[#FF820C] hover:text-white'}`}
                        style={k2dStack}
                    >
                        {playingType === 'countIn' ? <><Square size={12} fill="currentColor"/> Stop</> : <><Play
                            size={12} fill="currentColor"/> Test Loop</>}
                    </button>
                </div>
                <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 space-y-2">
                    <MarkedSlider label="Accents" value={settings.countInAccent}
                                  setter={(val) => updateFrequency('countInAccent', val)} min={200} max={2000} step={10}
                                  unit="Hz" defaultValue={1200}/>
                    <MarkedSlider label="Clicks" value={settings.countInClick}
                                  setter={(val) => updateFrequency('countInClick', val)} min={200} max={2000} step={10}
                                  unit="Hz" defaultValue={800}/>
                </div>
            </section>
        </div>
    );
};

export default SoundConfig;