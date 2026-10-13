# Autonomous AI Agent Architecture & Guidelines (`AGENTS.md`)

This document defines the agentic workflow, specialized roles, execution boundaries, and operational invariants for AI agents (and human engineers) collaborating on the **Gomoku ("Five in a Row") Progressive Web App** codebase.

---

## 1. Agent Roles & Specializations

```
                        ┌──────────────────────────────────────┐
                        │       Lead Architect Agent           │
                        │   (Module Contracts & Type System)   │
                        └──────────────────┬───────────────────┘
                                           │
         ┌────────────────────────┬────────┴───────────────┬────────────────────────┐
         │                        │                        │                        │
         ▼                        ▼                        ▼                        ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│   Core Game &    │    │ Mobile UX &      │    │  PWA & Offline   │    │ QA & Verification│
│  AI Engine Agent │    │ Canvas Graphics  │    │  Platform Agent  │    │      Agent       │
└──────────────────┘    └──────────────────┘    └──────────────────┘    └──────────────────┘
```

### 1.1 Lead Architect Agent
- **Scope**: Top-level project topology, module interfaces, and global type safety.
- **Key Files**: `src/core/types.ts`, `tsconfig.json`, `package.json`, `vite.config.ts`.
- **Invariants**:
  - `strict: true` in `tsconfig.json`. Zero tolerance for `any` or untyped casts (`as unknown as ...`).
  - Public interfaces in `src/core/types.ts` remain backward compatible.
  - Modularity: AI engine has no DOM/Canvas dependencies; UI has no direct access to AI internals outside `aiClient.ts`.

### 1.2 Core Game & AI Engine Agent
- **Scope**: Game rules, board representation, pattern matching, tactical analysis, Minimax/Negamax search with Alpha-Beta pruning, and Web Worker orchestration.
- **Key Files**: `src/core/board.ts`, `src/core/game.ts`, `src/ai/patterns.ts`, `src/ai/search.ts`, `src/ai/ai.worker.ts`, `src/ai/aiClient.ts`.
- **Invariants**:
  - `Board` uses a flat `Int8Array(size * size)` indexed by `y * size + x` for constant-time lookups and zero garbage collection overhead.
  - Win checking is raycast-based (`O(1)` relative to board size; only examines rays through the last placed stone).
  - Tactical checks (win now, block opponent win, create open-four, block opponent open-four) execute before tree searches.
  - Web Worker communication **never** detaches buffers using `transferList`; always transfer copied arrays (`Array.from(board.cells)`).
  - Stale worker responses must be discarded via request ID validation (`id !== latestId`).

### 1.3 Mobile UX & Canvas Graphics Agent
- **Scope**: High-DPI Canvas 2D rendering, responsive layout, Pointer Events gesture handling (pan/pinch-to-zoom), procedural Web Audio API, and haptic feedback.
- **Key Files**: `src/ui/renderer.ts`, `src/ui/input.ts`, `src/ui/hud.ts`, `src/ui/modals.ts`, `src/ui/sound.ts`, `src/ui/haptics.ts`, `src/style.css`.
- **Invariants**:
  - Render on demand: Canvas uses a `dirty` flag and `requestAnimationFrame`. No continuous CPU/GPU loops when the board is static.
  - Device Pixel Ratio (`window.devicePixelRatio`) must be factored into Canvas dimensions and transforms to eliminate blurring on Retina displays.
  - View transforms: `scale` clamped to `[1.0, 3.0]`; pan offsets clamped to board boundaries; pan disabled at `scale = 1.0`.
  - Coarse pointers (mobile touches) default to ghost stone placement with tap/button confirmation to eliminate misclicks.
  - Procedural sound synthesis via `AudioContext` only (0 external audio assets); must unlock AudioContext lazily on the first user interaction for iOS Safari compliance.
  - Respect `prefers-reduced-motion` for all visual animations.

### 1.4 PWA & Offline Platform Agent
- **Scope**: Progressive Web App lifecycle, service worker registration, offline precaching, installation prompts, and vector-to-raster icon generation.
- **Key Files**: `vite.config.ts`, `pwa-assets.config.ts`, `public/icon.svg`, `index.html`, `src/main.ts`.
- **Invariants**:
  - Use `vite-plugin-pwa` with `generateSW` and `registerType: 'autoUpdate'`. Never manually hand-write `sw.js` (asset hash mismatch risk).
  - Provide platform-specific installation workflows: native `beforeinstallprompt` banner for Chromium/Android and an actionable modal guide for iOS Safari (`Share` → `Add to Home Screen`).
  - Viewport configuration: `viewport-fit=cover`, `overscroll-behavior: none`, `100dvh` layout, and safe-area insets (`env(safe-area-inset-*)`).

### 1.5 QA & Verification Agent
- **Scope**: Automated unit testing, AI search benchmarks, i18n key parity, code review, and build integrity.
- **Key Files**: `src/core/board.test.ts`, `src/core/game.test.ts`, `src/ai/search.test.ts`, `src/i18n.test.ts`.
- **Invariants**:
  - All test suites must execute with `npm test` (`vitest run`).
  - Every UI string added to `src/i18n.ts` must exist in both `en` and `ru` dictionaries; verified by compile-time types and automated unit tests.
  - Every code modification must satisfy `npm run build` (`tsc --noEmit && vite build`).

---

## 2. Agent Operational Protocols

### 2.1 The Golden Development Loop
Before declaring any task or ticket complete, agents must execute the four-stage verification loop:

```bash
# 1. Typecheck (Zero errors)
npx tsc --noEmit

# 2. Automated Test Suite (100% green)
npm test

# 3. Production Bundle Build (Zero warnings, bundle size within budget)
npm run build

# 4. Git Cleanliness Check
git status
```

### 2.2 Internationalization (i18n) Rules
- UI text must **never** be hardcoded into TypeScript classes or HTML templates.
- Always retrieve strings via `t(key, params)` from `src/i18n.ts`.
- The Russian dictionary `ru` is strictly typed as `Record<Key, string>`, where `Key = keyof typeof dict.en`. Any missing translation key is an immediate TypeScript compilation error.
- UI elements must handle text expansion: Russian text is on average 30% longer than English. Do not use fixed-width CSS containers for text buttons.

### 2.3 Undo & Game State Rules
- Single Player (vs AI):
  - Undoing reverts **2 moves** (the AI's last response and the human player's preceding move).
  - If the human player undid while the AI was asynchronously calculating a move, increment `latestId` to immediately discard the pending worker result.
- Two Player (Pass & Play):
  - Undoing reverts **1 move** and switches the active player.
- Game Over:
  - Undoing after a win or draw is permitted: clears `won`/`draw` status, removes the winning line overlay, and resumes the timer.

---

## 3. Slash Command & AI Prompting Conventions

When prompting or steering coding agents on this repository, utilize the following specialized prompts:

| Command / Context | Intended Agent Action |
|---|---|
| `/plan` | Generate an executor-level specification without ambiguous choices before touching code. |
| `/grill-me` | Conduct a rapid interactive design interview to resolve edge cases and UX constraints. |
| `/boost` | Deep architecture review with rigorous verification, performance analysis, and adversarial tests. |
| Code Review | Apply Senior Review standards (inspect memory leaks, event listener cleanup, Safari iOS quirks, DPR scaling). |

---

## 4. Maintenance & Contribution Invariants
1. **Preserve Documentation Integrity**: Update `README.md`, `HARNESS.md`, and `SKILLS.md` whenever core interfaces or algorithms change.
2. **Deterministic PR Structure**: Group changes logically into atomic commits following Conventional Commits (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`).
3. **Zero Runtime External Dependencies**: The game client runs with pure vanilla TypeScript, HTML5 Canvas 2D, and Web Audio API without UI framework overhead. Keep production dependencies at zero.
