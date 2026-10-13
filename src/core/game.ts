import { Board } from './board'
import { BLACK, BoardSize, EMPTY, GameStatus, Move, Player, Settings, WHITE } from './types'

export interface GameState {
  board: Board
  moves: Move[]
  current: Player
  status: GameStatus
  winLine: { x: number; y: number }[] | null
  winner: Player | null
  startedAt: number
  elapsedMs: number
}

export class Game {
  state: GameState

  constructor(size: BoardSize = 15) {
    this.state = {
      board: new Board(size),
      moves: [],
      current: BLACK,
      status: 'playing',
      winLine: null,
      winner: null,
      startedAt: Date.now(),
      elapsedMs: 0
    }
  }

  play(x: number, y: number): boolean {
    if (this.state.status !== 'playing') {
      return false
    }
    if (!this.state.board.inBounds(x, y)) {
      return false
    }
    if (this.state.board.get(x, y) !== EMPTY) {
      return false
    }

    const player = this.state.current
    this.state.board.set(x, y, player)
    this.state.moves.push({ x, y, player })

    const winLine = this.state.board.checkWin(x, y)
    if (winLine) {
      this.state.status = 'won'
      this.state.winner = player
      this.state.winLine = winLine
      return true
    }

    if (this.state.board.isFull()) {
      this.state.status = 'draw'
      return true
    }

    // Next turn
    this.state.current = player === BLACK ? WHITE : BLACK
    return true
  }

  undo(n: 1 | 2 = 1): boolean {
    if (this.state.moves.length === 0) {
      return false
    }

    const count = Math.min(n, this.state.moves.length)
    for (let i = 0; i < count; i++) {
      const lastMove = this.state.moves.pop()
      if (lastMove) {
        this.state.board.set(lastMove.x, lastMove.y, EMPTY)
      }
    }

    // Revert win/draw states
    this.state.status = 'playing'
    this.state.winner = null
    this.state.winLine = null

    // Determine current player
    if (this.state.moves.length === 0) {
      this.state.current = BLACK
    } else {
      const lastPlayer = this.state.moves[this.state.moves.length - 1].player
      this.state.current = lastPlayer === BLACK ? WHITE : BLACK
    }

    return true
  }

  reset(settings?: Partial<Settings>): void {
    const size = settings?.size ?? this.state.board.size
    this.state = {
      board: new Board(size),
      moves: [],
      current: BLACK,
      status: 'playing',
      winLine: null,
      winner: null,
      startedAt: Date.now(),
      elapsedMs: 0
    }
  }

  serialize(): string {
    return JSON.stringify({
      size: this.state.board.size,
      cells: this.state.board.toArray(),
      moves: this.state.moves,
      current: this.state.current,
      status: this.state.status,
      winLine: this.state.winLine,
      winner: this.state.winner,
      startedAt: this.state.startedAt,
      elapsedMs: this.state.elapsedMs
    })
  }

  deserialize(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr)
      if (!data || typeof data.size !== 'number' || !Array.isArray(data.cells)) {
        return false
      }
      const board = new Board(data.size as BoardSize, data.cells)
      this.state = {
        board,
        moves: Array.isArray(data.moves) ? data.moves : [],
        current: data.current === WHITE ? WHITE : BLACK,
        status: data.status === 'won' || data.status === 'draw' ? data.status : 'playing',
        winLine: data.winLine || null,
        winner: data.winner || null,
        startedAt: typeof data.startedAt === 'number' ? data.startedAt : Date.now(),
        elapsedMs: typeof data.elapsedMs === 'number' ? data.elapsedMs : 0
      }
      return true
    } catch {
      return false
    }
  }
}
