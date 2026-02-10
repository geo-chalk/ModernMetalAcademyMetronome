import React from "react";

const MarkedSlider = ({ label, value, setter, min, max, unit, defaultValue, step = 1, displayValue }) => {
  const thumbSize = 16;
  const fraction = (defaultValue - min) / (max - min);
  const markerLeft = `calc(${fraction * 100}% + ${(0.5 - fraction) * thumbSize}px)`;

  return (
    <section className="py-2">
      <div className="flex justify-between text-[10px] font-bold mb-3 text-white/40 tracking-wider">
        <span>{label}</span>
        {/* Use displayValue if provided (for Duration), otherwise use value + unit */}
        <span className="text-white font-mono opacity-80">{displayValue || `${value}${unit}`}</span>
      </div>
      <div className="relative w-full h-4 flex items-center">
        <div
          className="absolute h-4 w-0.5 bg-white/20 pointer-events-none rounded-full"
          style={{ left: markerLeft, transform: 'translateX(-50%)', zIndex: 0 }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          className="w-full h-1 bg-black rounded-md appearance-none cursor-pointer accent-[#FF5500] relative z-10"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        />
      </div>
    </section>
  );
};

export default MarkedSlider;