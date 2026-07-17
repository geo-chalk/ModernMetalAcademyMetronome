import React, {memo} from 'react';

const TrainerProgress = memo(({isActive, progress, totalProgress, mode}) => {
    if (mode !== 'trainer') return null;

    const robotoStack = {fontFamily: "'K2D', sans-serif"};

    return (
        <div className="flex flex-col gap-2 py-2">
            <div className="w-full">
                <div className="flex justify-between items-center mb-1 text-white/40 tracking-[0.1em]">
                    <span className="text-[12px] font-black" style={robotoStack}>Cycle</span>
                    <span className="text-[#FF820C] text-[14px] font-black" style={robotoStack}>
            {Math.round(progress)}%
          </span>
                </div>
                <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
                    <div
                        className="bg-[#FF820C] h-full"
                        style={{
                            width: `${isActive ? progress : 0}%`,
                            willChange: 'width' // Optimization for smooth width changes
                        }}
                    />
                </div>
            </div>

            <div className="w-full">
                <div className="flex justify-between items-center mb-1 text-white/40 tracking-[0.1em]">
                    <span className="text-[12px] font-black" style={robotoStack}>Total Session</span>
                    <span className="text-white/60 text-[14px] font-black" style={robotoStack}>
            {Math.round(totalProgress)}%
          </span>
                </div>
                <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
                    <div
                        className="bg-white/40 h-full"
                        style={{
                            width: `${isActive ? totalProgress : 0}%`,
                            willChange: 'width'
                        }}
                    />
                </div>
            </div>
        </div>
    );
});

export default TrainerProgress;