# Specialized Engineering Skills & Domain Knowledge (`SKILLS.md`)

This guide captures the specialized domain skills, mathematical foundations, game heuristics, and low-level browser APIs implemented across the **Gomoku PWA** codebase.

---

## Skill 1: Gomoku Pattern Recognition & Heuristic Evaluation

### 1.1 Line Scoring Table
Gomoku evaluation inspects continuous rays of up to 9 cells through any coordinate across 4 principal axes:
- Horizontal: `(1, 0)`
- Vertical: `(0, 1)`
- Main Diagonal: `(1, 1)`
- Anti-Diagonal: `(1, -1)`

Each line configuration is mapped to an exact heuristic weight:

| Pattern Name | Visual Mask (`X` = player, `_` = empty) | Weight Score | Strategic Significance |
|---|---|---|---|
| **Five-in-a-Row** | `XXXXX` | `1,000,000` | Immediate winning state |
| **Open Four** | `_XXXX_` | `100,000` | Unstoppable win next turn (dual open ends) |
| **Closed Four** | `XXXX_` or `_XXXX` | `10,000` | Immediate single-threat win condition |
| **Broken Four** | `XX_XX` or `X_XXX` or `XXX_X` | `10,000` | Hidden single-threat win condition |
| **Open Three** | `_XXX_` or `_X_XX_` or `_XX_X_` | `5,000` | Can form an Open Four on next move |
| **Closed Three** | `XXX__` or `__XXX` | `500` | Can be blocked; limited offensive value |
| **Open Two** | `_XX_` or `_X_X_` | `200` | Developmental pressure |
| **Closed Two** | `XX___` | `20` | Minor territory presence |

### 1.2 Move Scoring Function
When grading a potential cell `(x, y)` for player `p`:
$$\text{Score}(x, y, p) = \sum_{d \in \text{axes}} \text{Weight}(d, p) + 0.9 \times \sum_{d \in \text{axes}} \text{Weight}(d, \text{opponent})$$

**Fork Threat Bonus**: If placing a stone at `(x, y)` forms $\ge 2$ independent open-threes or fours in different directions, a bonus of `+50,000` points is awarded, creating deadly fork moves ("double threes" / "four-three").

---

## Skill 2: Minimax & Iterative Deepening Search Optimization

### 2.1 Candidate Selection with Chebyshev Filtering
To reduce the branching factor from $O(N^2)$ (225 cells on a 15×15 board) to $\le 12$ high-value moves:
- On an empty board, the center cell $(7, 7)$ is returned immediately.
- On populated boards, candidate moves are constrained to empty cells within **Chebyshev radius 2** of any existing stone:
  $$\max(|x - x_{\text{stone}}|, |y - y_{\text{stone}}|) \le 2$$
- Candidates are sorted descending by `scoreMove(candidate, player)`; the Hard AI prunes all but the top **12** candidates at each ply.

### 2.2 Time-Budgeted Iterative Deepening
- Iterative deepening searches successive plies: Depth 2 $\to$ Depth 4 $\to$ Depth 6.
- To prevent thread freezing, `performance.now()` is sampled every **256 nodes**.
- If execution time exceeds `timeLimitMs` (800 ms), the search halts immediately and returns the best move evaluated from the highest *fully completed* depth.
- Alpha-Beta pruning guarantees identical minimax values with exponential branch reduction.

---

## Skill 3: High-DPI Canvas 2D & Viewport Transformation

### 3.1 Device Pixel Ratio (DPR) Sharpness
To eliminate blurry lines on modern mobile screens and Retina displays:
```ts
const dpr = window.devicePixelRatio || 1;
canvas.width = Math.round(cssWidth * dpr);
canvas.height = Math.round(cssHeight * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

### 3.2 Viewport Projection Matrix
The interactive board supports smooth panning and pinching:
- Screen-to-Board coordinate translation:
  $$x_{\text{board}} = \frac{x_{\text{canvas}} - \text{offsetX}}{\text{scale}}$$
  $$y_{\text{board}} = \frac{y_{\text{canvas}} - \text{offsetY}}{\text{scale}}$$
- `scale` is clamped strictly between `[1.0, 3.0]`.
- When `scale === 1.0`, `offsetX` and `offsetY` are reset to `0` and panning is disabled.
- At `scale > 1.0`, offsets are clamped so board edges cannot be dragged past screen margins.

### 3.3 On-Demand Dirty Flag Rendering Loop
Instead of a battery-draining continuous `requestAnimationFrame` loop, the canvas operates on an event-driven dirty flag:
```ts
requestRender() {
  if (this.dirty) return;
  this.dirty = true;
  requestAnimationFrame(() => this.draw());
}
```
Continuous loops are activated exclusively during stone placement drop animations (150 ms) and winning line pulsing, stopping immediately upon completion.

---

## Skill 4: Mobile Touch & Pointer Events State Machine

Mobile web games suffer from inadvertent tap conflicts during scrolling and zooming. The `InputHandler` implements a resilient multi-touch pointer state machine:

```
                  ┌────────────────────────┐
                  │    PointerDown (1)     │
                  └───────────┬────────────┘
                              │
             ┌────────────────┴────────────────┐
             │                                 │
      (Movement > 8px)                 (Movement <= 8px)
             ▼                                 ▼
    ┌─────────────────┐               ┌─────────────────┐
    │    Pan State    │               │    Tap State    │
    └─────────────────┘               └────────┬────────┘
                                               │
             ┌─────────────────────────────────┴─────────────────┐
             │ (oneTapMove = true)              (oneTapMove = false)
             ▼                                                   ▼
     [Play Move Instantly]                         [Set Ghost Preview Stone]
                                                                 │
                                                       (Tap Same Cell or Place)
                                                                 ▼
                                                       [Play Confirmed Move]
```

### 4.1 Pinch-to-Zoom Geometry
When two pointers are active (`pointerMap.size === 2`):
- Distance $D = \sqrt{(x_2 - x_1)^2 + (y_2 - y_1)^2}$
- Midpoint $M = \left( \frac{x_1 + x_2}{2}, \frac{y_1 + y_2}{2} \right)$
- Zoom updates scale proportionally while keeping midpoint $M$ stationary in world space.
- A post-pinch cooldown flag blocks any rogue `pointerup` from triggering an unintended stone placement.

---

## Skill 5: Procedural Web Audio API Synthesis

To eliminate external asset loading, sound latency, and 404 network risks, all audio effects are procedurally generated in `src/ui/sound.ts`:

### 5.1 Wood Knock Synthesis (Goban Stone Placement)
- Generates a rapid frequency modulated burst: sine oscillator dropping exponentially from 440 Hz down to 110 Hz in 45 ms.
- Applies an exponential gain decay curve (`0.3` to `0.001`) with a sharp attack (< 2 ms) for crisp, acoustic resonance.

### 5.2 Stone Snap Click (Slate Theme)
- Generates a short, crisp high-frequency snap: triangle wave at 880 Hz decaying in 30 ms.

### 5.3 iOS Safari Audio Unlock Policy
Safari blocks all Web Audio synthesis unless unlocked inside a physical user gesture:
```ts
const unlockAudio = () => {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  window.removeEventListener('pointerdown', unlockAudio);
};
window.addEventListener('pointerdown', unlockAudio, { once: true });
```

---

## Skill 6: Offline PWA Architecture & Caching Strategies

### 6.1 Service Worker Workbox Precaching
- Configured using `vite-plugin-pwa` with `generateSW`.
- Pre-caches all Vite-compiled HTML, JavaScript chunks, CSS styles, web fonts, and SVGs.
- Automatic cache invalidation via asset content hashing (`index-dv4UgONV.js`).

### 6.2 Bilingual Real-Time I18n Engine
- Typed dictionary parity: `en` and `ru` keys are strictly synchronized.
- Zero-reload language switching: triggers reactive updates via `data-i18n` DOM attributes and dynamic HUD subscriptions.
