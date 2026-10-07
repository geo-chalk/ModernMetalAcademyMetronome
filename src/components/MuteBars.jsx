import React, {memo} from 'react';
import MarkedSlider from './MarkedSlider';

const k2dStack = {fontFamily: "'K2D', sans-serif"};
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

// "Play by heart" practice: the click drops out for whole bars, so you have to hold
// the tempo yourself and find the next downbeat where the click comes back.
const MuteBars = memo(({
                           enabled, setEnabled, style, setStyle,
                           chance, setChance, maxRun, setMaxRun, onBars, setOnBars, offBars, setOffBars
                       }) => (
    <div className="flex flex-col gap-1 pt-2 border-t border-white/5 short:pt-1">
        <div className="flex items-center justify-between">
            <span className="text-[14px] font-bold text-white/40 tracking-wider" style={k2dStack}>
                Mute bars
            </span>
            <button
                onClick={() => setEnabled(!enabled)}
                aria-pressed={enabled}
                aria-label="Mute bars"
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF820C]/40
                            before:absolute before:-inset-2 before:content-[''] ${enabled ? 'bg-[#FF820C]' : 'bg-white/10'}`}
            >
                <div className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-out ${
                    enabled ? 'translate-x-4' : 'translate-x-0'}`}/>
            </button>
        </div>

        {enabled && (<>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] font-bold text-white/30 tracking-wider" style={k2dStack}>Style</span>
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                    {[['random', 'Random'], ['pattern', 'Pattern']].map(([key, label]) => (
                        <button key={key} onClick={() => setStyle(key)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${style === key ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:text-white'}`}
                                style={k2dStack}>
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            {style === 'random' ? (
                <>
                    <MarkedSlider label="Chance" value={chance} setter={setChance}
                                  min={10} max={80} step={5} unit="%" defaultValue={25}/>
                    <MarkedSlider label="Max in a row" value={maxRun} setter={setMaxRun}
                                  min={1} max={4} step={1}
                                  displayValue={plural(maxRun, 'bar')} defaultValue={1}/>
                </>
            ) : (<>
                <MarkedSlider label="Play" value={onBars} setter={setOnBars}
                              min={1} max={8} step={1}
                              displayValue={plural(onBars, 'bar')} defaultValue={3}/>
                <MarkedSlider label="Mute" value={offBars} setter={setOffBars}
                              min={1} max={4} step={1}
                              displayValue={plural(offBars, 'bar')} defaultValue={1}/>
            </>)}
        </>)}
    </div>
));

export default MuteBars;
