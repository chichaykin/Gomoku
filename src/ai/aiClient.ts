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

  constructor() {
    this.initWorker()
  }

  private initWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), {
          type: 'module'
        })
      } catch (err) {
        console.warn('Failed to initialize AI Web Worker, falling back to sync', err)
        this.worker = null
      }
    }
  }

  getIsThinking(): boolean {
    return this.isThinking
  }

  cancelCurrentThinking(): void {
    this.latestRequestId++
    this.isThinking = false
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
    const startTime = performance.now()
    const minDelayMs = 350

    if (!this.worker) {
      // Synchronous fallback
      import('./search').then(({ findBestMove }) => {
        if (requestId !== this.latestRequestId) return
        const res = findBestMove(board, aiPlayer, difficulty, timeLimitMs)
        const elapsed = performance.now() - startTime
        const remainingDelay = Math.max(0, minDelayMs - elapsed)
        setTimeout(() => {
          if (requestId === this.latestRequestId) {
            this.isThinking = false
            onMove({ x: res.x, y: res.y })
          }
        }, remainingDelay)
      })
      return
    }

    const onMessage = (e: MessageEvent<WorkerResponse>) => {
      const response = e.data
      if (response.id !== requestId) {
        // Stale response from canceled/superseded turn, ignore
        return
      }

      this.worker?.removeEventListener('message', onMessage)

      const elapsed = performance.now() - startTime
      const remainingDelay = Math.max(0, minDelayMs - elapsed)

      setTimeout(() => {
        if (requestId === this.latestRequestId) {
          this.isThinking = false
          onMove({ x: response.x, y: response.y })
        }
      }, remainingDelay)
    }

    this.worker.addEventListener('message', onMessage)

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
