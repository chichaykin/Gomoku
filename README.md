# Gomoku — Five in a Row (PWA)

🎮 **Play Live Online:** [https://chichaykin.github.io/Gomoku/](https://chichaykin.github.io/Gomoku/)

A high-performance Progressive Web App (PWA) for the classic logic board game **Gomoku** («Пять в ряд»).
Runs directly in modern desktop and mobile browsers, or installs to Android and iOS home screens as a native standalone application with 100% offline support.

---

## 🌟 Key Features

- **PWA & 100% Offline Mode:**
  - Automated cache-first Service Worker generated via `vite-plugin-pwa` with Workbox.
  - Native standalone installation on Android, Windows, macOS, and iOS Safari.
  - Interactive in-app installation banner for desktop/Android and guided instructions for iOS Safari («Поделиться» → «На экран „Домой“»).
  - Respects safe areas (iPhone notch, Dynamic Island, Home indicator).

- **Game Rules:**
  - **Free Gomoku («Свободное Гомоку»):** 5 or more stones in a continuous row (horizontal, vertical, diagonal) wins.
  - Selectable board sizes: **15 × 15** (standard) and **19 × 19**.
  - Turn indicator, move counter, and game timer.
  - Reversible moves (**Undo**) with win state recovery.

- **Game Modes & AI Engine:**
  - **Single Player vs AI:** Choose to play as Black (moves first) or White (moves second).
  - **Two Players (Pass & Play):** Play locally on the same device.
  - **3 AI Difficulty Levels:**
    - **Easy:** Casual play with threat awareness.
    - **Medium:** Heuristic pattern evaluation matrix (evaluating open/closed threes and fours, double forks).
    - **Hard:** Multi-ply Minimax search with Alpha-Beta pruning, candidate move pruning, and iterative deepening.
  - **Background Web Worker (`ai.worker.ts`):** Heavy calculations run off the main thread, keeping animations and touch interactions smooth at 60+ FPS.

- **Mobile Touch-First UX:**
  - Multi-touch **Pinch-to-zoom** (1× to 3×) and smooth **Pan / Drag** across the board.
  - **Ghost stone preview** with confirmation (tap once to inspect, tap again or press "Place" to confirm) to eliminate fat-finger misclicks on small phone screens.
  - Toggleable **"One-tap move"** mode in Settings for tablets and desktop mouse users.
  - Double-tap on board margins to reset zoom.

- **Visual Themes & Audio:**
  - **Wood Goban:** Natural warm wood texture with realistic 3D stones, highlights, and soft drop shadows.
  - **Dark Slate:** Modern dark neo-minimalist theme with contrasting stones and a vibrant glowing winning line.
  - **Procedural Web Audio API:** Realistic stone clicks, winning fanfare, and lose chime synthesized dynamically in real time without external MP3 files.
  - **Haptic Vibration API:** Subtle tactile feedback on moves and victories (on supported devices).

- **Localization (i18n):**
  - Instant in-game switching between **English** and **Русский** without page reload.
  - Automatically defaults based on device language preferences.

- **Data Persistence:**
  - Game state auto-saved in `localStorage` — resume interrupted matches on reload.
  - Win/Loss/Draw statistics tracked per AI difficulty level.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ (tested on Node 20 / 22 / 24)
- npm 9+

### Installation
```bash
npm install
```

### Local Development
Start the local Vite dev server with hot module replacement:
```bash
npm run dev
```
Open the printed URL (typically `http://localhost:5173/`) in your browser.

### Running Automated Tests
Run unit tests for core game rules, ray win detection, AI search heuristics, and localization parity:
```bash
npm run test
```

### Production Build & PWA Testing
Build the optimized production bundle and precached Service Worker:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```
Open `http://localhost:4173/`. Open Chrome DevTools → **Application** tab to inspect:
- **Manifest:** Verified icons, standalone display mode, orientation.
- **Service Workers:** Active SW precaching all assets.
- Check the **Offline** checkbox and refresh to test full offline capability!

---

## 🌐 Deployment

The build output in `dist/` is completely static and uses relative paths (`base: './'`), making it deployable to any hosting platform.

> [!IMPORTANT]
> **HTTPS Requirement for PWA:**
> Progressive Web Apps and Service Workers require a secure origin (**HTTPS** or `localhost`). Testing on a mobile device over a local IP (e.g. `http://192.168.x.x:4173`) will **not** register the Service Worker. Deploy to one of the free HTTPS hosts below to test on your phone.

### Deploy to GitHub Pages
1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist/` folder to the `gh-pages` branch using `gh-pages` or GitHub Actions:
   ```bash
   npx gh-pages -d dist
   ```

### Deploy to Netlify
- Drag and drop the `dist/` folder into [Netlify Drop](https://app.netlify.com/drop), or connect your repository:
  - **Build command:** `npm run build`
  - **Publish directory:** `dist`

### Deploy to Cloudflare Pages
- Connect your Git repository:
  - **Framework preset:** None / Vite
  - **Build command:** `npm run build`
  - **Output directory:** `dist`

### Deploy to Vercel
```bash
npx vercel deploy --prod
```

---

## 📚 Architecture, Skills & Agent Documentation

- [AGENTS.md](file:///Users/mikhail/work/MyGames/AGENTS.md) — Autonomous AI agent roles, operational protocols, code review standards, and constraints.
- [SKILLS.md](file:///Users/mikhail/work/MyGames/SKILLS.md) — Specialized domain engineering knowledge (Gomoku heuristic pattern scoring, iterative deepening, high-DPI Canvas mathematics, procedural Web Audio, and multi-touch pointer state machine).
- [HARNESS.md](file:///Users/mikhail/work/MyGames/HARNESS.md) — Automated verification gates (`tsc`, `vitest`, `vite build`, PWA assets generator), test suite matrix, and CI workflows.
- [PLAN.md](file:///Users/mikhail/work/MyGames/PLAN.md) — Complete executor specification and architectural blueprint.

---

## 📁 Project Structure

```
MyGames/
├── index.html                  # HTML entrypoint, PWA meta tags, layout shell
├── package.json                # Dependencies, build scripts, vitest config
├── tsconfig.json               # TypeScript strict configuration
├── vite.config.ts              # Vite + VitePWA plugin & manifest config
├── pwa-assets.config.ts        # PWA icon generator preset config
├── public/
│   ├── icon.svg                # Master vector icon
│   ├── pwa-192x192.png         # PWA icon (192px)
│   ├── pwa-512x512.png         # PWA icon (512px)
│   ├── maskable-icon-512x512.png # Maskable icon for Android
│   ├── apple-touch-icon-180x180.png # iOS home screen icon
│   └── favicon.ico             # Tab favicon
└── src/
    ├── main.ts                 # Main coordinator wiring game, HUD, audio & PWA events
    ├── style.css               # Responsive styling, themes (wood/slate), safe areas
    ├── i18n.ts                 # Bilingual EN/RU dictionaries and translation helpers
    ├── storage.ts              # LocalStorage persistence for settings, stats, and saved games
    ├── core/
    │   ├── types.ts            # Type definitions (Cell, Player, BoardSize, Settings)
    │   ├── board.ts            # Board model with O(1) ray win detection
    │   ├── board.test.ts       # Board unit tests (4 win directions, 6+ overline)
    │   ├── game.ts             # Game state manager (turns, undo, serialize)
    │   └── game.test.ts        # Game manager unit tests
    ├── ai/
    │   ├── patterns.ts         # Pattern recognition & static positional evaluation
    │   ├── search.ts           # Candidate generation, tactical checks, Minimax search
    │   ├── search.test.ts      # AI unit tests (win detection, blocking, performance)
    │   ├── ai.worker.ts        # Dedicated Web Worker for non-blocking search
    │   └── aiClient.ts         # Main thread worker client with stale-response protection
    └── ui/
        ├── renderer.ts         # Canvas 2D Retina renderer (goban, stones, pulse animations)
        ├── input.ts            # Pointer Events handler (pinch, pan, ghost preview, tap)
        ├── hud.ts              # Top/bottom bars, turn indicator, timer, move counter
        ├── modals.ts           # Settings, stats, game-over, and iOS install dialogs
        ├── sound.ts            # Procedural Web Audio API sound synthesizer
        └── haptics.ts          # Web Vibration API tactile feedback service
```

---

## 📜 License
MIT
