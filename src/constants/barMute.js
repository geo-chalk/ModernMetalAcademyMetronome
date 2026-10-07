// Bar-mute decision, kept pure so the scheduler just threads a small state object
// through it: {muted, run, barsSinceSync, resync}. `run` is how many muted bars in a
// row have just played (random style's cap counts against it).
export const INITIAL_MUTE_STATE = {muted: false, run: 0, barsSinceSync: 0, resync: true};

// Called once per bar, on its downbeat. The first bar after a re-sync point (start,
// tempo change, rest, or muting being switched on) always plays so there's a click to
// lock onto; in random style no more than `maxRun` muted bars come in a row (1 = a
// muted bar is always followed by one that plays).
export const nextBarMute = (settings, state, random = Math.random) => {
    if (!settings?.enabled) return INITIAL_MUTE_STATE;
    if (state.resync) return {muted: false, run: 0, barsSinceSync: 1, resync: false};

    if (settings.style === 'pattern') {
        const pos = state.barsSinceSync % (settings.on + settings.off);
        const muted = pos >= settings.on;
        return {muted, run: muted ? state.run + 1 : 0, barsSinceSync: state.barsSinceSync + 1, resync: false};
    }
    const muted = state.run < (settings.maxRun ?? 1) && random() * 100 < settings.chance;
    return {muted, run: muted ? state.run + 1 : 0, barsSinceSync: state.barsSinceSync + 1, resync: false};
};
