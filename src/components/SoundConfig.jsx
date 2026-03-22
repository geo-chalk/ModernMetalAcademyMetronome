import React, {useState, useEffect, useRef} from 'react';
import * as Tone from 'tone';
import {Play, Square} from 'lucide-react';
import MarkedSlider from './MarkedSlider';
import VolumeSlider from './VolumeSlider';
import AccentSwitch from './AccentSwitch';

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

    // Helper to find note info and current index for sliders
    const getNoteInfo = (freq) => {
        // Find index of the frequency that matches exactly (or closest)
        const index = NOTE_FREQUENCIES.findIndex(n => n.freq === freq);
        const info = index !== -1 ? NOTE_FREQUENCIES[index] : NOTE_FREQUENCIES[48]; // Fallback to C4
        return {...info, index: index !== -1 ? index : 48};
    };

    const handleSliderChange = (key, index) => {
        const newFreq = NOTE_FREQUENCIES[index].freq;
        updateFrequency(key, newFreq);
    };

    const getIndexByFreq = (targetFreq) => {
        const index = NOTE_FREQUENCIES.findIndex(n => Math.abs(n.freq - targetFreq) < 0.01);
        return index !== -1 ? index : 48; // Fallback to C4
    };

    // Map your requested defaults to their array indices
    const DEFAULTS = {
        metronomeAccent: getIndexByFreq(987.77), // B5
        metronomeClick: getIndexByFreq(493.88),  // B4
        countInAccent: getIndexByFreq(1174.66),  // C#/Db6
        countInClick: getIndexByFreq(587.33)     // G5
    };

    return (
        <div className="space-y-6 pt-0 pb-8 overflow-y-auto no-scrollbar">
            <h1 className="text-[#FF820C] text-sm font-black tracking-[0.2em] uppercase border-b border-white/5 pb-4"
                style={k2dStack}>
                Sound Configuration
            </h1>

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
                    <h2 className="text-white text-[16px] font-black tracking-widest uppercase opacity-100"
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
                    {['metronomeAccent', 'metronomeClick'].map((key) => {
                        const info = getNoteInfo(settings[key]);
                        return (
                            <MarkedSlider
                                key={key}
                                label={key === 'metronomeAccent' ? "Accents" : "Clicks"}
                                value={info.index}
                                setter={(val) => handleSliderChange(key, val)}
                                min={0}
                                max={NOTE_FREQUENCIES.length - 1}
                                step={1}
                                // FIX: Pass the calculated index constant here
                                defaultValue={DEFAULTS[key]}
                                displayValue={`${info.note} (${info.freq} Hz)`}
                            />
                        );
                    })}
                </div>
            </section>

            {/* Count-in Section */}
            <section className="space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-white text-[16px] font-black tracking-widest uppercase opacity-100"
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
                    {['countInAccent', 'countInClick'].map((key) => {
                        const info = getNoteInfo(settings[key]);
                        return (
                            <MarkedSlider
                                key={key}
                                label={key === 'countInAccent' ? "Accents" : "Clicks"}
                                value={info.index}
                                setter={(val) => handleSliderChange(key, val)}
                                min={0}
                                max={NOTE_FREQUENCIES.length - 1}
                                step={1}
                                // FIX: Pass the calculated index constant here
                                defaultValue={DEFAULTS[key]}
                                displayValue={`${info.note} (${info.freq} Hz)`}
                            />
                        );
                    })}
                </div>
            </section>
        </div>
    );
};

export default SoundConfig;