import React from 'react';
import { Square, Play } from 'lucide-react';

const PlayButton = ({ isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 font-bold uppercase tracking-[0.2em] transition-all duration-200
        ${isActive ? 'bg-[#CC0000]' : 'bg-[#FF5500]'}
        text-white active:scale-[0.97]`}
    >
      {isActive ? (
        <Square size={16} fill="currentColor" />
      ) : (
        <Play size={16} fill="currentColor" />
      )}
      {isActive ? 'Stop' : 'Start'}
    </button>
  );
};

export default PlayButton;