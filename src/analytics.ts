import { BoardSize, Difficulty, Mode, Player, Settings } from './core/types'
import { StatsRecord } from './storage'

export type PlayerCohort = '0_games' | '1_game' | '2_to_5_games' | '6_plus_games'
export type PlayedMultiple = 'none' | 'no' | 'yes'

export interface TelemetryRecord {
  sessionsCount: number
  pvpGames: number
}

export const TELEMETRY_KEY = 'gomoku:v1:telemetry'
export const SESSION_ACTIVE_KEY = 'gomoku:v1:session_active'

/**
 * Pure function: determine user engagement cohort based on total completed games.
 */
export function getPlayerCohort(totalGames: number): PlayerCohort {
  if (totalGames <= 0) return '0_games'
  if (totalGames === 1) return '1_game'
  if (totalGames <= 5) return '2_to_5_games'
  return '6_plus_games'
}

/**
 * Pure function: flag indicating whether user has played more than 1 game.
 */
export function getPlayedMultipleFlag(totalGames: number): PlayedMultiple {
  if (totalGames <= 0) return 'none'
  if (totalGames === 1) return 'no'
  return 'yes'
}

/**
 * Pure function: sum total completed games across all AI difficulties and PvP.
 */
export function countTotalCompletedGames(stats: StatsRecord, pvpGames = 0): number {
  const easyTotal = stats.easy.wins + stats.easy.losses + stats.easy.draws
  const medTotal = stats.medium.wins + stats.medium.losses + stats.medium.draws
  const hardTotal = stats.hard.wins + stats.hard.losses + stats.hard.draws
  return easyTotal + medTotal + hardTotal + Math.max(0, pvpGames)
}

/**
 * Pure function: check browser Do Not Track preference.
 */
export function isDoNotTrackEnabled(): boolean {
  if (typeof window === 'undefined') return false
  const win = window as unknown as { doNotTrack?: string; msDoNotTrack?: string }
  const nav = typeof navigator !== 'undefined' ? (navigator as unknown as { doNotTrack?: string }) : {}

  const dnt = nav.doNotTrack || win.doNotTrack || win.msDoNotTrack
  return dnt === '1' || dnt === 'yes'
}

/**
 * Load telemetry record from localStorage.
 */
export function loadTelemetry(): TelemetryRecord {
  const defaults: TelemetryRecord = { sessionsCount: 1, pvpGames: 0 }
  if (typeof localStorage === 'undefined') return defaults

  try {
    const raw = localStorage.getItem(TELEMETRY_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Partial<TelemetryRecord>
    return {
      sessionsCount: typeof parsed.sessionsCount === 'number' && parsed.sessionsCount > 0 ? parsed.sessionsCount : 1,
      pvpGames: typeof parsed.pvpGames === 'number' && parsed.pvpGames >= 0 ? parsed.pvpGames : 0
    }
  } catch {
    return defaults
  }
}

/**
 * Save telemetry record to localStorage.
 */
export function saveTelemetry(data: TelemetryRecord): void {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(TELEMETRY_KEY, JSON.stringify(data))
  } catch {
    // Fail-safe
  }
}

/**
 * Record session start: increment count if this is a new browser session.
 */
export function recordSessionStart(): number {
  const current = loadTelemetry()
  if (typeof sessionStorage === 'undefined') return current.sessionsCount

  try {
    const isActive = sessionStorage.getItem(SESSION_ACTIVE_KEY)
    if (!isActive) {
      sessionStorage.setItem(SESSION_ACTIVE_KEY, '1')
      // If telemetry already existed, increment session count
      const raw = localStorage.getItem(TELEMETRY_KEY)
      if (raw) {
        current.sessionsCount += 1
        saveTelemetry(current)
      } else {
        saveTelemetry(current)
      }
    }
  } catch {
    // Fail-safe
  }
  return current.sessionsCount
}

/**
 * Record completed PvP game.
 */
export function recordPvpGameCompleted(): number {
  const current = loadTelemetry()
  current.pvpGames += 1
  saveTelemetry(current)
  return current.pvpGames
}

// Global state
let currentMeasurementId: string | null = null
let isScriptInjected = false
let userConsented = true

export function getMeasurementId(): string | null {
  try {
    const envId = import.meta.env.VITE_GA_MEASUREMENT_ID
    if (typeof envId === 'string' && envId.trim().startsWith('G-')) {
      return envId.trim()
    }
  } catch {
    // Ignore in non-vite contexts
  }
  return null
}

export function isAnalyticsAllowed(settingsAnalytics = userConsented): boolean {
  if (!currentMeasurementId) return false
  if (isDoNotTrackEnabled()) return false
  if (!settingsAnalytics) return false
  return true
}

function safeGtag(...args: unknown[]): void {
  if (typeof window === 'undefined') return
  if (!window.dataLayer) {
    window.dataLayer = []
  }
  window.dataLayer.push(args)
}

function injectGtagScript(measurementId: string): void {
  if (isScriptInjected || typeof document === 'undefined') return
  isScriptInjected = true

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`
  document.head.appendChild(script)
}

/**
 * Initialize GA4 telemetry module.
 */
export function initAnalytics(settings: Settings, stats: StatsRecord): void {
  currentMeasurementId = getMeasurementId()
  userConsented = settings.analytics

  if (!currentMeasurementId) {
    return
  }

  // Handle opt-out state
  if (!settings.analytics || isDoNotTrackEnabled()) {
    if (typeof window !== 'undefined') {
      window[`ga-disable-${currentMeasurementId}`] = true
    }
    return
  }

  // Initialize dataLayer and gtag wrapper
  safeGtag('js', new Date())
  safeGtag('config', currentMeasurementId, {
    send_page_view: true
  })

  injectGtagScript(currentMeasurementId)

  // Record session
  const sessionsCount = recordSessionStart()
  const telemetry = loadTelemetry()
  const totalGames = countTotalCompletedGames(stats, telemetry.pvpGames)

  syncUserProperties(totalGames, sessionsCount, settings)
}

/**
 * Update consent when user toggles analytics in Settings.
 */
export function setAnalyticsConsent(enabled: boolean): void {
  userConsented = enabled
  if (currentMeasurementId && typeof window !== 'undefined') {
    window[`ga-disable-${currentMeasurementId}`] = !enabled
  }

  if (enabled && currentMeasurementId && !isScriptInjected && !isDoNotTrackEnabled()) {
    injectGtagScript(currentMeasurementId)
  }
}

/**
 * Sync GA4 user properties for audience segmentation.
 */
export function syncUserProperties(
  totalGames: number,
  sessionsCount: number,
  settings?: Settings
): void {
  if (!isAnalyticsAllowed()) return

  const cohort = getPlayerCohort(totalGames)
  const playedMultiple = getPlayedMultipleFlag(totalGames)

  const props: Record<string, string | number> = {
    total_games_played: totalGames,
    player_cohort: cohort,
    played_multiple: playedMultiple,
    sessions_count: sessionsCount
  }

  if (settings) {
    props.preferred_board_size = settings.size
    props.preferred_mode = settings.mode
    props.preferred_difficulty = settings.difficulty
    props.language = settings.lang
    props.theme = settings.theme
  }

  safeGtag('set', 'user_properties', props)
}

/**
 * Track game started (placed first stone).
 */
export function trackGameStart(params: {
  mode: Mode
  difficulty?: Difficulty
  board_size: BoardSize
  human_color?: Player
}): void {
  if (!isAnalyticsAllowed()) return

  safeGtag('event', 'game_start', {
    mode: params.mode,
    difficulty: params.difficulty || 'none',
    board_size: `${params.board_size}x${params.board_size}`,
    human_color: params.human_color === 2 ? 'white' : 'black'
  })
}

/**
 * Track game completed: sends game_complete, and conditionally first_game_complete / repeat_game_complete.
 */
export function trackGameEnd(params: {
  mode: Mode
  difficulty?: Difficulty
  board_size: BoardSize
  result: 'win' | 'loss' | 'draw'
  moves_count: number
  elapsed_seconds: number
  total_games: number
}): void {
  if (!isAnalyticsAllowed()) return

  const cohort = getPlayerCohort(params.total_games)
  const playedMultiple = getPlayedMultipleFlag(params.total_games)

  safeGtag('event', 'game_complete', {
    mode: params.mode,
    difficulty: params.difficulty || 'none',
    board_size: `${params.board_size}x${params.board_size}`,
    result: params.result,
    moves_count: params.moves_count,
    elapsed_seconds: params.elapsed_seconds,
    total_games_played: params.total_games,
    player_cohort: cohort,
    played_multiple: playedMultiple
  })

  // Milestone: exactly 1 game completed
  if (params.total_games === 1) {
    safeGtag('event', 'first_game_complete', {
      mode: params.mode,
      result: params.result,
      board_size: `${params.board_size}x${params.board_size}`
    })
  }

  // Milestone: exactly 2 games completed (user converted to repeat player)
  if (params.total_games === 2) {
    safeGtag('event', 'repeat_game_complete', {
      mode: params.mode,
      result: params.result,
      board_size: `${params.board_size}x${params.board_size}`
    })
  }
}

/**
 * Track modal screen view.
 */
export function trackModalView(modalName: 'settings' | 'stats' | 'about' | 'feedback' | 'ios_install' | 'games'): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'modal_view', { modal_name: modalName })
}

/**
 * Track undo move action.
 */
export function trackUndoUsed(params: { mode: Mode; moves_count: number }): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'undo_used', {
    mode: params.mode,
    moves_count: params.moves_count
  })
}

/**
 * Track PWA install prompt interaction.
 */
export function trackPwaInstallPrompt(outcome: 'accepted' | 'dismissed'): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'pwa_install_prompt', { outcome })
}

/**
 * Track PWA installation completion.
 */
export function trackPwaInstalled(): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'pwa_installed')
}

/**
 * Track settings changed.
 */
export function trackSettingsChange(setting: string, value: string | number | boolean): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'settings_change', {
    setting_name: setting,
    setting_value: String(value)
  })
}

/**
 * Track user feedback action.
 */
export function trackFeedbackAction(category: string, method: 'github' | 'email' | 'copy'): void {
  if (!isAnalyticsAllowed()) return
  safeGtag('event', 'feedback_action', {
    feedback_category: category,
    submission_method: method
  })
}

// Test-only reset helper
export function _resetAnalyticsStateForTests(): void {
  currentMeasurementId = null
  isScriptInjected = false
  userConsented = true
}
