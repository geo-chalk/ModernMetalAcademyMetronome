import React from 'react';
import { ChevronDown } from 'lucide-react';

const TimeSignatureSelector = ({ top, bottom, setTop, setBottom, isActive }) => {
  return (
    <div className="flex items-center border-l border-white/10 pl-6">
      <div
        className={`relative flex flex-col items-center justify-center p-2 rounded-lg transition-all border border-transparent ${
          !isActive ? 'bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/10 cursor-pointer' : 'opacity-50'
        }`}
      >
        {/* Top Number */}
        <div className="relative flex items-center group">
          <select
            value={top}
            onChange={(e) => setTop(Number(e.target.value))}
            disabled={isActive}
            className="bg-transparent text-white text-3xl font-black focus:outline-none appearance-none cursor-pointer text-center z-10 pr-4 leading-none"
          >
            {[2, 3, 4, 5, 6, 7, 8, 9, 12].map(num => (
              <option key={num} value={num} className="bg-[#1E1E1E]">{num}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-0 text-[#FF5500] opacity-50 group-hover:opacity-100 pointer-events-none" />
        </div>

        <div className="w-10 h-[1px] bg-white/20 my-1" />

        {/* Bottom Number */}
        <div className="relative flex items-center group">
          <select
            value={bottom}
            onChange={(e) => setBottom(Number(e.target.value))}
            disabled={isActive}
            className="bg-transparent text-white text-3xl font-black focus:outline-none appearance-none cursor-pointer text-center z-10 pr-4 leading-none"
          >
            {[2, 4, 8, 16].map(num => (
              <option key={num} value={num} className="bg-[#1E1E1E]">{num}</option>
            ))}
          </select>
          <ChevronDown size={10} className="absolute right-0 text-white/20 group-hover:text-white/40 pointer-events-none" />
        </div>
      </div>
    </div>
  );
};

export default TimeSignatureSelector;