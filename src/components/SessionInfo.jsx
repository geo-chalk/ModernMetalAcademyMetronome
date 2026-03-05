import React from "react";
import {Activity, Target} from "lucide-react";

const SessionInfo = ({startBpm, endBpm, mode}) => {
    // If mode is "info", return null for now (blank)
    if (mode === "info") return null;

    // Hide component entirely if not in trainer mode
    if (mode !== "trainer") return null;

    return (
        <div className="mt-8 pt-8 border-t border-white/5 grid grid-cols-2 gap-4">
            <div className="bg-white/[0.02] p-4 border border-white/5">
                <div
                    className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-white/30">
                    <Activity size={10}/>
                    <span>Floor</span>
                </div>
                <div className="font-mono text-xl text-white/90">
                    {startBpm}
                    <span className="text-[10px] ml-1 opacity-30">BPM</span>
                </div>
            </div>

            <div className="bg-[#FF820C]/[0.02] p-4 border border-[#FF820C]/10">
                <div
                    className="flex items-center gap-2 mb-2 text-[10px] font-black uppercase tracking-widest text-[#FF820C]/40">
                    <Target size={10}/>
                    <span>Ceiling</span>
                </div>
                <div className="font-mono text-xl text-[#FF820C]">
                    {endBpm}
                    <span className="text-[10px] ml-1 opacity-30">BPM</span>
                </div>
            </div>
        </div>
    );
};

export default SessionInfo;