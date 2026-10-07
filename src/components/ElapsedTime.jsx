import React, {memo} from 'react';

const pad = (n) => String(n).padStart(2, '0');

// m:ss under an hour, h:mm:ss after
export const formatClock = (sec) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
};

const ElapsedTime = memo(({isActive, seconds}) => {
    const robotoStack = {fontFamily: "'K2D', sans-serif"};

    return (
        <div className="flex justify-between items-center py-1 short:py-0 text-white/40 tracking-[0.1em]">
            <span className="text-[12px] font-black" style={robotoStack}>Elapsed</span>
            <span className={`text-[14px] font-black tabular-nums ${isActive ? 'text-white/60' : 'text-white/30'}`}
                  style={robotoStack}>
                {formatClock(isActive ? seconds : 0)}
            </span>
        </div>
    );
});

export default ElapsedTime;
