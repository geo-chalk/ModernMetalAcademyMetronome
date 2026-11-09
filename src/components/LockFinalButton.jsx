import React from 'react';

const k2dStack = {fontFamily: "'K2D', sans-serif"};

// "Keep going at the top speed when the ramp finishes" — the Trainer's Lock Final
// BPM and Track mode's Lock final are the same button with a different label.
const LockFinalButton = ({locked, onToggle, disabled = false, label = 'Lock Final BPM', lockedLabel = 'Locked'}) => (
    <button
        onClick={onToggle}
        disabled={disabled}
        className={`
            group relative flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-xl border transition-all duration-300 whitespace-nowrap
            ${locked
                ? "bg-[#FF820C]/10 border-[#FF820C] text-[#FF820C] shadow-[0_0_15px_rgba(255,130,12,0.1)]"
                : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white hover:bg-white/[0.07]"
            }
            ${disabled ? "opacity-30 cursor-not-allowed" : "active:scale-95"}
        `}
    >
        {/* Dynamic Icon with slight bounce animation */}
        <div className={`transition-transform duration-300 ${locked ? "scale-110" : "scale-100"}`}>
            {locked ? (
                <div className="relative">
                    <div className="absolute inset-0 blur-sm bg-[#FF820C]/30 rounded-full"/>
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                         viewBox="0 0 24 24" fill="none" stroke="currentColor"
                         strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                </div>
            ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14"
                     viewBox="0 0 24 24" fill="none" stroke="currentColor"
                     strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
                </svg>
            )}
        </div>

        <span className="text-[10px] font-black uppercase tracking-[0.08em] leading-none mt-0.5" style={k2dStack}>
            {locked ? lockedLabel : label}
        </span>

        {/* Subtle inner glow for active state */}
        {locked && <div className="absolute inset-0 rounded-xl border border-white/10 pointer-events-none"/>}
    </button>
);

export default LockFinalButton;
