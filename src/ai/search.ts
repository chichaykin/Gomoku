import { Board } from '../core/board'
import { Difficulty, EMPTY, Player } from '../core/types'
import { evaluateBoard, evaluateMoveAttack, PATTERN_WEIGHTS, scoreMove } from './patterns'

export interface SearchResult {
  x: number
  y: number
  depth: number
  nodes: number
}

interface Candidate {
  x: number
  y: number
  score: number
}

/**
 * Generates candidate moves.
 * - Empty board -> center cell.
 * - Otherwise: empty cells within Chebyshev radius 2 of any placed stone, sorted by scoreMove descending.
 */
export function getCandidates(board: Board, player: Player, maxCandidates = 16): Candidate[] {
  const size = board.size
  let hasStones = false
  const activeCells: { x: number; y: number }[] = []

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board.get(x, y) !== EMPTY) {
        hasStones = true
        activeCells.push({ x, y })
      }
    }
  }

  // 1. Empty board -> Center
  if (!hasStones) {
    const center = Math.floor(size / 2)
    return [{ x: center, y: center, score: 0 }]
  }

  // 2. Collect empty cells within Chebyshev distance <= 2 from any stone
  const visited = new Uint8Array(size * size)
  const candidateCoords: { x: number; y: number }[] = []

  for (const stone of activeCells) {
    const minX = Math.max(0, stone.x - 2)
    const maxX = Math.min(size - 1, stone.x + 2)
    const minY = Math.max(0, stone.y - 2)
    const maxY = Math.min(size - 1, stone.y + 2)

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const idx = y * size + x
        if (visited[idx] === 0) {
          visited[idx] = 1
          if (board.get(x, y) === EMPTY) {
            candidateCoords.push({ x, y })
          }
        }
      }
    }
  }

  // Score each candidate
  const candidates: Candidate[] = candidateCoords.map(c => ({
    x: c.x,
    y: c.y,
    score: scoreMove(board, c.x, c.y, player)
  }))

  candidates.sort((a, b) => b.score - a.score)
  return candidates.slice(0, maxCandidates)
}

/**
 * Mandatory tactical checks prior to deep search:
 * 1. Move gives ME five -> play it.
 * 2. Opponent has a move giving five -> block it.
 * 3. I can make an open four -> play it.
 * 4. Opponent can make an open four -> block it.
 */
export function checkTacticalMove(
  board: Board,
  player: Player,
  checkOpenFours = true
): { x: number; y: number } | null {
  const opponent: Player = player === 1 ? 2 : 1
  const candidates = getCandidates(board, player, 50)

  // 1. My immediate win (5+)
  for (const c of candidates) {
    board.set(c.x, c.y, player)
    const win = board.checkWin(c.x, c.y)
    board.set(c.x, c.y, EMPTY)
    if (win) {
      return { x: c.x, y: c.y }
    }
  }

  // 2. Block opponent's immediate win (5+)
  for (const c of candidates) {
    board.set(c.x, c.y, opponent)
    const oppWin = board.checkWin(c.x, c.y)
    board.set(c.x, c.y, EMPTY)
    if (oppWin) {
      return { x: c.x, y: c.y }
    }
  }

  if (checkOpenFours) {
    // 3. I can make an open four
    for (const c of candidates) {
      const myAttack = evaluateMoveAttack(board, c.x, c.y, player)
      if (myAttack >= PATTERN_WEIGHTS.OPEN_FOUR) {
        return { x: c.x, y: c.y }
      }
    }

    // 4. Opponent can make an open four (block it)
    for (const c of candidates) {
      const oppAttack = evaluateMoveAttack(board, c.x, c.y, opponent)
      if (oppAttack >= PATTERN_WEIGHTS.OPEN_FOUR) {
        return { x: c.x, y: c.y }
      }
    }
  }

  return null
}

/**
 * Main search function executing Easy, Medium, or Hard difficulty.
 */
export function findBestMove(
  board: Board,
  aiPlayer: Player,
  difficulty: Difficulty,
  timeLimitMs = 800
): SearchResult {
  const startTime = performance.now()
  let nodeCount = 0

  // Tactical checks
  const checkOpenFours = difficulty !== 'easy'
  const tactical = checkTacticalMove(board, aiPlayer, checkOpenFours)
  if (tactical) {
    return { x: tactical.x, y: tactical.y, depth: 1, nodes: 1 }
  }

  const candidates = getCandidates(board, aiPlayer, 20)
  if (candidates.length === 0) {
    return { x: 7, y: 7, depth: 0, nodes: 0 }
  }

  // 1. Easy level
  if (difficulty === 'easy') {
    // 40% chance pick a close move, otherwise random from top-5
    const pickCount = Math.min(5, candidates.length)
    const selected = candidates[Math.floor(Math.random() * pickCount)]
    return { x: selected.x, y: selected.y, depth: 1, nodes: candidates.length }
  }

  // 2. Medium level: best candidate by scoreMove (with random tie-break among top)
  if (difficulty === 'medium') {
    const topScore = candidates[0].score
    const bestCandidates = candidates.filter(c => c.score >= topScore * 0.95)
    const selected = bestCandidates[Math.floor(Math.random() * bestCandidates.length)]
    return { x: selected.x, y: selected.y, depth: 1, nodes: candidates.length }
  }

  // 3. Hard level: Iterative Deepening Negamax + Alpha-Beta
  let bestMove = { x: candidates[0].x, y: candidates[0].y }
  let completedDepth = 1

  let timeoutTriggered = false

  function negamax(
    b: Board,
    depth: number,
    alpha: number,
    beta: number,
    current: Player,
    lastX: number,
    lastY: number
  ): number {
    nodeCount++
    if ((nodeCount & 255) === 0) {
      if (performance.now() - startTime >= timeLimitMs) {
        timeoutTriggered = true
        return 0
      }
    }

    // Terminal check: last move won
    if (lastX >= 0 && lastY >= 0 && b.checkWin(lastX, lastY)) {
      return -PATTERN_WEIGHTS.FIVE + (10 - depth) // Prefer faster wins
    }

    if (depth <= 0 || b.isFull()) {
      return evaluateBoard(b, current)
    }

    const moves = getCandidates(b, current, 12)
    let maxVal = -Infinity

    for (const move of moves) {
      b.set(move.x, move.y, current)
      const nextPlayer: Player = current === 1 ? 2 : 1
      const val = -negamax(b, depth - 1, -beta, -alpha, nextPlayer, move.x, move.y)
      b.set(move.x, move.y, EMPTY)

      if (timeoutTriggered) return 0

      if (val > maxVal) {
        maxVal = val
      }
      if (val > alpha) {
        alpha = val
      }
      if (alpha >= beta) {
        break // Alpha-beta cutoff
      }
    }

    return maxVal
  }

  // Depths 2 -> 4 -> 6 (if fast enough)
  const targetDepths = [2, 4, 6]

  for (const d of targetDepths) {
    let currentBestMove = bestMove
    let maxScore = -Infinity
    let alpha = -Infinity
    const beta = Infinity

    for (const move of candidates.slice(0, 12)) {
      board.set(move.x, move.y, aiPlayer)
      const nextPlayer: Player = aiPlayer === 1 ? 2 : 1
      const score = -negamax(board, d - 1, -beta, -alpha, nextPlayer, move.x, move.y)
      board.set(move.x, move.y, EMPTY)

      if (timeoutTriggered) break

      if (score > maxScore) {
        maxScore = score
        currentBestMove = { x: move.x, y: move.y }
      }
      if (score > alpha) {
        alpha = score
      }
    }

    if (timeoutTriggered) {
      break
    } else {
      bestMove = currentBestMove
      completedDepth = d
    }
  }

  return {
    x: bestMove.x,
    y: bestMove.y,
    depth: completedDepth,
    nodes: nodeCount
  }
}
