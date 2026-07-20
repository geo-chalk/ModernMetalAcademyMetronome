import React from 'react';

const BPMDisplay = ({bpm, setBpm, isActive, locked = false}) => {
    const handleChange = (e) => {
        const val = Math.max(1, Math.min(400, Number(e.target.value))); // Clamp values
        setBpm(val);
    };

    return (
        <div className="text-center mb-2">
            <input
                type="number"
                value={bpm}
                onChange={handleChange}
                readOnly={locked}
                style={{fontFamily: 'system-ui, -apple-system, sans-serif'}}
                className={`bg-transparent text-white text-7xl font-black text-center w-full focus:outline-none tabular-nums ${locked ? 'cursor-default' : ''}`}
            />
            <div className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold mt-2 text-center">
                BPM
            </div>
        </div>
    );
};

export default BPMDisplay;