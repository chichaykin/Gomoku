import { BLACK, Difficulty, Mode, Player } from '../core/types'
import { t } from '../i18n'

export interface HudCallbacks {
  onUndo: () => void
  onPlace: () => void
  onNewGame: () => void
  onOpenSettings: () => void
  onOpenAbout?: () => void
  onCycleDifficulty?: () => void
}

export class Hud {
  private turnDot: HTMLElement | null
  private turnText: HTMLElement | null
  private moveCounter: HTMLElement | null
  private gameTimer: HTMLElement | null
  private btnUndo: HTMLButtonElement | null
  private btnPlace: HTMLButtonElement | null
  private btnNewGame: HTMLButtonElement | null
  private btnSettings: HTMLButtonElement | null
  private btnAbout: HTMLButtonElement | null
  private btnQuickDiff: HTMLElement | null
  private hudDiffText: HTMLElement | null
  private toastElement: HTMLElement | null
  private toastTimerId: number | null = null

  private timerInterval: number | null = null
  private startTime = 0
  private elapsedSeconds = 0

  constructor(callbacks: HudCallbacks) {
    this.turnDot = document.getElementById('turn-dot')
    this.turnText = document.getElementById('turn-text')
    this.moveCounter = document.getElementById('move-counter')
    this.gameTimer = document.getElementById('game-timer')
    this.btnUndo = document.getElementById('btn-undo') as HTMLButtonElement | null
    this.btnPlace = document.getElementById('btn-place') as HTMLButtonElement | null
    this.btnNewGame = document.getElementById('btn-new-game') as HTMLButtonElement | null
    this.btnSettings = document.getElementById('btn-settings') as HTMLButtonElement | null
    this.btnAbout = document.getElementById('btn-about') as HTMLButtonElement | null
    this.btnQuickDiff = document.getElementById('btn-quick-diff')
    this.hudDiffText = document.getElementById('hud-diff-text')
    this.toastElement = document.getElementById('toast')

    this.btnUndo?.addEventListener('click', callbacks.onUndo)
    this.btnPlace?.addEventListener('click', callbacks.onPlace)
    this.btnNewGame?.addEventListener('click', callbacks.onNewGame)
    this.btnSettings?.addEventListener('click', callbacks.onOpenSettings)
    this.btnAbout?.addEventListener('click', () => callbacks.onOpenAbout?.())
    this.btnQuickDiff?.addEventListener('click', () => callbacks.onCycleDifficulty?.())
  }

  updateTurn(player: Player, isAiThinking = false): void {
    if (!this.turnDot || !this.turnText) return

    this.turnDot.className = 'turn-dot'
    if (player === BLACK) {
      this.turnDot.classList.add('player-black')
    } else {
      this.turnDot.classList.add('player-white')
    }

    if (isAiThinking) {
      this.turnText.textContent = t('aiThinking')
    } else {
      this.turnText.textContent = player === BLACK ? t('turnBlack') : t('turnWhite')
    }
  }

  updateMoveCount(moveCount: number): void {
    if (!this.moveCounter) return
    this.moveCounter.textContent = t('move', { n: moveCount })
  }

  setGhostActive(hasGhost: boolean): void {
    if (!this.btnPlace) return
    if (hasGhost) {
      this.btnPlace.classList.remove('hidden')
    } else {
      this.btnPlace.classList.add('hidden')
    }
  }

  setUndoEnabled(enabled: boolean): void {
    if (!this.btnUndo) return
    this.btnUndo.disabled = !enabled
  }

  startTimer(initialElapsedSeconds = 0): void {
    this.stopTimer()
    this.elapsedSeconds = initialElapsedSeconds
    this.startTime = Date.now() - initialElapsedSeconds * 1000
    this.updateTimerDisplay()

    this.timerInterval = window.setInterval(() => {
      this.elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000)
      this.updateTimerDisplay()
    }, 1000)
  }

  stopTimer(): void {
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval)
      this.timerInterval = null
    }
  }

  getElapsedSeconds(): number {
    return this.elapsedSeconds
  }

  private updateTimerDisplay(): void {
    if (!this.gameTimer) return
    const mins = Math.floor(this.elapsedSeconds / 60)
    const secs = this.elapsedSeconds % 60
    const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`)
    this.gameTimer.textContent = `${pad(mins)}:${pad(secs)}`
  }

  showToast(message: string, duration = 2000): void {
    if (!this.toastElement) return
    if (this.toastTimerId !== null) {
      window.clearTimeout(this.toastTimerId)
      this.toastTimerId = null
    }
    this.toastElement.textContent = message
    this.toastElement.classList.remove('hidden')
    this.toastElement.style.opacity = '1'

    this.toastTimerId = window.setTimeout(() => {
      if (this.toastElement) {
        this.toastElement.style.opacity = '0'
        this.toastTimerId = window.setTimeout(() => {
          this.toastElement?.classList.add('hidden')
          this.toastTimerId = null
        }, 200)
      }
    }, duration)
  }

  updateDifficulty(diff: Difficulty, mode: Mode): void {
    if (!this.btnQuickDiff || !this.hudDiffText) return
    if (mode === 'pvp') {
      this.btnQuickDiff.classList.add('hidden')
      return
    }
    this.btnQuickDiff.classList.remove('hidden')
    this.btnQuickDiff.title = t('diffSelectorTitle')
    this.btnQuickDiff.setAttribute('aria-label', t('diffSelectorTitle'))
    const config: Record<Difficulty, { icon: string; name: string }> = {
      easy: { icon: '🟢', name: t('diffEasy') },
      medium: { icon: '🟡', name: t('diffMedium') },
      hard: { icon: '🔴', name: t('diffHard') }
    }
    const item = config[diff] || config.medium
    this.hudDiffText.textContent = `${item.icon} ${item.name}`
  }

  updateLabels(): void {
    if (this.btnUndo) this.btnUndo.textContent = t('undo')
    if (this.btnPlace) this.btnPlace.textContent = t('place')
    if (this.btnNewGame) this.btnNewGame.textContent = t('newGame')
    const rulesText = this.btnAbout?.querySelector('.btn-text')
    if (rulesText) rulesText.textContent = t('rulesButton')
    if (this.btnAbout) {
      this.btnAbout.title = t('aboutTitle')
      this.btnAbout.setAttribute('aria-label', t('aboutTitle'))
    }
  }
}
