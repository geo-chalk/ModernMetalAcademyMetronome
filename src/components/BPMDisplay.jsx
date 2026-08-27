import React, {useEffect, useState} from 'react';
import {Pencil} from 'lucide-react';
import {BPM_MAX, BPM_MIN, clampBpm} from '../constants/bpm';

const numberFont = {fontFamily: 'system-ui, -apple-system, sans-serif'};

const BPMDisplay = ({
                        bpm,
                        setBpm,
                        isActive,
                        locked = false,
                        onTap,
                        onTapReset,
                        tapCount = 0,
                        tapPulse = 0,
                        minTaps = 3
                    }) => {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    const listening = tapCount > 0 && !editing;

    // A Trainer session starting mid-edit closes the editor.
    useEffect(() => {
        if (locked) setEditing(false);
    }, [locked]);

    const beginEdit = () => {
        if (locked) return;
        onTapReset?.();          // an in-flight tap sequence isn't relevant any more
        setDraft(String(bpm));
        setEditing(true);
    };

    const commitEdit = () => {
        // Clamped on commit, not per keystroke: clamping every keystroke against a
        // floor of 40 would rewrite a half-typed "4" to "40" and make three-digit
        // entry impossible.
        const parsed = parseInt(draft, 10);
        if (Number.isFinite(parsed)) setBpm(clampBpm(parsed));
        setEditing(false);
    };

    // pointerdown, not click: pointerdown fires on contact, whereas on touch a
    // click fires on *release* after the browser's tap-gesture recognition —
    // which would fold hold-duration variance straight into the measured interval.
    const handlePointerDown = (e) => {
        if (locked || editing) return;
        // Left button only, so a right-click for the context menu isn't a tap.
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        // Suppresses the text-selection flicker from fast repeated taps, and the
        // iOS selection callout.
        e.preventDefault();
        onTap?.(e);
    };

    return (
        <div className="text-center mb-2 select-none">
            {editing ? (
                <input
                    type="number"
                    inputMode="numeric"
                    autoFocus
                    value={draft}
                    min={BPM_MIN}
                    max={BPM_MAX}
                    onChange={(e) => setDraft(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') commitEdit();
                        if (e.key === 'Escape') setEditing(false);
                    }}
                    style={numberFont}
                    className="bg-transparent text-white text-7xl font-black text-center w-full focus:outline-none tabular-nums leading-none"
                />
            ) : (
                <button
                    type="button"
                    onPointerDown={handlePointerDown}
                    aria-label="Tap tempo"
                    style={{...numberFont, WebkitTouchCallout: 'none'}}
                    className={`relative block w-full rounded-2xl bg-transparent text-white text-7xl font-black
                                text-center tabular-nums leading-none touch-none
                                focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF820C]/40
                                ${locked ? 'cursor-default' : 'cursor-pointer'}
                                ${listening ? 'ring-1 ring-[#FF820C]/30' : ''}`}
                >
                    {bpm}
                    {/* One-shot flash per tap. Keyed by tapPulse so it restarts even when
                        two taps land in the same render — same idiom as BeatIndicators'
                        pulseTick remount. */}
                    {listening && (
                        <span key={tapPulse}
                              className="absolute inset-0 rounded-2xl tap-flash pointer-events-none"/>
                    )}
                </button>
            )}

            {/* Fixed height so the caption swapping between BPM and the tap counter
                never shifts the layout. */}
            <div className="mt-2 h-4 flex items-center justify-center gap-2">
                {listening ? (
                    <span className="text-[#FF820C] uppercase tracking-[0.2em] text-xs font-bold tabular-nums">
                        {tapCount < minTaps ? `Tap ${tapCount}/${minTaps}` : `Tap ×${tapCount}`}
                    </span>
                ) : (
                    <span className="text-white/40 uppercase tracking-[0.2em] text-xs font-bold">BPM</span>
                )}
                {!locked && !editing && (
                    <button
                        type="button"
                        onClick={beginEdit}
                        aria-label="Type an exact BPM"
                        className="text-white/25 hover:text-[#FF820C] transition-colors"
                    >
                        <Pencil size={11}/>
                    </button>
                )}
            </div>

            {/* Discoverability: the readout doesn't look tappable on its own. Fixed
                height so the hint appearing and disappearing never nudges the layout.
                The "press T" half is desktop-only — there's no keyboard on touch, and
                the narrower container can't fit it anyway. */}
            <div className="h-3">
                {!locked && !editing && !listening && (
                    <span className="text-white/25 text-[10px] tracking-wide whitespace-nowrap">
                        Tap to set tempo<span className="desktop-only"> · or press T</span>
                    </span>
                )}
            </div>
        </div>
    );
};

export default BPMDisplay;
