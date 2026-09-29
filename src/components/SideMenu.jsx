import React from 'react';
import { X, FastForward, Infinity as InfinityIcon, Info, Volume2, Rows, Maximize, Minimize } from 'lucide-react';

const Switch = ({on}) => (
    <span className={`relative shrink-0 w-9 h-5 rounded-full transition-colors duration-200 ${on ? 'bg-[#FF820C]' : 'bg-white/10'}`}>
        <span className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-out ${on ? 'translate-x-4' : 'translate-x-0'}`}/>
    </span>
);

const rowClass = (on) => `mt-2 w-full flex items-center justify-between gap-3 p-3 rounded-lg font-black uppercase tracking-wider text-[11px] transition-all ${
    on ? 'text-white bg-white/5' : 'text-white/40 hover:bg-white/5'}`;

const SideMenu = ({ isOpen, onClose, mode, setMode, forceSingleColumn = false, onToggleSingleColumn, fullscreen }) => {
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

                {/* Display. Fullscreen hides the browser's URL bar on Android Chrome and
                    the window chrome on desktop; iPhone Safari has no such API, so the
                    row isn't offered there (installing to the home screen is the way).
                    Vertical layout only shows where the two-column Trainer applies. */}
                <div className={`mt-6 pt-6 border-t border-white/5 ${fullscreen?.supported ? '' : 'hidden twocol:block'}`}>
                        <span className="text-[10px] font-black tracking-widest text-white/40 uppercase">Display</span>
                        {fullscreen?.supported && (
                            <button type="button" onClick={fullscreen.toggle} aria-pressed={fullscreen.active}
                                    className={rowClass(fullscreen.active)}>
                                <span className="flex items-center gap-3">
                                    {fullscreen.active ? <Minimize size={18}/> : <Maximize size={18}/>} Fullscreen
                                </span>
                                <Switch on={fullscreen.active}/>
                            </button>
                        )}
                        <div className="hidden twocol:block">
                            <button type="button" onClick={onToggleSingleColumn} aria-pressed={forceSingleColumn}
                                    className={rowClass(forceSingleColumn)}>
                                <span className="flex items-center gap-3"><Rows size={18}/> Vertical layout</span>
                                <Switch on={forceSingleColumn}/>
                            </button>
                            <p className="text-[10px] text-white/25 mt-2 leading-relaxed">
                                Keep the Trainer in one column on wide screens.
                            </p>
                        </div>
                </div>
            </div>
        </>
    );
};

export default SideMenu;