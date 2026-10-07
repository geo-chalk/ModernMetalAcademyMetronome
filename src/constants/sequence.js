import {clampBpm} from './bpm';
import {defaultAccentsFor, normaliseAccents} from './accents';
import {PRESET_FIELDS, TIME_SIG_BOTTOMS, clampField} from './presets';

// A sequence is a list of steps: play at `bpm` for a length, then rest before the
// next step (0 = roll straight on). The last step's rest is ignored. Modelling the
// rest as a property of the step, rather than as a row of its own, rules out a
// leading, trailing or doubled-up rest.
//
// A sequence is measured either in time or in bars (`unit`, shared by every step).
// Both sets of lengths live on each step, like the Trainer's two interval units, so
// flipping the toggle never throws away what you'd set for the other one.
export const SEQ_MAX_STEPS = 12;
const UNITS = ['time', 'bars'];

export const DEFAULT_STEPS = [
    {bpm: 140, seconds: 60, restAfter: 10, bars: 8, restBars: 2},
    {bpm: 150, seconds: 60, restAfter: 10, bars: 8, restBars: 2},
    {bpm: 140, seconds: 60, restAfter: 10, bars: 8, restBars: 2},
    {bpm: 130, seconds: 60, restAfter: 10, bars: 8, restBars: 2}
];

// Values the +/- buttons walk through: fine steps where they matter, coarse
// where counting in fives would take forever.
export const STEP_SECONDS_LADDER = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 420, 600];
export const REST_SECONDS_LADDER = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];
export const STEP_BARS_LADDER = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48, 64];
export const REST_BARS_LADDER = [0, 1, 2, 3, 4, 6, 8, 12, 16];

// The next value on the ladder in `dir` (+1 / -1), starting from the nearest rung
// so a value that isn't on it (e.g. from older saved data) still moves sensibly.
export const stepLadder = (ladder, value, dir) => {
    let nearest = 0;
    ladder.forEach((v, i) => {
        if (Math.abs(v - value) < Math.abs(ladder[nearest] - value)) nearest = i;
    });
    const next = Math.max(0, Math.min(ladder.length - 1, nearest + dir));
    return ladder[next];
};

// The step at `from` moved to position `to`, the others shifting to make room. Rests
// belong to the gaps between steps, not to the steps themselves: they stay in their
// slots (so what you set between slot 1 and slot 2 is still there afterwards, and the
// hidden rest of the last step never surfaces), and only tempo and length move.
// Out of range, or no move, returns the list unchanged.
export const moveStepTo = (steps, from, to) => {
    if (from === to || from < 0 || to < 0 || from >= steps.length || to >= steps.length) return steps;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    return next.map((s, k) => ({...s, restAfter: steps[k].restAfter, restBars: steps[k].restBars}));
};

// Repair pass for whatever came out of localStorage. Steps from before bars existed
// have no `bars` / `restBars`, so those fall back to their defaults.
export const normaliseSteps = (raw) => {
    if (!Array.isArray(raw)) return DEFAULT_STEPS;
    const steps = raw.slice(0, SEQ_MAX_STEPS).filter(s => s && typeof s === 'object').map(s => ({
        bpm: clampBpm(s.bpm),
        seconds: clampField(s.seconds, {min: 5, max: 600, fallback: 60}),
        restAfter: clampField(s.restAfter, {min: 0, max: 300, fallback: 10}),
        bars: clampField(s.bars, {min: 1, max: 64, fallback: 8}),
        restBars: clampField(s.restBars, {min: 0, max: 16, fallback: 2})
    }));
    return steps.length > 0 ? steps : DEFAULT_STEPS;
};

export const normaliseUnit = (unit) => (UNITS.includes(unit) ? unit : 'time');

// The flat timeline the engine walks: play, rest, play, ... Each entry remembers
// which step it came from so the editor can light the right row.
//
// In bars mode a play entry keeps its `bars` (the engine ends it on the beat count,
// so the tempo change lands on the downbeat) and carries an equivalent `seconds`
// for the progress bars and totals. A rest is always timed by the clock: the Trainer
// does the same, at the tempo it is about to return to.
export const expandSteps = (steps, unit = 'time', timeSigTop = 4, timeSigBottom = 4) => {
    const secPerBar = (bpm) => timeSigTop * (60 / bpm) * (4 / timeSigBottom);
    return steps.flatMap((s, i) => {
        const inBars = unit === 'bars';
        const play = inBars
            ? {type: 'play', bpm: s.bpm, bars: s.bars, seconds: s.bars * secPerBar(s.bpm), step: i}
            : {type: 'play', bpm: s.bpm, seconds: s.seconds, step: i};
        const isLast = i === steps.length - 1;
        const restLength = inBars ? s.restBars : s.restAfter;
        if (isLast || restLength <= 0) return [play];
        const restSeconds = inBars ? restLength * secPerBar(steps[i + 1].bpm) : restLength;
        return [play, {type: 'rest', seconds: restSeconds, step: i}];
    });
};

export const sequenceSeconds = (steps, unit, timeSigTop, timeSigBottom) =>
    expandSteps(steps, unit, timeSigTop, timeSigBottom).reduce((sum, seg) => sum + seg.seconds, 0);

// --- Presets ---------------------------------------------------------------
// A sequence preset is the routine plus the meter it was built for, which matters
// most in bars mode where lengths depend on it. Same line as the Trainer's presets:
// nothing about how it sounds on this device.
export const captureSequencePreset = (state) => ({
    steps: state.steps,
    unit: state.unit,
    timeSigTop: state.timeSigTop,
    timeSigBottom: state.timeSigBottom,
    countdownBars: state.countdownBars,
    accents: state.accents
});

export const validateSequencePreset = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const timeSigTop = clampField(raw.timeSigTop, PRESET_FIELDS.timeSigTop);
    const timeSigBottom = TIME_SIG_BOTTOMS.includes(Number(raw.timeSigBottom)) ? Number(raw.timeSigBottom) : 4;
    return {
        steps: normaliseSteps(raw.steps),
        unit: normaliseUnit(raw.unit),
        timeSigTop,
        timeSigBottom,
        countdownBars: clampField(raw.countdownBars, PRESET_FIELDS.countdownBars),
        accents: Array.isArray(raw.accents)
            ? normaliseAccents(raw.accents, timeSigTop)
            : defaultAccentsFor(timeSigTop, timeSigBottom)
    };
};

export const SEQUENCE_PRESETS = {
    key: 'metronome_sequence_presets',
    capture: captureSequencePreset,
    validate: validateSequencePreset
};
