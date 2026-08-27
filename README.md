# Modern Metal Academy Metronome 🎸

A professional-grade, high-performance web metronome built for technical guitar training and speed building. Powered by the **Tone.js** audio engine (a look-ahead scheduler on the Web Audio clock) for rock-solid, drift-free timing.

## 🔗 Live Demo
**[Launch Metronome App](https://geo-chalk.github.io/ModernMetalAcademyMetronome/)**

---

## 🚀 Features

### Two modes (switch from the toggle at the top)
* **Trainer** — automatically ramps the tempo as you play, to build stamina and master riffs incrementally.
* **Constant** — a steady, high-precision metronome. Tempo is adjustable live while it plays.
* The tempo is **shared** across both modes, so it carries over when you switch. Switching modes (or opening the menu) stops a running session.

### Trainer ramp controls
* **Interval Type — Time or Bars:**
  * *Time* speeds up every few **seconds**, for a total **Duration**.
  * *Bars* speeds up every few **bars** for a number of **Reps** — staying locked to your playing regardless of tempo.
* **Pos. Increment** — how many BPM the tempo climbs at each step.
* **Neg. Increment (see-saw)** — optionally drop back down a little each step for a back-and-forth workout. Capped at the positive increment, so the net tempo never falls below your start.
* **Rest** — optional recovery between intervals (in seconds or bars). The metronome goes quiet, a **count-in leads you back in**, and the Cycle bar turns blue to show the rest. Short rests fill with as many count-in ticks as fit.
* **Lock Final BPM** — keep clicking at the top tempo when the ramp finishes instead of stopping.
* **BPM Range / duration** readout so you can see where a session will land before you start.

### Rhythm & feel
* **Flexible time signatures**, including irregular meters (5/8, 6/8, 7/8, 9/8, 12/8) with denominators 2–16.
* **Smart accents** — automatic accent maps for complex meters (e.g. 7/8 accents beats 1, 4, 6); accent toggle for the downbeat.
* **Count-in** — 0–4 lead-in bars before a session starts.

### Sound
* **Sound packs:** *Synth* (tunable pitched clicks) or *Natural* (sampled percussion).
* **Per-role sounds** — separate accent, click, and count-in sounds, each with a **Test Loop** to preview.
* Master **volume** and **accents** available on the main screen and in Sound Config.

### Experience
* **Tap tempo** — tap the big BPM number in time with the music, or press `T`. It locks on after three taps, tracks a rolling window of the last 8, rejects fumbled taps, and resets after 2s of silence.
* **Fine-grained BPM slider** — drag across for coarse, drag *away from the bar* for fine control on touch devices; or hit the pencil to type an exact value.
* **Screen stays awake** while the metronome is playing (Wake Lock — no permission prompt).
* **Locked while running** — a Trainer session locks its settings so the drill can't shift mid-run; only Volume, Accents, and the mode switch stay live.
* **Progress bars** for the current cycle and the whole session; beat indicators go dark during a rest.
* **Keyboard:** `Space` to start/stop, `T` to tap tempo.
* **Mobile-first**, fixed-viewport, touch-friendly, remembers your settings on the device.

---

## 🎮 How to Use

1. **Pick a mode** with the toggle at the top — **Trainer** or **Constant**.
2. **Set the tempo** — tap the big BPM number in time with the music (or press `T`), drag the slider to fine-tune (drag away from the bar for finer control), or hit the pencil to type an exact value.
3. **Trainer setup:**
   * Choose **Interval Type** (Time or Bars).
   * Set **Pos. Increment** (and optionally **Neg. Increment** for a see-saw).
   * Set the **Interval** and **Duration/Reps**, plus an optional **Rest** between intervals.
   * Optionally set a **Count-in**, **time signature**, and **Lock Final BPM**.
   * The **BPM Range** shows where you'll end up.
4. **Press Start** (or hit `Space`). Watch the **Cycle** bar for the current step and **Total Session** for overall progress.
5. **Tweak sound** in **Sound Config** (menu): pick a sound pack and dial in the click/accent/count-in tones.

There's an in-app **Info** screen (menu → Info) with the same guidance plus the recommended practice method.

---

## 🛠️ Local Development

The project is fully containerized using **Docker** for a consistent environment. (You can also run it directly with Node — `npm install && npm run dev`.)

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed.
* An active SSH agent on your host machine (if deploying via SSH).

### Setup & Run
1.  **Clone the repository:**
    ```bash
    git clone git@github.com:geo-chalk/ModernMetalAcademyMetronome.git
    cd ModernMetalAcademyMetronome
    ```

2.  **Environment Configuration:**
    Create a `.env` file in the root directory:
    ```env
    GIT_USER_NAME=your_name
    GIT_USER_EMAIL=your_email@example.com
    ```

3.  **Start the development server:**
    ```bash
    docker compose up --build
    ```
    The app will be available at `http://localhost:5173`.

---

## 📦 Deployment

This project uses `gh-pages` for automated deployment to GitHub Pages, run from **inside** the Docker container using SSH agent forwarding.

Ensure your SSH key is added to the agent on your **host** machine:
```bash
ssh-add ~/.ssh/id_ed25519   # or your specific key path
```

Then deploy:
```bash
docker compose exec metronome npm run deploy
```

This automatically configures the git identity from your `.env`, runs `vite build`, and pushes `dist/` to the `gh-pages` branch.

---

## 📝 Changelog

Versioning follows the `version` field in `package.json`.

### 0.6.0 — Tap tempo
* **Tap tempo** on the big BPM number or the `T` key — least-squares fit over a rolling 8-tap window, locking on from the third tap, with outlier rejection and a 2s idle reset. Live tap counter and a per-tap flash on the readout.
* Typing an exact BPM moved to a **pencil** next to the BPM caption (the number itself is now the tap pad).
* **Unified BPM range** to 40–300 everywhere — typed values previously allowed 1–400 while the slider was capped at 300.
* Fixed: `Space` no longer started/stopped the metronome while a dropdown or the BPM field had focus, and no longer auto-repeats when held.

### 0.5.1 — Timing & animation polish
* **Beat indicators** reworked into a pop-in pulse that holds until the next beat (smooth, compositor-driven) and stays dark during the count-in.
* Beat visuals **synced to the actual playback clock** so the flash lands with the click (it was firing slightly early).
* Fixed a case where a click could **leak into the start of a rest** in bars mode.

### 0.5.0 — Rest periods
* **Rest between intervals** (in seconds or bars, matching the Interval Type) — silent recovery with a count-in that leads you back in.
* Short rests **fill with as many count-in ticks as fit** instead of going silent.
* **Beat indicators go dark** during a rest; the Cycle bar shows the rest in blue.
* Trainer slider range tweaks.

### 0.4.5 — Stay awake
* The **screen no longer sleeps** while the metronome is playing (Screen Wake Lock).

### 0.4.4 — Mode toggle, run-lock & shared tempo
* **Trainer/Constant toggle** in the header; switching modes stops a running session.
* Trainer **controls lock while a session runs** (except Volume, Accents, and the mode switch).
* **BPM is shared** across both modes, so the tempo carries over.

### 0.4.3 — Count-in fix
* The **count-in now stops immediately** with the Stop button.

### 0.4.2 — Info panel
* Reorganised the **Info/Guide** screen into collapsible sections.

### 0.4.1 — Polish & precision
* Trainer UI polish and typography (K2D weights, tighter spacing, mobile scroll fix).
* **Fine-grained "drag-away" BPM slider** for precise mobile input.

### 0.4.0 — Bar-based intervals
* **Bars mode:** ramp every *N* bars for a number of reps, staying locked to your playing regardless of tempo. Shows an estimated total duration.

### 0.3.3 — See-saw ramp
* **Negative increment** — alternate up/down each interval for a back-and-forth workout (net tempo never decreases).

### 0.3.x — Sounds, timing & mobile
* **Lock Final BPM** at the end of a ramp.
* **Natural (sampled) sound packs** alongside the tunable synth, with a full Sound Config editor.
* **Look-ahead scheduler** on the Tone.js clock for tighter timing; additional (irregular) time signatures; BPM-range fixes.
* **Drag-to-slide** sliders tuned for mobile.

### 0.2.x — Configuration
* **Sound Config editor** and sound packs, **side menu**, per-setting local storage, and app-wide accent sync.

### 0.1.x and earlier — Foundations
* Initial **Trainer & Constant** metronome, core Tone.js engine, time signatures, count-in, and progress bars.

---

## 🧰 Tech Stack
* **Framework:** React 18
* **Audio Engine:** Tone.js (Web Audio API) with a custom look-ahead scheduler
* **Styling:** Tailwind CSS
* **Icons:** Lucide React
* **Build Tool:** Vite
* **Containerization:** Docker & Docker Compose

---

## 📜 License
MIT License. Feel free to use and modify for your own practice!
