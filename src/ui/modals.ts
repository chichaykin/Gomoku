import { trackFeedbackAction, trackModalView } from '../analytics'
import { BoardSize, Difficulty, Mode, Player, Settings, Theme } from '../core/types'
import {
  buildGameUrl,
  CURRENT_GAME_ID,
  escapeHtml,
  GameEntry,
  getGamesCatalog,
  refreshGamesCatalog
} from '../gamesCatalog'
import { getLang, setLang, t } from '../i18n'
import { StatsRecord } from '../storage'

export interface ModalCallbacks {
  onSettingsChanged: (newSettings: Settings) => void
  onConfirmNewGame: () => void
  onPlayAgain: () => void
  onUndoLastMove: () => void
  onInstallClick?: () => void
  getStats: () => StatsRecord
  getSettings?: () => Settings
  onToast?: (message: string) => void
}

export class ModalManager {
  private overlay: HTMLElement | null
  private card: HTMLElement | null
  private callbacks: ModalCallbacks
  private canInstall = false

  constructor(callbacks: ModalCallbacks) {
    this.overlay = document.getElementById('modal-overlay')
    this.card = document.getElementById('modal-card')
    this.callbacks = callbacks

    // Close on overlay backdrop click
    this.overlay?.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.close()
      }
    })

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close()
      }
    })

    // Return to game over modal after inspecting board
    const inspectBtn = document.getElementById('btn-inspect-return')
    inspectBtn?.addEventListener('click', () => {
      inspectBtn.classList.add('hidden')
      if (this.lastGameOverArgs) {
        this.showGameOver(
          this.lastGameOverArgs.winner,
          this.lastGameOverArgs.isDraw,
          this.lastGameOverArgs.mode,
          this.lastGameOverArgs.humanColor,
          this.lastGameOverArgs.statsSummary
        )
      }
    })
  }

  private closeTimer: number | null = null

  setInstallAvailable(available: boolean): void {
    this.canInstall = available
  }

  private open(): void {
    if (!this.overlay) return
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.overlay.classList.remove('is-closing')
    this.overlay.classList.remove('hidden')
  }

  isOpen(): boolean {
    return this.overlay !== null && !this.overlay.classList.contains('hidden') && !this.overlay.classList.contains('is-closing')
  }

  close(): void {
    if (!this.overlay || this.overlay.classList.contains('hidden')) return
    if (this.closeTimer !== null) {
      window.clearTimeout(this.closeTimer)
      this.closeTimer = null
    }
    this.overlay.classList.add('is-closing')
    this.closeTimer = window.setTimeout(() => {
      if (this.overlay && this.overlay.classList.contains('is-closing')) {
        this.overlay.classList.add('hidden')
        this.overlay.classList.remove('is-closing')
        if (this.card) {
          this.card.innerHTML = ''
        }
      }
      this.closeTimer = null
    }, 240)
  }

  showSettings(settings: Settings, onSettingsChanged: (s: Settings) => void): void {
    if (!this.overlay || !this.card) return

    const hasVibration = typeof navigator !== 'undefined' && 'vibrate' in navigator

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${t('settings')}</h2>
        <button id="modal-close-btn" class="btn btn-icon" aria-label="${t('close')}">✕</button>
      </div>
      <div class="modal-body">
        <!-- Language selector -->
        <div class="setting-row">
          <label class="setting-label" for="setting-lang">${t('language')}</label>
          <div class="setting-control">
            <select id="setting-lang">
              <option value="en" ${settings.lang === 'en' ? 'selected' : ''}>English</option>
              <option value="ru" ${settings.lang === 'ru' ? 'selected' : ''}>Русский</option>
            </select>
          </div>
        </div>

        <!-- Board size -->
        <div class="setting-row">
          <label class="setting-label" for="setting-size">${t('boardSize')}</label>
          <div class="setting-control">
            <select id="setting-size">
              <option value="15" ${settings.size === 15 ? 'selected' : ''}>15 × 15</option>
              <option value="19" ${settings.size === 19 ? 'selected' : ''}>19 × 19</option>
            </select>
          </div>
        </div>

        <!-- Mode -->
        <div class="setting-row">
          <label class="setting-label" for="setting-mode">${t('mode')}</label>
          <div class="setting-control">
            <select id="setting-mode">
              <option value="ai" ${settings.mode === 'ai' ? 'selected' : ''}>${t('modeAi')}</option>
              <option value="pvp" ${settings.mode === 'pvp' ? 'selected' : ''}>${t('modePvp')}</option>
            </select>
          </div>
        </div>

        <!-- Difficulty (AI only) -->
        <div id="row-difficulty" class="setting-row ${settings.mode === 'pvp' ? 'hidden' : ''}">
          <label class="setting-label" for="setting-diff">${t('difficulty')}</label>
          <div class="setting-control">
            <select id="setting-diff">
              <option value="easy" ${settings.difficulty === 'easy' ? 'selected' : ''}>${t('easy')}</option>
              <option value="medium" ${settings.difficulty === 'medium' ? 'selected' : ''}>${t('medium')}</option>
              <option value="hard" ${settings.difficulty === 'hard' ? 'selected' : ''}>${t('hard')}</option>
            </select>
          </div>
        </div>

        <!-- Human color (AI only) -->
        <div id="row-color" class="setting-row ${settings.mode === 'pvp' ? 'hidden' : ''}">
          <label class="setting-label" for="setting-color">${t('yourColor')}</label>
          <div class="setting-control">
            <select id="setting-color">
              <option value="1" ${settings.humanColor === 1 ? 'selected' : ''}>${t('black')}</option>
              <option value="2" ${settings.humanColor === 2 ? 'selected' : ''}>${t('white')}</option>
            </select>
          </div>
        </div>

        <!-- Theme -->
        <div class="setting-row">
          <label class="setting-label" for="setting-theme">${t('theme')}</label>
          <div class="setting-control">
            <select id="setting-theme">
              <option value="wood" ${settings.theme === 'wood' ? 'selected' : ''}>${t('themeWood')}</option>
              <option value="slate" ${settings.theme === 'slate' ? 'selected' : ''}>${t('themeSlate')}</option>
            </select>
          </div>
        </div>

        <!-- Sound toggle -->
        <div class="setting-row">
          <label class="setting-label" for="setting-sound">${t('sound')}</label>
          <div class="setting-control">
            <input type="checkbox" id="setting-sound" ${settings.sound ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          </div>
        </div>

        <!-- Vibration toggle (if supported) -->
        ${
          hasVibration
            ? `
          <div class="setting-row">
            <label class="setting-label" for="setting-haptics">${t('haptics')}</label>
            <div class="setting-control">
              <input type="checkbox" id="setting-haptics" ${settings.haptics ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
            </div>
          </div>
          `
            : ''
        }

        <!-- One tap move -->
        <div class="setting-row">
          <label class="setting-label" for="setting-onetap">${t('oneTapMove')}</label>
          <div class="setting-control">
            <input type="checkbox" id="setting-onetap" ${settings.oneTapMove ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          </div>
        </div>

        <!-- Anonymous analytics -->
        <div class="setting-row" style="align-items: flex-start;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <label class="setting-label" for="setting-analytics">${t('settingsAnalytics')}</label>
            <span style="font-size: 0.76rem; color: var(--text-muted); line-height: 1.3;">${t('settingsAnalyticsDesc')}</span>
          </div>
          <div class="setting-control">
            <input type="checkbox" id="setting-analytics" ${settings.analytics ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer;">
          </div>
        </div>

        <!-- Extra action buttons -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 6px;">
          <button id="btn-show-games" class="btn btn-secondary" style="flex: 1 1 45%;">🎮 ${t('otherGamesTitle')}</button>
          <button id="btn-show-about" class="btn btn-secondary" style="flex: 1 1 45%;">📖 ${t('aboutGame')}</button>
          <button id="btn-show-stats" class="btn btn-secondary" style="flex: 1 1 45%;">📊 ${t('stats')}</button>
          <button id="btn-show-feedback" class="btn btn-secondary" style="flex: 1 1 45%;">💬 ${t('feedbackButton')}</button>
          <button id="btn-modal-install" class="btn btn-primary ${this.canInstall ? '' : 'hidden'}" style="flex: 1 1 45%;">📥 ${t('install')}</button>
        </div>
      </div>
      <div class="modal-footer">
        <button id="modal-save-btn" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    // Wire up events
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-save-btn')?.addEventListener('click', () => this.close())

    const langSelect = document.getElementById('setting-lang') as HTMLSelectElement | null
    langSelect?.addEventListener('change', () => {
      const nextLang = langSelect.value as 'en' | 'ru'
      setLang(nextLang)
      settings.lang = nextLang
      onSettingsChanged({ ...settings })
      // Re-render settings modal with fresh language
      this.showSettings(settings, onSettingsChanged)
    })

    const sizeSelect = document.getElementById('setting-size') as HTMLSelectElement | null
    sizeSelect?.addEventListener('change', () => {
      settings.size = parseInt(sizeSelect.value, 10) as BoardSize
      onSettingsChanged({ ...settings })
    })

    const modeSelect = document.getElementById('setting-mode') as HTMLSelectElement | null
    const rowDiff = document.getElementById('row-difficulty')
    const rowColor = document.getElementById('row-color')
    modeSelect?.addEventListener('change', () => {
      settings.mode = modeSelect.value as Mode
      if (settings.mode === 'pvp') {
        rowDiff?.classList.add('hidden')
        rowColor?.classList.add('hidden')
      } else {
        rowDiff?.classList.remove('hidden')
        rowColor?.classList.remove('hidden')
      }
      onSettingsChanged({ ...settings })
    })

    const diffSelect = document.getElementById('setting-diff') as HTMLSelectElement | null
    diffSelect?.addEventListener('change', () => {
      settings.difficulty = diffSelect.value as Difficulty
      onSettingsChanged({ ...settings })
    })

    const colorSelect = document.getElementById('setting-color') as HTMLSelectElement | null
    colorSelect?.addEventListener('change', () => {
      settings.humanColor = parseInt(colorSelect.value, 10) as Player
      onSettingsChanged({ ...settings })
    })

    const themeSelect = document.getElementById('setting-theme') as HTMLSelectElement | null
    themeSelect?.addEventListener('change', () => {
      settings.theme = themeSelect.value as Theme
      onSettingsChanged({ ...settings })
    })

    const soundCheck = document.getElementById('setting-sound') as HTMLInputElement | null
    soundCheck?.addEventListener('change', () => {
      settings.sound = soundCheck.checked
      onSettingsChanged({ ...settings })
    })

    const hapticsCheck = document.getElementById('setting-haptics') as HTMLInputElement | null
    hapticsCheck?.addEventListener('change', () => {
      settings.haptics = hapticsCheck.checked
      onSettingsChanged({ ...settings })
    })

    const oneTapCheck = document.getElementById('setting-onetap') as HTMLInputElement | null
    oneTapCheck?.addEventListener('change', () => {
      settings.oneTapMove = oneTapCheck.checked
      onSettingsChanged({ ...settings })
    })

    const analyticsCheck = document.getElementById('setting-analytics') as HTMLInputElement | null
    analyticsCheck?.addEventListener('change', () => {
      settings.analytics = analyticsCheck.checked
      onSettingsChanged({ ...settings })
    })

    document.getElementById('btn-show-games')?.addEventListener('click', () => {
      this.showGames(settings, 'settings')
    })

    document.getElementById('btn-show-about')?.addEventListener('click', () => {
      this.showAbout(settings)
    })

    document.getElementById('btn-show-stats')?.addEventListener('click', () => {
      this.showStats(this.callbacks.getStats())
    })

    document.getElementById('btn-show-feedback')?.addEventListener('click', () => {
      this.showFeedback(settings, 'settings')
    })

    document.getElementById('btn-modal-install')?.addEventListener('click', () => {
      this.close()
      this.callbacks.onInstallClick?.()
    })

    this.open()
    trackModalView('settings')
  }

  showStats(stats: StatsRecord): void {
    if (!this.overlay || !this.card) return

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">📊 ${t('stats')}</h2>
        <button id="modal-close-btn" class="btn btn-icon">✕</button>
      </div>
      <div class="modal-body">
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; text-align: center;">
          <div style="background: var(--btn-sec-bg); padding: 12px 6px; border-radius: 8px;">
            <div style="font-weight: 700; color: #22c55e;">${t('easy')}</div>
            <div style="font-size: 0.85rem; margin-top: 6px;">${t('wins')}: ${stats.easy.wins}</div>
            <div style="font-size: 0.85rem;">${t('losses')}: ${stats.easy.losses}</div>
            <div style="font-size: 0.85rem;">${t('draws')}: ${stats.easy.draws}</div>
          </div>
          <div style="background: var(--btn-sec-bg); padding: 12px 6px; border-radius: 8px;">
            <div style="font-weight: 700; color: #eab308;">${t('medium')}</div>
            <div style="font-size: 0.85rem; margin-top: 6px;">${t('wins')}: ${stats.medium.wins}</div>
            <div style="font-size: 0.85rem;">${t('losses')}: ${stats.medium.losses}</div>
            <div style="font-size: 0.85rem;">${t('draws')}: ${stats.medium.draws}</div>
          </div>
          <div style="background: var(--btn-sec-bg); padding: 12px 6px; border-radius: 8px;">
            <div style="font-weight: 700; color: #ef4444;">${t('hard')}</div>
            <div style="font-size: 0.85rem; margin-top: 6px;">${t('wins')}: ${stats.hard.wins}</div>
            <div style="font-size: 0.85rem;">${t('losses')}: ${stats.hard.losses}</div>
            <div style="font-size: 0.85rem;">${t('draws')}: ${stats.hard.draws}</div>
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button id="modal-close-stats" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-close-stats')?.addEventListener('click', () => this.close())

    this.open()
    trackModalView('stats')
  }

  private lastGameOverArgs: {
    winner: Player | null
    isDraw: boolean
    mode: Mode
    humanColor: Player
    statsSummary?: { elapsedSeconds: number; movesCount: number; difficulty: Difficulty }
  } | null = null

  showGameOver(
    winner: Player | null,
    isDraw: boolean,
    mode: Mode,
    humanColor: Player,
    statsSummary?: { elapsedSeconds: number; movesCount: number; difficulty: Difficulty }
  ): void {
    if (!this.overlay || !this.card) return

    this.lastGameOverArgs = { winner, isDraw, mode, humanColor, statsSummary }

    let title = ''
    let subtitle = ''
    let icon = '🏆'
    let sealText = '五目'
    let sealClass = 'seal-win'

    if (isDraw) {
      title = t('draw')
      subtitle = t('rule4')
      icon = '🤝'
      sealText = '和'
      sealClass = 'seal-draw'
    } else if (mode === 'ai') {
      if (winner === humanColor) {
        title = t('victoryTitle')
        subtitle = t('victorySub')
        icon = '👑'
        sealText = '勝'
        sealClass = 'seal-win'
      } else {
        title = t('defeatTitle')
        subtitle = t('defeatSub')
        icon = '🍂'
        sealText = '道'
        sealClass = 'seal-lose'
      }
    } else {
      title = winner === 1 ? t('blackWins') : t('whiteWins')
      subtitle = t('victorySub')
      sealText = winner === 1 ? '黒' : '白'
      sealClass = 'seal-win'
    }

    let statsHtml = ''
    if (statsSummary) {
      const mins = Math.floor(statsSummary.elapsedSeconds / 60)
      const secs = statsSummary.elapsedSeconds % 60
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
      const timeStr = `${pad(mins)}:${pad(secs)}`

      let opponentStr = ''
      if (mode === 'ai') {
        const diffMap: Record<Difficulty, string> = {
          easy: t('diffEasy'),
          medium: t('diffMedium'),
          hard: t('diffHard')
        }
        opponentStr = `${t('modeAi')} (${diffMap[statsSummary.difficulty]})`
      } else {
        opponentStr = t('modePvp')
      }

      statsHtml = `
        <div class="scroll-stats-grid">
          <div class="scroll-stat-item">
            <span class="stat-label">⏱️ ${t('time')}</span>
            <span class="stat-val">${timeStr}</span>
          </div>
          <div class="scroll-stat-item">
            <span class="stat-label">🎯 ${t('turns')}</span>
            <span class="stat-val">${statsSummary.movesCount}</span>
          </div>
          <div class="scroll-stat-item">
            <span class="stat-label">🥋 ${t('opponent')}</span>
            <span class="stat-val">${opponentStr}</span>
          </div>
        </div>
      `
    }

    this.card.innerHTML = `
      <div class="medieval-scroll-content">
        <div class="seal-container">
          <div class="imperial-seal ${sealClass}">
            <span class="seal-char">${sealText}</span>
          </div>
        </div>
        <h2 class="modal-title scroll-title">${icon} ${title}</h2>
        <p class="scroll-subtitle">${subtitle}</p>
        ${statsHtml}
        <div class="modal-footer scroll-actions">
          <button id="btn-gameover-undo" class="btn btn-secondary">${t('undoMove')}</button>
          <button id="btn-gameover-inspect" class="btn btn-secondary">👁️ ${t('inspectBoard')}</button>
          <button id="btn-gameover-again" class="btn btn-primary btn-gold">⚔️ ${t('newBattle')}</button>
        </div>
      </div>
    `

    const inspectBtn = document.getElementById('btn-inspect-return')

    document.getElementById('btn-gameover-again')?.addEventListener('click', () => {
      this.close()
      if (inspectBtn) inspectBtn.classList.add('hidden')
      this.callbacks.onPlayAgain()
    })

    document.getElementById('btn-gameover-undo')?.addEventListener('click', () => {
      this.close()
      if (inspectBtn) inspectBtn.classList.add('hidden')
      this.callbacks.onUndoLastMove()
    })

    document.getElementById('btn-gameover-inspect')?.addEventListener('click', () => {
      this.close()
      if (inspectBtn) inspectBtn.classList.remove('hidden')
    })

    this.open()
  }

  showConfirmNewGame(): void {
    if (!this.overlay || !this.card) return

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">🔄 ${t('confirmNewGame')}</h2>
      </div>
      <div class="modal-body">
        <p>${t('confirmNewGame')}</p>
      </div>
      <div class="modal-footer">
        <button id="btn-confirm-cancel" class="btn btn-secondary">${t('cancel')}</button>
        <button id="btn-confirm-yes" class="btn btn-primary">${t('yes')}</button>
      </div>
    `

    document.getElementById('btn-confirm-cancel')?.addEventListener('click', () => this.close())
    document.getElementById('btn-confirm-yes')?.addEventListener('click', () => {
      this.close()
      this.callbacks.onConfirmNewGame()
    })

    this.open()
  }

  showIosInstallModal(): void {
    if (!this.overlay || !this.card) return

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">📲 ${t('install')}</h2>
        <button id="modal-close-btn" class="btn btn-icon">✕</button>
      </div>
      <div class="modal-body" style="display: flex; flex-direction: column; gap: 12px; align-items: center; text-align: center;">
        <img src="icon.svg" width="72" height="72" style="border-radius: 16px; margin: 8px 0;" alt="Icon" />
        <p style="font-size: 1rem; line-height: 1.4;">${t('iosInstall')}</p>
        <p style="font-size: 0.85rem; color: var(--text-muted);">
          1. Tap <strong>Share</strong> (кнопка «Поделиться» ⎋)<br/>
          2. Select <strong>Add to Home Screen</strong> («На экран Домой» ⊞)
        </p>
      </div>
      <div class="modal-footer">
        <button id="btn-ios-close" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('btn-ios-close')?.addEventListener('click', () => this.close())

    this.open()
    trackModalView('ios_install')
  }

  showAbout(settings?: Settings): void {
    if (!this.overlay || !this.card) return

    const s = settings || this.callbacks.getSettings?.()
    const currentLang = getLang()

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">📖 ${t('aboutTitle')}</h2>
        <button id="modal-close-btn" class="btn btn-icon" aria-label="${t('close')}">✕</button>
      </div>
      <div class="modal-body about-body">
        <div class="about-lang-switch">
          <span style="font-size: 0.85rem; color: var(--text-muted); align-self: center;">${t('language')}:</span>
          <button id="btn-about-lang-en" class="btn btn-sm ${currentLang === 'en' ? 'btn-primary' : 'btn-secondary'}">English</button>
          <button id="btn-about-lang-ru" class="btn btn-sm ${currentLang === 'ru' ? 'btn-primary' : 'btn-secondary'}">Русский</button>
        </div>

        <section class="about-card-section">
          <h3 class="about-section-heading">🎯 ${t('rulesTitle')}</h3>
          <p class="about-paragraph">${t('rulesIntro')}</p>
          <ul class="about-rules-list">
            <li>${t('rule1')}</li>
            <li>${t('rule2')}</li>
            <li>${t('rule3')}</li>
            <li>${t('rule4')}</li>
          </ul>
        </section>

        <section class="about-card-section">
          <h3 class="about-section-heading">⚔️ ${t('tacticsTitle')}</h3>
          <p class="about-paragraph">${t('tacticsDesc')}</p>
        </section>

        <section class="about-card-section">
          <h3 class="about-section-heading">📜 ${t('historyTitle')}</h3>
          <p class="about-paragraph">${t('historyP1')}</p>
          <p class="about-paragraph">${t('historyP2')}</p>
          <p class="about-paragraph">${t('historyP3')}</p>
        </section>

        <section class="about-card-section about-author-section">
          <h3 class="about-section-heading">💻 ${t('authorTitle')}</h3>
          <p class="about-paragraph">${t('authorDesc')}</p>
          <div class="about-author-links">
            <a href="https://github.com/chichaykin" target="_blank" rel="noopener noreferrer" class="btn btn-secondary about-author-link">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" style="flex-shrink: 0;"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              <span>${t('authorGithub')} (@chichaykin)</span>
            </a>
            <a href="https://github.com/chichaykin/Gomoku" target="_blank" rel="noopener noreferrer" class="btn btn-secondary about-author-link">
              <span>⭐ ${t('authorRepo')}</span>
            </a>
            <button id="btn-about-games" class="btn btn-secondary about-author-link" style="cursor: pointer;">
              <span>🎮 ${t('otherGamesTitle')}</span>
            </button>
            <button id="btn-about-feedback" class="btn btn-primary about-author-link" style="cursor: pointer;">
              <span>💬 ${t('feedbackButton')}</span>
            </button>
          </div>
        </section>
      </div>
      <div class="modal-footer">
        <button id="modal-about-close-btn" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-about-close-btn')?.addEventListener('click', () => this.close())

    document.getElementById('btn-about-games')?.addEventListener('click', () => {
      this.showGames(s, 'about')
    })

    document.getElementById('btn-about-feedback')?.addEventListener('click', () => {
      this.showFeedback(s, 'about')
    })

    document.getElementById('btn-about-lang-en')?.addEventListener('click', () => {
      if (getLang() !== 'en') {
        setLang('en')
        if (s) {
          s.lang = 'en'
          this.callbacks.onSettingsChanged(s)
        }
        this.showAbout(s)
      }
    })

    document.getElementById('btn-about-lang-ru')?.addEventListener('click', () => {
      if (getLang() !== 'ru') {
        setLang('ru')
        if (s) {
          s.lang = 'ru'
          this.callbacks.onSettingsChanged(s)
        }
        this.showAbout(s)
      }
    })

    this.open()
    trackModalView('about')
  }

  showGames(settings?: Settings, returnTo: 'about' | 'settings' | 'none' = 'none'): void {
    if (!this.overlay || !this.card) return

    const s = settings || this.callbacks.getSettings?.()
    const currentLang = getLang()

    const renderCatalogCards = (games: GameEntry[]): string => {
      return games
        .map((game) => {
          const isCurrent = game.id === CURRENT_GAME_ID
          const title = escapeHtml(game.title[currentLang] || game.title.en)
          const desc = escapeHtml(game.description[currentLang] || game.description.en)
          const icon = escapeHtml(game.icon)
          const safeId = escapeHtml(game.id)
          const tags = Array.isArray(game.tags?.[currentLang])
            ? game.tags[currentLang]
            : Array.isArray(game.tags?.en)
              ? game.tags.en
              : []
          const targetHref = escapeHtml(buildGameUrl(game.url, currentLang))

          const tagsHtml = tags
            .map((tag) => `<span class="game-catalog-tag">${escapeHtml(String(tag))}</span>`)
            .join('')

          if (isCurrent) {
            return `
              <div class="game-catalog-card game-catalog-card-current">
                <div class="game-catalog-card-top">
                  <span class="game-catalog-icon" aria-hidden="true">${icon}</span>
                  <div class="game-catalog-info">
                    <div class="game-catalog-title-row">
                      <span class="game-catalog-title">${title}</span>
                      <span class="game-catalog-badge">${t('currentGameBadge')}</span>
                    </div>
                    <p class="game-catalog-desc">${desc}</p>
                    <div class="game-catalog-tags">${tagsHtml}</div>
                  </div>
                </div>
              </div>
            `
          }

          return `
            <a href="${targetHref}" class="game-catalog-card game-catalog-card-link" data-game-id="${safeId}">
              <div class="game-catalog-card-top">
                <span class="game-catalog-icon" aria-hidden="true">${icon}</span>
                <div class="game-catalog-info">
                  <div class="game-catalog-title-row">
                    <span class="game-catalog-title">${title}</span>
                    <span class="btn btn-primary btn-sm game-catalog-play">${t('playGameButton')} →</span>
                  </div>
                  <p class="game-catalog-desc">${desc}</p>
                  <div class="game-catalog-tags">${tagsHtml}</div>
                </div>
              </div>
            </a>
          `
        })
        .join('')
    }

    const initialGames = getGamesCatalog()

    this.card.innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${returnTo !== 'none' ? `<button id="modal-games-back" class="btn btn-icon" aria-label="${t('back')}" title="${t('back')}">←</button>` : ''}
          <h2 class="modal-title">🎮 ${t('otherGamesTitle')}</h2>
        </div>
        <button id="modal-close-btn" class="btn btn-icon" aria-label="${t('close')}">✕</button>
      </div>
      <div class="modal-body games-catalog-body">
        <p class="feedback-desc">${t('otherGamesSubtitle')}</p>
        <div id="games-catalog-list" class="games-catalog-list">
          ${renderCatalogCards(initialGames)}
        </div>
        <p class="games-catalog-footer-hint">${t('gameSavedHint')}</p>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
        ${returnTo !== 'none' ? `<button id="modal-games-back-btn" class="btn btn-secondary">← ${t('back')}</button>` : ''}
        <button id="modal-games-close" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    const handleBack = () => {
      if (returnTo === 'about' && s) {
        this.showAbout(s)
      } else if (returnTo === 'settings' && s) {
        this.showSettings(s, this.callbacks.onSettingsChanged)
      } else {
        this.close()
      }
    }

    document.getElementById('modal-games-back')?.addEventListener('click', handleBack)
    document.getElementById('modal-games-back-btn')?.addEventListener('click', handleBack)
    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-games-close')?.addEventListener('click', () => this.close())

    this.open()
    trackModalView('games')

    // Refresh catalog asynchronously in background; update DOM if modal is still showing games
    void refreshGamesCatalog().then((freshGames) => {
      const listEl = document.getElementById('games-catalog-list')
      if (listEl && this.isOpen()) {
        listEl.innerHTML = renderCatalogCards(freshGames)
      }
    })
  }

  showFeedback(settings?: Settings, returnTo: 'about' | 'settings' | 'none' = 'none'): void {
    if (!this.overlay || !this.card) return

    const s = settings || this.callbacks.getSettings?.()

    this.card.innerHTML = `
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          ${returnTo !== 'none' ? `<button id="modal-feedback-back" class="btn btn-icon" aria-label="${t('back')}" title="${t('back')}">←</button>` : ''}
          <h2 class="modal-title">💬 ${t('feedbackTitle')}</h2>
        </div>
        <button id="modal-close-btn" class="btn btn-icon" aria-label="${t('close')}">✕</button>
      </div>
      <div class="modal-body feedback-body">
        <p class="feedback-desc">${t('feedbackDesc')}</p>

        <!-- Category -->
        <div class="feedback-row">
          <label class="setting-label" for="feedback-type">${t('feedbackCategory')}</label>
          <div class="setting-control" style="width: 100%;">
            <select id="feedback-type" style="width: 100%;">
              <option value="idea">${t('feedbackTypeIdea')}</option>
              <option value="bug">${t('feedbackTypeBug')}</option>
              <option value="general">${t('feedbackTypeGeneral')}</option>
            </select>
          </div>
        </div>

        <!-- Contact (optional) -->
        <div class="feedback-row">
          <label class="setting-label" for="feedback-contact">${t('feedbackContactLabel')}</label>
          <input type="text" id="feedback-contact" class="feedback-input" placeholder="${t('feedbackContactPlaceholder')}" />
        </div>

        <!-- Message -->
        <div class="feedback-row">
          <label class="setting-label" for="feedback-message">${t('feedbackMessageLabel')}</label>
          <textarea id="feedback-message" class="feedback-textarea" rows="4" placeholder="${t('feedbackMessagePlaceholder')}"></textarea>
        </div>

        <!-- Send options -->
        <div class="feedback-actions">
          <button id="btn-send-github" class="btn btn-primary feedback-send-btn">
            🐙 ${t('feedbackViaGithub')}
          </button>
          <button id="btn-send-email" class="btn btn-secondary feedback-send-btn">
            ✉️ ${t('feedbackViaEmail')}
          </button>
          <button id="btn-copy-feedback" class="btn btn-secondary feedback-send-btn">
            📋 ${t('feedbackCopy')}
          </button>
        </div>
      </div>
      <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 8px;">
        ${returnTo !== 'none' ? `<button id="modal-feedback-back-btn" class="btn btn-secondary">← ${t('back')}</button>` : ''}
        <button id="modal-feedback-close" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    const getFormData = () => {
      const messageInput = document.getElementById('feedback-message') as HTMLTextAreaElement | null
      const contactInput = document.getElementById('feedback-contact') as HTMLInputElement | null
      const typeSelect = document.getElementById('feedback-type') as HTMLSelectElement | null

      const message = messageInput?.value.trim() || ''
      const contact = contactInput?.value.trim() || 'Anonymous'
      const type = typeSelect?.value || 'general'

      return { message, contact, type, messageInput }
    }

    const handleBack = () => {
      if (returnTo === 'about' && s) {
        this.showAbout(s)
      } else if (returnTo === 'settings' && s) {
        this.showSettings(s, this.callbacks.onSettingsChanged)
      } else {
        this.close()
      }
    }

    document.getElementById('modal-feedback-back')?.addEventListener('click', handleBack)
    document.getElementById('modal-feedback-back-btn')?.addEventListener('click', handleBack)

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-feedback-close')?.addEventListener('click', () => this.close())

    document.getElementById('btn-send-github')?.addEventListener('click', () => {
      const { message, contact, type, messageInput } = getFormData()
      if (!message) {
        this.callbacks.onToast?.(t('feedbackEmptyWarning'))
        messageInput?.focus()
        return
      }

      const typeLabels: Record<string, string> = {
        idea: 'Feature Request / Idea',
        bug: 'Bug Report',
        general: 'Feedback'
      }
      const categoryName = typeLabels[type] || 'Feedback'
      const title = `[${categoryName}] ${message.slice(0, 50)}${message.length > 50 ? '...' : ''}`
      const body = `### Feedback Type\n${categoryName}\n\n### Message\n${message}\n\n### Contact\n${contact}\n\n### Environment\n- URL: ${window.location.href}\n- User Agent: ${navigator.userAgent}\n- Screen: ${window.innerWidth}x${window.innerHeight} (DPR: ${window.devicePixelRatio || 1})\n- Date: ${new Date().toISOString()}`

      const issueUrl = `https://github.com/chichaykin/Gomoku/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
      trackFeedbackAction(type, 'github')
      window.open(issueUrl, '_blank', 'noopener,noreferrer')
      this.callbacks.onToast?.(t('feedbackSent'))
      this.close()
    })

    document.getElementById('btn-send-email')?.addEventListener('click', () => {
      const { message, contact, type, messageInput } = getFormData()
      if (!message) {
        this.callbacks.onToast?.(t('feedbackEmptyWarning'))
        messageInput?.focus()
        return
      }

      const subject = `[Gomoku] ${type.toUpperCase()}: Feedback`
      const body = `Category: ${type}\nContact: ${contact}\n\nMessage:\n${message}\n\nDevice: ${navigator.userAgent}`
      const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      trackFeedbackAction(type, 'email')
      window.location.href = mailtoUrl
      this.callbacks.onToast?.(t('feedbackSent'))
      this.close()
    })

    document.getElementById('btn-copy-feedback')?.addEventListener('click', () => {
      const { message, contact, type, messageInput } = getFormData()
      if (!message) {
        this.callbacks.onToast?.(t('feedbackEmptyWarning'))
        messageInput?.focus()
        return
      }

      const formatted = `[Gomoku Feedback]\nCategory: ${type}\nContact: ${contact}\nMessage:\n${message}`
      trackFeedbackAction(type, 'copy')
      this.copyToClipboard(formatted)
    })

    this.open()
    trackModalView('feedback')
  }

  private copyToClipboard(text: string): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        this.callbacks.onToast?.(t('feedbackCopied'))
      }).catch(() => {
        this.fallbackCopyText(text)
      })
    } else {
      this.fallbackCopyText(text)
    }
  }

  private fallbackCopyText(text: string): void {
    try {
      const textArea = document.createElement('textarea')
      textArea.value = text
      textArea.style.position = 'fixed'
      textArea.style.top = '-9999px'
      textArea.style.left = '-9999px'
      textArea.setAttribute('readonly', '')
      document.body.appendChild(textArea)
      textArea.select()
      const successful = document.execCommand('copy')
      document.body.removeChild(textArea)
      if (successful) {
        this.callbacks.onToast?.(t('feedbackCopied'))
      } else {
        this.callbacks.onToast?.(t('feedbackCopyFailed'))
      }
    } catch {
      this.callbacks.onToast?.(t('feedbackCopyFailed'))
    }
  }
}
