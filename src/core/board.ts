import { BoardSize, Cell, EMPTY } from './types'

export class Board {
  readonly size: BoardSize
  readonly cells: Int8Array

  constructor(size: BoardSize = 15, initialCells?: Int8Array | number[]) {
    this.size = size
    if (initialCells) {
      this.cells = new Int8Array(initialCells)
    } else {
      this.cells = new Int8Array(size * size)
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size
  }

  getIndex(x: number, y: number): number {
    return y * this.size + x
  }

  get(x: number, y: number): Cell {
    if (!this.inBounds(x, y)) return EMPTY
    return this.cells[this.getIndex(x, y)] as Cell
  }

  set(x: number, y: number, color: Cell): void {
    if (!this.inBounds(x, y)) return
    this.cells[this.getIndex(x, y)] = color
  }

  isFull(): boolean {
    const len = this.cells.length
    for (let i = 0; i < len; i++) {
      if (this.cells[i] === EMPTY) {
        return false
      }
    }
    return true
  }

  clone(): Board {
    return new Board(this.size, new Int8Array(this.cells))
  }

  toArray(): number[] {
    return Array.from(this.cells)
  }

  /**
   * Scans 4 rays through (x, y) to check for a winning line (>= 5 consecutive stones).
   * Free Gomoku: 5 or more in a row wins.
   * Returns array of coordinate points forming the winning line, or null.
   */
  checkWin(x: number, y: number): { x: number; y: number }[] | null {
    if (!this.inBounds(x, y)) return null
    const player = this.get(x, y)
    if (player === EMPTY) return null

    const directions = [
      { dx: 1, dy: 0 },   // Horizontal
      { dx: 0, dy: 1 },   // Vertical
      { dx: 1, dy: 1 },   // Diagonal \
      { dx: 1, dy: -1 },  // Anti-diagonal /
    ]

    for (const { dx, dy } of directions) {
      const line: { x: number; y: number }[] = [{ x, y }]

      // Forward direction (+dx, +dy)
      let step = 1
      while (true) {
        const nx = x + dx * step
        const ny = y + dy * step
        if (this.inBounds(nx, ny) && this.get(nx, ny) === player) {
          line.push({ x: nx, y: ny })
          step++
        } else {
          break
        }
      }

      // Backward direction (-dx, -dy)
      step = 1
      while (true) {
        const nx = x - dx * step
        const ny = y - dy * step
        if (this.inBounds(nx, ny) && this.get(nx, ny) === player) {
          line.unshift({ x: nx, y: ny })
          step++
        } else {
          break
        }
      }

      if (line.length >= 5) {
        return line
      }
    }

    return null
  }
}
