import { BoardSize, Difficulty, Mode, Player, Settings, Theme } from '../core/types'
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

  setInstallAvailable(available: boolean): void {
    this.canInstall = available
  }

  isOpen(): boolean {
    return this.overlay !== null && !this.overlay.classList.contains('hidden')
  }

  close(): void {
    if (this.overlay) {
      this.overlay.classList.add('hidden')
    }
    if (this.card) {
      this.card.innerHTML = ''
    }
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

        <!-- Extra action buttons -->
        <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 6px;">
          <button id="btn-show-about" class="btn btn-secondary" style="flex: 1;">📖 ${t('aboutGame')}</button>
          <button id="btn-show-stats" class="btn btn-secondary" style="flex: 1;">📊 ${t('stats')}</button>
          <button id="btn-modal-install" class="btn btn-primary ${this.canInstall ? '' : 'hidden'}" style="flex: 1;">📥 ${t('install')}</button>
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

    document.getElementById('btn-show-about')?.addEventListener('click', () => {
      this.showAbout(settings)
    })

    document.getElementById('btn-show-stats')?.addEventListener('click', () => {
      this.showStats(this.callbacks.getStats())
    })

    document.getElementById('btn-modal-install')?.addEventListener('click', () => {
      this.close()
      this.callbacks.onInstallClick?.()
    })

    this.overlay.classList.remove('hidden')
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

    this.overlay.classList.remove('hidden')
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

    this.overlay.classList.remove('hidden')
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

    this.overlay.classList.remove('hidden')
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

    this.overlay.classList.remove('hidden')
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
          </div>
        </section>
      </div>
      <div class="modal-footer">
        <button id="modal-about-close-btn" class="btn btn-primary">${t('close')}</button>
      </div>
    `

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.close())
    document.getElementById('modal-about-close-btn')?.addEventListener('click', () => this.close())

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

    this.overlay.classList.remove('hidden')
  }
}
