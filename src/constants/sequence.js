import {clampBpm} from './bpm';

// A sequence is a list of steps: play at `bpm` for `seconds`, then rest for
// `restAfter` seconds before the next step (0 = roll straight on). The last
// step's rest is ignored. Modelling the rest as a property of the step, rather
// than as a row of its own, rules out a leading, trailing or doubled-up rest.
export const SEQ_MAX_STEPS = 12;

export const DEFAULT_STEPS = [
    {bpm: 140, seconds: 60, restAfter: 10},
    {bpm: 150, seconds: 60, restAfter: 10},
    {bpm: 140, seconds: 60, restAfter: 10},
    {bpm: 130, seconds: 60, restAfter: 10}
];

// Values the +/- buttons walk through: fine steps where they matter, coarse
// where counting in fives would take forever.
export const STEP_SECONDS_LADDER = [5, 10, 15, 20, 30, 45, 60, 75, 90, 120, 150, 180, 240, 300, 420, 600];
export const REST_SECONDS_LADDER = [0, 5, 10, 15, 20, 30, 45, 60, 90, 120, 180, 300];

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

const clampSeconds = (value, min, max, fallback) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, n));
};

// Repair pass for whatever came out of localStorage.
export const normaliseSteps = (raw) => {
    if (!Array.isArray(raw)) return DEFAULT_STEPS;
    const steps = raw.slice(0, SEQ_MAX_STEPS).filter(s => s && typeof s === 'object').map(s => ({
        bpm: clampBpm(s.bpm),
        seconds: clampSeconds(s.seconds, 5, 600, 60),
        restAfter: clampSeconds(s.restAfter, 0, 300, 10)
    }));
    return steps.length > 0 ? steps : DEFAULT_STEPS;
};

// The flat timeline the engine walks: play, rest, play, ... Each entry remembers
// which step it came from so the editor can light the right row.
export const expandSteps = (steps) => steps.flatMap((s, i) => {
    const play = {type: 'play', bpm: s.bpm, seconds: s.seconds, step: i};
    const isLast = i === steps.length - 1;
    return !isLast && s.restAfter > 0
        ? [play, {type: 'rest', seconds: s.restAfter, step: i}]
        : [play];
});

export const sequenceSeconds = (steps) =>
    expandSteps(steps).reduce((sum, seg) => sum + seg.seconds, 0);

