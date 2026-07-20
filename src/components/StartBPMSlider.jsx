import React, {useRef, useState} from "react";

const StartBPMSlider = ({label = "Start BPM", value, setter, min, max, unit = "bpm", defaultValue, disabled = false}) => {
    const k2dStack = {fontFamily: "'K2D', sans-serif"};

    const trackRef = useRef(null);
    const draggingRef = useRef(false);   // synchronous guard for pointermove
    const accRef = useRef(value);        // float accumulator (avoids rounding drift)
    const lastXRef = useRef(0);
    const startYRef = useRef(0);

    const [dragging, setDragging] = useState(false);
    const [fineFactor, setFineFactor] = useState(1);

    const THUMB = 18; // px

    const clamp = (v) => Math.max(min, Math.min(max, v));
    const pct = ((value - min) / (max - min)) * 100;
    const markerPct = ((defaultValue - min) / (max - min)) * 100;

    // Sensitivity by how far the finger has moved vertically away from the bar.
    // Drag straight across for coarse; drag up/down and away to fine-tune.
    const factorForDy = (dy) => {
        if (dy < 30) return 1;
        if (dy < 70) return 0.4;
        if (dy < 120) return 0.15;
        return 0.05;
    };

    const quickJump = (amount) => setter(clamp(value + amount));

    const onPointerDown = (e) => {
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        // Jump to the tapped position (coarse), then drag fine-tunes from there.
        const posValue = clamp(min + ((e.clientX - rect.left) / rect.width) * (max - min));
        accRef.current = posValue;
        lastXRef.current = e.clientX;
        startYRef.current = e.clientY;
        draggingRef.current = true;
        setDragging(true);
        setFineFactor(1);
        setter(Math.round(posValue));
        try { track.setPointerCapture(e.pointerId); } catch { /* noop */ }
    };

    const onPointerMove = (e) => {
        if (!draggingRef.current) return;
        const track = trackRef.current;
        if (!track) return;
        const rect = track.getBoundingClientRect();
        const dy = Math.abs(e.clientY - startYRef.current);
        const factor = factorForDy(dy);
        setFineFactor(factor);
        const dx = e.clientX - lastXRef.current;
        lastXRef.current = e.clientX;
        const perPx = (max - min) / rect.width;
        accRef.current = clamp(accRef.current + dx * perPx * factor);
        setter(Math.round(accRef.current));
    };

    const onPointerUp = (e) => {
        draggingRef.current = false;
        setDragging(false);
        setFineFactor(1);
        const track = trackRef.current;
        if (track) { try { track.releasePointerCapture(e.pointerId); } catch { /* noop */ } }
    };

    const btn = "text-[12px] font-black bg-white/5 hover:bg-white/10 border border-white/5 px-2 py-1 rounded transition-colors active:scale-95 text-white";

    return (
        <section className={`py-2 select-none ${disabled ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex justify-between items-center mb-3 text-white/40 tracking-wider">
                <span className="text-[14px] font-bold" style={k2dStack}>{label}</span>

                <div className="flex items-center gap-2">
                    <button onClick={() => quickJump(-20)} className={btn} style={k2dStack}>-20</button>
                    <button onClick={() => quickJump(-5)} className={btn} style={k2dStack}>-5</button>
                    <span className="text-[16px] text-white font-light min-w-[80px] text-center" style={k2dStack}>
                        {value}{unit}
                    </span>
                    <button onClick={() => quickJump(5)} className={btn} style={k2dStack}>+5</button>
                    <button onClick={() => quickJump(20)} className={btn} style={k2dStack}>+20</button>
                </div>
            </div>

            <div
                ref={trackRef}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
                className="relative w-full h-6 flex items-center touch-none cursor-pointer"
            >
                {/* Default value marker */}
                <div
                    className="absolute h-4 w-0.5 bg-white/10 rounded-full pointer-events-none"
                    style={{left: `${markerPct}%`, transform: 'translateX(-50%)'}}
                />
                {/* Track */}
                <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-full pointer-events-none"/>
                {/* Fill */}
                <div
                    className="absolute h-1.5 bg-[#FF820C] rounded-full pointer-events-none"
                    style={{width: `${pct}%`}}
                />
                {/* Thumb */}
                <div
                    className={`absolute rounded-full bg-[#FF820C] pointer-events-none transition-[transform,box-shadow] ${dragging ? 'scale-110 shadow-[0_0_0_6px_rgba(255,130,12,0.15)]' : ''}`}
                    style={{
                        left: `clamp(${THUMB / 2}px, ${pct}%, calc(100% - ${THUMB / 2}px))`,
                        transform: 'translateX(-50%)',
                        width: THUMB,
                        height: THUMB,
                    }}
                />
                {/* Fine-mode tooltip */}
                {dragging && fineFactor < 1 && (
                    <div
                        className="absolute -top-7 bg-[#FF820C] text-black text-[10px] font-black px-2 py-0.5 rounded whitespace-nowrap"
                        style={{
                            left: `clamp(24px, ${pct}%, calc(100% - 24px))`,
                            transform: 'translateX(-50%)',
                            ...k2dStack,
                        }}
                    >
                        FINE ×{fineFactor}
                    </div>
                )}
            </div>

            <p className="touch-only-hint text-[10px] text-white/25 mt-1.5 text-center tracking-wider" style={k2dStack}>
                Drag away from the bar for fine control
            </p>
        </section>
    );
};

export default StartBPMSlider;
