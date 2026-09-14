import { describe, expect, it } from 'vitest'
import { KANA } from '../data/kana'
import { ALL_ROW_KEYS, ROWS, orderEntries, rowEntries } from './rowscope'

describe('ROWS', () => {
  it('covers every kana row present in the dataset', () => {
    const datasetRows = new Set(KANA.map((e) => e.row))
    for (const row of datasetRows) {
      expect(ALL_ROW_KEYS).toContain(row)
    }
  })

  it('has no duplicate keys', () => {
    expect(new Set(ALL_ROW_KEYS).size).toBe(ROWS.length)
  })
})

describe('rowEntries', () => {
  it('returns one row in hiragana only', () => {
    const entries = rowEntries(['ka'], 'hiragana')
    expect(entries.map((e) => e.kana)).toEqual(['か', 'き', 'く', 'け', 'こ'])
  })

  it('returns both scripts when asked', () => {
    expect(rowEntries(['ka'], 'both')).toHaveLength(10)
  })

  it('returns the short wa row (wa, wo, n)', () => {
    const entries = rowEntries(['wa'], 'hiragana')
    expect(entries.map((e) => e.romaji)).toEqual(['wa', 'wo', 'n'])
  })

  it('combines multiple rows in gojuon order', () => {
    const entries = rowEntries(['ka', 'a'], 'hiragana')
    expect(entries.map((e) => e.kana).slice(0, 5)).toEqual(['あ', 'い', 'う', 'え', 'お'])
    expect(entries).toHaveLength(10)
  })

  it('returns katakana entries for katakana script', () => {
    const entries = rowEntries(['a'], 'katakana')
    expect(entries.map((e) => e.kana)).toEqual(['ア', 'イ', 'ウ', 'エ', 'オ'])
  })

  it('returns nothing for an empty selection', () => {
    expect(rowEntries([], 'both')).toEqual([])
  })
})

describe('orderEntries', () => {
  it('sequential preserves gojuon order', () => {
    const entries = rowEntries(['ka', 'a'], 'hiragana')
    expect(orderEntries(entries, 'sequential').map((e) => e.id)).toEqual(
      entries.map((e) => e.id),
    )
  })

  it('random returns the same set', () => {
    const entries = rowEntries(['ka'], 'both')
    const ordered = orderEntries(entries, 'random')
    expect([...ordered.map((e) => e.id)].sort()).toEqual(
      [...entries.map((e) => e.id)].sort(),
    )
  })

  it('does not mutate the input', () => {
    const entries = rowEntries(['ka'], 'hiragana')
    const snapshot = entries.map((e) => e.id)
    orderEntries(entries, 'random')
    expect(entries.map((e) => e.id)).toEqual(snapshot)
  })
})
