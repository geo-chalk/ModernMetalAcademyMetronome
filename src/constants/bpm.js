// One source of truth for the tempo range. Before this, BPMDisplay clamped typed
// input to 1-400 while StartBPMSlider ran 40-300, so a typed 350 sat outside the
// slider's range and pinned its thumb at the maximum.
export const BPM_MIN = 40;
export const BPM_MAX = 300;

export const clampBpm = (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return BPM_MIN;
    return Math.max(BPM_MIN, Math.min(BPM_MAX, n));
};

// Nudge amounts, shared by the arrow-key shortcuts and the slider's quick-jump
// buttons so the two can't drift apart.
export const BPM_STEP_SMALL = 5;
export const BPM_STEP_LARGE = 20;

// Snap to the nearest multiple of BPM_STEP_SMALL. Tap tempo lands on arbitrary
// values like 137; this tidies them to the same 5 BPM grid the nudges work on.
export const snapBpm = (value) =>
    clampBpm(Math.round(Number(value) / BPM_STEP_SMALL) * BPM_STEP_SMALL);
