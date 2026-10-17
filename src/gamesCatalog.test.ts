import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  buildGameUrl,
  BUILTIN_GAMES,
  CATALOG_CACHE_KEY,
  GameEntry,
  getGamesCatalog,
  mergeGamesCatalog,
  parseLangFromSearch,
  refreshGamesCatalog
} from './gamesCatalog'

describe('gamesCatalog', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  it('includes both Gomoku and Logika in BUILTIN_GAMES', () => {
    const ids = BUILTIN_GAMES.map((g) => g.id)
    expect(ids).toContain('gomoku')
    expect(ids).toContain('logika')
  })

  it('merges incoming remote games and appends new games without losing builtin ones', () => {
    const thirdGame: GameEntry = {
      id: 'sudoku',
      url: 'https://chichaykin.github.io/Sudoku/',
      repo: 'https://github.com/chichaykin/Sudoku',
      icon: '🔢',
      accent: '#38bdf8',
      title: { en: 'Sudoku', ru: 'Судоку' },
      shortTitle: { en: 'Sudoku', ru: 'Судоку' },
      description: { en: 'Classic number puzzle', ru: 'Классическая головоломка с числами' },
      tags: { en: ['Puzzle'], ru: ['Головоломка'] }
    }

    const merged = mergeGamesCatalog(BUILTIN_GAMES, [thirdGame])
    expect(merged.map((g) => g.id)).toEqual(['gomoku', 'logika', 'sudoku'])
  })

  it('builds game URL with lang query parameter', () => {
    expect(buildGameUrl('https://chichaykin.github.io/Logika/', 'ru')).toBe(
      'https://chichaykin.github.io/Logika/?lang=ru'
    )
    expect(buildGameUrl('https://chichaykin.github.io/Gomoku/', 'en')).toBe(
      'https://chichaykin.github.io/Gomoku/?lang=en'
    )
  })

  it('parses lang from URL search string', () => {
    expect(parseLangFromSearch('?lang=ru')).toBe('ru')
    expect(parseLangFromSearch('?foo=1&lang=EN')).toBe('en')
    expect(parseLangFromSearch('?lang=de')).toBeNull()
    expect(parseLangFromSearch('')).toBeNull()
  })

  it('refreshes catalog from remote fetch and falls back gracefully on error', async () => {
    const mockFetchFail = vi.fn().mockRejectedValue(new Error('Offline'))
    const fallback = await refreshGamesCatalog(mockFetchFail as unknown as typeof fetch)
    expect(fallback.length).toBeGreaterThanOrEqual(2)

    const mockFetchOk = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        version: 2,
        updatedAt: '2026-10-18',
        games: [
          ...BUILTIN_GAMES,
          {
            id: 'reversi',
            url: 'https://chichaykin.github.io/Reversi/',
            repo: 'https://github.com/chichaykin/Reversi',
            icon: '⚪',
            accent: '#22c55e',
            title: { en: 'Reversi', ru: 'Реверси' },
            shortTitle: { en: 'Reversi', ru: 'Реверси' },
            description: { en: 'Othello strategy game', ru: 'Стратегическая игра Отелло' },
            tags: { en: ['Board'], ru: ['Настольная'] }
          }
        ]
      })
    })

    const updated = await refreshGamesCatalog(mockFetchOk as unknown as typeof fetch)
    expect(updated.map((g) => g.id)).toContain('reversi')
    if (typeof localStorage !== 'undefined') {
      expect(localStorage.getItem(CATALOG_CACHE_KEY)).toBeTruthy()
      expect(getGamesCatalog().map((g) => g.id)).toContain('reversi')
    }
  })
})
