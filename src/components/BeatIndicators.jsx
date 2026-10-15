import React, {memo} from "react";
import {RotateCcw} from "lucide-react";

const BeatIndicators = memo(({
                                 isActive, currentBeat, beatsPerMeasure, isResting, pulseTick, beatMuted = false,
                                 accents = [], muted = [], accentsEnabled = true, onCycleBeat,
                                 onReset, canReset = false, sigLabel = ''
                             }) => {
    const beats = Array.from({length: beatsPerMeasure || 4}, (_, i) => i + 1);
    const playing = isActive && !isResting;

    return (
        <div className="relative flex justify-center gap-2 mb-4 short:mb-0 h-4">
            {beats.map((b) => {
                const accented = accents.includes(b);
                // `muted` is the layer for the current switch position (see
                // constants/accents.js): with accents off it's a separate set,
                // so a beat can be muted there and still carry its accent for
                // when the switch comes back on. Muted wins the look.
                const isMuted = muted.includes(b);
                // Three idle looks. The accent mark dims rather than disappearing
                // when accents are switched off: the switch mutes the accent, it
                // doesn't erase the pattern. A muted beat is a hollow bar — a gap
                // in the row, which is what it is in the bar.
                const idleFill = isMuted
                    ? 'bg-transparent border border-dashed border-white/25'
                    : accented
                        ? (accentsEnabled ? 'bg-white/40' : 'bg-white/10')
                        : 'bg-white/[0.06] hover:bg-white/[0.14]';
                const state = isMuted ? ' (muted)' : accented ? ' (accented)' : '';

                return (
                    <button
                        key={b}
                        type="button"
                        onClick={() => onCycleBeat?.(b)}
                        aria-label={`Beat ${b}${state}`}
                        // The bars are 16px tall, well under a thumb. The pseudo-element
                        // widens the tap target above and below without moving anything.
                        className={`relative flex-1 h-full rounded-md transition-colors
                                    before:absolute before:inset-x-0 before:-inset-y-2 before:content-['']
                                    ${idleFill}`}
                    >
                        {/* Nothing lights on a silent beat — a muted bar or a muted beat —
                            so there's no cue to follow. One-shot pulse on the beat; keyed
                            by pulseTick so it restarts each beat (even when the same beat
                            recurs, e.g. 1/4). */}
                        {playing && !beatMuted && currentBeat === b && (
                            <span
                                key={pulseTick}
                                className={`absolute inset-0 rounded-md ${
                                    accented && accentsEnabled ? 'beat-pulse-accent' : 'beat-pulse'}`}
                            />
                        )}
                    </button>
                );
            })}
            {/* Reset for this meter's pattern. Sits at the end of the row and only
                once the pattern has been changed, so an untouched row shows
                nothing extra. In the flow rather than hanging in the gutter: on a
                phone the gutter is 16px and the icon would touch the card's edge,
                so the bars give up ~20px while it's there instead. */}
            {canReset && onReset && (
                <button
                    type="button"
                    onClick={onReset}
                    aria-label={`Reset accents for ${sigLabel}`}
                    title="Reset accents"
                    className="relative shrink-0 self-center text-white/30 hover:text-white transition-colors
                               focus:outline-none focus-visible:text-[#FF820C]
                               before:absolute before:-inset-2 before:content-['']"
                >
                    <RotateCcw size={12}/>
                </button>
            )}
        </div>
    );
});

export default BeatIndicators;
