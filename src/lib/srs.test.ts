import { describe, expect, it } from 'vitest'
import {
  DAY_MS,
  MINUTE_MS,
  MIN_EASE,
  START_EASE,
  buildQueue,
  createCard,
  formatDuration,
  isDue,
  maturityOf,
  penalize,
  previewIntervals,
  rate,
  type SrsCard,
} from './srs'

const NOW = 1_700_000_000_000
const rng05 = () => 0.5

function reviewCard(overrides: Partial<SrsCard> = {}): SrsCard {
  return {
    ...createCard('h-あ', NOW - 10 * DAY_MS),
    phase: 'review',
    ease: 2.5,
    interval: 10,
    reps: 5,
    nextReview: NOW,
    ...overrides,
  }
}

describe('createCard', () => {
  it('starts new with default ease and no interval', () => {
    const c = createCard('h-あ', NOW)
    expect(c.phase).toBe('new')
    expect(c.ease).toBe(START_EASE)
    expect(c.interval).toBe(0)
    expect(c.reps).toBe(0)
    expect(c.nextReview).toBe(NOW)
  })
})

describe('learning steps (1m → 10m → graduate 1d)', () => {
  it('new + good moves to the 10m step', () => {
    const c = rate(createCard('x', NOW), 'good', NOW, rng05)
    expect(c.phase).toBe('learning')
    expect(c.stepIndex).toBe(1)
    expect(c.nextReview).toBe(NOW + 10 * MINUTE_MS)
  })

  it('new + again stays on the 1m step', () => {
    const c = rate(createCard('x', NOW), 'again', NOW, rng05)
    expect(c.phase).toBe('learning')
    expect(c.stepIndex).toBe(0)
    expect(c.nextReview).toBe(NOW + 1 * MINUTE_MS)
  })

  it('new + hard repeats the current (1m) step', () => {
    const c = rate(createCard('x', NOW), 'hard', NOW, rng05)
    expect(c.phase).toBe('learning')
    expect(c.stepIndex).toBe(0)
    expect(c.nextReview).toBe(NOW + 1 * MINUTE_MS)
  })

  it('good on the last learning step graduates at 1 day', () => {
    const step1 = rate(createCard('x', NOW), 'good', NOW, rng05)
    const c = rate(step1, 'good', NOW, rng05)
    expect(c.phase).toBe('review')
    expect(c.interval).toBe(1)
    expect(c.nextReview).toBe(NOW + 1 * DAY_MS)
  })

  it('easy from new graduates immediately at 4 days', () => {
    const c = rate(createCard('x', NOW), 'easy', NOW, rng05)
    expect(c.phase).toBe('review')
    expect(c.interval).toBe(4)
    expect(c.nextReview).toBe(NOW + 4 * DAY_MS)
  })
})

describe('review interval math (SM-2)', () => {
  it('good multiplies the interval by ease', () => {
    const c = rate(reviewCard(), 'good', NOW, rng05)
    expect(c.interval).toBe(25) // 10 × 2.5
    expect(c.ease).toBe(2.5) // good leaves ease unchanged
    expect(c.nextReview).toBe(NOW + 25 * DAY_MS)
  })

  it('hard multiplies by 1.2 and drops ease by 0.15', () => {
    const c = rate(reviewCard(), 'hard', NOW, rng05)
    expect(c.interval).toBe(12) // 10 × 1.2
    expect(c.ease).toBe(2.35)
  })

  it('easy multiplies by ease × 1.3 and raises ease by 0.15', () => {
    const c = rate(reviewCard(), 'easy', NOW, rng05)
    expect(c.interval).toBe(33) // round(10 × 2.5 × 1.3)
    expect(c.ease).toBe(2.65)
  })

  it('interval always grows by at least one day', () => {
    const c = rate(reviewCard({ interval: 1, ease: 1.3 }), 'hard', NOW, rng05)
    expect(c.interval).toBe(2) // round(1.2)=1 would not grow → clamped to prev+1
  })
})

describe('lapses', () => {
  it('again on a review card lapses into relearning with interval reset', () => {
    const c = rate(reviewCard(), 'again', NOW, rng05)
    expect(c.phase).toBe('relearning')
    expect(c.lapses).toBe(1)
    expect(c.ease).toBe(2.3) // 2.5 − 0.20
    expect(c.interval).toBe(0)
    expect(c.nextReview).toBe(NOW + 10 * MINUTE_MS)
  })

  it('graduating from relearning restarts at 1 day', () => {
    const lapsed = rate(reviewCard(), 'again', NOW, rng05)
    const c = rate(lapsed, 'good', NOW, rng05)
    expect(c.phase).toBe('review')
    expect(c.interval).toBe(1)
    expect(c.nextReview).toBe(NOW + 1 * DAY_MS)
  })

  it('ease never drops below 1.3', () => {
    const c = rate(reviewCard({ ease: 1.35 }), 'again', NOW, rng05)
    expect(c.ease).toBe(MIN_EASE)
  })
})

describe('fuzz', () => {
  it('stays within ±5% of the computed interval', () => {
    const low = rate(reviewCard({ interval: 100 }), 'good', NOW, () => 0)
    const high = rate(reviewCard({ interval: 100 }), 'good', NOW, () => 1)
    // 100 × 2.5 = 250 → [237.5, 262.5]
    expect(low.interval).toBeGreaterThanOrEqual(237)
    expect(low.interval).toBeLessThanOrEqual(238)
    expect(high.interval).toBeGreaterThanOrEqual(262)
    expect(high.interval).toBeLessThanOrEqual(263)
  })
})

describe('history and reps', () => {
  it('appends a log entry with the pre-answer phase', () => {
    const c = rate(createCard('x', NOW), 'good', NOW, rng05)
    expect(c.reps).toBe(1)
    expect(c.history).toHaveLength(1)
    expect(c.history[0]).toEqual({ ts: NOW, rating: 'good', phase: 'new' })
  })
})

describe('penalize (wrong answer in practice modes)', () => {
  it('pulls a future review back to now', () => {
    const c = penalize(reviewCard({ nextReview: NOW + 5 * DAY_MS }), NOW)
    expect(c.nextReview).toBe(NOW)
  })

  it('never pushes an already-due review later', () => {
    const c = penalize(reviewCard({ nextReview: NOW - DAY_MS }), NOW)
    expect(c.nextReview).toBe(NOW - DAY_MS)
  })

  it('leaves new cards untouched', () => {
    const fresh = createCard('x', NOW - DAY_MS)
    expect(penalize(fresh, NOW)).toBe(fresh)
  })
})

describe('maturity', () => {
  it('classifies new / learning / young / mature', () => {
    expect(maturityOf(undefined)).toBe('new')
    expect(maturityOf(createCard('x', NOW))).toBe('new')
    expect(maturityOf(rate(createCard('x', NOW), 'good', NOW, rng05))).toBe('learning')
    expect(maturityOf(reviewCard({ interval: 20 }))).toBe('young')
    expect(maturityOf(reviewCard({ interval: 21 }))).toBe('mature')
  })
})

describe('previewIntervals', () => {
  it('matches Anki-style labels for a new card', () => {
    const p = previewIntervals(createCard('x', NOW), NOW)
    expect(p.again).toBe('1m')
    expect(p.hard).toBe('1m')
    expect(p.good).toBe('10m')
    expect(p.easy).toBe('4d')
  })

  it('matches labels for a review card', () => {
    const p = previewIntervals(reviewCard(), NOW)
    expect(p.again).toBe('10m')
    expect(p.hard).toBe('12d')
    expect(p.good).toBe('25d')
    expect(p.easy).toBe('1.1mo') // 33 days renders in months, Anki-style
  })
})

describe('formatDuration', () => {
  it('formats minutes, days, months', () => {
    expect(formatDuration(MINUTE_MS)).toBe('1m')
    expect(formatDuration(10 * MINUTE_MS)).toBe('10m')
    expect(formatDuration(DAY_MS)).toBe('1d')
    expect(formatDuration(25 * DAY_MS)).toBe('25d')
    expect(formatDuration(91 * DAY_MS)).toBe('3mo')
  })
})

describe('buildQueue', () => {
  it('returns due cards sorted by overdue-ness plus limited new cards', () => {
    const pool = ['a', 'b', 'c', 'd', 'e']
    const cards = {
      a: reviewCard({ id: 'a', nextReview: NOW - DAY_MS }),
      b: reviewCard({ id: 'b', nextReview: NOW - 2 * DAY_MS }),
      c: reviewCard({ id: 'c', nextReview: NOW + DAY_MS }), // not due
    }
    const q = buildQueue(cards, pool, 1, NOW)
    expect(q.due).toEqual(['b', 'a'])
    expect(q.fresh).toEqual(['d'])
  })

  it('isDue treats new cards as not due', () => {
    expect(isDue(createCard('x', NOW - DAY_MS), NOW)).toBe(false)
  })
})
