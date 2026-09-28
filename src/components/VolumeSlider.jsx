import React from 'react';
import {Volume2} from 'lucide-react';

const VolumeSlider = ({volume, setVolume}) => {
    return (
        <div className="flex items-center gap-3 px-1 mt-2 opacity-100">
            <Volume2 size={14} className="text-white"/>
            {/* Same construction as MarkedSlider: a tall transparent input for the
                hit box over a separately drawn 4px track. */}
            <div className="relative flex-1 h-8 flex items-center">
                <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full pointer-events-none"/>
                <input
                    type="range"
                    min="-40"
                    max="0"
                    step="1"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    className="relative z-10 w-full h-full bg-transparent appearance-none cursor-pointer accent-[#FF820C]"
                />
            </div>
        </div>
    );
};

export default VolumeSlider;
