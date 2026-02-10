import React from 'react';

const TempoSlider = ({ label, value, setter, min, max, unit, defaultValue }) => {
  const range = max - min;
  const markers = [40, 80, 120, 160, 200, 240, 280];
  const dots = Array.from({ length: (max - min) / 10 + 1 }, (_, i) => min + i * 10);

  return (
    <section className="mb-12 select-none">
      <div className="flex justify-between items-end mb-6">
        <span className="text-[11px] font-black text-white/40 uppercase tracking-[0.25em]">
          {label}
        </span>
        <span className="text-[#FF5500] font-mono text-xl font-bold">
          {value}<span className="text-white/20 text-xs ml-1 font-normal uppercase">{unit}</span>
        </span>
      </div>

      <div className="relative w-full h-10 flex flex-col justify-center">
        {/* Number Labels */}
        <div className="absolute -top-5 w-full flex justify-between px-1 pointer-events-none">
          {markers.map((m) => (
            <span key={m} className="text-[10px] font-bold text-white/20 tabular-nums">
              {m}
            </span>
          ))}
        </div>

        {/* The Track and Decorative Dots */}
        <div className="absolute inset-0 flex items-center pointer-events-none px-2">
          <div className="w-full flex justify-between items-center">
            {dots.map((d) => (
              <div
                key={d}
                className={`rounded-full transition-colors ${
                  d === 120 ? 'w-1 h-1 bg-white/40' : 'w-[2px] h-[2px] bg-white/10'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Default Marker (120 BPM) */}
        <div
          className="absolute h-4 w-0.5 bg-white/20 pointer-events-none rounded-full"
          style={{
            left: `${((defaultValue - min) / range) * 100}%`,
            transform: 'translateX(-50%)'
          }}
        />

        {/* Invisible Range Input */}
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          className="absolute inset-0 w-full h-full bg-transparent appearance-none cursor-pointer accent-[#FF5500] z-10"
        />
      </div>
    </section>
  );
};

export default TempoSlider;