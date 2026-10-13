import { Lang } from './core/types'

export const enDict = {
  appTitle: 'Gomoku',
  turnBlack: 'Black to move',
  turnWhite: 'White to move',
  aiThinking: 'AI is thinking…',
  move: 'Move {n}',
  undo: 'Undo',
  place: 'Place',
  newGame: 'New game',
  settings: 'Settings',
  boardSize: 'Board size',
  mode: 'Mode',
  modeAi: 'vs AI',
  modePvp: 'Two players',
  difficulty: 'Difficulty',
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
  yourColor: 'Your color',
  black: 'Black',
  white: 'White',
  theme: 'Theme',
  themeWood: 'Wood',
  themeSlate: 'Dark',
  language: 'Language',
  sound: 'Sound',
  haptics: 'Vibration',
  oneTapMove: 'One-tap move',
  stats: 'Statistics',
  wins: 'Wins',
  losses: 'Losses',
  draws: 'Draws',
  youWin: 'You win!',
  youLose: 'You lose',
  blackWins: 'Black wins',
  whiteWins: 'White wins',
  draw: 'Draw',
  playAgain: 'Play again',
  undoMove: 'Undo move',
  confirmNewGame: 'Start a new game?',
  yes: 'Yes',
  cancel: 'Cancel',
  install: 'Install app',
  iosInstall: 'Tap Share, then "Add to Home Screen"',
  close: 'Close'
} as const

export type Key = keyof typeof enDict

export const ruDict: Record<Key, string> = {
  appTitle: 'Гомоку',
  turnBlack: 'Ход чёрных',
  turnWhite: 'Ход белых',
  aiThinking: 'ИИ думает…',
  move: 'Ход {n}',
  undo: 'Отменить',
  place: 'Поставить',
  newGame: 'Новая игра',
  settings: 'Настройки',
  boardSize: 'Размер доски',
  mode: 'Режим',
  modeAi: 'Против ИИ',
  modePvp: 'Вдвоём',
  difficulty: 'Сложность',
  easy: 'Лёгкий',
  medium: 'Средний',
  hard: 'Сложный',
  yourColor: 'Ваш цвет',
  black: 'Чёрные',
  white: 'Белые',
  theme: 'Тема',
  themeWood: 'Дерево',
  themeSlate: 'Тёмная',
  language: 'Язык',
  sound: 'Звук',
  haptics: 'Вибрация',
  oneTapMove: 'Ход в одно касание',
  stats: 'Статистика',
  wins: 'Победы',
  losses: 'Поражения',
  draws: 'Ничьи',
  youWin: 'Победа!',
  youLose: 'Поражение',
  blackWins: 'Победили чёрные',
  whiteWins: 'Победили белые',
  draw: 'Ничья',
  playAgain: 'Ещё раз',
  undoMove: 'Отменить ход',
  confirmNewGame: 'Начать новую партию?',
  yes: 'Да',
  cancel: 'Отмена',
  install: 'Установить приложение',
  iosInstall: 'Нажмите «Поделиться», затем «На экран „Домой“»',
  close: 'Закрыть'
}

let currentLang: Lang = (() => {
  if (typeof navigator !== 'undefined' && navigator.language && navigator.language.toLowerCase().startsWith('ru')) {
    return 'ru'
  }
  return 'en'
})()

const listeners: Set<(lang: Lang) => void> = new Set()

export function getLang(): Lang {
  return currentLang
}

export function setLang(lang: Lang): void {
  if (currentLang === lang) return
  currentLang = lang
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang
  }
  applyI18n()
  listeners.forEach(cb => cb(lang))
}

export function onLangChange(cb: (lang: Lang) => void): () => void {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function t(key: Key, params?: Record<string, string | number>): string {
  const dict = currentLang === 'ru' ? ruDict : enDict
  let text: string = dict[key] || enDict[key] || key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v))
    }
  }
  return text
}

export function applyI18n(root?: Element | Document): void {
  if (typeof document === 'undefined') return
  const target = root ?? document
  const elements = target.querySelectorAll('[data-i18n]')
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n') as Key | null
    if (key && (key in enDict)) {
      el.textContent = t(key)
    }
  })
}
