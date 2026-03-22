import React from 'react';
import { X, FastForward, Infinity as InfinityIcon, Info, Volume2 } from 'lucide-react';

const SideMenu = ({ isOpen, onClose, mode, setMode }) => {
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
            <div className={`fixed top-0 left-0 h-full w-64 bg-[#1E1E1E] border-r border-white/10 z-[101] transition-transform duration-300 ease-out p-6 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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
            </div>
        </>
    );
};

export default SideMenu;