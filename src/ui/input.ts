import { BoardSize, Player } from '../core/types'
import { CanvasRenderer } from './renderer'

export interface InputCallbacks {
  onConfirmMove: (x: number, y: number) => void
  onGhostChange: (ghost: { x: number; y: number; player: Player } | null) => void
  getCurrentPlayer: () => Player
  getBoardSize: () => BoardSize
  isInteractionLocked: () => boolean
  isCellEmpty: (x: number, y: number) => boolean
}

export class InputController {
  private canvas: HTMLCanvasElement
  private renderer: CanvasRenderer
  private callbacks: InputCallbacks
  public oneTapMove: boolean

  // Pointer tracking for multi-touch (pinch-to-zoom)
  private activePointers: Map<number, { x: number; y: number }> = new Map()
  private initialPinchDist = 0
  private initialPinchScale = 1
  private pinchMidX = 0
  private pinchMidY = 0
  private hasPinched = false

  // Single pointer tracking for tap vs pan
  private startPointerX = 0
  private startPointerY = 0
  private isPanning = false
  private readonly PAN_THRESHOLD = 8 // px

  // Active ghost preview stone
  private currentGhost: { x: number; y: number; player: Player } | null = null

  // Double-tap tracking
  private lastTapTime = 0
  private readonly DOUBLE_TAP_DELAY = 300 // ms

  constructor(canvas: HTMLCanvasElement, renderer: CanvasRenderer, callbacks: InputCallbacks) {
    this.canvas = canvas
    this.renderer = renderer
    this.callbacks = callbacks

    // Default: coarse pointer (mobile) uses confirm mode, fine pointer (mouse) uses one-tap
    const isCoarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
    this.oneTapMove = !isCoarse

    this.bindEvents()
  }

  getGhost(): { x: number; y: number; player: Player } | null {
    return this.currentGhost
  }

  clearGhost(): void {
    if (this.currentGhost !== null) {
      this.currentGhost = null
      this.callbacks.onGhostChange(null)
      this.renderer.requestRender()
    }
  }

  confirmGhostMove(): boolean {
    if (this.currentGhost) {
      const { x, y } = this.currentGhost
      this.clearGhost()
      this.callbacks.onConfirmMove(x, y)
      return true
    }
    return false
  }

  private bindEvents(): void {
    this.canvas.addEventListener('pointerdown', this.onPointerDown.bind(this))
    this.canvas.addEventListener('pointermove', this.onPointerMove.bind(this))
    this.canvas.addEventListener('pointerup', this.onPointerUp.bind(this))
    this.canvas.addEventListener('pointercancel', this.onPointerCancel.bind(this))
    this.canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false })
  }

  private onPointerDown(e: PointerEvent): void {
    e.preventDefault()
    this.canvas.setPointerCapture(e.pointerId)
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.activePointers.size === 1) {
      this.startPointerX = e.clientX
      this.startPointerY = e.clientY
      this.isPanning = false
      this.hasPinched = false
    } else if (this.activePointers.size === 2) {
      // Begin pinch
      this.hasPinched = true
      const pts = Array.from(this.activePointers.values())
      this.initialPinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      this.initialPinchScale = this.renderer.transform.scale
      const rect = this.canvas.getBoundingClientRect()
      this.pinchMidX = (pts[0].x + pts[1].x) / 2 - rect.left
      this.pinchMidY = (pts[0].y + pts[1].y) / 2 - rect.top
    }
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.activePointers.has(e.pointerId)) {
      // Desktop mouse hover preview
      if (e.pointerType === 'mouse' && !this.callbacks.isInteractionLocked()) {
        const boardSize = this.callbacks.getBoardSize()
        const cell = this.renderer.screenToBoard(e.clientX, e.clientY, boardSize)
        if (cell && this.callbacks.isCellEmpty(cell.x, cell.y)) {
          const player = this.callbacks.getCurrentPlayer()
          if (!this.currentGhost || this.currentGhost.x !== cell.x || this.currentGhost.y !== cell.y) {
            this.currentGhost = { x: cell.x, y: cell.y, player }
            this.callbacks.onGhostChange(this.currentGhost)
            this.renderer.requestRender()
          }
        } else if (this.currentGhost) {
          this.clearGhost()
        }
      }
      return
    }

    const prevPos = this.activePointers.get(e.pointerId)!
    const deltaX = e.clientX - prevPos.x
    const deltaY = e.clientY - prevPos.y
    this.activePointers.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (this.activePointers.size === 2) {
      // Pinching
      const pts = Array.from(this.activePointers.values())
      const curDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y)
      if (this.initialPinchDist > 0) {
        const newScale = this.initialPinchScale * (curDist / this.initialPinchDist)
        this.renderer.setZoom(newScale, this.pinchMidX, this.pinchMidY)
      }
    } else if (this.activePointers.size === 1 && !this.hasPinched) {
      // Check if distance passed pan threshold
      const totalDist = Math.hypot(e.clientX - this.startPointerX, e.clientY - this.startPointerY)
      if (totalDist > this.PAN_THRESHOLD) {
        this.isPanning = true
      }
      if (this.isPanning) {
        this.renderer.pan(deltaX, deltaY)
      }
    }
  }

  private onPointerUp(e: PointerEvent): void {
    try {
      this.canvas.releasePointerCapture(e.pointerId)
    } catch {
      // Ignore if pointer capture was already released
    }

    const wasPanning = this.isPanning
    const wasPinching = this.hasPinched

    this.activePointers.delete(e.pointerId)

    // Only process tap if all fingers released and no drag/pinch occurred
    if (this.activePointers.size === 0 && !wasPanning && !wasPinching) {
      this.handleTap(e.clientX, e.clientY)
    }
  }

  private onPointerCancel(e: PointerEvent): void {
    this.activePointers.delete(e.pointerId)
    if (this.activePointers.size === 0) {
      this.isPanning = false
      this.hasPinched = false
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault()
    const rect = this.canvas.getBoundingClientRect()
    const centerX = e.clientX - rect.left
    const centerY = e.clientY - rect.top
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
    const newScale = this.renderer.transform.scale * zoomFactor
    this.renderer.setZoom(newScale, centerX, centerY)
  }

  private handleTap(clientX: number, clientY: number): void {
    if (this.callbacks.isInteractionLocked()) return

    const now = performance.now()
    const isDoubleTap = now - this.lastTapTime < this.DOUBLE_TAP_DELAY
    this.lastTapTime = now

    const boardSize = this.callbacks.getBoardSize()
    const cell = this.renderer.screenToBoard(clientX, clientY, boardSize)

    // Double-tap on empty area resets zoom
    if (isDoubleTap && !cell) {
      this.renderer.resetView()
      this.renderer.requestRender()
      return
    }

    if (!cell) {
      // Tapped outside board grid -> dismiss ghost if in confirm mode
      if (!this.oneTapMove && this.currentGhost) {
        this.clearGhost()
      }
      return
    }

    // Guard against tapping already occupied intersections
    if (!this.callbacks.isCellEmpty(cell.x, cell.y)) {
      if (!this.oneTapMove && this.currentGhost) {
        this.clearGhost()
      }
      return
    }

    const player = this.callbacks.getCurrentPlayer()

    if (this.oneTapMove) {
      // One-tap move: plays directly
      this.clearGhost()
      this.callbacks.onConfirmMove(cell.x, cell.y)
    } else {
      // Confirm mode: tap on same cell confirms move, tap on another cell moves ghost
      if (this.currentGhost && this.currentGhost.x === cell.x && this.currentGhost.y === cell.y) {
        this.confirmGhostMove()
      } else {
        this.currentGhost = { x: cell.x, y: cell.y, player }
        this.callbacks.onGhostChange(this.currentGhost)
        this.renderer.requestRender()
      }
    }
  }
}
