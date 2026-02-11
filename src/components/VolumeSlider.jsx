import React from 'react';
import { Volume2 } from 'lucide-react';

const VolumeSlider = ({ volume, setVolume }) => {
  return (
    <div className="flex items-center gap-3 px-1 mt-2 opacity-100">
      <Volume2 size={14} className="text-white" />
      <input
        type="range"
        min="-40"
        max="0"
        step="1"
        value={volume}
        onChange={(e) => setVolume(Number(e.target.value))}
        className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#FF5500]"
      />
    </div>
  );
};

export default VolumeSlider;