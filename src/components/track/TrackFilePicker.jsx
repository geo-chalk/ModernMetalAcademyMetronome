import React, {useEffect, useRef, useState} from 'react';
import {FileAudio, Upload, X, AlertTriangle, Loader2} from 'lucide-react';
import {formatClock} from '../ElapsedTime';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

const formatSize = (bytes) => {
    if (!Number.isFinite(bytes)) return '';
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

/**
 * The file behind Track mode: choose it, see it, replace it, remove it.
 *
 * A hidden <input type="file"> does the picking (it is the only way to reach
 * the Files app on iOS); on desktop the card also takes a drop. The states
 * come from useTrackLibrary — a file that is remembered but gone from this
 * device asks for the same file again, keeping its tempo.
 */
const TrackFilePicker = ({status, track, duration, message, onPick, onRemove, disabled = false}) => {
    const inputRef = useRef(null);
    const [over, setOver] = useState(false);

    const choose = () => {
        if (disabled) return;
        inputRef.current?.click();
    };

    const onChange = (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';           // picking the same file again must fire change
        if (file) onPick(file);
    };

    const onDrop = (e) => {
        e.preventDefault();
        setOver(false);
        if (disabled) return;
        const file = e.dataTransfer?.files?.[0];
        if (file) onPick(file);
    };

    // A file dragged in from the desktop can land anywhere on the page, not just
    // on this card: the card lights up as soon as the drag enters the window,
    // and the browser's default (navigating to the file) is suppressed.
    useEffect(() => {
        if (disabled) return undefined;
        const hasFiles = (e) => [...(e.dataTransfer?.types ?? [])].includes('Files');
        const onWindowDrag = (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setOver(true);
        };
        const onWindowLeave = (e) => {
            // relatedTarget is null when the pointer leaves the window itself.
            if (e.relatedTarget === null) setOver(false);
        };
        const onWindowDrop = (e) => {
            if (!hasFiles(e)) return;
            e.preventDefault();
            setOver(false);
            const file = e.dataTransfer.files[0];
            if (file) onPick(file);
        };
        window.addEventListener('dragenter', onWindowDrag);
        window.addEventListener('dragover', onWindowDrag);
        window.addEventListener('dragleave', onWindowLeave);
        window.addEventListener('drop', onWindowDrop);
        return () => {
            window.removeEventListener('dragenter', onWindowDrag);
            window.removeEventListener('dragover', onWindowDrag);
            window.removeEventListener('dragleave', onWindowLeave);
            window.removeEventListener('drop', onWindowDrop);
        };
    }, [disabled, onPick]);

    const input = (
        <input ref={inputRef} type="file" accept="audio/*" className="hidden" onChange={onChange}/>
    );

    const smallButton = "shrink-0 px-2.5 py-1.5 rounded-lg border text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed";
    const idleButton = "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white";

    if (status === 'empty' || (status === 'error' && !track)) {
        return (
            <div className="mb-3">
                {input}
                <button
                    type="button"
                    onClick={choose}
                    onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                    onDragLeave={() => setOver(false)}
                    onDrop={onDrop}
                    disabled={disabled}
                    className={`w-full flex flex-col items-center gap-2 p-5 short:p-3 rounded-xl border border-dashed transition-all ${
                        over ? 'border-[#FF820C] bg-[#FF820C]/10' : 'border-white/15 bg-white/[0.03] hover:border-white/30 hover:bg-white/5'
                    } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                    <Upload size={20} className="text-[#FF820C]"/>
                    <span className="text-white text-[14px] font-bold" style={k2dStack}>Choose an audio file</span>
                    <span className="text-white/40 text-[11px] tracking-wide" style={k2dStack}>
                        MP3, WAV, M4A · <span className="desktop-only">drop it here or </span>tap to browse
                    </span>
                </button>
                {message && <p className="mt-2 text-[12px] text-red-400/90" style={k2dStack}>{message}</p>}
            </div>
        );
    }

    const name = track?.name ?? 'Track';
    const isMissing = status === 'missing';
    const isError = status === 'error';
    const isLoading = status === 'loading';

    return (
        <div className="mb-3">
            {input}
            <div
                onDragOver={(e) => { e.preventDefault(); setOver(true); }}
                onDragLeave={() => setOver(false)}
                onDrop={onDrop}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    over ? 'border-[#FF820C] bg-[#FF820C]/10'
                        : isMissing || isError ? 'border-amber-400/40 bg-amber-400/5' : 'border-white/10 bg-white/[0.03]'
                }`}
            >
                <div className={`shrink-0 ${isMissing || isError ? 'text-amber-400' : 'text-[#FF820C]'}`}>
                    {isLoading ? <Loader2 size={20} className="animate-spin"/>
                        : isMissing || isError ? <AlertTriangle size={20}/> : <FileAudio size={20}/>}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white text-[14px] font-bold truncate" style={k2dStack} title={name}>{name}</div>
                    <div className="text-white/40 text-[11px] tracking-wide" style={k2dStack}>
                        {isLoading ? 'Loading…'
                            : isMissing ? 'Not on this device — choose this file again'
                            : isError ? (message ?? 'Cannot play this file')
                            : [duration > 0 ? formatClock(Math.round(duration)) : null, formatSize(track?.size)].filter(Boolean).join(' · ')}
                    </div>
                </div>
                <button type="button" onClick={choose} disabled={disabled}
                        className={`${smallButton} ${isMissing ? 'bg-[#FF820C]/10 border-[#FF820C] text-[#FF820C]' : idleButton}`}
                        style={k2dStack}>
                    {isMissing || isError ? 'Choose' : 'Replace'}
                </button>
                <button type="button" onClick={onRemove} disabled={disabled} aria-label="Remove track"
                        className="shrink-0 p-1.5 rounded-lg text-white/30 hover:text-red-400 transition-colors disabled:opacity-30">
                    <X size={14}/>
                </button>
            </div>
            {message && !isError && <p className="mt-2 text-[12px] text-red-400/90" style={k2dStack}>{message}</p>}
        </div>
    );
};

export default TrackFilePicker;
