export const EMPTY = 0
export const BLACK = 1
export const WHITE = 2

export type Cell = 0 | 1 | 2
export type Player = 1 | 2
export type BoardSize = 15 | 19
export type Difficulty = 'easy' | 'medium' | 'hard'
export type Mode = 'ai' | 'pvp'
export type Theme = 'wood' | 'slate'
export type Lang = 'en' | 'ru'

export interface Move {
  x: number
  y: number
  player: Player
}

export type GameStatus = 'playing' | 'won' | 'draw'

export interface Settings {
  size: BoardSize
  mode: Mode
  difficulty: Difficulty
  humanColor: Player
  theme: Theme
  lang: Lang
  sound: boolean
  haptics: boolean
  oneTapMove: boolean
}
