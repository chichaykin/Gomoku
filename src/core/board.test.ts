import { describe, expect, it } from 'vitest'
import { Board } from './board'
import { BLACK, EMPTY, WHITE } from './types'

describe('Board model', () => {
  it('initializes with correct size and empty cells', () => {
    const board = new Board(15)
    expect(board.size).toBe(15)
    expect(board.cells.length).toBe(225)
    expect(board.get(0, 0)).toBe(EMPTY)
    expect(board.get(7, 7)).toBe(EMPTY)
    expect(board.isFull()).toBe(false)
  })

  it('bounds checking works correctly', () => {
    const board = new Board(15)
    expect(board.inBounds(0, 0)).toBe(true)
    expect(board.inBounds(14, 14)).toBe(true)
    expect(board.inBounds(-1, 0)).toBe(false)
    expect(board.inBounds(0, 15)).toBe(false)
    expect(board.get(-1, 5)).toBe(EMPTY)
  })

  it('sets and gets cell color', () => {
    const board = new Board(15)
    board.set(7, 7, BLACK)
    expect(board.get(7, 7)).toBe(BLACK)
    board.set(7, 8, WHITE)
    expect(board.get(7, 8)).toBe(WHITE)
  })

  it('detects win horizontally (direction 1, 0)', () => {
    const board = new Board(15)
    // Place 5 in a row horizontally
    for (let x = 3; x <= 7; x++) {
      board.set(x, 5, BLACK)
    }
    const win = board.checkWin(7, 5)
    expect(win).not.toBeNull()
    expect(win?.length).toBe(5)
    expect(win).toEqual([
      { x: 3, y: 5 },
      { x: 4, y: 5 },
      { x: 5, y: 5 },
      { x: 6, y: 5 },
      { x: 7, y: 5 }
    ])
  })

  it('detects win vertically (direction 0, 1)', () => {
    const board = new Board(15)
    for (let y = 2; y <= 6; y++) {
      board.set(4, y, WHITE)
    }
    const win = board.checkWin(4, 4)
    expect(win).not.toBeNull()
    expect(win?.length).toBe(5)
  })

  it('detects win diagonally (direction 1, 1)', () => {
    const board = new Board(15)
    for (let i = 0; i < 5; i++) {
      board.set(2 + i, 2 + i, BLACK)
    }
    const win = board.checkWin(4, 4)
    expect(win).not.toBeNull()
    expect(win?.length).toBe(5)
  })

  it('detects win anti-diagonally (direction 1, -1)', () => {
    const board = new Board(15)
    for (let i = 0; i < 5; i++) {
      board.set(2 + i, 8 - i, WHITE)
    }
    const win = board.checkWin(4, 6)
    expect(win).not.toBeNull()
    expect(win?.length).toBe(5)
  })

  it('awards win for 6 or more stones in a row (Free Gomoku)', () => {
    const board = new Board(15)
    for (let x = 1; x <= 6; x++) {
      board.set(x, 10, BLACK)
    }
    const win = board.checkWin(6, 10)
    expect(win).not.toBeNull()
    expect(win?.length).toBe(6)
  })

  it('returns null if fewer than 5 stones', () => {
    const board = new Board(15)
    for (let x = 1; x <= 4; x++) {
      board.set(x, 3, BLACK)
    }
    expect(board.checkWin(4, 3)).toBeNull()
  })

  it('clones board correctly without sharing memory', () => {
    const board = new Board(15)
    board.set(5, 5, BLACK)
    const clone = board.clone()
    expect(clone.get(5, 5)).toBe(BLACK)
    clone.set(5, 5, WHITE)
    expect(board.get(5, 5)).toBe(BLACK)
    expect(clone.get(5, 5)).toBe(WHITE)
  })
})
