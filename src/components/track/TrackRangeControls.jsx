import React from 'react';
import MarkedSlider from '../MarkedSlider';
import {TRACK_FIELDS, bpmToPct, pctToBpm} from '../../constants/track';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

/**
 * The speed ladder: unit toggle, start, end, step, see-saw step, rest.
 *
 * Percent and BPM are one quantity, so every slider shows both readings when
 * the song's tempo is known: "70% (98 bpm)" or "98 bpm (70%)". The BPM unit
 * is disabled until there is a tempo to convert with.
 */
const TrackRangeControls = ({unit, setUnit, range, originalBpm, restSeconds, setRestSeconds}) => {
    const isBpm = unit === 'bpm';

    const both = (v) => {
        if (isBpm) return `${v} bpm (${bpmToPct(v, originalBpm)}%)`;
        return originalBpm ? `${v}% (${pctToBpm(v, originalBpm)} bpm)` : `${v}%`;
    };
    const stepText = (v) => (isBpm ? `${v} bpm` : `${v}%`);

    const defaults = isBpm
        ? {start: TRACK_FIELDS.startBpm.fallback, end: TRACK_FIELDS.endBpm.fallback, step: TRACK_FIELDS.stepBpm.fallback}
        : {start: TRACK_FIELDS.startPct.fallback, end: TRACK_FIELDS.endPct.fallback, step: TRACK_FIELDS.stepPct.fallback};

    return (
        <>
            {/* Unit toggle: the same pill as the Trainer's Interval Type */}
            <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] font-bold text-white/40 tracking-wider" style={k2dStack}>Range in</span>
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                    {[['percent', '%'], ['bpm', 'BPM']].map(([u, label]) => {
                        const unavailable = u === 'bpm' && !originalBpm;
                        return (
                            <button key={u} onClick={() => setUnit(u)} disabled={unavailable}
                                    title={unavailable ? 'Set the song tempo first' : undefined}
                                    className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${
                                        unit === u ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:text-white'
                                    } ${unavailable ? 'opacity-30 cursor-not-allowed' : ''}`}
                                    style={k2dStack}>
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            <MarkedSlider label="Start speed" value={range.start} setter={range.setStart}
                          min={range.min} max={range.max} displayValue={both(range.start)}
                          defaultValue={defaults.start}/>
            <MarkedSlider label="End speed" value={range.end} setter={range.setEnd}
                          min={range.min} max={range.max} displayValue={both(range.end)}
                          defaultValue={defaults.end}/>
            <MarkedSlider label="Pos. Increment" value={range.step} setter={range.setStep}
                          min={range.stepMin} max={range.stepMax} displayValue={stepText(range.step)}
                          defaultValue={defaults.step}/>
            <MarkedSlider label="Neg. Increment" value={range.negStep} setter={range.setNegStep}
                          min={0} max={range.step} displayValue={stepText(range.negStep)}
                          defaultValue={0}/>
            <MarkedSlider label="Rest" value={restSeconds} setter={setRestSeconds}
                          min={TRACK_FIELDS.restSeconds.min} max={TRACK_FIELDS.restSeconds.max} step={5}
                          displayValue={restSeconds === 0 ? 'None' : `${restSeconds}s`}
                          defaultValue={TRACK_FIELDS.restSeconds.fallback}/>
        </>
    );
};

export default TrackRangeControls;
