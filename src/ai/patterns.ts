import { Board } from '../core/board'
import { Cell, EMPTY, Player } from '../core/types'

export const PATTERN_WEIGHTS = {
  FIVE: 1_000_000,
  OPEN_FOUR: 100_000,
  CLOSED_FOUR: 10_000,
  OPEN_THREE: 5_000,
  CLOSED_THREE: 500,
  OPEN_TWO: 200,
  CLOSED_TWO: 20
} as const

const DIRECTIONS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: 1, dy: 1 },
  { dx: 1, dy: -1 }
]

/**
 * Extracts a line of cells centered at (x, y) along (dx, dy) with radius 4 (total length up to 9).
 * Treats out-of-bounds cells as the opponent's color to prevent false open ends.
 */
export function getLineWindow(
  board: Board,
  x: number,
  y: number,
  dx: number,
  dy: number,
  player: Player
): { cells: Cell[]; centerIdx: number } {
  const opponent: Player = player === 1 ? 2 : 1
  const cells: Cell[] = []

  for (let step = -4; step <= 4; step++) {
    const nx = x + dx * step
    const ny = y + dy * step
    if (board.inBounds(nx, ny)) {
      cells.push(board.get(nx, ny))
    } else {
      cells.push(opponent) // Boundary acts as block
    }
  }

  return { cells, centerIdx: 4 }
}

/**
 * Evaluates the line pattern for the given player when placing a stone at centerIdx.
 */
export function evaluateLinePattern(line: Cell[], centerIdx: number, player: Player): number {
  const opponent: Player = player === 1 ? 2 : 1

  // Count consecutive player stones through centerIdx
  let count = 1
  let left = centerIdx - 1
  while (left >= 0 && line[left] === player) {
    count++
    left--
  }
  const leftOpen = left >= 0 && line[left] === EMPTY

  let right = centerIdx + 1
  while (right < line.length && line[right] === player) {
    count++
    right++
  }
  const rightOpen = right < line.length && line[right] === EMPTY

  // 1. Five in a row
  if (count >= 5) {
    return PATTERN_WEIGHTS.FIVE
  }

  // 2. Continuous four
  if (count === 4) {
    if (leftOpen && rightOpen) {
      return PATTERN_WEIGHTS.OPEN_FOUR
    }
    if (leftOpen || rightOpen) {
      return PATTERN_WEIGHTS.CLOSED_FOUR
    }
    return 0
  }

  // Check for broken four (e.g. XX_XX, X_XXX, XXX_X) within the window
  const patternStr = line
    .map(c => (c === player ? 'P' : c === opponent ? 'O' : '_'))
    .join('')

  if (
    patternStr.includes('P_PPP') ||
    patternStr.includes('PP_PP') ||
    patternStr.includes('PPP_P')
  ) {
    return PATTERN_WEIGHTS.CLOSED_FOUR
  }

  // 3. Three
  if (count === 3) {
    if (leftOpen && rightOpen) {
      // Check if open 3 has extra room to expand (at least one end has space)
      const leftSpace = left - 1 >= 0 && line[left - 1] === EMPTY
      const rightSpace = right + 1 < line.length && line[right + 1] === EMPTY
      if (leftSpace || rightSpace) {
        return PATTERN_WEIGHTS.OPEN_THREE
      }
      return PATTERN_WEIGHTS.CLOSED_THREE
    }
    if (leftOpen || rightOpen) {
      return PATTERN_WEIGHTS.CLOSED_THREE
    }
  }

  // Broken open three: _P_PP_ or _PP_P_
  if (patternStr.includes('_P_PP_') || patternStr.includes('_PP_P_')) {
    return PATTERN_WEIGHTS.OPEN_THREE
  }

  // 4. Two
  if (count === 2) {
    if (leftOpen && rightOpen) {
      return PATTERN_WEIGHTS.OPEN_TWO
    }
    if (leftOpen || rightOpen) {
      return PATTERN_WEIGHTS.CLOSED_TWO
    }
  }

  // Broken open two: _P_P_
  if (patternStr.includes('_P_P_')) {
    return PATTERN_WEIGHTS.OPEN_TWO
  }

  return 0
}

/**
 * Evaluates the pure attack value of placing player's stone at (x, y).
 */
export function evaluateMoveAttack(board: Board, x: number, y: number, player: Player): number {
  let attackScore = 0
  for (const { dx, dy } of DIRECTIONS) {
    const { cells, centerIdx } = getLineWindow(board, x, y, dx, dy, player)
    cells[centerIdx] = player
    attackScore += evaluateLinePattern(cells, centerIdx, player)
  }
  return attackScore
}

/**
 * Calculates score for placing player's stone at (x, y), combining attack and defense values.
 */
export function scoreMove(board: Board, x: number, y: number, player: Player): number {
  const opponent: Player = player === 1 ? 2 : 1
  let attackScore = 0
  let defenseScore = 0
  let myThreatDirections = 0
  let oppThreatDirections = 0

  for (const { dx, dy } of DIRECTIONS) {
    // Attack evaluation
    const { cells: myLine, centerIdx } = getLineWindow(board, x, y, dx, dy, player)
    myLine[centerIdx] = player
    const myVal = evaluateLinePattern(myLine, centerIdx, player)
    attackScore += myVal

    if (myVal >= PATTERN_WEIGHTS.OPEN_THREE) {
      myThreatDirections++
    }

    // Defense evaluation (blocking opponent)
    const { cells: oppLine } = getLineWindow(board, x, y, dx, dy, opponent)
    oppLine[centerIdx] = opponent
    const oppVal = evaluateLinePattern(oppLine, centerIdx, opponent)
    defenseScore += oppVal

    if (oppVal >= PATTERN_WEIGHTS.OPEN_THREE) {
      oppThreatDirections++
    }
  }

  let total = attackScore + 0.9 * defenseScore

  // Fork bonus: two or more strong attack threats, or dual attack + block across different directions
  if (myThreatDirections >= 2 || (myThreatDirections >= 1 && oppThreatDirections >= 1)) {
    total += 50_000
  }

  return total
}

/**
 * Static board evaluation for the minimax leaf nodes.
 */
export function evaluateBoard(board: Board, player: Player): number {
  let myScore = 0
  let oppScore = 0

  // Scan board lines
  for (let y = 0; y < board.size; y++) {
    for (let x = 0; x < board.size; x++) {
      const cell = board.get(x, y)
      if (cell === EMPTY) continue

      for (const { dx, dy } of DIRECTIONS) {
        // Only evaluate from the start of each line
        const prevX = x - dx
        const prevY = y - dy
        if (board.inBounds(prevX, prevY) && board.get(prevX, prevY) === cell) {
          continue
        }

        const { cells, centerIdx } = getLineWindow(board, x, y, dx, dy, cell)
        const val = evaluateLinePattern(cells, centerIdx, cell)
        if (cell === player) {
          myScore += val
        } else {
          oppScore += val
        }
      }
    }
  }

  return myScore - 1.1 * oppScore
}
