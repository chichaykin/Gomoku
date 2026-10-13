import { Board } from '../core/board'
import { BoardSize, Difficulty, Player } from '../core/types'
import { findBestMove } from './search'

export interface WorkerRequest {
  id: number
  size: BoardSize
  cells: number[]
  aiPlayer: Player
  difficulty: Difficulty
  timeLimitMs: number
}

export interface WorkerResponse {
  id: number
  x: number
  y: number
  depth: number
  nodes: number
}

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const { id, size, cells, aiPlayer, difficulty, timeLimitMs } = e.data

  const board = new Board(size, cells)
  const result = findBestMove(board, aiPlayer, difficulty, timeLimitMs)

  const response: WorkerResponse = {
    id,
    x: result.x,
    y: result.y,
    depth: result.depth,
    nodes: result.nodes
  }

  self.postMessage(response)
}
