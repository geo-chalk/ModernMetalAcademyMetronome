import React from "react";

const StartBPMSlider = ({ value, setter, min, max, defaultValue }) => {
    const thumbSize = 16;
    const fraction = (defaultValue - min) / (max - min);
    const markerLeft = `calc(${fraction * 100}% + ${(0.5 - fraction) * thumbSize}px)`;
    const k2dStack = { fontFamily: "'K2D', sans-serif" };

    const quickJump = (amount) => {
        const newValue = Math.max(min, Math.min(max, value + amount));
        setter(newValue);
    };

    return (
        <section className="py-2 select-none">
            <div className="flex justify-between items-center mb-3 text-white/40 tracking-wider">
                <span className="text-[14px] font-bold" style={k2dStack}>
                    Start BPM
                </span>

                <div className="flex items-center gap-2">
                    {/* Decrement Buttons */}
                    <button
                        onClick={() => quickJump(-20)}
                        className="text-[12px] font-black bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1 rounded transition-colors active:scale-95 text-white/100"
                        style={k2dStack}
                    >
                        -20
                    </button>
                    <button
                        onClick={() => quickJump(-5)}
                        className="text-[12px] font-black bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1 rounded transition-colors active:scale-95 text-white/100"
                        style={k2dStack}
                    >
                        -5
                    </button>

                    {/* Value Display - Centered in a fixed block for symmetry */}
                    <span
                        className="text-[16px] text-white font-light min-w-[80px] text-center"
                        style={k2dStack}
                    >
                        {value}bpm
                    </span>

                    {/* Increment Button */}
                    <button
                        onClick={() => quickJump(5)}
                        className="text-[12px] font-black bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1 rounded transition-colors active:scale-95 text-white/100"
                        style={k2dStack}
                    >
                        +5
                    </button>

                    {/* Increment Button */}
                    <button
                        onClick={() => quickJump(20)}
                        className="text-[12px] font-black bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1 rounded transition-colors active:scale-95 text-white/100"
                        style={k2dStack}
                    >
                        +20
                    </button>
                </div>
            </div>

            <div className="relative w-full h-4 flex items-center touch-none">
                {/* Default Marker (120 BPM) */}
                <div
                    className="absolute h-4 w-0.5 bg-white/10 pointer-events-none rounded-full"
                    style={{ left: markerLeft, transform: 'translateX(-50%)', zIndex: 0 }}
                />
                <input
                    type="range"
                    min={min}
                    max={max}
                    step={1}
                    value={value}
                    onChange={(e) => setter(Number(e.target.value))}
                    className="w-full h-1 bg-black rounded-md appearance-none cursor-pointer accent-[#FF820C] relative z-10"
                    style={{ background: 'rgba(255,255,255,0.1)' }}
                />
            </div>
        </section>
    );
};

export default StartBPMSlider;