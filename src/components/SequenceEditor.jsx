import React, {memo} from 'react';
import {Plus, Minus, X, Menu} from 'lucide-react';
import {useDragReorder} from '../hooks/useDragReorder';
import {BPM_MIN, BPM_MAX, clampBpm} from '../constants/bpm';
import {
    SEQ_MAX_STEPS, STEP_SECONDS_LADDER, REST_SECONDS_LADDER, STEP_BARS_LADDER, REST_BARS_LADDER,
    stepLadder, moveStepTo
} from '../constants/sequence';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

// Small - / value / + control. The buttons carry a padded hit area like the rest of
// the app's tiny controls.
const Stepper = ({value, display, onMinus, onPlus, canMinus = true, canPlus = true, label, width = 'w-[3.25rem]', children}) => (
    <div className="flex items-center gap-1" role="group" aria-label={label}>
        <button type="button" onClick={onMinus} disabled={!canMinus} aria-label={`${label} down`}
                className="relative w-6 h-7 rounded-md bg-white/5 text-white/60 flex items-center justify-center
                           hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none active:scale-95
                           before:absolute before:-inset-1 before:content-['']">
            <Minus size={12}/>
        </button>
        {children ?? (
            <span className={`${width} text-center text-[13px] font-black text-white/80 tabular-nums`} style={k2dStack}>
                {display ?? value}
            </span>
        )}
        <button type="button" onClick={onPlus} disabled={!canPlus} aria-label={`${label} up`}
                className="relative w-6 h-7 rounded-md bg-white/5 text-white/60 flex items-center justify-center
                           hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none active:scale-95
                           before:absolute before:-inset-1 before:content-['']">
            <Plus size={12}/>
        </button>
    </div>
);

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

const SequenceEditor = memo(({
                                 steps, setSteps, unit, setUnit, activeStep, activeType, locked, formatDuration, totalSeconds
                             }) => {
    const inBars = unit === 'bars';
    // The two units differ only in which field they edit and how it is shown.
    const lengthKey = inBars ? 'bars' : 'seconds';
    const restKey = inBars ? 'restBars' : 'restAfter';
    const lengthLadder = inBars ? STEP_BARS_LADDER : STEP_SECONDS_LADDER;
    const restLadder = inBars ? REST_BARS_LADDER : REST_SECONDS_LADDER;
    const showLength = (n) => (inBars ? plural(n, 'bar') : formatDuration(n));
    const showRest = (n) => (n === 0 ? 'none' : showLength(n));
    const valueWidth = inBars ? 'w-[3.75rem]' : 'w-[3.25rem]';

    const update = (i, patch) => setSteps(steps.map((s, idx) => idx === i ? {...s, ...patch} : s));
    const remove = (i) => setSteps(steps.filter((_, idx) => idx !== i));
    // New steps start as a copy of the last one, so building a routine is mostly tapping Add.
    // The last step's own rest is hidden (nothing follows it), so it can be stale; adding
    // makes it the rest that now shows between the two, which should carry on from the
    // rest you set on the step before it rather than jump back to a value you never saw.
    const add = () => {
        const last = steps[steps.length - 1];
        const before = steps[steps.length - 2];
        const rest = before ? {restAfter: before.restAfter, restBars: before.restBars} : {};
        setSteps([...steps.slice(0, -1), {...last, ...rest}, {...last, ...rest}]);
    };

    const setBpm = (i, value) => update(i, {bpm: clampBpm(value)});
    const move = (from, to) => setSteps(moveStepTo(steps, from, to));
    const reorder = useDragReorder({onMove: move, enabled: !locked});

    return (
        <div className={`flex flex-col gap-1 ${locked ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-bold text-white/40 tracking-wider" style={k2dStack}>Length Type</span>
                <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                    {['time', 'bars'].map((u) => (
                        <button key={u} onClick={() => setUnit(u)}
                                className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${unit === u ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:text-white'}`}
                                style={k2dStack}>
                            {u === 'time' ? 'Time' : 'Bars'}
                        </button>
                    ))}
                </div>
            </div>
            <div className="flex items-center justify-between mb-1">
                <span className="text-[14px] font-bold text-white/40 tracking-wider" style={k2dStack}>Sequence</span>
                <span className="text-[12px] font-bold text-white/30 tracking-wider tabular-nums" style={k2dStack}>
                    {plural(steps.length, 'step')} · {formatDuration(Math.round(totalSeconds))}
                </span>
            </div>

            {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const playing = activeStep === i && activeType === 'play';
                const resting = activeStep === i && activeType === 'rest';
                return (
                    <div key={i} className="flex flex-col gap-1">
                        <div ref={reorder.blockRef(i)} style={reorder.blockStyle(i)}
                             className={`flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 border transition-colors ${
                            playing ? 'border-[#FF820C] bg-[#FF820C]/10' : 'border-white/5 bg-[#232323]'} ${
                            reorder.dragFrom === i ? 'drop-shadow-xl' : ''}`}>
                            {/* Drag handle: a mouse picks the step up at once, a finger needs a
                                long press so scrolling past it never grabs a row. Arrow keys move
                                it too, for keyboard users. */}
                            <button type="button" {...reorder.handleProps(i)}
                                    onKeyDown={(e) => {
                                        const to = e.key === 'ArrowUp' ? i - 1 : e.key === 'ArrowDown' ? i + 1 : null;
                                        if (to === null) return;
                                        e.preventDefault();
                                        e.stopPropagation();
                                        if (to >= 0 && to < steps.length) move(i, to);
                                    }}
                                    aria-label={`Reorder step ${i + 1}. Long press and drag, or use the up and down arrow keys`}
                                    className="relative -mr-1 w-5 h-7 shrink-0 flex items-center justify-center text-white/30 hover:text-white
                                               cursor-grab active:cursor-grabbing touch-pan-y select-none [-webkit-touch-callout:none]
                                               before:absolute before:-inset-1 before:content-['']">
                                <Menu size={14}/>
                            </button>
                            <span className="w-3 text-[12px] font-black text-white/30 tabular-nums" style={k2dStack}>{i + 1}</span>
                            <Stepper label={`Step ${i + 1} tempo`}
                                     onMinus={() => setBpm(i, step.bpm - 5)} onPlus={() => setBpm(i, step.bpm + 5)}
                                     canMinus={step.bpm > BPM_MIN} canPlus={step.bpm < BPM_MAX}>
                                <span className="w-[3.25rem] text-center text-[13px] font-black text-white/80 tabular-nums" style={k2dStack}>
                                    {step.bpm}<span className="text-[9px] text-white/30 ml-0.5">bpm</span>
                                </span>
                            </Stepper>
                            <Stepper label={`Step ${i + 1} length`} display={showLength(step[lengthKey])} width={valueWidth}
                                     onMinus={() => update(i, {[lengthKey]: stepLadder(lengthLadder, step[lengthKey], -1)})}
                                     onPlus={() => update(i, {[lengthKey]: stepLadder(lengthLadder, step[lengthKey], +1)})}
                                     canMinus={step[lengthKey] > lengthLadder[0]}
                                     canPlus={step[lengthKey] < lengthLadder[lengthLadder.length - 1]}/>
                            <button type="button" onClick={() => remove(i)} disabled={steps.length <= 1}
                                    aria-label={`Remove step ${i + 1}`}
                                    className="relative w-6 h-7 flex items-center justify-center text-white/30 hover:text-white
                                               disabled:opacity-20 disabled:pointer-events-none
                                               before:absolute before:-inset-1 before:content-['']">
                                <X size={14}/>
                            </button>
                        </div>

                        {!isLast && (
                            <div className={`flex items-center justify-between rounded-lg px-2 py-1 border transition-colors ${
                                resting ? 'border-[#38BDF8] bg-[#38BDF8]/10' : 'border-transparent'}`}>
                                <span className="w-4"/>
                                <span className="text-[12px] font-bold text-white/30 tracking-wider" style={k2dStack}>Rest</span>
                                <Stepper label={`Rest after step ${i + 1}`}
                                         display={showRest(step[restKey])} width={valueWidth}
                                         onMinus={() => update(i, {[restKey]: stepLadder(restLadder, step[restKey], -1)})}
                                         onPlus={() => update(i, {[restKey]: stepLadder(restLadder, step[restKey], +1)})}
                                         canMinus={step[restKey] > 0}
                                         canPlus={step[restKey] < restLadder[restLadder.length - 1]}/>
                                <span className="w-6"/>
                            </div>
                        )}
                    </div>
                );
            })}

            <button type="button" onClick={add} disabled={steps.length >= SEQ_MAX_STEPS}
                    className="mt-1 flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-white/15
                               text-[11px] font-black uppercase tracking-widest text-white/40 hover:text-white hover:border-white/30
                               disabled:opacity-30 disabled:pointer-events-none active:scale-[0.98] transition-all"
                    style={k2dStack}>
                <Plus size={14}/> Add step
            </button>
        </div>
    );
});

export default SequenceEditor;
