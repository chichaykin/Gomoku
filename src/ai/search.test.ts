import { describe, expect, it } from 'vitest'
import { Board } from '../core/board'
import { BLACK, WHITE } from '../core/types'
import { findBestMove } from './search'

describe('AI Search engine', () => {
  it('takes its own win when it has a four (all levels)', () => {
    const levels = ['easy', 'medium', 'hard'] as const
    for (const level of levels) {
      const board = new Board(15)
      // AI is BLACK, has 4 in a row: (1,5), (2,5), (3,5), (4,5)
      board.set(1, 5, BLACK)
      board.set(2, 5, BLACK)
      board.set(3, 5, BLACK)
      board.set(4, 5, BLACK)

      const move = findBestMove(board, BLACK, level)
      // Winning moves are either (0,5) or (5,5)
      expect(move.y).toBe(5)
      expect(move.x === 0 || move.x === 5).toBe(true)
    }
  })

  it("blocks the opponent's closed four (all levels)", () => {
    const levels = ['easy', 'medium', 'hard'] as const
    for (const level of levels) {
      const board = new Board(15)
      // Opponent is BLACK, AI is WHITE
      // Opponent has: (2,7), (3,7), (4,7), (5,7)
      // One end (1,7) is blocked by boundary or stone, other end (6,7) is open
      board.set(1, 7, WHITE) // Blocked on left
      board.set(2, 7, BLACK)
      board.set(3, 7, BLACK)
      board.set(4, 7, BLACK)
      board.set(5, 7, BLACK)

      const move = findBestMove(board, WHITE, level)
      // Must block at (6, 7)
      expect(move.x).toBe(6)
      expect(move.y).toBe(7)
    }
  })

  it('medium and hard block an opponent open three when they have no own threats', () => {
    const levels = ['medium', 'hard'] as const
    for (const level of levels) {
      const board = new Board(15)
      // Opponent (BLACK) has open three at y=5: (3,5), (4,5), (5,5) with (2,5) and (6,5) open
      board.set(3, 5, BLACK)
      board.set(4, 5, BLACK)
      board.set(5, 5, BLACK)

      const move = findBestMove(board, WHITE, level)
      // AI must block at either (2,5) or (6,5)
      expect(move.y).toBe(5)
      expect(move.x === 2 || move.x === 6).toBe(true)
    }
  })

  it('hard on 15x15 after 10 random moves responds in < 1000 ms', () => {
    const board = new Board(15)
    // Place 10 alternating moves near center
    const moves = [
      { x: 7, y: 7 }, { x: 7, y: 8 },
      { x: 8, y: 7 }, { x: 6, y: 6 },
      { x: 6, y: 7 }, { x: 8, y: 8 },
      { x: 9, y: 7 }, { x: 5, y: 5 },
      { x: 6, y: 8 }, { x: 7, y: 9 }
    ]
    moves.forEach((m, i) => {
      board.set(m.x, m.y, i % 2 === 0 ? BLACK : WHITE)
    })

    const start = performance.now()
    const move = findBestMove(board, BLACK, 'hard', 800)
    const elapsed = performance.now() - start

    expect(board.inBounds(move.x, move.y)).toBe(true)
    expect(board.get(move.x, move.y)).toBe(0) // must be empty cell
    expect(elapsed).toBeLessThan(1000)
  })
})
