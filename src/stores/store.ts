import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { KANA, type KanaEntry } from '../data/kana'
import { computeStreak, dayKey, type DayActivity } from '../lib/dates'
import {
  createCard,
  isDue,
  maturityOf,
  penalize,
  rate,
  type Rating,
  type SrsCard,
} from '../lib/srs'

export const SCHEMA_VERSION = 1

export interface Settings {
  scripts: 'hiragana' | 'katakana' | 'both'
  groups: {
    basic: boolean
    /** Covers dakuten + handakuten together (single toggle, like the spec). */
    dakuten: boolean
    yoon: boolean
  }
  newPerDay: number
  audio: boolean
  /** Lenient romaji input: accept shi/si, chi/ti, tsu/tu, fu/hu, ja/jya… */
  lenient: boolean
}

export interface BestScores {
  timeAttack: number
  kanaRain: number
  /** Best (lowest) matching-game clear time in seconds; null until first clear. */
  matchingSec: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  scripts: 'hiragana',
  groups: { basic: true, dakuten: false, yoon: false },
  newPerDay: 10,
  audio: true,
  lenient: true,
}

const DEFAULT_BEST: BestScores = { timeAttack: 0, kanaRain: 0, matchingSec: null }

interface AppState {
  onboarded: boolean
  settings: Settings
  cards: Record<string, SrsCard>
  /** New cards introduced per day, keyed by dayKey. */
  newHistory: Record<string, number>
  /** All answers per day (SRS reviews + practice modes), keyed by dayKey. */
  activity: Record<string, DayActivity>
  best: BestScores

  completeOnboarding: (settings: Partial<Settings>) => void
  updateSettings: (partial: Partial<Settings>) => void
  rateCard: (id: string, rating: Rating) => SrsCard
  /**
   * Record a practice-mode answer. Wrong answers pull the card's next review
   * earlier (modes feed the SRS). Pass null for non-SRS items (words).
   */
  recordPractice: (id: string | null, correct: boolean) => void
  submitScore: (game: 'timeAttack' | 'kanaRain', score: number) => void
  submitMatchingTime: (seconds: number) => void
  importAll: (data: ExportPayload['data']) => void
  resetProgress: () => void
}

export interface ExportPayload {
  app: 'kanaflow'
  schema: number
  exportedAt: string
  data: {
    onboarded: boolean
    settings: Settings
    cards: Record<string, SrsCard>
    newHistory: Record<string, number>
    activity: Record<string, DayActivity>
    best: BestScores
  }
}

function bumpActivity(
  activity: Record<string, DayActivity>,
  correct: boolean,
  now: number,
): Record<string, DayActivity> {
  const key = dayKey(now)
  const day = activity[key] ?? { reviews: 0, correct: 0 }
  return {
    ...activity,
    [key]: { reviews: day.reviews + 1, correct: day.correct + (correct ? 1 : 0) },
  }
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      onboarded: false,
      settings: DEFAULT_SETTINGS,
      cards: {},
      newHistory: {},
      activity: {},
      best: DEFAULT_BEST,

      completeOnboarding: (settings) =>
        set((s) => ({ onboarded: true, settings: { ...s.settings, ...settings } })),

      updateSettings: (partial) =>
        set((s) => ({ settings: { ...s.settings, ...partial } })),

      rateCard: (id, rating) => {
        const now = Date.now()
        const s = get()
        const existing = s.cards[id]
        const card = existing ?? createCard(id, now)
        const isIntroduction = card.phase === 'new'
        const updated = rate(card, rating, now)
        const key = dayKey(now)
        set({
          cards: { ...s.cards, [id]: updated },
          activity: bumpActivity(s.activity, rating !== 'again', now),
          newHistory: isIntroduction
            ? { ...s.newHistory, [key]: (s.newHistory[key] ?? 0) + 1 }
            : s.newHistory,
        })
        return updated
      },

      recordPractice: (id, correct) => {
        const now = Date.now()
        set((s) => {
          const cards =
            !correct && id && s.cards[id]
              ? { ...s.cards, [id]: penalize(s.cards[id], now) }
              : s.cards
          return { cards, activity: bumpActivity(s.activity, correct, now) }
        })
      },

      submitScore: (game, score) =>
        set((s) => ({
          best: { ...s.best, [game]: Math.max(s.best[game], score) },
        })),

      submitMatchingTime: (seconds) =>
        set((s) => ({
          best: {
            ...s.best,
            matchingSec:
              s.best.matchingSec === null ? seconds : Math.min(s.best.matchingSec, seconds),
          },
        })),

      importAll: (data) =>
        set({
          onboarded: data.onboarded,
          settings: { ...DEFAULT_SETTINGS, ...data.settings },
          cards: data.cards,
          newHistory: data.newHistory,
          activity: data.activity,
          best: { ...DEFAULT_BEST, ...data.best },
        }),

      resetProgress: () =>
        set({ cards: {}, newHistory: {}, activity: {}, best: DEFAULT_BEST }),
    }),
    {
      name: 'kanaflow-store',
      version: SCHEMA_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: (persisted, version) => {
        // Migration guard: on unknown/older schemas, keep whatever fields still
        // match and let defaults fill the rest (merge happens on rehydrate).
        if (version !== SCHEMA_VERSION) return persisted as AppState
        return persisted as AppState
      },
    },
  ),
)

// ---------- Selectors / helpers ----------

export function activePool(settings: Settings): KanaEntry[] {
  return KANA.filter((k) => {
    if (settings.scripts !== 'both' && k.script !== settings.scripts) return false
    if (k.group === 'basic') return settings.groups.basic
    if (k.group === 'dakuten' || k.group === 'handakuten') return settings.groups.dakuten
    return settings.groups.yoon
  })
}

export function newIntroducedToday(newHistory: Record<string, number>, now = Date.now()): number {
  return newHistory[dayKey(now)] ?? 0
}

export interface DashboardStats {
  dueCount: number
  newRemaining: number
  streak: number
  mastered: number
  totalCards: number
  accuracy: number | null
  totalReviews: number
  /** Timestamp of the next upcoming review, or null when nothing is scheduled. */
  nextDueAt: number | null
}

export function computeStats(
  state: Pick<AppState, 'cards' | 'activity' | 'newHistory' | 'settings'>,
  now = Date.now(),
): DashboardStats {
  const pool = activePool(state.settings)
  const cards = pool.map((k) => state.cards[k.id]).filter((c): c is SrsCard => c !== undefined)
  const dueCount = cards.filter((c) => isDue(c, now)).length
  const introduced = new Set(cards.filter((c) => c.phase !== 'new').map((c) => c.id))
  const unseen = pool.filter((k) => !introduced.has(k.id)).length
  const newRemaining = Math.min(
    unseen,
    Math.max(0, state.settings.newPerDay - newIntroducedToday(state.newHistory, now)),
  )
  const mastered = cards.filter((c) => maturityOf(c) === 'mature').length
  let totalReviews = 0
  let totalCorrect = 0
  for (const day of Object.values(state.activity)) {
    totalReviews += day.reviews
    totalCorrect += day.correct
  }
  const upcoming = cards
    .filter((c) => c.phase !== 'new' && c.nextReview > now)
    .map((c) => c.nextReview)
  return {
    dueCount,
    newRemaining,
    streak: computeStreak(state.activity, now),
    mastered,
    totalCards: pool.length,
    accuracy: totalReviews === 0 ? null : Math.round((totalCorrect / totalReviews) * 100),
    totalReviews,
    nextDueAt: upcoming.length > 0 ? Math.min(...upcoming) : null,
  }
}

export function buildExportPayload(state: AppState): ExportPayload {
  return {
    app: 'kanaflow',
    schema: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      onboarded: state.onboarded,
      settings: state.settings,
      cards: state.cards,
      newHistory: state.newHistory,
      activity: state.activity,
      best: state.best,
    },
  }
}

export function parseImportPayload(text: string): ExportPayload['data'] {
  const parsed: unknown = JSON.parse(text)
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    (parsed as ExportPayload).app !== 'kanaflow' ||
    typeof (parsed as ExportPayload).schema !== 'number' ||
    (parsed as ExportPayload).schema > SCHEMA_VERSION ||
    typeof (parsed as ExportPayload).data !== 'object'
  ) {
    throw new Error('Not a valid KanaFlow backup file.')
  }
  return (parsed as ExportPayload).data
}
