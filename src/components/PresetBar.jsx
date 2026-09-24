import React, {useEffect, useRef, useState} from 'react';
import {Bookmark, Check, ChevronDown, Trash2, X} from 'lucide-react';
import {MAX_NAME_LENGTH} from '../constants/presets';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

/**
 * Save / load / delete for trainer drills, as one row above Interval Type.
 *
 * Naming happens inline rather than through window.prompt(): prompt blocks the
 * whole page, looks nothing like the rest of the app, and is suppressed outright
 * in some embedded contexts. The row swaps to a text field instead, the same way
 * the BPM readout swaps to an input behind its pencil.
 */
const PresetBar = ({presets, selectedId, onSelect, onSave, onDelete, isFull, disabled}) => {
    const [naming, setNaming] = useState(false);
    const [draft, setDraft] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (naming) inputRef.current?.focus();
    }, [naming]);

    // Leaving Trainer mode (or starting a run) mid-rename shouldn't strand the row
    // in its editing state.
    useEffect(() => {
        if (disabled) setNaming(false);
    }, [disabled]);

    const selected = presets.find(p => p.id === selectedId);

    const beginNaming = () => {
        // Pre-fill with the loaded preset's name, so Save on a tweaked preset
        // reads as "update this one" — usePresets overwrites on a name match.
        setDraft(selected?.name ?? '');
        setNaming(true);
    };

    const commit = () => {
        if (draft.trim()) onSave(draft);
        setNaming(false);
        setDraft('');
    };

    const cancel = () => {
        setNaming(false);
        setDraft('');
    };

    const iconButton = "shrink-0 p-2 rounded-lg border transition-all active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100";
    const idleButton = "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/[0.07]";

    if (naming) {
        return (
            <div className="flex items-center gap-2 mb-2">
                <input
                    ref={inputRef}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        // Stop Space, A, T and the arrows reaching the window listener
                        // while a name is being typed. isTypingTarget already covers
                        // this, but an explicit stop keeps the field independent of
                        // that guard.
                        e.stopPropagation();
                        if (e.key === 'Enter') commit();
                        if (e.key === 'Escape') cancel();
                    }}
                    maxLength={MAX_NAME_LENGTH}
                    placeholder="Preset name"
                    className="flex-1 min-w-0 bg-white/5 border border-[#FF820C]/50 rounded-lg px-3 py-2 text-[14px] text-white placeholder:text-white/25 focus:outline-none focus:border-[#FF820C]"
                    style={k2dStack}
                />
                <button onClick={commit} disabled={!draft.trim()} aria-label="Confirm preset name"
                        className={`${iconButton} bg-[#FF820C]/10 border-[#FF820C] text-[#FF820C]`}>
                    <Check size={14}/>
                </button>
                <button onClick={cancel} aria-label="Cancel" className={`${iconButton} ${idleButton}`}>
                    <X size={14}/>
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2 mb-2">
            <div className="relative flex-1 min-w-0">
                <select
                    value={selectedId ?? ''}
                    onChange={(e) => onSelect(e.target.value)}
                    disabled={disabled || presets.length === 0}
                    aria-label="Load a preset"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-3 pr-8 py-2 text-[14px] text-white appearance-none cursor-pointer focus:outline-none focus:border-white/20 disabled:opacity-40 disabled:cursor-not-allowed truncate"
                    style={k2dStack}
                >
                    <option value="" className="bg-[#1E1E1E]">
                        {presets.length === 0 ? 'No presets saved' : 'Load a preset…'}
                    </option>
                    {presets.map(p => (
                        <option key={p.id} value={p.id} className="bg-[#1E1E1E]">{p.name}</option>
                    ))}
                </select>
                <ChevronDown size={12}
                             className="absolute right-3 top-1/2 -translate-y-1/2 text-[#FF820C] opacity-50 pointer-events-none"/>
            </div>

            <button
                onClick={beginNaming}
                disabled={disabled || (isFull && !selected)}
                title={isFull && !selected ? 'Preset list is full — delete one first' : 'Save these settings'}
                aria-label="Save these settings as a preset"
                className={`${iconButton} ${idleButton}`}
            >
                <Bookmark size={14}/>
            </button>

            {selected && (
                <button onClick={() => onDelete(selected.id)} disabled={disabled}
                        aria-label={`Delete preset ${selected.name}`}
                        className={`${iconButton} bg-white/5 border-white/10 text-white/40 hover:border-red-500/40 hover:text-red-400`}>
                    <Trash2 size={14}/>
                </button>
            )}
        </div>
    );
};

export default PresetBar;
