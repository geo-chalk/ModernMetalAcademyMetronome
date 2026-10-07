import {clampBpm} from './bpm';
import {defaultAccentsFor, normaliseAccents} from './accents';

// A preset is the shape of a drill under a name: everything that defines what
// you're about to practise, and nothing about how it sounds on this device.
// Volume, the accent switch and the sound pack are deliberately excluded —
// loading a preset shouldn't change your output level or swap your click.
//
// The accent *pattern* is on the drill side of that line, unlike the switch that
// mutes it: which beats you're accenting is part of what you're practising, and
// it travels with the time signature it belongs to. Restoring a 7/8 drill and
// getting its meter without its 3+2+2 would be restoring half the drill.
//
// Each field carries its own bounds so a stored preset can be repaired rather
// than trusted: localStorage is editable by hand, survives across versions, and
// a field that has since changed range would otherwise pin a slider off-scale
// (the same class of bug BPM_MIN/BPM_MAX was introduced to fix).
//
// Bounds mirror the MarkedSlider props in App.jsx; when one moves, move it here.
export const PRESET_FIELDS = {
    startBpm: {min: 40, max: 300, fallback: 120},
    increment: {min: 0, max: 10, fallback: 2},
    negativeIncrement: {min: 0, max: 10, fallback: 0},
    stepSeconds: {min: 5, max: 90, fallback: 10},
    totalSeconds: {min: 30, max: 600, fallback: 120},
    intervalBars: {min: 1, max: 32, fallback: 8},
    totalReps: {min: 1, max: 30, fallback: 10},
    restSeconds: {min: 0, max: 360, fallback: 0},
    restBars: {min: 0, max: 8, fallback: 0},
    timeSigTop: {min: 1, max: 15, fallback: 4},
    countdownBars: {min: 0, max: 4, fallback: 1},
};

// Fields that aren't plain bounded numbers.
export const TIME_SIG_BOTTOMS = [2, 4, 8, 16];
const INTERVAL_UNITS = ['time', 'bars'];

export const MAX_PRESETS = 20;
export const MAX_NAME_LENGTH = 24;

export const clampField = (value, {min, max, fallback}) => {
    // null, '' and false all coerce to 0 through Number(), which is finite and
    // would clamp to min — so a field an older build never wrote would come back
    // as the smallest legal value rather than the default. Reject the empties
    // before coercing; only a real out-of-range number gets clamped.
    if (value === null || value === undefined || value === '' || typeof value === 'boolean') {
        return fallback;
    }
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
};

// Both the time-mode and bars-mode fields are captured regardless of which unit
// is active. They're independent state, so storing only the active half would
// silently reset the other one the moment you toggled Interval Type after a load.
export const capturePreset = (state) => {
    const out = {};
    for (const key of Object.keys(PRESET_FIELDS)) out[key] = state[key];
    out.intervalUnit = state.intervalUnit;
    out.timeSigBottom = state.timeSigBottom;
    out.lockFinalBpm = state.lockFinalBpm;
    out.accents = state.accents;
    return out;
};

// Repair rather than reject: a preset missing a field (saved by an older build)
// still loads, with that field at its default.
export const validatePreset = (raw) => {
    if (!raw || typeof raw !== 'object') return null;

    const out = {};
    for (const [key, spec] of Object.entries(PRESET_FIELDS)) {
        out[key] = clampField(raw[key], spec);
    }
    out.startBpm = clampBpm(out.startBpm);

    out.intervalUnit = INTERVAL_UNITS.includes(raw.intervalUnit) ? raw.intervalUnit : 'time';
    out.timeSigBottom = TIME_SIG_BOTTOMS.includes(Number(raw.timeSigBottom)) ? Number(raw.timeSigBottom) : 4;
    out.lockFinalBpm = raw.lockFinalBpm === true;

    // Tested for the array, not for truthiness: [] is the user having cleared
    // every accent, and must round-trip as itself. Only a preset from a build
    // that had no accent pattern at all falls back to the meter's default.
    out.accents = Array.isArray(raw.accents)
        ? normaliseAccents(raw.accents, out.timeSigTop)
        : defaultAccentsFor(out.timeSigTop, out.timeSigBottom);

    // The see-saw can never lower the net tempo, so the negative increment is
    // capped by the positive one — the same invariant handleIncrementChange
    // maintains in the UI. A hand-edited preset could otherwise smuggle past it.
    out.negativeIncrement = Math.min(out.negativeIncrement, out.increment);

    return out;
};

// What usePresets needs to store one kind of preset: where, how to snapshot the
// state, and how to repair what comes back. Sequence presets have their own (see
// constants/sequence.js), so the two lists never mix.
export const TRAINER_PRESETS = {key: 'metronome_presets', capture: capturePreset, validate: validatePreset};

export const normalisePresetName = (name) =>
    String(name ?? '').trim().slice(0, MAX_NAME_LENGTH);
