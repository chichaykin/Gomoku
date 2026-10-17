import { Lang } from './core/types'

export interface LocalizedText {
  en: string
  ru: string
}

export interface LocalizedTags {
  en: string[]
  ru: string[]
}

export interface GameEntry {
  id: string
  url: string
  repo: string
  icon: string
  accent: string
  title: LocalizedText
  shortTitle: LocalizedText
  description: LocalizedText
  tags: LocalizedTags
}

export interface GamesManifest {
  version: number
  updatedAt: string
  games: GameEntry[]
}

export const CURRENT_GAME_ID = 'gomoku'
export const CATALOG_CACHE_KEY = 'chichaykin:games_catalog:v1'
export const REMOTE_CATALOG_URL = 'https://chichaykin.github.io/Gomoku/games.json'

export const BUILTIN_GAMES: GameEntry[] = [
  {
    id: 'gomoku',
    url: 'https://chichaykin.github.io/Gomoku/',
    repo: 'https://github.com/chichaykin/Gomoku',
    icon: '⚫',
    accent: '#d4af37',
    title: {
      en: 'Gomoku — Five in a Row',
      ru: 'Гомоку — Пять в ряд'
    },
    shortTitle: {
      en: 'Gomoku',
      ru: 'Гомоку'
    },
    description: {
      en: 'Ancient strategy board game: align 5 stones in a row against AI or a friend.',
      ru: 'Древняя логическая стратегия: выстройте 5 камней в ряд против ИИ или друга.'
    },
    tags: {
      en: ['Strategy', '15×15 / 19×19', 'AI & 2P'],
      ru: ['Стратегия', '15×15 / 19×19', 'ИИ и 2 игрока']
    }
  },
  {
    id: 'logika',
    url: 'https://chichaykin.github.io/Logika/',
    repo: 'https://github.com/chichaykin/Logika',
    icon: '🔮',
    accent: '#e6be47',
    title: {
      en: 'Logika — Mastermind',
      ru: 'Логика — Mastermind'
    },
    shortTitle: {
      en: 'Logika',
      ru: 'Логика'
    },
    description: {
      en: 'Crack the secret code of colored marbles or challenge Donald Knuth’s 5-guess AI.',
      ru: 'Разгадайте секретный код из цветных шариков или сразитесь с алгоритмом Кнута.'
    },
    tags: {
      en: ['Deduction', 'Knuth AI', 'Codebreaker'],
      ru: ['Дедукция', 'ИИ Кнута', 'Код-брейкер']
    }
  }
]

function isValidUrl(url: unknown): url is string {
  if (typeof url !== 'string' || !url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

function isStringArray(arr: unknown): arr is string[] {
  return Array.isArray(arr) && arr.every((x) => typeof x === 'string')
}

function isValidGameEntry(item: unknown): item is GameEntry {
  if (typeof item !== 'object' || item === null) return false
  const rec = item as Record<string, unknown>
  if (typeof rec.id !== 'string' || !rec.id) return false
  if (!isValidUrl(rec.url)) return false
  if (typeof rec.icon !== 'string') return false
  const title = rec.title as Record<string, unknown> | undefined
  const desc = rec.description as Record<string, unknown> | undefined
  if (!title || typeof title.en !== 'string' || typeof title.ru !== 'string') return false
  if (!desc || typeof desc.en !== 'string' || typeof desc.ru !== 'string') return false
  if (rec.tags !== undefined) {
    const tags = rec.tags as Record<string, unknown> | null
    if (!tags || !isStringArray(tags.en) || !isStringArray(tags.ru)) return false
  }
  return true
}

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Merge builtin games with cached/remote games so builtin entries are always present
 * and remote entries can update existing metadata or append newly released games.
 */
export function mergeGamesCatalog(base: GameEntry[], incoming: GameEntry[]): GameEntry[] {
  const map = new Map<string, GameEntry>()
  for (const g of base) {
    map.set(g.id, g)
  }
  for (const g of incoming) {
    if (isValidGameEntry(g)) {
      map.set(g.id, {
        ...map.get(g.id),
        ...g
      })
    }
  }
  return Array.from(map.values())
}

export function getGamesCatalog(): GameEntry[] {
  if (typeof localStorage === 'undefined') return BUILTIN_GAMES
  try {
    const raw = localStorage.getItem(CATALOG_CACHE_KEY)
    if (!raw) return BUILTIN_GAMES
    const parsed = JSON.parse(raw) as Partial<GamesManifest>
    if (Array.isArray(parsed.games)) {
      return mergeGamesCatalog(BUILTIN_GAMES, parsed.games)
    }
  } catch {
    // Fail-safe fallback
  }
  return BUILTIN_GAMES
}

export async function refreshGamesCatalog(fetchImpl: typeof fetch = fetch): Promise<GameEntry[]> {
  try {
    const res = await fetchImpl(REMOTE_CATALOG_URL, { cache: 'no-cache' })
    if (!res.ok) return getGamesCatalog()
    const data = (await res.json()) as Partial<GamesManifest>
    if (Array.isArray(data.games)) {
      const valid = data.games.filter(isValidGameEntry)
      if (valid.length > 0) {
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(
              CATALOG_CACHE_KEY,
              JSON.stringify({
                version: typeof data.version === 'number' ? data.version : 1,
                updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : '',
                games: valid
              })
            )
          } catch {
            // Ignore storage quota errors
          }
        }
        return mergeGamesCatalog(BUILTIN_GAMES, valid)
      }
    }
  } catch {
    // Offline or network error — return cached/builtin catalog silently
  }
  return getGamesCatalog()
}

/**
 * Build cross-game navigation URL with `?lang=ru|en` parameter so the target game
 * opens in the user's active language.
 */
export function buildGameUrl(baseUrl: string, lang: Lang): string {
  try {
    const u = new URL(baseUrl)
    u.searchParams.set('lang', lang)
    return u.toString()
  } catch {
    const sep = baseUrl.includes('?') ? '&' : '?'
    return `${baseUrl}${sep}lang=${encodeURIComponent(lang)}`
  }
}

/**
 * Parse `?lang=ru|en` from location search string if present.
 */
export function parseLangFromSearch(search: string): Lang | null {
  try {
    const params = new URLSearchParams(search)
    const lang = params.get('lang')?.toLowerCase()
    if (lang === 'ru' || lang === 'en') {
      return lang
    }
  } catch {
    // Ignore malformed query
  }
  return null
}

/**
 * Strip `?lang=` from current browser URL bar without reloading page.
 */
export function cleanLangParamFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return
  try {
    const url = new URL(window.location.href)
    if (url.searchParams.has('lang')) {
      url.searchParams.delete('lang')
      const next = url.pathname + (url.search ? url.search : '') + url.hash
      window.history.replaceState(null, '', next)
    }
  } catch {
    // Ignore
  }
}
