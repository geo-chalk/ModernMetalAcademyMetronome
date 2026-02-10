import React from 'react';

const BPMDisplay = ({ bpm, setBpm, isActive }) => {
  const handleChange = (e) => {
    const val = Math.max(1, Math.min(400, Number(e.target.value))); // Clamp values
    setBpm(val);
  };

  return (
    <div className="text-center mb-6">
      <input
        type="number"
        value={bpm}
        onChange={handleChange}
        className="bg-transparent text-white text-7xl font-black text-center w-full focus:outline-none tabular-nums"
      />
      <div className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold mt-2 text-center">
        BPM
      </div>
    </div>
  );
};

export default BPMDisplay;