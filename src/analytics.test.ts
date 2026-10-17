import { beforeEach, describe, expect, it } from 'vitest'
import {
  _resetAnalyticsStateForTests,
  countTotalCompletedGames,
  getPlayerCohort,
  getPlayedMultipleFlag,
  initAnalytics,
  isAnalyticsAllowed,
  isDoNotTrackEnabled,
  loadTelemetry,
  recordPvpGameCompleted,
  recordSessionStart,
  saveTelemetry,
  setAnalyticsConsent,
  trackFeedbackAction,
  trackGameEnd,
  trackGameStart,
  trackModalView,
  trackPwaInstallPrompt,
  trackPwaInstalled,
  trackSettingsChange,
  trackUndoUsed
} from './analytics'
import { Settings } from './core/types'
import { getDefaultStats, StatsRecord } from './storage'

function createMockStorage(): Storage {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value)
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length
    }
  }
}

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = createMockStorage()
}
if (typeof globalThis.sessionStorage === 'undefined') {
  globalThis.sessionStorage = createMockStorage()
}

describe('Analytics module', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    _resetAnalyticsStateForTests()
    if (typeof window !== 'undefined') {
      window.dataLayer = []
    }
  })

  describe('Cohort & Pure calculations', () => {
    it('calculates player cohort accurately', () => {
      expect(getPlayerCohort(0)).toBe('0_games')
      expect(getPlayerCohort(-1)).toBe('0_games')
      expect(getPlayerCohort(1)).toBe('1_game')
      expect(getPlayerCohort(2)).toBe('2_to_5_games')
      expect(getPlayerCohort(5)).toBe('2_to_5_games')
      expect(getPlayerCohort(6)).toBe('6_plus_games')
      expect(getPlayerCohort(42)).toBe('6_plus_games')
    })

    it('calculates played_multiple flag accurately', () => {
      expect(getPlayedMultipleFlag(0)).toBe('none')
      expect(getPlayedMultipleFlag(-5)).toBe('none')
      expect(getPlayedMultipleFlag(1)).toBe('no')
      expect(getPlayedMultipleFlag(2)).toBe('yes')
      expect(getPlayedMultipleFlag(10)).toBe('yes')
    })

    it('counts total completed games across AI difficulties and PvP', () => {
      const stats: StatsRecord = {
        easy: { wins: 3, losses: 1, draws: 0 },
        medium: { wins: 2, losses: 2, draws: 1 },
        hard: { wins: 0, losses: 1, draws: 0 }
      }
      // AI total = 4 + 5 + 1 = 10
      expect(countTotalCompletedGames(stats, 0)).toBe(10)
      expect(countTotalCompletedGames(stats, 5)).toBe(15)
      expect(countTotalCompletedGames(stats)).toBe(10)
    })
  })

  describe('Telemetry Storage', () => {
    it('returns default telemetry if storage is empty', () => {
      const t = loadTelemetry()
      expect(t.sessionsCount).toBe(1)
      expect(t.pvpGames).toBe(0)
    })

    it('persists and retrieves telemetry correctly', () => {
      saveTelemetry({ sessionsCount: 4, pvpGames: 2 })
      const loaded = loadTelemetry()
      expect(loaded.sessionsCount).toBe(4)
      expect(loaded.pvpGames).toBe(2)
    })

    it('increments session count on fresh session', () => {
      saveTelemetry({ sessionsCount: 1, pvpGames: 0 })
      // First call marks session active
      const count1 = recordSessionStart()
      expect(count1).toBe(2)

      // Subsequent call in same session does not increment
      const count2 = recordSessionStart()
      expect(count2).toBe(2)
    })

    it('records PvP completed games', () => {
      expect(recordPvpGameCompleted()).toBe(1)
      expect(recordPvpGameCompleted()).toBe(2)
      expect(loadTelemetry().pvpGames).toBe(2)
    })
  })

  describe('Consent and Tracking behavior', () => {
    const mockSettings: Settings = {
      size: 15,
      mode: 'ai',
      difficulty: 'medium',
      humanColor: 1,
      theme: 'wood',
      lang: 'en',
      sound: true,
      haptics: true,
      oneTapMove: true,
      analytics: true
    }

    it('checks DNT preference correctly', () => {
      expect(isDoNotTrackEnabled()).toBe(false)
    })

    it('respects user opt-out in settings', () => {
      initAnalytics({ ...mockSettings, analytics: false }, getDefaultStats())
      expect(isAnalyticsAllowed(false)).toBe(false)

      setAnalyticsConsent(true)
    })

    it('emits safe events without throwing when measurement ID is absent', () => {
      initAnalytics(mockSettings, getDefaultStats())

      // All track calls should safely execute without errors
      expect(() => {
        trackGameStart({ mode: 'ai', difficulty: 'easy', board_size: 15, human_color: 1 })
        trackGameEnd({
          mode: 'ai',
          difficulty: 'easy',
          board_size: 15,
          result: 'win',
          moves_count: 23,
          elapsed_seconds: 64,
          total_games: 1
        })
        trackGameEnd({
          mode: 'pvp',
          board_size: 19,
          result: 'win',
          moves_count: 35,
          elapsed_seconds: 120,
          total_games: 2
        })
        trackModalView('settings')
        trackUndoUsed({ mode: 'ai', moves_count: 10 })
        trackPwaInstallPrompt('accepted')
        trackPwaInstalled()
        trackSettingsChange('theme', 'slate')
        trackFeedbackAction('idea', 'github')
      }).not.toThrow()
    })
  })
})
