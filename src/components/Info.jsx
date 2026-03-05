import React from 'react';
import { Keyboard } from "lucide-react";

const Info = () => {
  const k2dStack = { fontFamily: "'K2D', sans-serif" };

  const cycles = [
    { title: "1. Exercise | Cycle One", subtitle: "Top speed minus 20 BPM", details: "2 min burst | +2 BPM every 10s" },
    { title: "2. Exercise | Cycle Two", subtitle: "Cycle One start + 5 BPM", details: "2 min burst | +2 BPM every 10s" },
    { title: "3. Exercise | Cycle Three", subtitle: "Cycle Two start + 5 BPM", details: "3 min burst | +2 BPM every 10s" }
  ];

  const shortcuts = [
    { key: "Space", action: "Start / Stop" },
    // { key: "Up / Down", action: "+1 / -1 BPM" },
    // { key: "Shift + Up", action: "+5 BPM" }
  ];

  return (
    <div className="space-y-6 pt-0 pb-8 overflow-y-auto no-scrollbar touch-pan-y">
      {/* Header */}
      <h1 className="text-[#FF820C] text-sm font-black tracking-[0.2em] uppercase border-b border-white/5 pb-4" style={k2dStack}>
        How to Practice Each Hack
      </h1>

      {/* Main Tip */}
      <section>
        <h2 className="text-white text-[16px] font-black tracking-widest uppercase mb-2 opacity-100" style={k2dStack}>
          Find Your Top Speed
        </h2>
        <p className="text-white/70 text-[14px] leading-relaxed font-light" style={k2dStack}>
          Play the exercise for exactly 1 minute repeating the phrase. After finishing, your hand and arm <span className="text-white font-bold underline decoration-[#FF820C]">MUST NOT BE TIRED.</span>
        </p>
      </section>

      {/* Exercise Cycles */}
      <div className="space-y-4 pt-2">
        {cycles.map((cycle, i) => (
          <div key={i} className="bg-white/[0.03] p-4 rounded-md border border-white/5">
            <h2 className="text-white text-[16px] font-bold mb-1" style={k2dStack}>{cycle.title}</h2>
            <p className="text-[#FF820C]/60 text-[14px] tracking-wider mb-2" style={k2dStack}>{cycle.subtitle}</p>
            <p className="text-white/50 text-[14px] font-light" style={k2dStack}>{cycle.details}</p>
          </div>
        ))}
      </div>

      {/* Shortcuts Section */}
      <div className="pt-4 border-t border-white/5">
        <div className="flex items-center gap-2 mb-4 opacity-100 text-white">
            <Keyboard size={12} />
            <h2 className="text-[14px] font-black tracking-widest uppercase" style={k2dStack}>
                Keyboard Shortcuts
            </h2>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex justify-between items-center text-[14px] font-mono tracking-tighter">
              <span className="text-white/40 uppercase" style={k2dStack}>{s.action}</span>
              <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded border border-white/10">
                {s.key}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Info;