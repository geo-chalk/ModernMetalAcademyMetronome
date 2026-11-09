import React from 'react';
import {Play, Square, Volume2} from 'lucide-react';
import {formatClock} from '../ElapsedTime';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

/**
 * What you watch while the track plays: name, position in the file, a preview
 * button for tapping the tempo along to the song at its own speed, and the
 * track's volume (separate from the click's, so the two can be balanced).
 */
const TrackStrip = ({name, position, duration, isPreviewing, isActive, canPreview, onTogglePreview, volume, setVolume}) => {
    const pct = duration > 0 ? Math.min(100, (position / duration) * 100) : 0;
    const playing = isActive || isPreviewing;

    return (
        <div className="flex flex-col gap-2 py-2 short:gap-1 short:py-0">
            <div className="flex justify-between items-center gap-3 text-white/40 tracking-[0.1em]">
                <span className="text-[12px] font-black truncate" style={k2dStack} title={name ?? ''}>
                    {name ?? 'No track'}
                </span>
                <span className={`text-[14px] font-black tabular-nums shrink-0 ${playing ? 'text-white/60' : 'text-white/30'}`}
                      style={k2dStack}>
                    {formatClock(playing ? position : 0)} / {formatClock(Math.round(duration || 0))}
                </span>
            </div>
            <div className="w-full bg-white/5 h-[2px] rounded-full overflow-hidden">
                <div className="h-full bg-white/40" style={{width: `${playing ? pct : 0}%`, willChange: 'width'}}/>
            </div>

            <div className="flex items-center gap-3 mt-1">
                <button
                    type="button"
                    onClick={onTogglePreview}
                    disabled={!canPreview || isActive}
                    aria-pressed={isPreviewing}
                    className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100 ${
                        isPreviewing
                            ? 'bg-[#FF820C]/10 border-[#FF820C] text-[#FF820C]'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white'
                    }`}
                    style={k2dStack}
                >
                    {isPreviewing ? <Square size={12} fill="currentColor"/> : <Play size={12} fill="currentColor"/>}
                    {isPreviewing ? 'Stop' : 'Preview'}
                </button>
                <div className="flex-1 flex items-center gap-3 px-1">
                    <Volume2 size={14} className="text-white"/>
                    <div className="relative flex-1 h-8 flex items-center">
                        <div className="absolute inset-x-0 h-1 bg-white/10 rounded-full pointer-events-none"/>
                        <input
                            type="range" min="0" max="100" step="1" value={volume}
                            onChange={(e) => setVolume(Number(e.target.value))}
                            aria-label="Track volume"
                            className="relative z-10 w-full h-full bg-transparent appearance-none cursor-pointer accent-[#FF820C]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TrackStrip;
