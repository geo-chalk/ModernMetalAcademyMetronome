import React from 'react';

const AccentSwitch = ({ isOn, onToggle }) => {
    return (
        /* items-center centers the children horizontally in the column */
        <div className="flex flex-col items-center gap-1.5 select-none">
            <span className="text-[10px] font-black tracking-[0.15em] text-white/40 text-center">
                Accents
            </span>
            <button
                onClick={onToggle}
                className={`relative w-9 h-5 rounded-full transition-colors duration-200 focus:outline-none ${
                    isOn ? 'bg-[#FF820C]' : 'bg-white/10'
                }`}
            >
                <div
                    className={`absolute top-1 left-1 bg-white w-3 h-3 rounded-full transition-transform duration-200 ease-out ${
                        isOn ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
};

export default AccentSwitch;