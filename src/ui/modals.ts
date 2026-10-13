import { BoardSize, Difficulty, Mode, Player, Settings, Theme } from '../core/types'
import { setLang, t } from '../i18n'
import { StatsRecord } from '../storage'

export interface ModalCallbacks {
  onSettingsChanged: (newSettings: Settings) => void
  onConfirmNewGame: () => void
  onPlayAgain: () => void
  onUndoLastMove: () => void
  onInstallClick?: () => void
  getStats: () => StatsRecord
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

  showGameOver(winner: Player | null, isDraw: boolean, mode: Mode, humanColor: Player): void {
    if (!this.overlay || !this.card) return

    let title = ''
    let icon = '🏆'

    if (isDraw) {
      title = t('draw')
      icon = '🤝'
    } else if (mode === 'ai') {
      if (winner === humanColor) {
        title = t('youWin')
        icon = '🎉'
      } else {
        title = t('youLose')
        icon = '💔'
      }
    } else {
      title = winner === 1 ? t('blackWins') : t('whiteWins')
    }

    this.card.innerHTML = `
      <div class="modal-header">
        <h2 class="modal-title">${icon} ${title}</h2>
      </div>
      <div class="modal-body" style="text-align: center; font-size: 1.1rem; padding: 16px 0;">
        <p>${title}</p>
      </div>
      <div class="modal-footer" style="justify-content: center; gap: 12px;">
        <button id="btn-gameover-undo" class="btn btn-secondary">${t('undoMove')}</button>
        <button id="btn-gameover-again" class="btn btn-primary">${t('playAgain')}</button>
      </div>
    `

    document.getElementById('btn-gameover-again')?.addEventListener('click', () => {
      this.close()
      this.callbacks.onPlayAgain()
    })

    document.getElementById('btn-gameover-undo')?.addEventListener('click', () => {
      this.close()
      this.callbacks.onUndoLastMove()
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
}
