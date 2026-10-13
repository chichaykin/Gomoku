# Quality, Testing & Verification Harness (`HARNESS.md`)

This document defines the automated testing harness, verification suites, performance budgets, and CI gates that ensure zero regressions in the **Gomoku PWA** codebase.

---

## 1. Automated Verification Gates

Every pull request or code change must satisfy all five verification gates:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Gate 1: Types  │ ──> │  Gate 2: Unit   │ ──> │  Gate 3: Build  │ ──> │ Gate 4: Preview │ ──> │  Gate 5: PWA    │
│  tsc --noEmit   │     │   vitest run    │     │   vite build    │     │  vite preview   │     │  ServiceWorker  │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
```

### 1.1 Gate 1: Strict TypeScript Verification
Validates strict type contracts, null-safety, and absence of `any` types:
```bash
npx tsc --noEmit
```
- **Expectation**: Zero errors, zero warnings.

### 1.2 Gate 2: Vitest Automated Test Suite
Executes fast, deterministic unit and behavioral tests for core game rules, AI search, and i18n dictionaries:
```bash
npm test
# Or in watch mode during development:
npm run test:watch
```
- **Current Baseline**: 4 test files, 25 tests passing (100% green).
- **Execution Time Target**: $< 250\text{ ms}$ total runtime.

### 1.3 Gate 3: Production Bundle Compilation
Verifies tree-shaking, code splitting, asset inlining, and bundle size limits:
```bash
npm run build
```
- **Bundle Budgets**:
  - Main JS bundle (`index-*.js`): $< 60\text{ KiB}$ uncompressed ($< 20\text{ KiB}$ gzipped).
  - Main CSS bundle (`index-*.css`): $< 10\text{ KiB}$ uncompressed ($< 3\text{ KiB}$ gzipped).
  - AI Worker (`ai.worker-*.js`): $< 8\text{ KiB}$ uncompressed.
  - Workbox PWA precache list: $\ge 20$ assets registered.

### 1.4 Gate 4: PWA Asset Generation
Ensures icons and web app manifest comply with PWA installation requirements:
```bash
npm run generate-pwa-assets
```
- Source icon: `public/icon.svg`
- Generated resolutions: 64×64, 192×192, 512×512, maskable 512×512, and 180×180 Apple touch icon.

### 1.5 Gate 5: Production Preview & Service Worker Verification
```bash
npm run preview -- --port 4173
```
- Open `http://localhost:4173` in an incognito browser window.
- Verify Service Worker registration in Chrome DevTools (`Application` → `Service Workers`).
- Toggle `Offline` mode in Network tab and reload: app must render and be fully playable without network access.

---

## 2. Test Suite Breakdown

### 2.1 Core Board Suite (`src/core/board.test.ts`)
| Test Case | Description | Expected Result |
|---|---|---|
| Initialization | Instantiates 15×15 and 19×19 boards | All cells set to `EMPTY`, correct dimensions |
| Cell Accessors | `set()`, `get()`, `inBounds()` | Correct state mutation, boundary detection |
| Horizontal Win | Places 5 consecutive stones horizontally | Returns array of 5 winning cell coordinates |
| Vertical Win | Places 5 consecutive stones vertically | Returns array of 5 winning cell coordinates |
| Diagonal Win | Places 5 consecutive stones along `(1, 1)` | Returns array of 5 winning cell coordinates |
| Anti-Diagonal Win | Places 5 consecutive stones along `(1, -1)` | Returns array of 5 winning cell coordinates |
| Overline Rule | Places 6 or more stones in a continuous row | Returns win line ($\ge 5$ satisfies Free Gomoku rules) |
| Board Full Detection | Fills all board cells | `isFull()` returns `true` |

### 2.2 Game State & Flow Suite (`src/core/game.test.ts`)
| Test Case | Description | Expected Result |
|---|---|---|
| Turn Alternation | Consecutive `play(x, y)` moves | Alternates between `BLACK` (1) and `WHITE` (2) |
| Occupied Cell Rejection | Playing on a cell with an existing stone | Returns `false`, move rejected |
| Win Transition | Completing 5 in a row | Sets `status = 'won'`, records `winner` and `winLine` |
| Draw Transition | Filling board without 5-in-a-row | Sets `status = 'draw'` |
| Undo in PvP | Calling `undo(1)` in two-player mode | Removes 1 move, reverts active player |
| Undo in AI Mode | Calling `undo(2)` in vs AI mode | Removes 2 moves (AI move + human move) |
| Post-Win Undo | Calling `undo` after game over | Reopens game to `status = 'playing'`, clears `winLine` |

### 2.3 AI Heuristics & Search Suite (`src/ai/search.test.ts`)
| Test Case | Description | Expected Result |
|---|---|---|
| Self Four Win | AI has 4 in a row with open end | Plays the 5th stone immediately (all difficulty levels) |
| Opponent Four Block | Opponent has 4 in a row threatening win | Blocks opponent immediately (all difficulty levels) |
| Open Three Block | Opponent has an open three `_XXX_` | Medium and Hard AI immediately block the threat |
| Search Latency Budget | Hard AI evaluates a 10-stone board | Returns best move in $< 1000\text{ ms}$ (strict time budget) |

### 2.4 Localization Parity Suite (`src/i18n.test.ts`)
| Test Case | Description | Expected Result |
|---|---|---|
| Key Parity | Compares keys in `en` dictionary with `ru` | Both dictionaries have 100% identical key sets |
| Placeholder Interpolation | Tests `t('moveNumber', { n: 12 })` | Replaces `{n}` with `12` |
| Language Switcher | Calls `setLang('ru')` then `setLang('en')` | Reactive listeners fire with corresponding language |
| Unknown Key Fallback | Passes invalid or untranslated key | Returns the key as fallback string |

---

## 3. Performance & Memory Benchmarks

| Metric | Target Budget | Monitored Via |
|---|---|---|
| **AI Decision Latency** | $< 800\text{ ms}$ (Hard level) | `performance.now()` in Web Worker |
| **Search Tree Node Budget** | $\ge 1,000$ nodes/sec | Search profiling |
| **First Contentful Paint (FCP)** | $< 0.8\text{ s}$ | Lighthouse / Chrome DevTools |
| **Largest Contentful Paint (LCP)** | $< 1.2\text{ s}$ | Lighthouse / Chrome DevTools |
| **Cumulative Layout Shift (CLS)** | `0.00` | Lighthouse |
| **Canvas Frame Rate** | $60\text{ fps}$ during stone placement | Chrome Performance monitor |
| **Idle CPU Utilization** | $0\%$ (Render on demand) | Chrome Task Manager |

---

## 4. Continuous Integration Workflow (GitHub Actions)

Sample `.github/workflows/ci.yml` pipeline:

```yaml
name: CI Harness

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Strict Typecheck
        run: npx tsc --noEmit
      - name: Vitest Suite
        run: npm test
      - name: Production Build
        run: npm run build
```
