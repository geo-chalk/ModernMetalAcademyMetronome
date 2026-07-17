import React from "react";

const BpmRangeDisplay = ({ startBpm, increment, negativeIncrement = 0, totalIncrements = 0, duration = null, mode }) => {
  if (mode !== 'trainer') return null;

  // totalIncrements = how many times the BPM changes (computed in App.jsx from the
  // active unit — time or bars/reps). Mirror the engine (useMetronome.js): when
  // negativeIncrement is 0 every step ramps up; otherwise steps alternate up/down
  // starting with an up-step.
  const steps = Math.max(0, totalIncrements);
  const endBpm = negativeIncrement === 0
    ? startBpm + steps * increment
    : startBpm
      + Math.ceil(steps / 2) * increment      // up-steps (0,2,4,...)
      - Math.floor(steps / 2) * negativeIncrement; // down-steps (1,3,5,...)

  const k2dStack = { fontFamily: "'K2D', sans-serif" };

  return (
    <div className="flex flex-col gap-0.5" style={k2dStack}>
      <div className="flex items-center gap-4">
        <span className="text-[14px] font-bold text-white/40 tracking-wider whitespace-nowrap">
          Range:
        </span>
        <span className="text-white font-light text-[18px] whitespace-nowrap">
          {startBpm} <span className="text-white/20 mx-1">→</span> {endBpm}
        </span>
      </div>
      {duration && (
        <span className="text-[12px] font-bold text-white/30 tracking-wider whitespace-nowrap">
          ≈ {duration} total
        </span>
      )}
    </div>
  );
};

export default BpmRangeDisplay;