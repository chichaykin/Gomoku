# Plan v2: Gomoku "Five in a Row" PWA — Executor Spec

> [!IMPORTANT]
> **Rules for the executor (Gemini 3.8 Flash):**
> 1. The plan contains no "either/or" — implement exactly what is written. Do not add frameworks or libraries beyond the listed ones.
> 2. After **every** stage, `npx tsc --noEmit` and `npx vitest run` must pass. Do not move on until the current stage is green.
> 3. TypeScript `strict: true`, no `any`. **In-game UI is bilingual (English / Russian)** — never hard-code UI text; always use `t('key')` from `src/i18n.ts` (section 7a). Code, comments and README in English.
> 4. Do not change the public interfaces in section 3 unless strictly necessary.

---

## 1. Locked decisions

| Area | Decision |
|---|---|
| Stack | Vite 5 + TypeScript 5 + HTML5 Canvas 2D + plain CSS |
| Language | UI in **English and Russian**, switch in Settings. Default: `ru` if `navigator.language` starts with `ru`, else `en`. Switching re-renders all text instantly, no reload |
| PWA | `vite-plugin-pwa` (generateSW, `registerType: 'autoUpdate'`). Do **not** hand-write `sw.js` — Vite hashes filenames, a manual cache list will break |
| Icons | Single source `public/icon.svg` → PNGs via `@vite-pwa/assets-generator` (preset `minimal-2023`): 64, 192, 512, maskable 512, apple-touch-icon 180 |
| Tests | `vitest` (only for `core/`, `ai/` and an i18n key-parity test) |
| Rules | Free Gomoku: 5 **or more** in a row wins. Black moves first. Draw when the board is full |
| Board | 15×15 default, 19×19 in settings. Changing size mid-game → confirm dialog (`confirmNewGame`) |
| Modes | vs AI (player picks color: Black/White) and Pass & Play |
| AI | 3 levels in a Web Worker (algorithm in section 5) |
| Themes | `wood` (goban) and `slate` (dark, neon winning line) |
| Orientation | manifest `orientation: "any"`; responsive layout (portrait: bars top/bottom; landscape: side panel on the right) |

---

## 2. File structure (final)

```
MyGames/
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts            # VitePWA({...}) with manifest inline
├── pwa-assets.config.ts
├── README.md
├── public/
│   └── icon.svg              # Icon source (stones on a board)
└── src/
    ├── main.ts               # Wires all modules, registers SW (virtual:pwa-register)
    ├── style.css
    ├── core/
    │   ├── types.ts
    │   ├── board.ts          # + board.test.ts
    │   └── game.ts           # + game.test.ts
    ├── ai/
    │   ├── patterns.ts       # Line / position evaluation
    │   ├── search.ts         # Candidates, negamax, levels (+ search.test.ts)
    │   ├── ai.worker.ts      # Thin wrapper over search.ts
    │   └── aiClient.ts       # Main-thread worker client with requestId
    ├── ui/
    │   ├── renderer.ts
    │   ├── input.ts          # Pointer Events: tap / pan / pinch / ghost
    │   ├── hud.ts            # Top/bottom bars, buttons, toasts
    │   ├── modals.ts         # Settings, game over, stats, PWA install
    │   ├── sound.ts
    │   └── haptics.ts
    ├── i18n.ts               # en/ru dictionaries, t(), setLang() (+ i18n.test.ts)
    └── storage.ts
```

> [!NOTE]
> AI logic lives in `search.ts` as pure functions; the worker only calls it. This keeps the AI testable in vitest without a worker.

---

## 3. Types and interfaces (module contract)

```ts
// core/types.ts
export const EMPTY = 0, BLACK = 1, WHITE = 2;
export type Cell = 0 | 1 | 2;
export type Player = 1 | 2;
export type BoardSize = 15 | 19;
export type Difficulty = 'easy' | 'medium' | 'hard';
export type Mode = 'ai' | 'pvp';
export type Theme = 'wood' | 'slate';
export interface Move { x: number; y: number; player: Player; }
export type GameStatus = 'playing' | 'won' | 'draw';
export type Lang = 'en' | 'ru';

export interface Settings {
  size: BoardSize; mode: Mode; difficulty: Difficulty;
  humanColor: Player; theme: Theme; lang: Lang;
  sound: boolean; haptics: boolean; oneTapMove: boolean;
}
```

**`Board`** — flat `Int8Array(size*size)`, index `y*size + x`.
- `get(x,y)`, `set(x,y,c)`, `inBounds(x,y)`, `isFull()`, `clone()`, `toArray(): number[]`.
- `checkWin(x, y): {x:number,y:number}[] | null` — 4 directions `(1,0) (0,1) (1,1) (1,-1)`, count both ways from the point; if `count >= 5` return **all** cells of the line. Independent of board area (only scans rays through the last move).

**`Game`**
- `state: { board, moves: Move[], current: Player, status, winLine, winner, startedAt, elapsedMs }`
- `play(x,y): boolean` (false if occupied / not playing), `undo(n: 1|2)`, `reset(settings)`, `serialize()/deserialize()`.
- Undo: in `ai` mode reverts **2** moves (AI + human) if the last move was the AI's; in `pvp` reverts 1. Undo after a win is allowed (clears `won`).

---

## 4. Web Worker protocol

```ts
// request
{ id: number; size: number; cells: number[]; aiPlayer: Player; difficulty: Difficulty; timeLimitMs: number }
// response
{ id: number; x: number; y: number; depth: number; nodes: number }
```

> [!WARNING]
> **Do not pass `board.buffer` in the transfer list** — it detaches the buffer on the main thread and breaks the board. Send a copy: `Array.from(board.cells)`.

- Create with `new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' })`.
- `aiClient` keeps `latestId`; responses with `id !== latestId` are **ignored** (after Undo / New game). On Undo/New while the AI is thinking, just bump `latestId`.
- While the AI thinks: board input is locked, Undo/New stay enabled, HUD shows `t('aiThinking')`.
- Minimum delay before showing the AI move: 350 ms (so it doesn't feel instant).

---

## 5. AI algorithm (exact spec)

### 5.1 Candidate generation
- Empty board → center.
- Otherwise: empty cells within Chebyshev radius **2** of any stone.
- Sort by `scoreMove` (below), descending; at each tree level `hard` keeps the top **12**.

### 5.2 Pattern table (evaluate one line of ≤ 9 cells around a cell)
| Pattern | Weight |
|---|---|
| Five (5+) | 1,000,000 |
| Open four `_XXXX_` | 100,000 |
| Closed / broken four (`XXXX_`, `XX_XX`, `X_XXX`) | 10,000 |
| Open three (`_XXX_`, `_X_XX_`) | 5,000 |
| Closed three | 500 |
| Open two | 200 |
| Closed two | 20 |

`scoreMove(cell, p)` = sum over 4 directions of the pattern weight formed by placing `p` at `cell`, **plus** 0.9 × the same for the opponent (blocking value). Fork bonus: two or more open-three/four threats in different directions → +50,000.

`evaluate(board, p)` = Σ pattern score over all lines for `p` − 1.1 × same for opponent (defense weighted higher).

### 5.3 Mandatory tactical checks (before search)
1. A move gives **me five** → play it.
2. Opponent has a move giving five → block it.
3. (medium/hard) I can make an open four → play it.
4. (medium/hard) Opponent can make an open four → block it.

### 5.4 Levels
- **easy:** checks 1–2; otherwise 40% chance random candidate within radius 1, else random from top-5 by `scoreMove`.
- **medium:** checks 1–4; otherwise best by `scoreMove` (ties broken randomly).
- **hard:** checks 1–4; otherwise **iterative deepening** negamax + alpha-beta, depths 2 → 4 (→ 6 if time permits), limit **800 ms** (check `performance.now()` every 256 nodes; on timeout return the best move of the last **completed** depth). Terminal win detection in nodes via `checkWin` on the last move.

### 5.5 Required tests (`search.test.ts`)
- Takes its own win when it has a four (all levels).
- Blocks the opponent's closed four (all levels).
- medium/hard block an opponent open three when they have no own threats.
- hard on 15×15 after 10 random moves responds in < 1000 ms.

---

## 6. Rendering and input

### 6.1 Renderer
- Canvas fills the available area; `canvas.width = cssWidth * devicePixelRatio`.
- **Render on demand:** `dirty` flag + `requestAnimationFrame`; continuous loop only during animations (stone appear 150 ms scale 0.6→1, winning-line pulse).
- Draw: theme background, grid, star points (15×15: (3,3),(3,11),(11,3),(11,11),(7,7); 19×19: 9 points on 3/9/15). No coordinates.
- Stones: radial gradient + shadow (wood); flat fill + glow (slate). Last-move marker — small contrasting dot. Winning line — thick stroke through stone centers.
- Ghost stone — current player's color at alpha 0.45.
- View transform `{ scale, offsetX, offsetY }`; `scale` in **[1, 3]**; at `scale=1` the whole board fits and pan is disabled; offset clamped to board edges.

### 6.2 Input (Pointer Events only; `touch-action: none` on canvas)
- One pointer: movement > **8 px** → pan; otherwise `pointerup` = tap.
- Two pointers → pinch (zoom around the midpoint); after a pinch, no tap fires until all pointers are released.
- Mouse wheel → zoom around cursor. Mouse hover → ghost preview (desktop only).
- Confirm mode (`oneTapMove=false`, default when `matchMedia('(pointer: coarse)')`): first tap places ghost; second tap on the same cell **or** the `place` button plays; tap elsewhere moves the ghost.
- `oneTapMove=true` (default for `pointer: fine`): plays immediately.
- Double-tap outside the board — reset zoom to 1.

---

## 7. UI layout (`index.html` + `hud.ts`)

- **Top bar:** turn indicator (colored dot + `turnBlack`/`turnWhite`/`aiThinking`), move number (`move`), game timer `mm:ss`.
- **Center:** canvas.
- **Bottom bar:** `undo`, `place` (only when a ghost is active), `newGame`, "⚙".
- **Modals:** Settings (all `Settings` fields incl. language + `stats` + `install`), Game over (`youWin` / `youLose` / `blackWins` / `whiteWins` / `draw`, buttons `playAgain`, `undoMove`), iOS install instructions (`iosInstall`).
- Insets: `padding: env(safe-area-inset-*)`; `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, user-scalable=no">`; `html,body { overscroll-behavior: none; height: 100dvh }`.
- Respect `prefers-reduced-motion` (no pulse, no appear animation).
- Buttons must fit both languages (Russian strings are ~30% longer): use flexible widths, no fixed-width text buttons.

---

## 7a. Localization (`src/i18n.ts`)

- `const dict = { en: {...}, ru: {...} } as const`; type `Key = keyof typeof dict.en`; `ru` must be typed as `Record<Key, string>` so a missing key is a **compile error**.
- API: `t(key: Key, params?: Record<string, string | number>): string` (simple `{name}` substitution), `getLang()`, `setLang(lang)`, `onLangChange(cb)`.
- Static HTML elements use `data-i18n="key"`; `applyI18n()` updates all of them + `document.documentElement.lang`. Canvas draws no text.
- `setLang` saves to settings, calls `applyI18n()` and notifies listeners (HUD / open modal re-render).
- Language selector in Settings shows native names: "English" / "Русский".
- Test `i18n.test.ts`: both dictionaries have identical key sets and no empty values.

| Key | en | ru |
|---|---|---|
| appTitle | Gomoku | Гомоку |
| turnBlack / turnWhite | Black to move / White to move | Ход чёрных / Ход белых |
| aiThinking | AI is thinking… | ИИ думает… |
| move | Move {n} | Ход {n} |
| undo / place / newGame | Undo / Place / New game | Отменить / Поставить / Новая игра |
| settings | Settings | Настройки |
| boardSize / mode / modeAi / modePvp | Board size / Mode / vs AI / Two players | Размер доски / Режим / Против ИИ / Вдвоём |
| difficulty / easy / medium / hard | Difficulty / Easy / Medium / Hard | Сложность / Лёгкий / Средний / Сложный |
| yourColor / black / white | Your color / Black / White | Ваш цвет / Чёрные / Белые |
| theme / themeWood / themeSlate | Theme / Wood / Dark | Тема / Дерево / Тёмная |
| language | Language | Язык |
| sound / haptics / oneTapMove | Sound / Vibration / One-tap move | Звук / Вибрация / Ход в одно касание |
| stats / wins / losses / draws | Statistics / Wins / Losses / Draws | Статистика / Победы / Поражения / Ничьи |
| youWin / youLose / blackWins / whiteWins / draw | You win! / You lose / Black wins / White wins / Draw | Победа! / Поражение / Победили чёрные / Победили белые / Ничья |
| playAgain / undoMove | Play again / Undo move | Ещё раз / Отменить ход |
| confirmNewGame / yes / cancel | Start a new game? / Yes / Cancel | Начать новую партию? / Да / Отмена |
| install | Install app | Установить приложение |
| iosInstall | Tap Share, then "Add to Home Screen" | Нажмите «Поделиться», затем «На экран „Домой“» |
| close | Close | Закрыть |

---

## 8. Sound, haptics, storage

- **sound.ts:** one `AudioContext`, created / `resume()`d on first `pointerdown`. Synthesized: "stone" — 30 ms white-noise buffer through bandpass ~1800 Hz with fast decay; "win" — 3-note sine arpeggio (C5-E5-G5); "lose" — 2 descending notes; "click" — 5 ms tick.
- **haptics.ts:** guard `'vibrate' in navigator`; move 10 ms, win `[30,50,30]`. Hide the toggle when the API is missing (iOS).
- **storage.ts:** keys `gomoku:v1:settings`, `gomoku:v1:stats`, `gomoku:v1:game`. All reads wrapped in `try/catch` + shape validation, fall back to defaults. Stats: `{ [difficulty]: { wins, losses, draws } }`, `ai` mode only. Autosave after every move; restore on launch if `status === 'playing'`.

---

## 9. PWA

- `vite.config.ts`: `base: './'` (works from a subfolder, e.g. GitHub Pages).
- `VitePWA({ registerType: 'autoUpdate', includeAssets: ['icon.svg', 'apple-touch-icon-180x180.png'], manifest: { name: 'Gomoku — Five in a Row', short_name: 'Gomoku', lang: 'en', display: 'standalone', orientation: 'any', background_color: '#1e2430', theme_color: '#1e2430', start_url: '.', scope: '.', icons: [...] }, workbox: { globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'] }, devOptions: { enabled: false } })`.
- `index.html`: `apple-touch-icon`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style=black-translucent`, `theme-color`.
- Install: capture `beforeinstallprompt` → show `install` button. iOS (UA iPhone/iPad and `!navigator.standalone`) → `iosInstall` modal (show at most once, flag in storage). Hide the button in standalone mode.
- The manifest is static, so the home-screen name is language-neutral ("Gomoku"); the in-app language follows the setting.

---

## 10. Stages and acceptance criteria

| # | Stage | Done when |
|---|---|---|
| 1 | Scaffold: Vite vanilla-ts in the current folder, deps, configs, empty screen with canvas | `npm run dev` opens, `tsc` clean |
| 2 | `core/` + tests (win in 4 directions, 6-in-row wins, draw, undo 1/2) | `vitest` green |
| 3 | `i18n.ts` + test, Renderer + HUD + Pass & Play with mouse | A game can be played to a win, line highlighted; all HUD text via `t()` |
| 4 | Input: pinch / pan / ghost / confirm | Verified in DevTools device mode (iPhone SE, 375 px) |
| 5 | AI: `patterns.ts`, `search.ts` + tests, worker, `aiClient` | Tests from 5.5 green; UI doesn't freeze during a hard move |
| 6 | Modals, settings (incl. language), storage, stats, sound, haptics | Reload restores game, settings and language; switching EN↔RU updates every visible string without reload, no layout overflow on 375 px |
| 7 | PWA: icons, manifest, SW, install UX | `npm run build && npx vite preview` → DevTools › Application: manifest has no errors, SW active, Offline + reload still works |
| 8 | README: run, build, deploy (GitHub Pages / Netlify) | Instructions present |

---

## 11. Known pitfalls (verify explicitly)

> [!CAUTION]
> - Service Workers require **HTTPS or localhost**. Opening `http://192.168.x.x:4173` from a phone will **not** register the SW. For on-device testing, deploy (GitHub Pages / Netlify / Cloudflare Pages) — document in README.
> - SW is disabled in `npm run dev` — test offline only via `preview`.
> - iOS Safari: no `beforeinstallprompt`, no `vibrate`, `AudioContext` starts only from a user gesture.
> - Call `e.preventDefault()` in canvas `pointerdown` / `wheel` (otherwise the page scrolls / zooms).
> - On resize / rotation: recompute canvas size and reset view to `scale=1`.
