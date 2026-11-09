import React from 'react';
import {formatClock} from '../ElapsedTime';
import {rateToBpm, rateToPct, trackSessionSeconds} from '../../constants/track';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

// Where the ladder starts and ends, how many passes, and how long that takes
// with this file — before Start. A sibling of BpmRangeDisplay, which is
// Trainer-only and reasons from increments rather than an explicit end.
const TrackRangeDisplay = ({rates, originalBpm, duration, restSeconds, lockFinal}) => {
    if (rates.length === 0) {
        return (
            <span className="text-[12px] font-bold text-white/30 tracking-wider" style={k2dStack}>
                Set the song tempo to use a BPM range
            </span>
        );
    }

    const first = rates[0];
    const last = rates[rates.length - 1];
    const show = (r) => (originalBpm ? `${rateToBpm(r, originalBpm)}` : `${rateToPct(r)}%`);
    const unitSuffix = originalBpm ? ' bpm' : '';
    const seconds = duration > 0 ? trackSessionSeconds(rates, duration, restSeconds) : 0;
    const passes = `${rates.length} ${rates.length === 1 ? 'pass' : 'passes'}`;

    return (
        <div className="flex flex-col gap-0.5" style={k2dStack}>
            <div className="flex items-center gap-4">
                <span className="text-[14px] font-bold text-white/40 tracking-wider whitespace-nowrap">Range:</span>
                <span className="text-white font-light text-[18px] whitespace-nowrap">
                    {show(first)} <span className="text-white/20 mx-1">→</span> {show(last)}{unitSuffix}
                </span>
            </div>
            <span className="text-[12px] font-bold text-white/30 tracking-wider whitespace-nowrap">
                {passes}{seconds > 0 ? ` · ≈ ${formatClock(Math.round(seconds))}` : ''}{lockFinal ? ' · then loops' : ''}
            </span>
        </div>
    );
};

export default TrackRangeDisplay;
