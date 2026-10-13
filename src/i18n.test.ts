import { describe, expect, it } from 'vitest'
import { enDict, getLang, ruDict, setLang, t } from './i18n'

describe('i18n module', () => {
  it('has identical key sets in English and Russian dictionaries', () => {
    const enKeys = Object.keys(enDict).sort()
    const ruKeys = Object.keys(ruDict).sort()
    expect(enKeys).toEqual(ruKeys)
  })

  it('has non-empty values for all keys in both dictionaries', () => {
    for (const [key, val] of Object.entries(enDict)) {
      expect(val, `enDict.${key} is empty`).toBeTruthy()
    }
    for (const [key, val] of Object.entries(ruDict)) {
      expect(val, `ruDict.${key} is empty`).toBeTruthy()
    }
  })

  it('interpolates parameters correctly', () => {
    setLang('en')
    expect(t('move', { n: 5 })).toBe('Move 5')
    setLang('ru')
    expect(t('move', { n: 5 })).toBe('Ход 5')
  })

  it('switches languages and reflects in getLang() and t()', () => {
    setLang('en')
    expect(getLang()).toBe('en')
    expect(t('newGame')).toBe('New game')

    setLang('ru')
    expect(getLang()).toBe('ru')
    expect(t('newGame')).toBe('Новая игра')
  })
})
