import { describe, expect, it } from 'vitest'
import { parseVocabImport } from './vocabImport'

const VALID = JSON.stringify([
  { kana: 'ねむい', romaji: 'Nemui', en: 'sleepy', id: 'mengantuk', category: 'feelings' },
  { kana: 'うれしい', romaji: 'ureshii', en: 'happy', id: 'senang', alt: ['uresii'] },
])

describe('parseVocabImport', () => {
  it('parses a plain JSON array and normalizes romaji', () => {
    const { items, invalid } = parseVocabImport(VALID)
    expect(items).toHaveLength(2)
    expect(invalid).toBe(0)
    expect(items[0]).toEqual({
      kana: 'ねむい',
      romaji: 'nemui',
      alt: [],
      en: 'sleepy',
      idn: 'mengantuk',
      category: 'feelings',
    })
    expect(items[1].alt).toEqual(['uresii'])
    expect(items[1].category).toBe('custom')
  })

  it('extracts the array from markdown fences and surrounding prose', () => {
    const noisy = 'Sure! Here you go:\n```json\n' + VALID + '\n```\nHope that helps!'
    expect(parseVocabImport(noisy).items).toHaveLength(2)
  })

  it('skips malformed rows but keeps good ones', () => {
    const mixed = JSON.stringify([
      { kana: 'ねむい', romaji: 'nemui', en: 'sleepy', id: 'mengantuk' },
      { kana: 'missing-fields' },
      'not-an-object',
      { kana: 'ねむい', romaji: 'nemui', en: 'dup', id: 'dup' }, // duplicate kana
    ])
    const { items, invalid } = parseVocabImport(mixed)
    expect(items).toHaveLength(1)
    expect(invalid).toBe(3)
  })

  it('accepts idn as an alias for id', () => {
    const alt = JSON.stringify([{ kana: 'あつい', romaji: 'atsui', en: 'hot', idn: 'panas' }])
    expect(parseVocabImport(alt).items[0].idn).toBe('panas')
  })

  it('throws typed errors for garbage input', () => {
    expect(() => parseVocabImport('just some prose')).toThrowError('no-array')
    expect(() => parseVocabImport('[{ broken json }]')).toThrowError('invalid-json')
    expect(() => parseVocabImport('[]')).toThrowError('empty')
    expect(() => parseVocabImport('[{"kana":"x"}]')).toThrowError('empty')
  })
})
