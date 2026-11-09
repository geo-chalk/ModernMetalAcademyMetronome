import React, {useEffect, useState} from 'react';
import {Loader2, Sparkles} from 'lucide-react';
import {BPM_MAX, BPM_MIN, clampBpm} from '../../constants/bpm';
import {DETECT_RANGES} from '../../hooks/useBpmDetection';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

const SOURCE_LABEL = {tap: 'tapped', manual: 'typed', detect: 'detected'};

/**
 * The song's own tempo. Percent ranges don't need it; BPM ranges and the BPM
 * readout do. Three ways in: type it, tap the big BPM number while the preview
 * plays (App's tap tempo lands in the same setter), or let the detector guess
 * it from the file. ×2 / ÷2 fix the octave the detector — or a tapper — got wrong.
 */
const TrackTempoInput = ({originalBpm, setOriginalBpm, bpmSource, disabled = false, hasTrack, detection, canDetect}) => {
    const [draft, setDraft] = useState(originalBpm ? String(originalBpm) : '');
    const [rangeId, setRangeId] = useState('mid');

    // A tap, a detection, a preset or another file changes the value under the field.
    useEffect(() => {
        setDraft(originalBpm ? String(originalBpm) : '');
    }, [originalBpm]);

    const commit = () => {
        const parsed = parseInt(draft, 10);
        if (Number.isFinite(parsed)) setOriginalBpm(clampBpm(parsed), 'manual');
        else setDraft(originalBpm ? String(originalBpm) : '');
    };

    const octave = (factor) => {
        if (!originalBpm) return;
        setOriginalBpm(clampBpm(originalBpm * factor), bpmSource ?? 'manual');
    };

    const runDetect = async () => {
        const range = DETECT_RANGES.find(r => r.id === rangeId) ?? DETECT_RANGES[1];
        const bpm = await detection.detect(range);
        if (bpm) setOriginalBpm(bpm, 'detect');
    };

    const working = detection?.status === 'working';
    const range = DETECT_RANGES.find(r => r.id === (detection?.result?.rangeId ?? rangeId));
    const sourceLabel = SOURCE_LABEL[bpmSource] ?? null;

    const chip = "px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed";
    const octaveBtn = "shrink-0 px-1.5 py-1 rounded-md border border-white/10 bg-white/5 text-[10px] font-black text-white/40 hover:text-white hover:border-white/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

    return (
        <div className={`py-2 short:py-1 ${!hasTrack ? 'opacity-40' : ''}`}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col min-w-0">
                    <span className="text-[14px] font-bold text-white/40 tracking-wider" style={k2dStack}>Song tempo</span>
                    <span className="text-[10px] text-white/25 tracking-wide short:hidden" style={k2dStack}>
                        {originalBpm
                            ? `${sourceLabel ?? 'set'} · needed for BPM ranges`
                            : 'Type it, tap the BPM above while previewing, or detect it'}
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <button type="button" onClick={() => octave(0.5)} disabled={disabled || !originalBpm}
                            title="Halve: the tempo is double-time" aria-label="Halve the tempo"
                            className={octaveBtn} style={k2dStack}>÷2</button>
                    <input
                        type="number"
                        inputMode="numeric"
                        min={BPM_MIN}
                        max={BPM_MAX}
                        placeholder="—"
                        value={draft}
                        disabled={disabled || !hasTrack}
                        onChange={(e) => setDraft(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onBlur={commit}
                        onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') e.target.blur();
                            if (e.key === 'Escape') { setDraft(originalBpm ? String(originalBpm) : ''); e.target.blur(); }
                        }}
                        aria-label="Song tempo in BPM"
                        className="w-[4.5rem] bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-[16px] text-white text-right tabular-nums focus:outline-none focus:border-[#FF820C] disabled:cursor-not-allowed"
                        style={k2dStack}
                    />
                    <button type="button" onClick={() => octave(2)} disabled={disabled || !originalBpm}
                            title="Double: the tempo is half-time" aria-label="Double the tempo"
                            className={octaveBtn} style={k2dStack}>×2</button>
                </div>
            </div>

            {/* Detection: pick the range the song's tempo falls in (the detector folds
                everything into the range it is given), then let it listen. */}
            {hasTrack && detection && (
                <div className="mt-2 flex items-center justify-between gap-3">
                    <div className="flex bg-white/5 rounded-lg p-0.5 border border-white/5">
                        {DETECT_RANGES.map(r => (
                            <button key={r.id} type="button" onClick={() => setRangeId(r.id)} disabled={disabled || working}
                                    title={`${r.min}–${r.max} BPM`}
                                    className={`${chip} ${rangeId === r.id ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}`}
                                    style={k2dStack}>
                                {r.label}
                            </button>
                        ))}
                    </div>
                    <button type="button" onClick={runDetect} disabled={disabled || working || !canDetect}
                            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-[10px] font-black uppercase tracking-widest text-white/60 hover:text-white hover:border-white/20 transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                            style={k2dStack}>
                        {working ? <Loader2 size={12} className="animate-spin"/> : <Sparkles size={12}/>}
                        {working ? 'Listening…' : 'Detect'}
                    </button>
                </div>
            )}
            {hasTrack && detection?.status === 'done' && detection.result && (
                <p className="mt-1.5 text-[11px] text-white/40 tracking-wide" style={k2dStack}>
                    Detected <span className="text-white/70 font-semibold">{detection.result.bpm} bpm</span>
                    {range ? ` in the ${range.min}–${range.max} range` : ''}. Sounds half- or double-time? Use ×2 / ÷2.
                </p>
            )}
            {hasTrack && detection?.status === 'error' && (
                <p className="mt-1.5 text-[11px] text-red-400/90 tracking-wide" style={k2dStack}>{detection.error}</p>
            )}
        </div>
    );
};

export default TrackTempoInput;
