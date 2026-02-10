import React from "react";

const BeatIndicators = ({ isActive, currentBeat }) => {
  return (
    <div className="flex justify-center gap-3 mb-8">
      {[1, 2, 3, 4].map((b) => (
        <div key={b} className={`h-4 w-full rounded-md transition-all duration-75 ${
          isActive && currentBeat === b
            ? b === 1 ? 'bg-white' : 'bg-[#FF5500]'
            : 'bg-gray-800'
        }`} />
      ))}
    </div>
  );
};

export default BeatIndicators;