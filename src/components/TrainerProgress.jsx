import React, { memo } from 'react';

const TrainerProgress = memo(({ isActive, progress, totalProgress, mode }) => {
  if (mode !== 'trainer') return null;

  return (
    <div className="flex flex-col gap-3 py-4 mb-2">
      <div className="w-full">
        <div className="flex justify-between items-center mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
          <span>Cycle</span>
          <span className="text-[#FF5500] font-mono">{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-[#FF5500] h-full transition-all duration-[32ms] linear"
            style={{ width: `${isActive ? progress : 0}%` }}
          />
        </div>
      </div>

      <div className="w-full">
        <div className="flex justify-between items-center mb-1 text-[9px] font-black uppercase tracking-[0.2em] text-white/40">
          <span>Total Session</span>
          <span className="text-white/60 font-mono">{Math.round(totalProgress)}%</span>
        </div>
        <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
          <div
            className="bg-white/40 h-full transition-all duration-[100ms] linear"
            style={{ width: `${isActive ? totalProgress : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
});

export default TrainerProgress;