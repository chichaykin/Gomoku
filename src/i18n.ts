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
  close: 'Close',
  aboutGame: 'About & History',
  aboutTitle: 'About Gomoku',
  rulesTitle: 'Rules & Objective',
  rulesIntro: 'Gomoku (Five in a Row) is an ancient abstract strategy board game for two players.',
  rule1: 'Black moves first; players alternate placing one stone per turn on grid intersections.',
  rule2: 'The goal is to form an unbroken horizontal, vertical, or diagonal chain of 5 or more stones.',
  rule3: 'In Free Gomoku, continuous lines of 6 or more stones (overlines) also count as a win.',
  rule4: 'If the entire board is filled without a 5-in-a-row, the game ends in a draw.',
  tacticsTitle: 'Tactics & Strategy',
  tacticsDesc: 'Victory requires creating double threats that cannot be blocked simultaneously. An "Open Four" (_XXXX_) guarantees a win on the next turn. Master players orchestrate "Forks" (such as Four-Three or Double-Three) to attack along two axes at once.',
  historyTitle: 'History & Origins',
  historyP1: 'Gomoku originated in ancient China over 4,000 years ago under the name Wuziqi (五子棋, literally "Five-Child Chess"), making it one of the oldest board games in history.',
  historyP2: 'Introduced to Japan around the 7th century AD alongside Go, it was known as Kakugo and later Gomoku-narabe (五目並べ, "lining up five points"). "Go" means five and "Moku" signifies grid intersections.',
  historyP3: 'In the late 19th century, the game gained immense global popularity under names like "Five in a Row" and "Connect Five". To balance the natural advantage of Black moving first, the tournament variant Renju was created in 1899 with opening rules and forbidden moves. Free Gomoku remains the most beloved, intuitive, and accessible format worldwide.',
  rulesButton: 'Rules',
  diffEasy: 'Apprentice',
  diffMedium: 'Master',
  diffHard: 'Sensei',
  diffSelectorTitle: 'AI Difficulty',
  victoryTitle: 'Master’s Triumph',
  defeatTitle: 'Master’s Lesson',
  victorySub: 'Five stones have united along the sacred line of wisdom.',
  defeatSub: 'Every defeat is a step along the path to mastery.',
  inspectBoard: 'Inspect Board',
  returnToMenu: 'Results',
  matchStats: 'Battle Summary',
  time: 'Time',
  turns: 'Turns',
  opponent: 'Opponent',
  newBattle: 'New Battle'
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
  close: 'Закрыть',
  aboutGame: 'Об игре и история',
  aboutTitle: 'О Гомоку',
  rulesTitle: 'Правила и цель игры',
  rulesIntro: 'Гомоку («Пять в ряд») — классическая логическая настольная игра для двух соперников.',
  rule1: 'Чёрные ходят первыми. Игроки по очереди выставляют по одному камню на свободные пересечения линий.',
  rule2: 'Цель игры — первым выстроить непрерывный ряд из 5 или более своих камней по горизонтали, вертикали или диагонали.',
  rule3: 'В варианте «Свободное Гомоку» ряд из 6 и более камней («оверлайн») также приносит победу.',
  rule4: 'Если вся доска заполнилась, а ряд из 5 камней не собран — партия заканчивается вничью.',
  tacticsTitle: 'Тактика и стратегия',
  tacticsDesc: 'Ключ к победе — создание двойных угроз, которые невозможно перекрыть одним ходом. «Открытая четвёрка» (_XXXX_) гарантирует выигрыш следующим ходом. Опытные игроки строят «вилки» (например, «четыре-три» или «три-три»), атакуя сразу по двум направлениям.',
  historyTitle: 'История возникновения',
  historyP1: 'Гомоку зародилась в Древнем Китае более 4000 лет назад под названием Уцзици (五子棋, буквально «шахматы из пяти фишек»). Это одна из древнейших интеллектуальных игр человечества.',
  historyP2: 'Примерно в VII веке нашей эры игра проникла в Японию вместе с классическим Го, где получила название Какуго, а позднее — Гомоку-нарабэ (五目並べ, «выстраивание пяти точек»). Слово «го» означает пять, а «моку» — пункт или пересечение линий.',
  historyP3: 'В конце XIX века игра завоевала мировую популярность в Европе и Америке под названиями «Пять в ряд» и «Connect Five». Из-за математического преимущества первого хода у чёрных в 1899 году в Японии были созданы строгие турнирные правила Рэндзю с запретами вилок. Классическое Свободное Гомоку до сих пор остаётся самым популярным, понятным и увлекательным форматом во всём мире.',
  rulesButton: 'Правила',
  diffEasy: 'Ученик',
  diffMedium: 'Мастер',
  diffHard: 'Сенсей',
  diffSelectorTitle: 'Сложность ИИ',
  victoryTitle: 'Триумф мастера',
  defeatTitle: 'Урок мастера',
  victorySub: 'Пять священных камней сошлись воедино.',
  defeatSub: 'Поражение — лишь шаг на пути к совершенству.',
  inspectBoard: 'Осмотреть доску',
  returnToMenu: 'К результатам',
  matchStats: 'Итоги битвы',
  time: 'Время',
  turns: 'Ходов',
  opponent: 'Соперник',
  newBattle: 'Новая битва'
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
