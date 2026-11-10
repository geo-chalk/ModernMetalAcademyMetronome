// Master volume, in dB on Tone's destination. 0 dB is the clicks as recorded;
// the range used to stop there, which on a phone speaker next to a loud amp
// wasn't enough. Above 0 the output would hard-clip, so the engine puts a soft
// clipper on the master chain (useMetronome) that bends peaks under full scale.
export const VOLUME_MIN_DB = -40;
export const VOLUME_MAX_DB = 12;
export const VOLUME_DEFAULT_DB = -6;

// Below this amplitude (about -2 dBFS) the soft clipper is a straight line;
// above it the curve bends towards 1, so nothing at or under 0 dB is touched.
export const SOFT_CLIP_KNEE = 0.8;

export const clampVolume = (value) => {
    const n = Math.round(Number(value));
    if (!Number.isFinite(n)) return VOLUME_DEFAULT_DB;
    return Math.max(VOLUME_MIN_DB, Math.min(VOLUME_MAX_DB, n));
};
