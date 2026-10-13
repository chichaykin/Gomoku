import { registerSW } from 'virtual:pwa-register'
import { AiClient } from './ai/aiClient'
import { Game } from './core/game'
import { Difficulty, Player, Settings, WHITE } from './core/types'
import { applyI18n, onLangChange, setLang, t } from './i18n'
import { StorageService } from './storage'
import { HapticsService } from './ui/haptics'
import { Hud } from './ui/hud'
import { InputController } from './ui/input'
import { ModalManager } from './ui/modals'
import { CanvasRenderer } from './ui/renderer'
import { SoundService } from './ui/sound'

// Initialize Service Worker for PWA
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('New content available, auto-updating PWA...')
  },
  onOfflineReady() {
    console.log('PWA is ready for offline use.')
  }
})

// DOM Elements
const appContainer = document.getElementById('app') as HTMLElement
const boardContainer = document.getElementById('board-container') as HTMLElement
const canvas = document.getElementById('board-canvas') as HTMLCanvasElement

// Services
const storage = new StorageService()
const sound = new SoundService()
const haptics = new HapticsService()
const aiClient = new AiClient()

// Load persisted settings
let settings: Settings = storage.loadSettings()
sound.enabled = settings.sound
haptics.enabled = settings.haptics
setLang(settings.lang)
applyTheme(settings.theme)

// Game Core
const game = new Game(settings.size)

// Try restoring previously active game
const savedGameStr = storage.loadGame()
if (savedGameStr) {
  const restored = game.deserialize(savedGameStr)
  if (restored && game.state.status === 'playing') {
    // Restored active game
  } else {
    game.reset(settings)
  }
} else {
  game.reset(settings)
}

// UI Controllers
const renderer = new CanvasRenderer(canvas, boardContainer)

let inputController: InputController

const hud = new Hud({
  onUndo: () => handleUndo(),
  onPlace: () => inputController?.confirmGhostMove(),
  onNewGame: () => handleNewGameRequest(),
  onOpenSettings: () => modals.showSettings(settings, onSettingsChanged),
  onOpenAbout: () => modals.showAbout(settings),
  onCycleDifficulty: () => handleCycleDifficulty()
})

const modals = new ModalManager({
  onSettingsChanged: (s) => onSettingsChanged(s),
  onConfirmNewGame: () => startFreshGame(),
  onPlayAgain: () => startFreshGame(),
  onUndoLastMove: () => handleUndo(),
  onInstallClick: () => triggerInstallPrompt(),
  getStats: () => storage.loadStats(),
  getSettings: () => settings
})

inputController = new InputController(canvas, renderer, {
  onConfirmMove: (x, y) => handlePlayerMove(x, y),
  onGhostChange: (ghost) => {
    hud.setGhostActive(ghost !== null)
    renderCurrent()
  },
  getCurrentPlayer: () => game.state.current,
  getBoardSize: () => game.state.board.size,
  isInteractionLocked: () => isBoardLocked(),
  isCellEmpty: (x, y) => game.state.board.get(x, y) === 0
})

inputController.oneTapMove = settings.oneTapMove

// Unlock AudioContext on first user interaction for iOS Safari / WebKit
window.addEventListener('pointerdown', () => sound.unlock(), { once: true })

// PWA Install prompt handling
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}
let deferredPrompt: BeforeInstallPromptEvent | null = null

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  deferredPrompt = e as BeforeInstallPromptEvent
  modals.setInstallAvailable(true)
})

window.addEventListener('appinstalled', () => {
  deferredPrompt = null
  modals.setInstallAvailable(false)
  hud.showToast('App installed!')
})

function triggerInstallPrompt(): void {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    deferredPrompt.userChoice.then(() => {
      deferredPrompt = null
      modals.setInstallAvailable(false)
    })
  } else {
    // If iOS Safari
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent)
    if (isIosDevice) {
      modals.showIosInstallModal()
    } else {
      hud.showToast(settings.lang === 'ru' ? 'Используйте меню браузера (⋮) для установки' : 'Use browser menu (⋮) to install')
    }
  }
}

// Check iOS prompt
const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent)
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && (navigator as unknown as { standalone: boolean }).standalone)
if (isIos && !isStandalone && !storage.isIosPromptShown()) {
  setTimeout(() => {
    modals.showIosInstallModal()
    storage.setIosPromptShown()
  }, 2500)
}

// React to language switch
onLangChange(() => {
  applyI18n()
  hud.updateLabels()
  updateHudTurn()
  hud.updateMoveCount(game.state.moves.length + 1)
})

// Game loop functions
function isBoardLocked(): boolean {
  if (game.state.status !== 'playing') return true
  if (aiClient.getIsThinking()) return true
  if (settings.mode === 'ai' && game.state.current !== settings.humanColor) return true
  return false
}

function renderCurrent(): void {
  const lastMove = game.state.moves.length > 0 ? game.state.moves[game.state.moves.length - 1] : null
  renderer.render({
    board: game.state.board,
    theme: settings.theme,
    lastMove: lastMove ? { x: lastMove.x, y: lastMove.y } : null,
    winLine: game.state.winLine,
    ghost: inputController.getGhost()
  })
}

function updateHudTurn(): void {
  const isAiThinking = aiClient.getIsThinking()
  hud.updateTurn(game.state.current, isAiThinking)
  hud.updateMoveCount(game.state.moves.length + 1)
  hud.setUndoEnabled(game.state.moves.length > 0)
  hud.updateDifficulty(settings.difficulty, settings.mode)
}

function handleCycleDifficulty(): void {
  sound.playClick()
  const order: Difficulty[] = ['easy', 'medium', 'hard']
  const nextIdx = (order.indexOf(settings.difficulty) + 1) % order.length
  settings.difficulty = order[nextIdx]
  storage.saveSettings(settings)
  hud.updateDifficulty(settings.difficulty, settings.mode)
  const names: Record<Difficulty, string> = {
    easy: t('diffEasy'),
    medium: t('diffMedium'),
    hard: t('diffHard')
  }
  hud.showToast(`${t('difficulty')}: ${names[settings.difficulty]}`)
}

function applyTheme(theme: 'wood' | 'slate'): void {
  appContainer.classList.remove('theme-wood', 'theme-slate')
  appContainer.classList.add(`theme-${theme}`)
  const metaThemeColor = document.querySelector('meta[name="theme-color"]')
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'wood' ? '#1a1612' : '#0f172a')
  }
}

function handlePlayerMove(x: number, y: number): void {
  if (isBoardLocked()) return

  const played = game.play(x, y)
  if (!played) return

  sound.playStone()
  haptics.triggerMove()
  renderer.triggerStoneAnimation(x, y)

  postMoveProcessing()
}

function postMoveProcessing(): void {
  updateHudTurn()
  renderCurrent()

  if (game.state.status === 'won') {
    handleGameWon()
    return
  }

  if (game.state.status === 'draw') {
    handleGameDraw()
    return
  }

  // Save in-progress game with synced timer
  saveCurrentGame()

  // AI turn
  if (settings.mode === 'ai' && game.state.current !== settings.humanColor) {
    triggerAiTurn()
  }
}

function saveCurrentGame(): void {
  game.state.elapsedMs = hud.getElapsedSeconds() * 1000
  storage.saveGame(game.serialize())
}

function triggerAiTurn(): void {
  const aiPlayer: Player = settings.humanColor === 1 ? 2 : 1
  hud.updateTurn(aiPlayer, true)

  aiClient.requestMove(
    game.state.board,
    aiPlayer,
    settings.difficulty,
    (move) => {
      if (game.state.status !== 'playing') return
      const played = game.play(move.x, move.y)
      if (played) {
        sound.playStone()
        haptics.triggerMove()
        renderer.triggerStoneAnimation(move.x, move.y)
        postMoveProcessing()
      }
    }
  )
}

function handleGameWon(): void {
  hud.stopTimer()
  storage.clearSavedGame()

  const winner = game.state.winner
  const humanWon = settings.mode === 'ai' && winner === settings.humanColor

  if (humanWon) {
    sound.playWin()
    haptics.triggerWin()
  } else if (settings.mode === 'ai') {
    sound.playLose()
  } else {
    sound.playWin()
    haptics.triggerWin()
  }

  if (settings.mode === 'ai') {
    storage.recordGameResult(settings.difficulty, humanWon ? 'win' : 'loss')
  }

  const statsSummary = {
    elapsedSeconds: hud.getElapsedSeconds(),
    movesCount: game.state.moves.length,
    difficulty: settings.difficulty
  }

  setTimeout(() => {
    modals.showGameOver(winner, false, settings.mode, settings.humanColor, statsSummary)
  }, 500)
}

function handleGameDraw(): void {
  hud.stopTimer()
  storage.clearSavedGame()

  if (settings.mode === 'ai') {
    storage.recordGameResult(settings.difficulty, 'draw')
  }

  const statsSummary = {
    elapsedSeconds: hud.getElapsedSeconds(),
    movesCount: game.state.moves.length,
    difficulty: settings.difficulty
  }

  setTimeout(() => {
    modals.showGameOver(null, true, settings.mode, settings.humanColor, statsSummary)
  }, 400)
}

function handleUndo(): void {
  sound.playClick()
  aiClient.cancelCurrentThinking()
  inputController.clearGhost()
  document.getElementById('btn-inspect-return')?.classList.add('hidden')

  if (settings.mode === 'ai') {
    // If AI's turn is active or last move was AI's, undo 2 moves (AI + human)
    const lastPlayer = game.state.moves.length > 0 ? game.state.moves[game.state.moves.length - 1].player : null
    const undoCount = lastPlayer !== settings.humanColor ? 2 : 1
    game.undo(undoCount)
  } else {
    game.undo(1)
  }

  updateHudTurn()
  renderCurrent()
  saveCurrentGame()

  if (game.state.status === 'playing') {
    hud.startTimer(Math.floor(game.state.elapsedMs / 1000))
  }
}

function handleNewGameRequest(): void {
  sound.playClick()
  if (game.state.moves.length > 0 && game.state.status === 'playing') {
    modals.showConfirmNewGame()
  } else {
    startFreshGame()
  }
}

function startFreshGame(): void {
  aiClient.cancelCurrentThinking()
  inputController.clearGhost()
  document.getElementById('btn-inspect-return')?.classList.add('hidden')
  renderer.resetView()
  game.reset(settings)
  storage.clearSavedGame()
  hud.startTimer(0)
  updateHudTurn()
  renderCurrent()

  // If AI plays first (Human picked White)
  if (settings.mode === 'ai' && settings.humanColor === WHITE) {
    triggerAiTurn()
  }
}

function onSettingsChanged(newSettings: Settings): void {
  const sizeChanged = newSettings.size !== settings.size
  const modeChanged = newSettings.mode !== settings.mode
  const colorChanged = newSettings.humanColor !== settings.humanColor
  const themeChanged = newSettings.theme !== settings.theme

  settings = newSettings
  sound.enabled = settings.sound
  haptics.enabled = settings.haptics
  inputController.oneTapMove = settings.oneTapMove
  storage.saveSettings(settings)

  if (themeChanged) {
    applyTheme(settings.theme)
  }

  hud.updateDifficulty(settings.difficulty, settings.mode)

  if (sizeChanged || modeChanged || colorChanged) {
    startFreshGame()
  } else {
    renderCurrent()
  }
}

// Initial Boot
hud.startTimer(Math.floor(game.state.elapsedMs / 1000))
updateHudTurn()
renderCurrent()

// If restored game had AI's turn
if (settings.mode === 'ai' && game.state.current !== settings.humanColor && game.state.status === 'playing') {
  triggerAiTurn()
}
