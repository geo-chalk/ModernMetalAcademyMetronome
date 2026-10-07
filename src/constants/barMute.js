// Bar-mute decision, kept pure so the scheduler just threads a small state object
// through it: {muted, barsSinceSync, resync}.
export const INITIAL_MUTE_STATE = {muted: false, barsSinceSync: 0, resync: true};

// Called once per bar, on its downbeat. The first bar after a re-sync point (start,
// tempo change, rest, or muting being switched on) always plays so there's a click to
// lock onto; in random style a muted bar is never followed by another.
export const nextBarMute = (settings, state, random = Math.random) => {
    if (!settings?.enabled) return INITIAL_MUTE_STATE;
    if (state.resync) return {muted: false, barsSinceSync: 1, resync: false};

    if (settings.style === 'pattern') {
        const pos = state.barsSinceSync % (settings.on + settings.off);
        return {muted: pos >= settings.on, barsSinceSync: state.barsSinceSync + 1, resync: false};
    }
    return {
        muted: !state.muted && random() * 100 < settings.chance,
        barsSinceSync: state.barsSinceSync + 1,
        resync: false
    };
};
