import { describe, expect, it } from 'vitest'
import { Game } from './game'
import { BLACK, WHITE } from './types'

describe('Game manager', () => {
  it('alternates turns between Black and White', () => {
    const game = new Game(15)
    expect(game.state.current).toBe(BLACK)

    expect(game.play(7, 7)).toBe(true)
    expect(game.state.current).toBe(WHITE)
    expect(game.state.moves.length).toBe(1)

    expect(game.play(7, 8)).toBe(true)
    expect(game.state.current).toBe(BLACK)
    expect(game.state.moves.length).toBe(2)
  })

  it('rejects playing on an occupied cell', () => {
    const game = new Game(15)
    expect(game.play(5, 5)).toBe(true)
    expect(game.play(5, 5)).toBe(false)
    expect(game.state.current).toBe(WHITE)
  })

  it('stops accepting moves after a win', () => {
    const game = new Game(15)
    // Black: (0,0), (1,0), (2,0), (3,0), (4,0)
    // White: (0,1), (1,1), (2,1), (3,1)
    game.play(0, 0) // B
    game.play(0, 1) // W
    game.play(1, 0) // B
    game.play(1, 1) // W
    game.play(2, 0) // B
    game.play(2, 1) // W
    game.play(3, 0) // B
    game.play(3, 1) // W
    game.play(4, 0) // B wins!

    expect(game.state.status).toBe('won')
    expect(game.state.winner).toBe(BLACK)
    expect(game.state.winLine?.length).toBe(5)

    // Cannot play further
    expect(game.play(4, 1)).toBe(false)
  })

  it('undo 1 reverts single move in pvp', () => {
    const game = new Game(15)
    game.play(7, 7) // B
    game.play(7, 8) // W

    expect(game.undo(1)).toBe(true)
    expect(game.state.moves.length).toBe(1)
    expect(game.state.board.get(7, 8)).toBe(0)
    expect(game.state.current).toBe(WHITE)
  })

  it('undo 2 reverts 2 moves in ai mode', () => {
    const game = new Game(15)
    game.play(7, 7) // B (Human)
    game.play(7, 8) // W (AI)

    expect(game.undo(2)).toBe(true)
    expect(game.state.moves.length).toBe(0)
    expect(game.state.board.get(7, 7)).toBe(0)
    expect(game.state.board.get(7, 8)).toBe(0)
    expect(game.state.current).toBe(BLACK)
  })

  it('undo after a win clears win state and allows continuing', () => {
    const game = new Game(15)
    // 5 in row
    for (let x = 0; x < 4; x++) {
      game.play(x, 0) // B
      game.play(x, 1) // W
    }
    game.play(4, 0) // B wins
    expect(game.state.status).toBe('won')

    expect(game.undo(1)).toBe(true)
    expect(game.state.status).toBe('playing')
    expect(game.state.winner).toBeNull()
    expect(game.state.winLine).toBeNull()
    expect(game.state.current).toBe(BLACK)

    // Can make a different move now
    expect(game.play(5, 5)).toBe(true)
    expect(game.state.current).toBe(WHITE)
  })

  it('handles serialize and deserialize', () => {
    const game = new Game(15)
    game.play(3, 3)
    game.play(4, 4)

    game.state.elapsedMs = 45000
    const serialized = game.serialize()
    const restored = new Game(15)
    expect(restored.deserialize(serialized)).toBe(true)

    expect(restored.state.moves.length).toBe(2)
    expect(restored.state.board.get(3, 3)).toBe(BLACK)
    expect(restored.state.board.get(4, 4)).toBe(WHITE)
    expect(restored.state.current).toBe(BLACK)
    expect(restored.state.elapsedMs).toBe(45000)
  })
})
