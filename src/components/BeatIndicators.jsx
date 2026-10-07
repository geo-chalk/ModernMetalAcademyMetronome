import React, {memo} from "react";

const BeatIndicators = memo(({
                                 isActive, currentBeat, beatsPerMeasure, isResting, pulseTick, barMuted = false,
                                 accents = [], accentsEnabled = true, onToggleAccent
                             }) => {
    const beats = Array.from({length: beatsPerMeasure || 4}, (_, i) => i + 1);
    const playing = isActive && !isResting;

    return (
        <div className="flex justify-center gap-2 mb-4 short:mb-0 h-4">
            {beats.map((b) => {
                const accented = accents.includes(b);
                // The mark dims rather than disappearing when accents are switched
                // off: the switch mutes the accent, it doesn't erase the pattern.
                const idleFill = accented
                    ? (accentsEnabled ? 'bg-white/40' : 'bg-white/10')
                    : 'bg-white/[0.06] hover:bg-white/[0.14]';

                return (
                    <button
                        key={b}
                        type="button"
                        onClick={() => onToggleAccent?.(b)}
                        aria-pressed={accented}
                        aria-label={`Beat ${b}${accented ? ' (accented)' : ''}`}
                        // The bars are 16px tall, well under a thumb. The pseudo-element
                        // widens the tap target above and below without moving anything.
                        className={`relative flex-1 h-full rounded-md transition-colors
                                    before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']
                                    ${idleFill}`}
                    >
                        {/* Nothing lights during a muted bar, so there's no cue to follow.
                            One-shot pulse on the beat; keyed by pulseTick so it restarts
                            each beat (even when the same beat recurs, e.g. 1/4). */}
                        {playing && !barMuted && currentBeat === b && (
                            <span
                                key={pulseTick}
                                className={`absolute inset-0 rounded-md ${
                                    accented && accentsEnabled ? 'beat-pulse-accent' : 'beat-pulse'}`}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
});

export default BeatIndicators;
