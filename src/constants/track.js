import {BPM_MAX, BPM_MIN, clampBpm} from './bpm';
import {clampField} from './presets';

// Track mode loops a whole audio file, one full pass per speed, raising the speed
// after each pass. Everything here is pure: the speed ladder, the session length
// and the preset shape. The playback itself lives in hooks/useTrackTrainer.js.
//
// A speed is a *rate* — 1 is the recording as it is. Percent and BPM are two ways
// of writing the same rate (rate = pct / 100 = bpm / originalBpm), so the ladder is
// built in rates and the UI converts for display.

// Musically useful range for a pitch-preserving stretch of a full mix. Below half
// speed the smearing gets obvious; above 1.5x a song is already very fast.
export const RATE_MIN = 0.5;
export const RATE_MAX = 1.5;
export const PCT_MIN = RATE_MIN * 100;
export const PCT_MAX = RATE_MAX * 100;

export const TRACK_UNITS = ['percent', 'bpm'];

// A see-saw with the negative step equal to the positive one never arrives, and
// a hand-edited preset could ask for a 1% step across the whole range; either way
// the ladder stops here rather than looping forever.
export const MAX_PASSES = 200;

// The element streams from a Blob URL, so this isn't about memory — it keeps a
// stray multi-hour file out of IndexedDB.
export const MAX_TRACK_BYTES = 200 * 1024 * 1024;

// Slider bounds, mirrored in the Track panel. A stored value outside them is
// repaired on read, like the Trainer's presets.
export const TRACK_FIELDS = {
    startPct: {min: PCT_MIN, max: PCT_MAX, fallback: 70},
    endPct: {min: PCT_MIN, max: PCT_MAX, fallback: 100},
    stepPct: {min: 1, max: 25, fallback: 5},
    negStepPct: {min: 0, max: 25, fallback: 0},
    startBpm: {min: BPM_MIN, max: BPM_MAX, fallback: 120},
    endBpm: {min: BPM_MIN, max: BPM_MAX, fallback: 160},
    stepBpm: {min: 1, max: 20, fallback: 4},
    negStepBpm: {min: 0, max: 20, fallback: 0},
    restSeconds: {min: 0, max: 60, fallback: 0},
};

const EPS = 1e-9;
const round6 = (x) => Math.round(x * 1e6) / 1e6;

export const clampRate = (rate) => Math.max(RATE_MIN, Math.min(RATE_MAX, rate));

export const isValidBpm = (bpm) => Number.isFinite(bpm) && bpm > 0;

// The two conversions the unit toggle needs. Both return whole numbers, since
// that's what the sliders move in.
export const pctToBpm = (pct, originalBpm) => clampBpm(originalBpm * pct / 100);
export const bpmToPct = (bpm, originalBpm) =>
    Math.max(PCT_MIN, Math.min(PCT_MAX, Math.round(bpm / originalBpm * 100)));

// The rates, in playing order. Walks start → end by `step`, with the Trainer's
// see-saw: when a negative step is set, the passes alternate up / down starting
// with an up-step (goingUp on even steps). Overshoot is clipped to `end`, so
// 70 → 100 by 7 gives 70, 77, 84, 91, 98, 100. Descending ranges just walk down.
// In the BPM unit the song's tempo is needed to turn BPM into a rate; without
// it there is nothing to play, hence the empty ladder.
export const rateLadder = ({
    unit = 'percent', startPct, endPct, stepPct, negStepPct = 0,
    startBpm, endBpm, stepBpm, negStepBpm = 0, originalBpm = null
}) => {
    let start, end, step, neg;
    if (unit === 'bpm') {
        if (!isValidBpm(originalBpm)) return [];
        start = startBpm / originalBpm;
        end = endBpm / originalBpm;
        step = stepBpm / originalBpm;
        neg = negStepBpm / originalBpm;
    } else {
        start = startPct / 100;
        end = endPct / 100;
        step = stepPct / 100;
        neg = negStepPct / 100;
    }
    if (![start, end, step, neg].every(Number.isFinite)) return [];

    start = clampRate(start);
    end = clampRate(end);
    neg = Math.max(0, Math.min(neg, step));   // the see-saw never lowers the net speed

    const dir = Math.sign(end - start);
    if (dir === 0 || step <= 0) return [round6(start)];

    const rates = [round6(start)];
    let cur = start;
    for (let i = 0; rates.length < MAX_PASSES; i++) {
        const goingUp = neg === 0 || i % 2 === 0;
        cur += dir * (goingUp ? step : -neg);
        // Reached or overshot the end (in the direction of travel): finish on it.
        if (dir * (cur - end) >= -EPS) {
            rates.push(round6(end));
            break;
        }
        rates.push(round6(cur));
    }
    return rates;
};

// Playing time of the whole session: each pass is the file at its rate, with a
// rest after every pass but the last. Lock final loops forever after that, so
// this is the time until the final speed is reached.
export const trackSessionSeconds = (rates, duration, restSeconds = 0) => {
    if (!Number.isFinite(duration) || duration <= 0 || rates.length === 0) return 0;
    const playing = rates.reduce((sum, r) => sum + duration / r, 0);
    return playing + Math.max(0, rates.length - 1) * restSeconds;
};

// What the BPM readout shows for a pass: the song's tempo scaled by the rate,
// or null when the tempo isn't known (percent unit, nothing typed or tapped).
export const rateToBpm = (rate, originalBpm) =>
    isValidBpm(originalBpm) ? Math.round(originalBpm * rate) : null;

export const rateToPct = (rate) => Math.round(rate * 100);

// --- Presets -------------------------------------------------------------
// A Track preset is the drill: unit, range, step, rest, lock final. The song's
// own tempo is not part of it — that belongs to the file (useTrackSettings keeps
// it per track), so one drill applies to any song.

export const captureTrackPreset = (state) => {
    const out = {};
    for (const key of Object.keys(TRACK_FIELDS)) out[key] = state[key];
    out.unit = state.unit;
    out.lockFinal = state.lockFinal;
    return out;
};

export const validateTrackPreset = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const out = {};
    for (const [key, spec] of Object.entries(TRACK_FIELDS)) {
        out[key] = clampField(raw[key], spec);
    }
    out.unit = TRACK_UNITS.includes(raw.unit) ? raw.unit : 'percent';
    out.lockFinal = raw.lockFinal === true;
    out.negStepPct = Math.min(out.negStepPct, out.stepPct);
    out.negStepBpm = Math.min(out.negStepBpm, out.stepBpm);
    return out;
};

export const TRACK_PRESETS = {
    key: 'metronome_track_presets', capture: captureTrackPreset, validate: validateTrackPreset
};
