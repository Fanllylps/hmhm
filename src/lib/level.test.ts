import { describe, expect, it } from 'vitest'
import { levelFromXp, xpForLevel } from './level'

describe('xpForLevel', () => {
  it('grows by 50 per level starting at 100', () => {
    expect(xpForLevel(1)).toBe(100)
    expect(xpForLevel(2)).toBe(150)
    expect(xpForLevel(5)).toBe(300)
  })
})

describe('levelFromXp', () => {
  it('starts at level 1 with zero XP', () => {
    const l = levelFromXp(0)
    expect(l.level).toBe(1)
    expect(l.title).toBe('Newcomer')
    expect(l.intoLevel).toBe(0)
    expect(l.needed).toBe(100)
    expect(l.progress).toBe(0)
  })

  it('levels up exactly at the threshold', () => {
    expect(levelFromXp(99).level).toBe(1)
    expect(levelFromXp(100).level).toBe(2)
    // level 2 → 3 costs 150, so 100+150 = 250 total
    expect(levelFromXp(249).level).toBe(2)
    expect(levelFromXp(250).level).toBe(3)
  })

  it('tracks progress inside a level', () => {
    const l = levelFromXp(175) // level 2, 75 into the 150-cost level
    expect(l.level).toBe(2)
    expect(l.intoLevel).toBe(75)
    expect(l.needed).toBe(150)
    expect(l.progress).toBeCloseTo(0.5)
  })

  it('assigns titles by level bracket', () => {
    expect(levelFromXp(250).title).toBe('Student') // level 3
    const big = levelFromXp(1_000_000)
    expect(big.title).toBe('Kana Sage')
    expect(big.level).toBeGreaterThan(27)
  })

  it('clamps negative and fractional input', () => {
    expect(levelFromXp(-50).level).toBe(1)
    expect(levelFromXp(100.9).level).toBe(2)
  })
})
