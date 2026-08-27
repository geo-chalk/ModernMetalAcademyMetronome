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
