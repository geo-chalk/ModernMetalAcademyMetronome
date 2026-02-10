import React from "react";
import { FastForward, Infinity as InfinityIcon } from "lucide-react";

const ModeSelector = ({ mode, setMode, onStop }) => {
  const handleModeChange = (newMode) => {
    onStop();
    setMode(newMode);
  };

  return (
    /* Changed bg-gray-900 to bg-black and rounded-xl to rounded-md */
    <div className="flex bg-black p-1 rounded-md mb-8">
      <button
        onClick={() => handleModeChange("trainer")}
        /* 1. Changed rounded-lg to rounded-md
           2. Changed font-bold to font-black for a more aggressive look
           3. Active state: Changed bg-blue-600 to bg-[#FF5500]
           4. Inactive state: Changed text-gray-500 to text-white/40
        */
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
          mode === "trainer"
            ? "bg-[#FF5500] text-white"
            : "text-white/40 hover:text-white"
        }`}
      >
        <FastForward size={14} /> TRAINER
      </button>
      <button
        onClick={() => handleModeChange("constant")}
        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
          mode === "constant"
            ? "bg-[#FF5500] text-white"
            : "text-white/40 hover:text-white"
        }`}
      >
        <InfinityIcon size={14} /> CONSTANT
      </button>
    </div>
  );
};

export default ModeSelector;