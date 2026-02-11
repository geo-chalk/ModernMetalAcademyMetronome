import React from 'react';
import { ChevronDown } from 'lucide-react';

const CountdownSelector = ({ value, setter, isActive }) => {
  return (
    <div className="flex flex-col items-center gap-1 pr-4 border-r border-white/10">
      <span className="text-[8px] font-black text-white/20 tracking-widest">Countdown</span>
      <div className={`relative flex items-center group rounded-md transition-all ${
        !isActive ? 'bg-white/[0.03] hover:bg-white/[0.08] cursor-pointer' : 'opacity-50'
      } p-1.5`}>
        <select
          value={value}
          onChange={(e) => setter(Number(e.target.value))}
          disabled={isActive}
          className="bg-transparent text-white text-xl font-mono font-bold focus:outline-none appearance-none cursor-pointer text-center z-10 pr-4 leading-none"
        >
          {[1, 2, 3, 4].map(num => (
            <option key={num} value={num} className="bg-[#1E1E1E]">{num}</option>
          ))}
        </select>
        <ChevronDown size={10} className="absolute right-1 text-white/20 pointer-events-none" />
      </div>
      <span className="text-[8px] font-bold text-white/20">Bars</span>
    </div>
  );
};

export default CountdownSelector;