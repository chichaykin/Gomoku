import { Board } from '../core/board'
import { BLACK, BoardSize, Cell, EMPTY, Player, Theme } from '../core/types'

export interface ViewTransform {
  scale: number
  offsetX: number
  offsetY: number
}

export interface RenderState {
  board: Board
  theme: Theme
  lastMove: { x: number; y: number } | null
  winLine: { x: number; y: number }[] | null
  ghost: { x: number; y: number; player: Player } | null
}

export class CanvasRenderer {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private container: HTMLElement
  private animating = false
  private animStartTime = 0

  // View transform (zoom and pan)
  transform: ViewTransform = { scale: 1, offsetX: 0, offsetY: 0 }

  // Board layout metrics
  private boardPixelSize = 0
  private boardOriginX = 0
  private boardOriginY = 0
  private cellSize = 0
  private padding = 0
  private currentBoardSize: BoardSize = 15

  // Animation tracking for recently placed stone
  private animatingStone: { x: number; y: number; startTime: number } | null = null

  constructor(canvas: HTMLCanvasElement, container: HTMLElement) {
    this.canvas = canvas
    this.container = container
    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Failed to obtain 2D canvas context')
    }
    this.ctx = context

    this.resize()
    window.addEventListener('resize', () => {
      this.resize()
      this.resetView()
      this.requestRender()
    })
  }

  private prefersReducedMotion(): boolean {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1
    const rect = this.container.getBoundingClientRect()
    const width = Math.max(rect.width, 280)
    const height = Math.max(rect.height, 280)

    this.canvas.width = Math.floor(width * dpr)
    this.canvas.height = Math.floor(height * dpr)
    this.canvas.style.width = `${width}px`
    this.canvas.style.height = `${height}px`

    this.ctx.setTransform(1, 0, 0, 1, 0, 0)
    this.ctx.scale(dpr, dpr)

    this.updateBoardMetrics(this.currentBoardSize)
    this.requestRender()
  }

  updateBoardMetrics(size: BoardSize): void {
    this.currentBoardSize = size
    const rect = this.container.getBoundingClientRect()
    const availWidth = rect.width
    const availHeight = rect.height

    const minDim = Math.min(availWidth, availHeight)
    this.boardPixelSize = minDim * 0.94
    this.padding = this.boardPixelSize * 0.05
    const innerGridSize = this.boardPixelSize - this.padding * 2
    this.cellSize = innerGridSize / (size - 1)

    this.boardOriginX = (availWidth - this.boardPixelSize) / 2
    this.boardOriginY = (availHeight - this.boardPixelSize) / 2
  }

  resetView(): void {
    this.transform.scale = 1
    this.transform.offsetX = 0
    this.transform.offsetY = 0
  }

  clampOffset(): void {
    if (this.transform.scale <= 1) {
      this.transform.offsetX = 0
      this.transform.offsetY = 0
      return
    }
    const rect = this.container.getBoundingClientRect()
    const maxOffsetX = (rect.width * (this.transform.scale - 1)) / 2
    const maxOffsetY = (rect.height * (this.transform.scale - 1)) / 2

    this.transform.offsetX = Math.max(-maxOffsetX, Math.min(maxOffsetX, this.transform.offsetX))
    this.transform.offsetY = Math.max(-maxOffsetY, Math.min(maxOffsetY, this.transform.offsetY))
  }

  setZoom(scale: number, centerX: number, centerY: number): void {
    const prevScale = this.transform.scale
    const nextScale = Math.max(1, Math.min(3, scale))
    if (nextScale === prevScale) return

    // Scale around center point
    const factor = nextScale / prevScale
    this.transform.offsetX = centerX - (centerX - this.transform.offsetX) * factor
    this.transform.offsetY = centerY - (centerY - this.transform.offsetY) * factor
    this.transform.scale = nextScale

    this.clampOffset()
    this.requestRender()
  }

  pan(deltaX: number, deltaY: number): void {
    if (this.transform.scale <= 1) return
    this.transform.offsetX += deltaX
    this.transform.offsetY += deltaY
    this.clampOffset()
    this.requestRender()
  }

  triggerStoneAnimation(x: number, y: number): void {
    if (this.prefersReducedMotion()) return
    this.animatingStone = { x, y, startTime: performance.now() }
    this.startAnimationLoop()
  }

  requestRender(): void {
    if (!this.animating) {
      this.renderCurrentState(performance.now())
    }
  }

  startAnimationLoop(): void {
    if (this.animating || this.prefersReducedMotion()) return
    this.animating = true
    this.animStartTime = performance.now()
    const loop = (now: number) => {
      if (!this.animating) return
      this.renderCurrentState(now)
      requestAnimationFrame(loop)
    }
    requestAnimationFrame(loop)
  }

  stopAnimationLoop(): void {
    this.animating = false
  }

  // Active state reference for rendering
  private activeState: RenderState | null = null

  render(state: RenderState): void {
    this.activeState = state
    this.updateBoardMetrics(state.board.size)

    if (state.winLine && !this.animating && !this.prefersReducedMotion()) {
      this.startAnimationLoop()
    }

    if (!this.animating) {
      this.renderCurrentState(performance.now())
    }
  }

  private renderCurrentState(timestamp: number): void {
    if (!this.activeState) return

    const { board, theme, lastMove, winLine, ghost } = this.activeState
    const rect = this.container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    this.ctx.clearRect(0, 0, width, height)

    this.ctx.save()

    // Apply view transform (zoom & pan) centered in canvas
    this.ctx.translate(width / 2 + this.transform.offsetX, height / 2 + this.transform.offsetY)
    this.ctx.scale(this.transform.scale, this.transform.scale)
    this.ctx.translate(-width / 2, -height / 2)

    // 1. Draw Goban Table
    this.drawBoardTable(theme)

    // 2. Draw Grid Lines and Star points
    this.drawGrid(board.size, theme)

    // 3. Draw Stones
    this.drawStones(board, theme, timestamp)

    // 4. Draw Ghost Stone preview
    if (ghost && board.inBounds(ghost.x, ghost.y) && board.get(ghost.x, ghost.y) === EMPTY) {
      this.drawGhostStone(ghost.x, ghost.y, ghost.player)
    }

    // 5. Draw Last Move Marker
    if (lastMove && board.get(lastMove.x, lastMove.y) !== EMPTY) {
      this.drawLastMoveMarker(lastMove.x, lastMove.y, board.get(lastMove.x, lastMove.y))
    }

    // 6. Draw Winning Line with glowing pulse
    if (winLine && winLine.length >= 5) {
      this.drawWinningLine(winLine, theme, timestamp)
    }

    this.ctx.restore()

    // Stop animation loop if no active winLine and stone animation completed
    if (this.animatingStone) {
      if (timestamp - this.animatingStone.startTime > 160) {
        this.animatingStone = null
      }
    }
    if (!winLine && !this.animatingStone && this.animating) {
      this.stopAnimationLoop()
    }
  }

  private drawBoardTable(theme: Theme): void {
    const x = this.boardOriginX
    const y = this.boardOriginY
    const size = this.boardPixelSize
    const radius = 16

    this.ctx.save()

    // Outer board shadow: deep natural shadow for tactile 3D wood block look
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.65)'
    this.ctx.shadowBlur = 24
    this.ctx.shadowOffsetY = 12

    // Board plate
    if (theme === 'wood') {
      // Base Kaya wood gradient
      const grad = this.ctx.createRadialGradient(
        x + size * 0.35, y + size * 0.35, size * 0.1,
        x + size * 0.5, y + size * 0.5, size * 0.72
      )
      grad.addColorStop(0, '#ebba7c')
      grad.addColorStop(0.5, '#ce8d46')
      grad.addColorStop(0.85, '#a86c2d')
      grad.addColorStop(1, '#7e4c19')
      this.ctx.fillStyle = grad
      this.ctx.strokeStyle = '#57330f'
    } else {
      // Slate theme
      const grad = this.ctx.createRadialGradient(
        x + size * 0.35, y + size * 0.35, size * 0.1,
        x + size * 0.5, y + size * 0.5, size * 0.7
      )
      grad.addColorStop(0, '#283548')
      grad.addColorStop(1, '#151d2a')
      this.ctx.fillStyle = grad
      this.ctx.strokeStyle = '#334155'
    }

    this.ctx.lineWidth = 4
    this.roundedRect(x, y, size, size, radius)
    this.ctx.fill()
    this.ctx.shadowColor = 'transparent'
    this.ctx.stroke()

    // Subtle inner chamfer border for traditional Goban craftsmanship
    if (theme === 'wood') {
      const inset = 5
      this.ctx.strokeStyle = 'rgba(255, 230, 180, 0.28)'
      this.ctx.lineWidth = 1.5
      this.roundedRect(x + inset, y + inset, size - inset * 2, size - inset * 2, radius - 2)
      this.ctx.stroke()

      const outerInset = 1.5
      this.ctx.strokeStyle = 'rgba(40, 20, 5, 0.45)'
      this.ctx.lineWidth = 1.5
      this.roundedRect(x + outerInset, y + outerInset, size - outerInset * 2, size - outerInset * 2, radius)
      this.ctx.stroke()
    }

    this.ctx.restore()
  }

  private drawGrid(size: BoardSize, theme: Theme): void {
    this.ctx.save()
    this.ctx.strokeStyle = theme === 'wood' ? '#5a340e' : '#475569'
    this.ctx.lineWidth = 1.2
    this.ctx.lineCap = 'round'

    const startX = this.boardOriginX + this.padding
    const startY = this.boardOriginY + this.padding

    // Grid lines
    for (let i = 0; i < size; i++) {
      // Horizontal
      const y = startY + i * this.cellSize
      this.ctx.beginPath()
      this.ctx.moveTo(startX, y)
      this.ctx.lineTo(startX + (size - 1) * this.cellSize, y)
      this.ctx.stroke()

      // Vertical
      const x = startX + i * this.cellSize
      this.ctx.beginPath()
      this.ctx.moveTo(x, startY)
      this.ctx.lineTo(x, startY + (size - 1) * this.cellSize)
      this.ctx.stroke()
    }

    // Star points (Hoshi)
    const starColor = theme === 'wood' ? '#44250a' : '#94a3b8'
    this.ctx.fillStyle = starColor

    const hoshiCoords = size === 15
      ? [
          { x: 3, y: 3 }, { x: 3, y: 11 }, { x: 11, y: 3 }, { x: 11, y: 11 }, { x: 7, y: 7 }
        ]
      : [
          { x: 3, y: 3 }, { x: 3, y: 9 }, { x: 3, y: 15 },
          { x: 9, y: 3 }, { x: 9, y: 9 }, { x: 9, y: 15 },
          { x: 15, y: 3 }, { x: 15, y: 9 }, { x: 15, y: 15 }
        ]

    for (const h of hoshiCoords) {
      const px = startX + h.x * this.cellSize
      const py = startY + h.y * this.cellSize
      this.ctx.beginPath()
      this.ctx.arc(px, py, this.cellSize * 0.11, 0, Math.PI * 2)
      this.ctx.fill()
    }

    this.ctx.restore()
  }

  private drawStones(board: Board, theme: Theme, timestamp: number): void {
    const radius = this.cellSize * 0.44

    for (let y = 0; y < board.size; y++) {
      for (let x = 0; x < board.size; x++) {
        const color = board.get(x, y)
        if (color === EMPTY) continue

        const { screenX, screenY } = this.boardToScreen(x, y)

        // Scale animation for newly placed stone
        let scale = 1
        if (this.animatingStone && this.animatingStone.x === x && this.animatingStone.y === y && !this.prefersReducedMotion()) {
          const progress = Math.min(1, (timestamp - this.animatingStone.startTime) / 150)
          scale = 0.6 + 0.4 * progress
        }

        this.drawSingleStone(screenX, screenY, radius * scale, color, theme)
      }
    }
  }

  private drawSingleStone(x: number, y: number, radius: number, player: Cell, theme: Theme): void {
    this.ctx.save()

    // Stone drop shadow
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.45)'
    this.ctx.shadowBlur = 6
    this.ctx.shadowOffsetX = 2
    this.ctx.shadowOffsetY = 4

    this.ctx.beginPath()
    this.ctx.arc(x, y, radius, 0, Math.PI * 2)

    if (player === BLACK) {
      if (theme === 'wood') {
        const grad = this.ctx.createRadialGradient(
          x - radius * 0.35, y - radius * 0.35, radius * 0.05,
          x, y, radius
        )
        grad.addColorStop(0, '#555555')
        grad.addColorStop(0.35, '#222222')
        grad.addColorStop(1, '#080808')
        this.ctx.fillStyle = grad
      } else {
        // Slate black stone with subtle edge
        this.ctx.fillStyle = '#090d16'
        this.ctx.strokeStyle = '#334155'
        this.ctx.lineWidth = 1.5
      }
    } else {
      // White stone
      const grad = this.ctx.createRadialGradient(
        x - radius * 0.35, y - radius * 0.35, radius * 0.05,
        x, y, radius
      )
      grad.addColorStop(0, '#ffffff')
      grad.addColorStop(0.65, '#e2e2e6')
      grad.addColorStop(1, '#b0b0b8')
      this.ctx.fillStyle = grad
    }

    this.ctx.fill()
    if (theme === 'slate' && player === BLACK) {
      this.ctx.stroke()
    }
    this.ctx.restore()
  }

  private drawGhostStone(x: number, y: number, player: Player): void {
    const { screenX, screenY } = this.boardToScreen(x, y)
    const radius = this.cellSize * 0.44

    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY, radius, 0, Math.PI * 2)
    if (player === BLACK) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.45)'
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    } else {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
      this.ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)'
    }
    this.ctx.lineWidth = 2
    this.ctx.fill()
    this.ctx.stroke()
    this.ctx.restore()
  }

  private drawLastMoveMarker(x: number, y: number, color: Cell): void {
    const { screenX, screenY } = this.boardToScreen(x, y)
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.arc(screenX, screenY, this.cellSize * 0.12, 0, Math.PI * 2)
    this.ctx.fillStyle = color === BLACK ? '#f59e0b' : '#dc2626'
    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.5)'
    this.ctx.shadowBlur = 3
    this.ctx.fill()
    this.ctx.restore()
  }

  private drawWinningLine(winLine: { x: number; y: number }[], theme: Theme, timestamp: number): void {
    this.ctx.save()

    const pulse = this.prefersReducedMotion() ? 0.5 : (0.5 + 0.5 * Math.sin((timestamp - this.animStartTime) / 200))
    const lineColor = theme === 'wood' ? '#22c55e' : '#38bdf8'

    this.ctx.strokeStyle = lineColor
    this.ctx.lineWidth = 6 + pulse * 3
    this.ctx.lineCap = 'round'
    this.ctx.shadowColor = lineColor
    this.ctx.shadowBlur = 12 + pulse * 8

    this.ctx.beginPath()
    for (let i = 0; i < winLine.length; i++) {
      const pt = this.boardToScreen(winLine[i].x, winLine[i].y)
      if (i === 0) {
        this.ctx.moveTo(pt.screenX, pt.screenY)
      } else {
        this.ctx.lineTo(pt.screenX, pt.screenY)
      }
    }
    this.ctx.stroke()

    // Draw glowing circles on each winning stone
    for (const cell of winLine) {
      const pt = this.boardToScreen(cell.x, cell.y)
      this.ctx.beginPath()
      this.ctx.arc(pt.screenX, pt.screenY, this.cellSize * 0.2, 0, Math.PI * 2)
      this.ctx.fillStyle = lineColor
      this.ctx.fill()
    }

    this.ctx.restore()
  }

  private roundedRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.beginPath()
    this.ctx.moveTo(x + r, y)
    this.ctx.lineTo(x + w - r, y)
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    this.ctx.lineTo(x + w, y + h - r)
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    this.ctx.lineTo(x + r, y + h)
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    this.ctx.lineTo(x, y + r)
    this.ctx.quadraticCurveTo(x, y, x + r, y)
    this.ctx.closePath()
  }

  boardToScreen(x: number, y: number): { screenX: number; screenY: number } {
    const startX = this.boardOriginX + this.padding
    const startY = this.boardOriginY + this.padding
    return {
      screenX: startX + x * this.cellSize,
      screenY: startY + y * this.cellSize
    }
  }

  screenToBoard(screenX: number, screenY: number, size: BoardSize): { x: number; y: number } | null {
    const rect = this.container.getBoundingClientRect()
    const width = rect.width
    const height = rect.height

    // Reverse view transform
    let x = screenX - rect.left
    let y = screenY - rect.top

    x = (x - (width / 2 + this.transform.offsetX)) / this.transform.scale + width / 2
    y = (y - (height / 2 + this.transform.offsetY)) / this.transform.scale + height / 2

    const startX = this.boardOriginX + this.padding
    const startY = this.boardOriginY + this.padding

    const boardX = Math.round((x - startX) / this.cellSize)
    const boardY = Math.round((y - startY) / this.cellSize)

    if (boardX >= 0 && boardX < size && boardY >= 0 && boardY < size) {
      // Validate proximity to intersection (within 0.48 of cell size)
      const exactX = startX + boardX * this.cellSize
      const exactY = startY + boardY * this.cellSize
      const dist = Math.hypot(x - exactX, y - exactY)
      if (dist <= this.cellSize * 0.48) {
        return { x: boardX, y: boardY }
      }
    }

    return null
  }
}
