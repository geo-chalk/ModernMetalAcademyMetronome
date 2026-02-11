import React, { memo } from "react";

const BeatIndicators = memo(({ isActive, currentBeat, beatsPerMeasure }) => {
  const beats = Array.from({ length: beatsPerMeasure || 4 }, (_, i) => i + 1);

  return (
    <div className="flex justify-center gap-2 mb-8">
      {beats.map((b) => (
        <div
          key={b}
          className={`h-4 w-full rounded-md transition-all duration-75 ease-out ${
            isActive && currentBeat === b
              ? b === 1 ? 'bg-white scale-y-110 shadow-[0_0_15px_rgba(255,255,255,0.5)]' : 'bg-[#FF5500] scale-y-105'
              : 'bg-gray-800 scale-y-100'
          }`}
        />
      ))}
    </div>
  );
});

export default BeatIndicators;