import React, {useState} from 'react';

const MarkedSlider = ({label, value, setter, min, max, unit, defaultValue, step = 1, displayValue}) => {
    const thumbSize = 16;
    const range = max - min;
    const fraction = range > 0 ? (defaultValue - min) / range : 0;
    const markerLeft = `calc(${fraction * 100}% + ${(0.5 - fraction) * thumbSize}px)`;
    const [isDragging, setIsDragging] = useState(false);

    const k2dStack = {fontFamily: "'K2D', sans-serif"};

    // Detect if the device is mobile/touch
    const isTouchDevice = typeof window !== 'undefined' &&
                         ('ontouchstart' in window || navigator.maxTouchPoints > 0);

    const handlePointerDown = (e) => {
        // Desktop: Allow immediate interaction anywhere
        if (!isTouchDevice) {
            setIsDragging(true);
            return;
        }

        // Mobile: Strict check to ensure they are touching the thumb
        const rect = e.target.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const clickedValue = min + (max - min) * percent;

        // Threshold of 10% of the slider width for mobile "grabbing"
        const threshold = (max - min) * 0.10;
        const isNearThumb = Math.abs(clickedValue - value) < threshold;

        if (!isNearThumb) {
            e.preventDefault();
        } else {
            setIsDragging(true);
        }
    };

    return (
        <section className="py-2 select-none">
            <div className="flex justify-between items-center mb-3 text-white/40 tracking-wider">
                <span className="text-[14px] font-bold" style={k2dStack}>
                    {label}
                </span>
                <span className="text-[16px] text-white font-light" style={k2dStack}>
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
                    value={value}
                    step={step}
                    onPointerDown={handlePointerDown}
                    onPointerUp={() => setIsDragging(false)}
                    onChange={(e) => {
                        // Desktop always allows, Mobile only if drag was verified
                        if (!isTouchDevice || isDragging) {
                            setter(Number(e.target.value));
                        }
                    }}
                    className={`w-full h-1.5 bg-white/10 rounded-lg appearance-none 
                                ${isTouchDevice ? 'cursor-default' : 'cursor-pointer'}
                                ${isDragging ? 'accent-white/40' : 'accent-[#FF820C]'}
                                touch-none
                            `}
                    style={{background: 'rgba(255,255,255,0.1)'}}
                />
            </div>
        </section>
    );
};

export default MarkedSlider;