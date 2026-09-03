/**
 * Anki-style SM-2 spaced repetition engine.
 * Pure functions only — no store access, no Date.now() defaults — so every
 * scheduling rule is unit-testable with an injected clock and RNG.
 */

export type Rating = 'again' | 'hard' | 'good' | 'easy'
export type CardPhase = 'new' | 'learning' | 'review' | 'relearning'
export type Maturity = 'new' | 'learning' | 'young' | 'mature'

export interface ReviewLogEntry {
  ts: number
  rating: Rating
  /** Phase the card was in when it was answered. */
  phase: CardPhase
}

export interface SrsCard {
  id: string
  phase: CardPhase
  ease: number
  /** Current interval in days (0 until the card first graduates). */
  interval: number
  /** Index into the learning/relearning steps. */
  stepIndex: number
  reps: number
  lapses: number
  /** Epoch ms when the card is next due. */
  nextReview: number
  introducedAt: number
  history: ReviewLogEntry[]
}

export const LEARNING_STEPS_MIN = [1, 10]
export const RELEARNING_STEPS_MIN = [10]
export const GRADUATING_INTERVAL = 1
export const EASY_INTERVAL = 4
export const START_EASE = 2.5
export const MIN_EASE = 1.3
export const EASE_AGAIN = -0.2
export const EASE_HARD = -0.15
export const EASE_EASY = 0.15
export const HARD_MULTIPLIER = 1.2
export const EASY_BONUS = 1.3
/** Review cards with an interval at or above this many days count as mature. */
export const MATURE_INTERVAL = 21
/** Cards with this many lapses count as leeches (stubborn trouble cards). */
export const LEECH_LAPSES = 8
export const FUZZ = 0.05

export const MINUTE_MS = 60_000
export const DAY_MS = 86_400_000

export function createCard(id: string, now: number): SrsCard {
  return {
    id,
    phase: 'new',
    ease: START_EASE,
    interval: 0,
    stepIndex: 0,
    reps: 0,
    lapses: 0,
    nextReview: now,
    introducedAt: now,
    history: [],
  }
}

/** ±5% fuzz so cards reviewed together don't clump on the same future day. */
function fuzzed(days: number, rng: () => number): number {
  return days * (1 - FUZZ + 2 * FUZZ * rng())
}

function clampEase(ease: number): number {
  return Math.max(MIN_EASE, Math.round(ease * 100) / 100)
}

function fuzzedDays(days: number, rng: () => number): number {
  return Math.max(1, Math.round(fuzzed(days, rng)))
}

export function rate(
  card: SrsCard,
  rating: Rating,
  now: number,
  rng: () => number = Math.random,
): SrsCard {
  const next: SrsCard = {
    ...card,
    reps: card.reps + 1,
    history: [...card.history, { ts: now, rating, phase: card.phase }],
  }
  const phase: CardPhase = card.phase === 'new' ? 'learning' : card.phase

  if (phase === 'learning' || phase === 'relearning') {
    const steps = phase === 'learning' ? LEARNING_STEPS_MIN : RELEARNING_STEPS_MIN
    const curStep = card.phase === 'new' ? 0 : card.stepIndex

    if (rating === 'again') {
      next.phase = phase
      next.stepIndex = 0
      next.nextReview = now + steps[0] * MINUTE_MS
    } else if (rating === 'hard') {
      next.phase = phase
      next.stepIndex = curStep
      next.nextReview = now + steps[Math.min(curStep, steps.length - 1)] * MINUTE_MS
    } else if (rating === 'good') {
      const idx = curStep + 1
      if (idx >= steps.length) {
        const ivl = fuzzedDays(GRADUATING_INTERVAL, rng)
        next.phase = 'review'
        next.stepIndex = 0
        next.interval = ivl
        next.nextReview = now + ivl * DAY_MS
      } else {
        next.phase = phase
        next.stepIndex = idx
        next.nextReview = now + steps[idx] * MINUTE_MS
      }
    } else {
      // easy: graduate immediately. From learning use the easy interval; from
      // relearning the lapse already reset the interval, so restart at 1 day.
      const days = phase === 'learning' ? EASY_INTERVAL : GRADUATING_INTERVAL
      const ivl = fuzzedDays(days, rng)
      next.phase = 'review'
      next.stepIndex = 0
      next.interval = ivl
      next.nextReview = now + ivl * DAY_MS
    }
    return next
  }

  // phase === 'review'
  if (rating === 'again') {
    next.phase = 'relearning'
    next.stepIndex = 0
    next.lapses = card.lapses + 1
    next.ease = clampEase(card.ease + EASE_AGAIN)
    next.interval = 0
    next.nextReview = now + RELEARNING_STEPS_MIN[0] * MINUTE_MS
    return next
  }

  let days: number
  if (rating === 'hard') {
    days = card.interval * HARD_MULTIPLIER
    next.ease = clampEase(card.ease + EASE_HARD)
  } else if (rating === 'good') {
    days = card.interval * card.ease
  } else {
    days = card.interval * card.ease * EASY_BONUS
    next.ease = clampEase(card.ease + EASE_EASY)
  }
  const ivl = Math.max(card.interval + 1, fuzzedDays(days, rng))
  next.interval = ivl
  next.nextReview = now + ivl * DAY_MS
  return next
}

/**
 * Wrong answer in a practice mode: pull the card's next review earlier
 * (due immediately) without touching ease/interval. New cards are untouched.
 */
export function penalize(card: SrsCard, now: number): SrsCard {
  if (card.phase === 'new') return card
  return { ...card, nextReview: Math.min(card.nextReview, now) }
}

export function isDue(card: SrsCard, now: number): boolean {
  return card.phase !== 'new' && card.nextReview <= now
}

export function maturityOf(card: SrsCard | undefined): Maturity {
  if (!card || card.phase === 'new') return 'new'
  if (card.phase === 'learning' || card.phase === 'relearning') return 'learning'
  return card.interval >= MATURE_INTERVAL ? 'mature' : 'young'
}

/** Anki-style leech: a card that keeps lapsing and needs focused drilling. */
export function isLeech(card: SrsCard | undefined): boolean {
  return card !== undefined && card.lapses >= LEECH_LAPSES
}

export function formatDuration(ms: number): string {
  const minutes = ms / MINUTE_MS
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))}m`
  const days = ms / DAY_MS
  if (days < 1) return `${Math.round(ms / (60 * MINUTE_MS))}h`
  if (days < 30) return `${Math.round(days)}d`
  if (days < 365) {
    const months = days / 30.4
    const rounded = months.toFixed(1).replace(/\.0$/, '')
    return `${rounded}mo`
  }
  const years = (days / 365).toFixed(1).replace(/\.0$/, '')
  return `${years}yr`
}

/**
 * Interval preview per answer button ("1m", "10m", "1d", "4d"), computed
 * without fuzz so the labels are stable.
 */
export function previewIntervals(card: SrsCard, now: number): Record<Rating, string> {
  const noFuzz = () => 0.5
  const ratings: Rating[] = ['again', 'hard', 'good', 'easy']
  const out = {} as Record<Rating, string>
  for (const r of ratings) {
    const rated = rate(card, r, now, noFuzz)
    out[r] = formatDuration(rated.nextReview - now)
  }
  return out
}

export interface QueueResult {
  /** Cards already in the SRS that are due, most overdue first. */
  due: string[]
  /** Brand-new entry ids to introduce today (respects the daily new limit). */
  fresh: string[]
}

export function buildQueue(
  cards: Record<string, SrsCard>,
  poolIds: string[],
  newLimit: number,
  now: number,
): QueueResult {
  const due = poolIds
    .filter((id) => {
      const c = cards[id]
      return c !== undefined && isDue(c, now)
    })
    .sort((a, b) => cards[a].nextReview - cards[b].nextReview)
  const fresh = poolIds
    .filter((id) => cards[id] === undefined || cards[id].phase === 'new')
    .slice(0, Math.max(0, newLimit))
  return { due, fresh }
}
