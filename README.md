# Modern Metal Academy Metronome 🎸

A professional-grade, high-performance web metronome specifically designed for technical guitar training and speed building. Powered by the **Tone.js** audio engine for rock-solid precision.

## 🔗 Live Demo
**[Launch Metronome App](https://geo-chalk.github.io/ModernMetalAcademyMetronome/)**

---

## 🚀 Key Features

### 1. Dual Operational Modes
* **Trainer Mode:** Automatically increases the tempo by a set amount of BPM at specific intervals. Ideal for building stamina and incrementally mastering difficult riffs.
* **Constant Mode:** A standard, high-precision metronome for steady-state practice.

### 2. Advanced Rhythmic Tools
* **Custom Accent Mapping:** Intelligent accenting for complex meters. For example, 7/8 automatically accents beats 1, 4, and 6.
* **Flexible Time Signatures:** Supports standard and irregular meters (e.g., 5/8, 9/8, 12/8) with denominators from 2 to 16.
* **Adjustable Pre-roll:** Configure a countdown (1–4 bars) before the session starts to ensure you are ready to play on the first beat.

### 3. Visual & Haptic Feedback
* **High-Contrast Indicators:** Visual beat tracking with dedicated downbeat highlighting.
* **Progress Tracking:** Dynamic progress bars show completion percentages for both the current BPM cycle and the total session duration.
* **Mobile Optimized:** Fixed-viewport layout with touch-friendly sliders and no-scroll interaction.

### 4. Precision Control
* **Keyboard Shortcuts:** Press `Space` to instantly start or stop the metronome.
* **Range:** Supports a wide tempo range from 40 to 300 BPM.

---

## 🛠️ Local Development

The project is fully containerized using **Docker** to ensure a consistent environment across different machines.

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

This project uses `gh-pages` for automated deployment to GitHub Pages. Deployment is performed from **inside** the Docker container using SSH agent forwarding.

### Prerequisites for Deployment
Ensure your SSH key is added to the agent on your **host** machine:
```bash
ssh-add ~/.ssh/id_ed25519  # Or your specific key path```
```

### Deploy Command
Execute the deployment script via Docker Compose:
```bash
docker compose exec metronome npm run deploy
```

This command will execute the following steps automatically:
1. **Configure Git identity**: Sets your name and email inside the container using your `.env` variables.

2. **Build**: Runs `vite build` to generate production-ready assets in the dist/ folder.

3. **Push**: Uses `gh-pages` to push the build folder to the `gh-pages` branch of your repository.

## 📜 Tech Stack
* **Framework**: React 18
* **Audio Engine**: Tone.js (Web Audio API) for sub-millisecond rhythmic precision
* **Styling**: Tailwind CSS for a high-contrast, responsive interface
* **Icons**: Lucide React
* **Build Tool**: Vite
* **Containerization**: Docker & Docker Compose for a unified dev/deploy environment

---
## License
MIT License. Feel free to use and modify for your own practice!