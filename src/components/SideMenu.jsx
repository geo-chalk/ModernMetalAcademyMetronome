import React from 'react';
import { X, FastForward, Infinity as InfinityIcon, Info, Volume2, Rows } from 'lucide-react';

const SideMenu = ({ isOpen, onClose, mode, setMode, forceSingleColumn = false, onToggleSingleColumn }) => {
    const handleModeChange = (newMode) => {
        setMode(newMode);
        onClose();
    };

    return (
        <>
            {/* Backdrop */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`fixed top-0 left-0 h-full w-64 twocol:w-72 bg-[#1E1E1E] border-r border-white/10 z-[101] transition-transform duration-300 ease-out safe-pad-drawer ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex justify-between items-center mb-8">
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Menu</span>
                    <button onClick={onClose} className="text-white/40 hover:text-white"><X size={20}/></button>
                </div>

                <nav className="flex flex-col gap-2">
                    {[
                        { id: 'trainer', label: 'Trainer', icon: <FastForward size={18}/> },
                        { id: 'constant', label: 'Constant', icon: <InfinityIcon size={18}/> },
                        { id: 'info', label: 'Info', icon: <Info size={18}/> },
                        { id: 'sound', label: 'Sound Config', icon: <Volume2 size={18}/> }
                    ].map((m) => (
                        <button
                            key={m.id}
                            onClick={() => handleModeChange(m.id)}
                            className={`flex items-center gap-4 p-4 rounded-lg font-black uppercase tracking-widest text-xs transition-all ${
                                mode === m.id ? 'bg-[#FF820C] text-white' : 'text-white/40 hover:bg-white/5'
                            }`}
                        >
                            {m.icon} {m.label}
                        </button>
                    ))}
                </nav>

                {/* Layout: only shown where the two-column Trainer applies (the
                    `twocol` screen), since below that it changes nothing. */}
                <div className="hidden twocol:block mt-6 pt-6 border-t border-white/5">
                    <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Layout</span>
                    <button
                        type="button"
                        onClick={onToggleSingleColumn}
                        aria-pressed={forceSingleColumn}
                        className={`mt-2 w-full flex items-center justify-between gap-3 p-3 rounded-lg font-black uppercase tracking-wider text-[11px] transition-all ${
                            forceSingleColumn ? 'text-white bg-white/5' : 'text-white/40 hover:bg-white/5'
                        }`}
                    >
                        <span className="flex items-center gap-3"><Rows size={18}/> Vertical layout</span>
                        <span className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${
                            forceSingleColumn ? 'bg-[#FF820C]' : 'bg-white/10'
                        }`}>
                            <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-out ${
                                forceSingleColumn ? 'translate-x-4' : 'translate-x-0'
                            }`}/>
                        </span>
                    </button>
                    <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
                        Keep the Trainer in one column on wide screens.
                    </p>
                </div>
            </div>
        </>
    );
};

export default SideMenu;