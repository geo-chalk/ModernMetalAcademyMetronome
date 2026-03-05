import React from "react";
import {FastForward, Infinity as InfinityIcon, Info} from "lucide-react";

const ModeSelector = ({mode, setMode, onStop}) => {
    const handleModeChange = (newMode) => {
        onStop();
        setMode(newMode);
    };

    return (
        <div className="flex bg-black p-1 rounded-md mb-8">
            <button
                onClick={() => handleModeChange("trainer")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                    mode === "trainer"
                        ? "bg-[#FF820C] text-white"
                        : "text-white/40 hover:text-white"
                }`}
            >
                <FastForward size={14}/> TRAINER
            </button>
            <button
                onClick={() => handleModeChange("constant")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                    mode === "constant"
                        ? "bg-[#FF820C] text-white"
                        : "text-white/40 hover:text-white"
                }`}
            >
                <InfinityIcon size={14}/> CONSTANT
            </button>
            <button
                onClick={() => handleModeChange("info")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-black uppercase tracking-widest transition-all ${
                    mode === "info"
                        ? "bg-[#FF820C] text-white"
                        : "text-white/40 hover:text-white"
                }`}
            >
                <Info size={14}/> INFO
            </button>
        </div>
    );
};

export default ModeSelector;