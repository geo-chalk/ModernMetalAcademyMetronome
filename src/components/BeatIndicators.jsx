import React, {memo} from "react";

const BeatIndicators = memo(({isActive, currentBeat, beatsPerMeasure, isResting, pulseTick}) => {
    const beats = Array.from({length: beatsPerMeasure || 4}, (_, i) => i + 1);
    const playing = isActive && !isResting;

    return (
        <div className="flex justify-center gap-2 mb-4 h-4">
            {beats.map((b) => (
                <div key={b} className="relative flex-1 h-full rounded-md bg-white/[0.06]">
                    {/* One-shot pulse on the beat; keyed by pulseTick so it restarts
                        each beat (even when the same beat recurs, e.g. 1/4). */}
                    {playing && currentBeat === b && (
                        <span
                            key={pulseTick}
                            className={`absolute inset-0 rounded-md ${b === 1 ? 'beat-pulse-accent' : 'beat-pulse'}`}
                        />
                    )}
                </div>
            ))}
        </div>
    );
});

export default BeatIndicators;