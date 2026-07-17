import React from 'react';
import {ChevronDown} from 'lucide-react';

const CountdownSelector = ({value, setter, isActive}) => {
    return (
        <div className="flex items-center border-r border-white/10 pr-6 h-20">
            <div className="flex flex-col items-center gap-1">
                <span className="text-[10px] font-black text-white/50 tracking-widest">Count-in</span>
                <div className={`relative flex items-center group rounded-md transition-all border border-transparent ${
                    !isActive ? 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/10 cursor-pointer' : 'opacity-50'
                } p-2`}>
                    <select
                        value={value}
                        onChange={(e) => setter(Number(e.target.value))}
                        disabled={isActive}
                        className="bg-transparent text-white text-3xl font-black focus:outline-none appearance-none cursor-pointer text-center z-10 pr-4 leading-none"
                    >
                        {[0, 1, 2, 3, 4].map(num => (
                            <option key={num} value={num} className="bg-[#1E1E1E]">{num}</option>
                        ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-1 text-[#FF820C] opacity-50 group-hover:opacity-100 pointer-events-none"/>
                </div>
                <span className="text-[10px] font-bold text-white/50">Bars</span>
            </div>
        </div>
    );
};

export default CountdownSelector;