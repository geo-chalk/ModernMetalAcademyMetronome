import React, {useState} from 'react';
import {Keyboard, ChevronDown} from "lucide-react";

const k2dStack = {fontFamily: "'K2D', sans-serif"};

// Inline emphasis for key terms inside body copy — same colour as the body,
// set apart by weight only (used sparingly).
const Em = ({children}) => <span className="text-white/70 font-semibold">{children}</span>;

const Section = ({title, defaultOpen = false, children}) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border-b border-white/5">
            <button
                type="button"
                onClick={() => setOpen(o => !o)}
                aria-expanded={open}
                className="w-full flex items-center justify-between py-4 text-left group"
            >
                <span
                    className="text-white text-[14px] font-black tracking-widest uppercase group-hover:text-[#FF820C] transition-colors"
                    style={k2dStack}>
                    {title}
                </span>
                <ChevronDown
                    size={16}
                    className={`text-[#FF820C] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
                />
            </button>
            {open && <div className="pb-5">{children}</div>}
        </div>
    );
};

const DefList = ({items}) => (
    <dl className="space-y-3">
        {items.map((item, i) => (
            <div key={i}>
                <dt className="text-white text-[14px] font-bold" style={k2dStack}>{item.term}</dt>
                <dd className="text-white/70 text-[14px] leading-relaxed font-light" style={k2dStack}>
                    {item.desc}
                </dd>
            </div>
        ))}
    </dl>
);

const Info = () => {
    // What each Trainer control does (Constant mode intentionally omitted).
    const trainerGuide = [
        {
            term: "Set your tempo",
            desc: <><Em>Tap the big BPM number</Em> to type an exact value, or drag the Start BPM slider — on
                touch, <Em>drag away from the bar</Em> for finer control.</>
        },
        {
            term: "Interval Type",
            desc: <><Em>Time</Em> speeds up every few seconds. <Em>Bars</Em> speeds up every few bars,
                staying locked to your playing no matter the tempo.</>
        },
        {
            term: "Pos. Increment",
            desc: <>How many BPM the tempo climbs at each step.</>
        },
        {
            term: "Neg. Increment",
            desc: <>Optional <Em>see-saw</Em>: drop back down a little each step for a back-and-forth workout. Capped at
                the positive increment, so you never fall below the start tempo.</>
        },
        {
            term: "Interval + Duration / Reps",
            desc: <>In <Em>Time</Em> mode, set how often it speeds up and the total length. In <Em>Bars</Em> mode, set
                the bars per step and how many reps to play.</>
        },
        {
            term: "Count-in & Time Signature",
            desc: <>Count-in adds lead-in bars before the session. The time signature and <Em>Accents</Em> toggle
                set the meter and emphasise the downbeat.</>
        },
        {
            term: "Lock Final BPM",
            desc: <>Keep clicking at the top tempo when the ramp finishes, instead of stopping.</>
        },
    ];

    const settingsGuide = [
        {
            term: "Volume & Accents",
            desc: <>The volume slider and Accents toggle sit on the main screen and in Sound Config. Accents give
                the first beat of each bar a higher pitch.</>
        },
        {
            term: "Sound Pack",
            desc: <>Switch between <Em>Synth</Em> (tunable pitched clicks) and <Em>Natural</Em> (sampled percussion).</>
        },
        {
            term: "Click sounds",
            desc: <>Give the accent, click, and count-in their own pitch (Synth) or sample (Natural).
                Hit <Em>Test Loop</Em> to preview.</>
        },
        {
            term: "Saved automatically",
            desc: <>Your settings and last tempo are stored on your device, ready the next time you open the app.</>
        },
    ];

    const cycles = [
        {title: "1. Exercise | Cycle One", subtitle: "Top speed minus 20 BPM", details: "2 min burst | +2 BPM every 10s"},
        {title: "2. Exercise | Cycle Two", subtitle: "Cycle One start + 5 BPM", details: "2 min burst | +2 BPM every 10s"},
        {title: "3. Exercise | Cycle Three", subtitle: "Cycle Two start + 5 BPM", details: "3 min burst | +2 BPM every 10s"},
    ];

    const shortcuts = [
        {key: "Space", action: "Start / Stop"},
    ];

    return (
        <div className="pt-0 pb-8 overflow-y-auto no-scrollbar touch-pan-y">
            <p className="text-white/40 text-[12px] font-bold tracking-wider uppercase pt-1 pb-2" style={k2dStack}>
                Guide
            </p>

            {/* How the app works (Trainer) */}
            <Section title="How the Trainer Works" defaultOpen>
                <DefList items={trainerGuide}/>
            </Section>

            {/* Sounds & settings */}
            <Section title="Sounds & Settings">
                <DefList items={settingsGuide}/>
            </Section>

            {/* Practice methodology */}
            <Section title="How to Practice Each Hack">
                <p className="text-white/70 text-[14px] leading-relaxed font-light mb-4" style={k2dStack}>
                    Play the exercise for exactly 1 minute repeating the phrase. After finishing, your hand and
                    arm <span className="text-white font-bold underline decoration-[#FF820C]">MUST NOT BE TIRED.</span>
                </p>
                <div className="space-y-3">
                    {cycles.map((cycle, i) => (
                        <div key={i} className="bg-white/[0.03] p-4 rounded-md border border-white/5">
                            <h3 className="text-white text-[15px] font-bold mb-1" style={k2dStack}>{cycle.title}</h3>
                            <p className="text-[#FF820C] text-[14px] tracking-wider mb-2" style={k2dStack}>{cycle.subtitle}</p>
                            <p className="text-white/80 text-[14px] font-light" style={k2dStack}>{cycle.details}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Keyboard shortcuts — only useful with a physical keyboard */}
            <div className="desktop-only pt-5">
                <div className="flex items-center gap-2 mb-4 text-white">
                    <Keyboard size={12}/>
                    <h2 className="text-[14px] font-black tracking-widest uppercase" style={k2dStack}>
                        Keyboard Shortcuts
                    </h2>
                </div>
                <div className="grid grid-cols-1 gap-2">
                    {shortcuts.map((s, i) => (
                        <div key={i} className="flex justify-between items-center text-[14px]">
                            <span className="text-white/40 uppercase" style={k2dStack}>{s.action}</span>
                            <span className="bg-white/10 text-white/90 px-2 py-0.5 rounded border border-white/10 font-mono">
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
