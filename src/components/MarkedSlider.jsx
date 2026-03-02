import React from "react";

const MarkedSlider = ({label, value, setter, min, max, unit, defaultValue, step = 1, displayValue}) => {
    const thumbSize = 16;
    const fraction = (defaultValue - min) / (max - min);
    const markerLeft = `calc(${fraction * 100}% + ${(0.5 - fraction) * thumbSize}px)`;

    // Isolated font stack for this component only
    const k2dStack = {fontFamily: "'K2D', sans-serif"};

    return (
        <section className="py-2 select-none">
            <div className="flex justify-between items-center mb-3 text-white/40 tracking-wider">
          <span
              className="text-[14px] font-bold"
              style={k2dStack}
          >
            {label}
          </span>
                <span
                    className="text-[16px] text-white font-light"
                    style={k2dStack}
                >
            {/* Added the space you requested earlier as well */}
                    {displayValue || `${value}${unit}`}
          </span>
            </div>
            <div className="relative w-full h-4 flex items-center touch-none">
                <div
                    className="absolute h-4 w-0.5 bg-white/20 pointer-events-none rounded-full"
                    style={{left: markerLeft, transform: 'translateX(-50%)', zIndex: 0}}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-full h-1 bg-black rounded-md appearance-none cursor-pointer accent-[#FF820C] relative z-10"
                    style={{background: 'rgba(255,255,255,0.1)'}}
                />
            </div>
        </section>
    );
};

export default MarkedSlider;