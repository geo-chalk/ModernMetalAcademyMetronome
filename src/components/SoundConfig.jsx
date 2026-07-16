import React, {useState, useEffect, useRef} from 'react';
import * as Tone from 'tone';
import {Play, Square, ChevronDown} from 'lucide-react';
import MarkedSlider from './MarkedSlider';
import VolumeSlider from './VolumeSlider';
import AccentSwitch from './AccentSwitch';
import { SOUND_ASSETS, AVAILABLE_SAMPLES } from '../constants/sounds';

const NOTE_FREQUENCIES = [
    {note: "C3", freq: 130.81}, {note: "C#/Db3", freq: 138.59}, {note: "D3", freq: 146.83}, {
        note: "D#/Eb3",
        freq: 155.56
    }, {note: "E3", freq: 164.81}, {note: "F3", freq: 174.61}, {note: "F#/Gb3", freq: 185.00}, {
        note: "G3",
        freq: 196.00
    }, {note: "G#/Ab3", freq: 207.65}, {note: "A3", freq: 220.00}, {note: "A#/Bb3", freq: 233.08}, {
        note: "B3",
        freq: 246.94
    },
    {note: "C4", freq: 261.63}, {note: "C#/Db4", freq: 277.18}, {note: "D4", freq: 293.66}, {
        note: "D#/Eb4",
        freq: 311.13
    }, {note: "E4", freq: 329.63}, {note: "F4", freq: 349.23}, {note: "F#/Gb4", freq: 369.99}, {
        note: "G4",
        freq: 392.00
    }, {note: "G#/Ab4", freq: 415.30}, {note: "A4", freq: 440.00}, {note: "A#/Bb4", freq: 466.16}, {
        note: "B4",
        freq: 493.88
    },
    {note: "C5", freq: 523.25}, {note: "C#/Db5", freq: 554.37}, {note: "D5", freq: 587.33}, {
        note: "D#/Eb5",
        freq: 622.25
    }, {note: "E5", freq: 659.25}, {note: "F5", freq: 698.46}, {note: "F#/Gb5", freq: 739.99}, {
        note: "G5",
        freq: 783.99
    }, {note: "G#/Ab5", freq: 830.61}, {note: "A5", freq: 880.00}, {note: "A#/Bb5", freq: 932.33}, {
        note: "B5",
        freq: 987.77
    },
    {note: "C6", freq: 1046.50}, {note: "C#/Db6", freq: 1108.73}, {note: "D6", freq: 1174.66}, {
        note: "D#/Eb6",
        freq: 1244.51
    }, {note: "E6", freq: 1318.51}, {note: "F6", freq: 1396.91}, {note: "F#/Gb6", freq: 1479.98}, {
        note: "G6",
        freq: 1567.98
    }, {note: "G#/Ab6", freq: 1661.22}, {note: "A6", freq: 1760.00}, {note: "A#/Bb6", freq: 1864.66}, {
        note: "B6",
        freq: 1975.53
    },
    {note: "C7", freq: 2093.00}, {note: "C#/Db7", freq: 2217.46}, {note: "D7", freq: 2349.32}, {
        note: "D#/Eb7",
        freq: 2489.02
    }, {note: "E7", freq: 2637.02}, {note: "F7", freq: 2793.83}, {note: "F#/Gb7", freq: 2959.96}, {
        note: "G7",
        freq: 3135.96
    }, {note: "G#/Ab7", freq: 3322.44}, {note: "A7", freq: 3520.00}, {note: "A#/Bb7", freq: 3729.31}, {
        note: "B7",
        freq: 3951.07
    },

];

const SoundConfig = ({
                         activePack,
                         setActivePack,
                         settings,
                         setAllSettings,
                         volume,
                         setVolume,
                         isAccentEnabled,
                         setIsAccentEnabled
                     }) => {
    const k2dStack = {fontFamily: "'K2D', sans-serif"};
    const [playingType, setPlayingType] = useState(null);

    const synthRef = useRef(null);
    const playersRef = useRef(null);
    const intervalRef = useRef(null);
    const stepRef = useRef(0);
    const settingsRef = useRef(settings);
    const isAccentEnabledRef = useRef(isAccentEnabled);

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

        playersRef.current = new Tone.Players(SOUND_ASSETS).toDestination();

        return () => {
            stopTest();
            if (synthRef.current) synthRef.current.dispose();
            if (playersRef.current) playersRef.current.dispose();
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
                const isBeatOne = stepRef.current % 4 === 0;
                const useAccent = isAccentEnabledRef.current && isBeatOne;
                const current = settingsRef.current;

                const source = type === 'metronome'
                    ? (useAccent ? current.metronomeAccent : current.metronomeClick)
                    : (useAccent ? current.countInAccent : current.countInClick);

                if (typeof source === 'number') {
                    synthRef.current.triggerAttackRelease(source, "32n", Tone.now());
                } else {
                    const player = playersRef.current.player(source);
                    if (player && player.loaded) player.start(Tone.now());
                }

                stepRef.current++;
            }, 500);
        }
    };

    const updateValue = (key, value) => {
        setAllSettings(prev => ({
            ...prev,
            [activePack]: {...prev[activePack], [key]: value}
        }));
    };

    const getNoteInfo = (freq) => {
        const index = NOTE_FREQUENCIES.findIndex(n => n.freq === freq);
        const info = index !== -1 ? NOTE_FREQUENCIES[index] : NOTE_FREQUENCIES[48];
        return {...info, index: index !== -1 ? index : 48};
    };

    const getIndexByFreq = (targetFreq) => {
        const index = NOTE_FREQUENCIES.findIndex(n => Math.abs(n.freq - targetFreq) < 0.01);
        return index !== -1 ? index : 48;
    };

    const DEFAULTS = {
        metronomeAccent: getIndexByFreq(987.77),
        metronomeClick: getIndexByFreq(493.88),
        countInAccent: getIndexByFreq(1174.66),
        countInClick: getIndexByFreq(587.33)
    };

    return (
        <div className="space-y-6 pt-0 pb-8 overflow-y-auto no-scrollbar">
            <h1 className="text-[#FF820C] text-sm font-black tracking-[0.2em] uppercase border-b border-white/5 pb-4"
                style={k2dStack}>
                Sound Configuration
            </h1>

            {/* Volume and Accents */}
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

            {/* Pack Selector */}
            <section className="bg-white/[0.03] p-4 rounded-lg border border-white/5">
                <div className="flex items-center justify-between px-1">
                    <span className="text-white text-[16px] font-black tracking-widest uppercase opacity-100"
                          style={k2dStack}>
                        Sound Pack
                    </span>
                    <div className="relative flex items-center bg-white/5 rounded px-2 py-1">
                        <select
                            value={activePack}
                            onChange={(e) => {
                                stopTest();
                                setActivePack(e.target.value);
                            }}
                            className="bg-transparent text-white text-sm font-bold focus:outline-none appearance-none pr-6 cursor-pointer uppercase tracking-wider"
                            style={k2dStack}
                        >
                            {['synth', 'natural'].map(pack => (
                                <option key={pack} value={pack} className="bg-[#1E1E1E]">{pack}</option>
                            ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2 text-white/20 pointer-events-none"/>
                    </div>
                </div>
            </section>


            {/* Config Sections */}
            {['metronome', 'countIn'].map((sectionKey) => (
                <section key={sectionKey} className="space-y-4">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-white text-[16px] font-black tracking-widest uppercase opacity-100"
                            style={k2dStack}>{sectionKey === 'metronome' ? 'Metronome' : 'Count-in'}</h2>
                        <button
                            onClick={() => toggleTest(sectionKey)}
                            className={`flex items-center gap-2 text-[10px] font-bold uppercase transition-all ${playingType === sectionKey ? 'text-red-500' : 'text-[#FF820C] hover:text-white'}`}
                            style={k2dStack}
                        >
                            {playingType === sectionKey ? <><Square size={12} fill="currentColor"/> Stop</> : <><Play
                                size={12} fill="currentColor"/> Test Loop</>}
                        </button>
                    </div>

                    <div className="bg-white/[0.02] p-4 rounded-lg border border-white/5 space-y-2">
                        {[
                            {key: `${sectionKey}Accent`, label: "Accents"},
                            {key: `${sectionKey}Click`, label: "Clicks"}
                        ].map(({key, label}) => (
                            <div key={key}>
                                {activePack === 'synth' ? (
                                    <MarkedSlider
                                        label={label}
                                        value={getNoteInfo(settings[key]).index}
                                        setter={(val) => updateValue(key, NOTE_FREQUENCIES[val].freq)}
                                        min={0}
                                        max={NOTE_FREQUENCIES.length - 1}
                                        step={1}
                                        defaultValue={DEFAULTS[key]}
                                        displayValue={`${getNoteInfo(settings[key]).note} (${getNoteInfo(settings[key]).freq} Hz)`}
                                    />
                                ) : (
                                    <div
                                        className="flex justify-between items-center py-3 border-b border-white/5 last:border-0">
                                        <span className="text-[14px] font-bold text-white/40"
                                              style={k2dStack}>{label}</span>
                                        <div className="relative flex items-center bg-white/5 rounded px-2 py-1">
                                            <select
                                                value={settings[key]}
                                                onChange={(e) => updateValue(key, e.target.value)}
                                                className="bg-transparent text-white text-sm font-bold focus:outline-none appearance-none pr-6 cursor-pointer"
                                                style={k2dStack}
                                            >
                                                {AVAILABLE_SAMPLES.map(s => <option key={s} value={s}
                                                                                    className="bg-[#1E1E1E]">{s.toUpperCase()}</option>)}
                                            </select>
                                            <ChevronDown size={12}
                                                         className="absolute right-2 text-white/20 pointer-events-none"/>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            ))}
        </div>
    );
};

export default SoundConfig;