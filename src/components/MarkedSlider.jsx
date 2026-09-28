import React, {useRef, useState} from 'react';

const MarkedSlider = ({label, value, setter, min, max, unit, defaultValue, step = 1, displayValue}) => {
    const thumbSize = 16;
    const range = max - min;
    const fraction = range > 0 ? (defaultValue - min) / range : 0;
    const markerLeft = `calc(${fraction * 100}% + ${(0.5 - fraction) * thumbSize}px)`;
    const [isDragging, setIsDragging] = useState(false);

    // Whether the gesture in flight came from a finger. Decided per pointer
    // rather than per device: the old `'ontouchstart' in window` sniff put a
    // touchscreen laptop into touch mode for its mouse as well, so the mouse
    // had to land on the thumb and never got a pointer cursor.
    const touchRef = useRef(false);

    const k2dStack = {fontFamily: "'K2D', sans-serif"};

    const handlePointerDown = (e) => {
        touchRef.current = e.pointerType === 'touch';

        // Mouse / pen: a press anywhere on the track starts a drag.
        if (!touchRef.current) {
            setIsDragging(true);
            return;
        }

        // Touch: only a press near the thumb starts a drag, so a finger that
        // brushes the track while scrolling the column doesn't yank the value.
        const rect = e.currentTarget.getBoundingClientRect();
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
            <div className="flex justify-between items-center mb-2 text-white/40 tracking-wider">
                <span className="text-[14px] font-bold" style={k2dStack}>
                    {label}
                </span>
                <span className="text-[16px] text-white font-light" style={k2dStack}>
                    {displayValue || `${value}${unit}`}
                </span>
            </div>
            {/* The input is 32px tall and transparent, so the whole band around the
                track is grabbable; the 6px track is drawn separately behind it. As a
                6px-tall input, a finger more than ~8px off the line missed entirely. */}
            <div className="relative w-full h-8 flex items-center touch-none">
                <div
                    className="absolute h-4 w-0.5 bg-white/20 pointer-events-none rounded-full"
                    style={{left: markerLeft, transform: 'translateX(-50%)', zIndex: 0}}
                />
                <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-lg pointer-events-none"/>
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    step={step}
                    onPointerDown={handlePointerDown}
                    onPointerUp={() => setIsDragging(false)}
                    onPointerCancel={() => setIsDragging(false)}
                    onChange={(e) => {
                        // Mouse / pen always apply; touch only once the grab was verified.
                        if (!touchRef.current || isDragging) {
                            setter(Number(e.target.value));
                        }
                    }}
                    className={`relative z-10 w-full h-full bg-transparent appearance-none cursor-pointer touch-none
                                ${isDragging ? 'accent-white/40' : 'accent-[#FF820C]'}
                            `}
                />
            </div>
        </section>
    );
};

export default MarkedSlider;
