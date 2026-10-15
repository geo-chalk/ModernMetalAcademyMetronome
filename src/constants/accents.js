// What each beat of a bar does: accented, plain, or muted. The user clicks the
// beat bars to set this, so what lives here is only the *default* layer (the
// accents a meter starts from before anyone has touched it) and the pure
// helpers that keep a stored pattern honest.
//
// A pattern is {accents, muted, mutedOff}. The Accents switch picks the mode:
//   on  — a click cycles plain → accented → muted → plain, over `accents` and
//         `muted` (a beat is in at most one of the two);
//   off — a click toggles plain ↔ muted over `mutedOff`, its own layer, and
//         never touches `accents` or `muted`.
// So muting while the switch is off saves nothing over the accent-mode pattern:
// switch back on and it comes back exactly as left, muted beats included.
//
// One beat always stays audible: a bar with every beat muted is no metronome at
// all, so the click that would silence the last one is refused, and a stored
// pattern that has done it is repaired.
//
// The odd meters are the ones worth seeding, because their accents are what the
// meter means — 7/8 is 3+2+2, and a 7/8 that clicks flat is just seven beats.
// Everything else starts on the downbeat alone. Nothing starts muted.
export const DEFAULT_ACCENT_MAP = {
    "7/8": [1, 4, 6], "5/8": [1, 4], "6/8": [1, 4], "9/8": [1, 4, 7], "12/8": [1, 4, 7, 10],
};

export const sigKey = (top, bottom) => `${top}/${bottom}`;

export const defaultAccentsFor = (top, bottom) =>
    (DEFAULT_ACCENT_MAP[sigKey(top, bottom)] || [1]).filter(b => b <= top);

export const defaultPatternFor = (top, bottom) =>
    ({accents: defaultAccentsFor(top, bottom), muted: [], mutedOff: []});

// Patterns come back from localStorage, so they can be stale (saved under a
// wider meter), hand-edited, or not an array at all. Repair rather than reject,
// the same way validatePreset does for drills.
//
// An empty result is a real answer — "no accents at all" is something the user
// can click their way to — so callers must fall back to the default on a
// *missing* pattern (??), never on an empty one (||).
export const normaliseAccents = (raw, top) => {
    if (!Array.isArray(raw)) return [];
    const seen = new Set();
    for (const value of raw) {
        const n = Math.round(Number(value));
        if (Number.isFinite(n) && n >= 1 && n <= top) seen.add(n);
    }
    return [...seen].sort((a, b) => a - b);
};

// A mute layer never covers the whole bar. If a stored one does (a hand edit,
// or a pattern saved under a wider meter that lost its only audible beat to the
// filter), the downbeat is given back: it's the one beat a bar can least do
// without. The list is unique and within 1..top, so "all" is just the count.
const keepOneAudible = (muted, top) => (muted.length >= top ? muted.slice(1) : muted);

// A mute layer from storage or a preset. For the accent-mode layer the accents
// are passed in: a beat is accented or muted there, never both, and should a
// stored pattern claim both (two tabs, a hand edit), the accent wins — it's the
// older, deliberate mark. Missing or invalid → nothing muted, which is what
// every pattern saved before muting existed should mean.
export const normaliseMuted = (raw, top, accents = []) =>
    keepOneAudible(normaliseAccents(raw, top).filter(b => !accents.includes(b)), top);

// One signature's entry in the store. Before 0.12 it was a bare array of
// accented beats; it's now {accents, muted, mutedOff}. Every older shape is
// read, so nothing anyone clicked before an upgrade is lost. A missing
// `accents` on an object falls back to the meter's default; an empty one stays
// empty (see above). `mutedOff` is its own layer, so it's not reconciled
// against the accents.
export const normalisePattern = (raw, top, bottom) => {
    if (Array.isArray(raw)) return {accents: normaliseAccents(raw, top), muted: [], mutedOff: []};
    if (!raw || typeof raw !== 'object') return defaultPatternFor(top, bottom);
    const accents = Array.isArray(raw.accents)
        ? normaliseAccents(raw.accents, top)
        : defaultAccentsFor(top, bottom);
    return {
        accents,
        muted: normaliseMuted(raw.muted, top, accents),
        mutedOff: normaliseMuted(raw.mutedOff, top)
    };
};

// Untouched for this meter? Drives the reset control: it shows only when there
// is something to put back.
const sameBeats = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
export const isDefaultPattern = (pattern, top, bottom) => {
    const d = defaultPatternFor(top, bottom);
    return sameBeats(pattern.accents, d.accents) && pattern.muted.length === 0 && pattern.mutedOff.length === 0;
};

// The beats that are silent right now, given the switch.
export const mutedFor = (pattern, accentsEnabled) =>
    accentsEnabled ? pattern.muted : pattern.mutedOff;

const without = (list, beat) => list.filter(b => b !== beat);
const withBeat = (list, beat) => [...list, beat].sort((a, b) => a - b);

// Would muting one more beat leave the bar with nothing audible?
const lastAudible = (muted, top) => muted.length + 1 >= top;

// One click on a beat bar. With the switch on: plain → accented → muted → plain
// (the first click still accents, as it did before muting existed, so nothing
// learnt is unlearnt). With the switch off: plain ↔ muted on the `mutedOff`
// layer, and the accent-mode pattern is left exactly as it is.
//
// The muted stop is skipped when it would silence the last audible beat: with
// the switch on the accented beat goes back to plain instead, with it off the
// click does nothing. `top` is the meter, which bounds how many can be muted.
export const cycleBeat = (pattern, beat, accentsEnabled = true, top = Infinity) => {
    const {accents, muted, mutedOff} = pattern;
    if (!accentsEnabled) {
        if (mutedOff.includes(beat)) return {accents, muted, mutedOff: without(mutedOff, beat)};
        if (lastAudible(mutedOff, top)) return pattern;
        return {accents, muted, mutedOff: withBeat(mutedOff, beat)};
    }
    if (accents.includes(beat)) {
        return lastAudible(muted, top)
            ? {accents: without(accents, beat), muted, mutedOff}
            : {accents: without(accents, beat), muted: withBeat(muted, beat), mutedOff};
    }
    if (muted.includes(beat)) return {accents, muted: without(muted, beat), mutedOff};
    return {accents: withBeat(accents, beat), muted, mutedOff};
};
