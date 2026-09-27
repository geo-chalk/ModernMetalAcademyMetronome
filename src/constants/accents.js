// Which beats of a bar get the accent click. The user clicks the beat bars to
// set this, so what lives here is only the *default* layer: the pattern a meter
// starts from before anyone has touched it.
//
// The odd meters are the ones worth seeding, because their accents are what the
// meter means — 7/8 is 3+2+2, and a 7/8 that clicks flat is just seven beats.
// Everything else starts on the downbeat alone.
export const DEFAULT_ACCENT_MAP = {
    "7/8": [1, 4, 6], "5/8": [1, 4], "6/8": [1, 4], "9/8": [1, 4, 7], "12/8": [1, 4, 7, 10],
};

export const sigKey = (top, bottom) => `${top}/${bottom}`;

export const defaultAccentsFor = (top, bottom) =>
    (DEFAULT_ACCENT_MAP[sigKey(top, bottom)] || [1]).filter(b => b <= top);

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
