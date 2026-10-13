import { Difficulty, Lang, Settings } from './core/types'
import { getLang } from './i18n'

export interface DifficultyStats {
  wins: number
  losses: number
  draws: number
}

export type StatsRecord = Record<Difficulty, DifficultyStats>

const SETTINGS_KEY = 'gomoku:v1:settings'
const STATS_KEY = 'gomoku:v1:stats'
const GAME_KEY = 'gomoku:v1:game'
const IOS_PROMPT_KEY = 'gomoku:v1:ios_prompt_shown'

export function getDefaultSettings(): Settings {
  const isCoarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
  return {
    size: 15,
    mode: 'ai',
    difficulty: 'medium',
    humanColor: 1, // BLACK
    theme: 'wood',
    lang: getLang(),
    sound: true,
    haptics: true,
    oneTapMove: !isCoarse
  }
}

export function getDefaultStats(): StatsRecord {
  return {
    easy: { wins: 0, losses: 0, draws: 0 },
    medium: { wins: 0, losses: 0, draws: 0 },
    hard: { wins: 0, losses: 0, draws: 0 }
  }
}

export class StorageService {
  loadSettings(): Settings {
    const defaults = getDefaultSettings()
    if (typeof localStorage === 'undefined') return defaults

    try {
      const raw = localStorage.getItem(SETTINGS_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw)
      return {
        size: parsed.size === 19 ? 19 : 15,
        mode: parsed.mode === 'pvp' ? 'pvp' : 'ai',
        difficulty: ['easy', 'medium', 'hard'].includes(parsed.difficulty) ? parsed.difficulty : 'medium',
        humanColor: parsed.humanColor === 2 ? 2 : 1,
        theme: parsed.theme === 'slate' ? 'slate' : 'wood',
        lang: (parsed.lang === 'ru' || parsed.lang === 'en') ? (parsed.lang as Lang) : defaults.lang,
        sound: typeof parsed.sound === 'boolean' ? parsed.sound : true,
        haptics: typeof parsed.haptics === 'boolean' ? parsed.haptics : true,
        oneTapMove: typeof parsed.oneTapMove === 'boolean' ? parsed.oneTapMove : defaults.oneTapMove
      }
    } catch {
      return defaults
    }
  }

  saveSettings(settings: Settings): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // Fail-safe
    }
  }

  loadStats(): StatsRecord {
    const defaults = getDefaultStats()
    if (typeof localStorage === 'undefined') return defaults

    try {
      const raw = localStorage.getItem(STATS_KEY)
      if (!raw) return defaults
      const parsed = JSON.parse(raw)
      return {
        easy: parsed.easy || { wins: 0, losses: 0, draws: 0 },
        medium: parsed.medium || { wins: 0, losses: 0, draws: 0 },
        hard: parsed.hard || { wins: 0, losses: 0, draws: 0 }
      }
    } catch {
      return defaults
    }
  }

  recordGameResult(difficulty: Difficulty, result: 'win' | 'loss' | 'draw'): void {
    const stats = this.loadStats()
    if (result === 'win') stats[difficulty].wins++
    else if (result === 'loss') stats[difficulty].losses++
    else stats[difficulty].draws++

    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(stats))
    } catch {
      // Fail-safe
    }
  }

  loadGame(): string | null {
    if (typeof localStorage === 'undefined') return null
    try {
      return localStorage.getItem(GAME_KEY)
    } catch {
      return null
    }
  }

  saveGame(serializedGame: string): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(GAME_KEY, serializedGame)
    } catch {
      // Fail-safe
    }
  }

  clearSavedGame(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.removeItem(GAME_KEY)
    } catch {
      // Fail-safe
    }
  }

  isIosPromptShown(): boolean {
    if (typeof localStorage === 'undefined') return false
    try {
      return localStorage.getItem(IOS_PROMPT_KEY) === '1'
    } catch {
      return false
    }
  }

  setIosPromptShown(): void {
    if (typeof localStorage === 'undefined') return
    try {
      localStorage.setItem(IOS_PROMPT_KEY, '1')
    } catch {
      // Fail-safe
    }
  }
}
