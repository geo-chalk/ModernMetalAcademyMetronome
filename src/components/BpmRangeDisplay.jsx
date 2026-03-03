import React from "react";

const BpmRangeDisplay = ({ startBpm, increment, stepSeconds, totalSeconds, mode }) => {
  if (mode !== 'trainer') return null;

  // Calculate the final BPM
  const totalSteps = Math.floor(totalSeconds / stepSeconds);
  const endBpm = startBpm + (totalSteps * increment);

  const k2dStack = { fontFamily: "'K2D', sans-serif" };

  return (
    /* flex justify-between matches the layout of MarkedSlider headers */
    <div className="flex justify-between items-center mt-6 px-1">
      {/* Label on the left, matching the style of Slider labels */}
      <span
        className="text-[14px] font-bold text-white/40 tracking-wider"
        style={k2dStack}
      >
        BPM Range
      </span>

      {/* Values centered in the remaining space */}
      <div className="flex-1 flex justify-center pr-[15%]">
        <span
          className="text-white font-light text-[20px] whitespace-nowrap"
          style={k2dStack}
        >
          {startBpm} <span className="text-white/20 mx-1">→</span> {endBpm}
        </span>
      </div>

      {/* Empty span or unit to maintain the right-hand alignment anchor */}
      <span className="text-[10px] text-white/20 font-bold uppercase invisible" style={k2dStack}>
        BPM
      </span>
    </div>
  );
};

export default BpmRangeDisplay;