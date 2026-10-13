import { Board } from '../core/board'
import { Difficulty, Player } from '../core/types'
import { WorkerRequest, WorkerResponse } from './ai.worker'

export interface AiMoveCallback {
  (move: { x: number; y: number }): void
}

export class AiClient {
  private worker: Worker | null = null
  private latestRequestId = 0
  private isThinking = false
  private currentCallback: AiMoveCallback | null = null
  private currentStartTime = 0
  private readonly minDelayMs = 350

  constructor() {
    this.initWorker()
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
          type: 'module'
        })
        this.worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          this.handleWorkerResponse(e.data)
        }
        this.worker.onerror = (err) => {
          console.warn('AI Web Worker encountered an error, resetting thinking state', err)
          this.isThinking = false
          this.currentCallback = null
        }
      } catch (err) {
        console.warn('Failed to initialize AI Web Worker, falling back to sync', err)
        this.worker = null
      }
    }
  }

  private handleWorkerResponse(response: WorkerResponse): void {
    if (response.id !== this.latestRequestId || !this.currentCallback) {
      // Stale response from canceled/superseded turn, ignore
      return
    }

    const callback = this.currentCallback
    const requestId = this.latestRequestId
    const elapsed = performance.now() - this.currentStartTime
    const remainingDelay = Math.max(0, this.minDelayMs - elapsed)

    setTimeout(() => {
      if (requestId === this.latestRequestId) {
        this.isThinking = false
        this.currentCallback = null
        callback({ x: response.x, y: response.y })
      }
    }, remainingDelay)
  }

  getIsThinking(): boolean {
    return this.isThinking
  }

  cancelCurrentThinking(): void {
    this.latestRequestId++
    this.isThinking = false
    this.currentCallback = null
  }

  requestMove(
    board: Board,
    aiPlayer: Player,
    difficulty: Difficulty,
    onMove: AiMoveCallback,
    timeLimitMs = 800
  ): void {
    this.latestRequestId++
    const requestId = this.latestRequestId
    this.isThinking = true
    this.currentCallback = onMove
    this.currentStartTime = performance.now()

    if (!this.worker) {
      // Synchronous fallback
      import('./search').then(({ findBestMove }) => {
        if (requestId !== this.latestRequestId) return
        const res = findBestMove(board, aiPlayer, difficulty, timeLimitMs)
        const elapsed = performance.now() - this.currentStartTime
        const remainingDelay = Math.max(0, this.minDelayMs - elapsed)
        setTimeout(() => {
          if (requestId === this.latestRequestId) {
            this.isThinking = false
            this.currentCallback = null
            onMove({ x: res.x, y: res.y })
          }
        }, remainingDelay)
      })
      return
    }

    const request: WorkerRequest = {
      id: requestId,
      size: board.size,
      cells: board.toArray(),
      aiPlayer,
      difficulty,
      timeLimitMs
    }

    this.worker.postMessage(request)
  }
}
