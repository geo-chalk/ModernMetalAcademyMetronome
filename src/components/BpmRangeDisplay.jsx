import React from "react";

const BpmRangeDisplay = ({ startBpm, increment, negativeIncrement = 0, stepSeconds, totalSeconds, mode }) => {
  if (mode !== 'trainer') return null;

  // FIX: Calculate the number of times the BPM will actually increase
  // We subtract 1 because the final increment coincides with the session stop
  const totalIncrements = Math.max(0, Math.floor(totalSeconds / stepSeconds) - 1);

  // Mirror the engine (useMetronome.js): when negativeIncrement is 0 every interval
  // ramps up; otherwise intervals alternate up/down starting with an up-interval.
  const endBpm = negativeIncrement === 0
    ? startBpm + totalIncrements * increment
    : startBpm
      + Math.ceil(totalIncrements / 2) * increment      // up-intervals (0,2,4,...)
      - Math.floor(totalIncrements / 2) * negativeIncrement; // down-intervals (1,3,5,...)

  const k2dStack = { fontFamily: "'K2D', sans-serif" };

  return (
    <div className="flex items-center gap-4" style={k2dStack}>
      <span className="text-[14px] font-bold text-white/40 tracking-wider whitespace-nowrap">
        BPM Range:
      </span>

      <div className="flex items-center gap-2">
        <span className="text-white font-light text-[20px] whitespace-nowrap">
          {startBpm} <span className="text-white/20 mx-1">→</span> {endBpm}
        </span>
      </div>
    </div>
  );
};

export default BpmRangeDisplay;