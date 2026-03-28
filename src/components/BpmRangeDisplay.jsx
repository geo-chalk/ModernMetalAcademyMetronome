import React from "react";

const BpmRangeDisplay = ({ startBpm, increment, stepSeconds, totalSeconds, mode }) => {
  if (mode !== 'trainer') return null;

  // Calculate the final BPM
  const totalSteps = Math.floor(totalSeconds / stepSeconds);
  const endBpm = startBpm + (totalSteps * increment);

  const k2dStack = { fontFamily: "'K2D', sans-serif" };

  return (
    <div className="flex items-center gap-4" style={k2dStack}>
      {/* Label */}
      <span className="text-[14px] font-bold text-white/40 tracking-wider whitespace-nowrap">
        BPM Range:
      </span>

      {/* Values */}
      <div className="flex items-center gap-2">
        <span className="text-white font-light text-[20px] whitespace-nowrap">
          {startBpm} <span className="text-white/20 mx-1">→</span> {endBpm}
        </span>
      </div>
    </div>
  );
};

export default BpmRangeDisplay;