import React from 'react';
import {Volume2} from 'lucide-react';
import {VOLUME_MAX_DB, VOLUME_MIN_DB} from '../constants/volume';

const VolumeSlider = ({volume, setVolume}) => {
    // The tick marks 0 dB — the clicks at their recorded level. Everything to
    // its right is boost, held clean by the master limiter.
    const unityPct = ((0 - VOLUME_MIN_DB) / (VOLUME_MAX_DB - VOLUME_MIN_DB)) * 100;

    return (
        <div className="flex items-center gap-3 px-1 mt-2 short:mt-0 opacity-100">
            <Volume2 size={14} className="text-white"/>
            {/* Same construction as MarkedSlider: a tall transparent input for the
                hit box over a separately drawn 4px track. */}
            <div className="relative flex-1 h-8 flex items-center">
                <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full pointer-events-none"/>
                <div className="absolute h-3 w-0.5 bg-white/20 rounded-full pointer-events-none"
                     style={{left: `${unityPct}%`, transform: 'translateX(-50%)'}}/>
                <input
                    type="range"
                    min={VOLUME_MIN_DB}
                    max={VOLUME_MAX_DB}
                    step="1"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    aria-label="Volume"
                    aria-valuetext={`${volume > 0 ? '+' : ''}${volume} dB`}
                    className="relative z-10 w-full h-full bg-transparent appearance-none cursor-pointer accent-[#FF820C]"
                />
            </div>
        </div>
    );
};

export default VolumeSlider;
