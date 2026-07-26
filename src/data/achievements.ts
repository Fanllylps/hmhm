import { KANA } from './kana'
import { maturityOf, type SrsCard } from '../lib/srs'
import { levelFromXp } from '../lib/level'
import type { DayActivity } from '../lib/dates'
import { computeStreak } from '../lib/dates'
import type { BestScores } from '../stores/store'

export interface AchievementContext {
  totalAnswers: number
  streak: number
  mastered: number
  masteredBasicHiragana: number
  masteredBasicKatakana: number
  level: number
  xp: number
  best: BestScores
}

export interface AchievementDef {
  id: string
  /** Glyph stamped in the hanko seal. */
  jp: string
  title: string
  description: string
  /** [current, target] — unlocked when current >= target. */
  progress: (ctx: AchievementContext) => [number, number]
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    jp: '初',
    title: 'First step',
    description: 'Answer your first card',
    progress: (c) => [Math.min(c.totalAnswers, 1), 1],
  },
  {
    id: 'answers-100',
    jp: '百',
    title: 'A hundred strong',
    description: 'Answer 100 cards',
    progress: (c) => [c.totalAnswers, 100],
  },
  {
    id: 'answers-1000',
    jp: '千',
    title: 'One thousand',
    description: 'Answer 1,000 cards',
    progress: (c) => [c.totalAnswers, 1000],
  },
  {
    id: 'streak-3',
    jp: '芽',
    title: 'Sprouting',
    description: 'Study 3 days in a row',
    progress: (c) => [c.streak, 3],
  },
  {
    id: 'streak-7',
    jp: '週',
    title: 'A full week',
    description: 'Study 7 days in a row',
    progress: (c) => [c.streak, 7],
  },
  {
    id: 'streak-30',
    jp: '鬼',
    title: 'Oni mode',
    description: 'Study 30 days in a row',
    progress: (c) => [c.streak, 30],
  },
  {
    id: 'mastered-10',
    jp: '習',
    title: 'Taking root',
    description: 'Master 10 cards',
    progress: (c) => [c.mastered, 10],
  },
  {
    id: 'mastered-50',
    jp: '達',
    title: 'Well versed',
    description: 'Master 50 cards',
    progress: (c) => [c.mastered, 50],
  },
  {
    id: 'hiragana-complete',
    jp: '平',
    title: 'Hiragana complete',
    description: 'Master all 46 basic hiragana',
    progress: (c) => [c.masteredBasicHiragana, 46],
  },
  {
    id: 'katakana-complete',
    jp: '片',
    title: 'Katakana complete',
    description: 'Master all 46 basic katakana',
    progress: (c) => [c.masteredBasicKatakana, 46],
  },
  {
    id: 'level-5',
    jp: '昇',
    title: 'Rising',
    description: 'Reach level 5',
    progress: (c) => [c.level, 5],
  },
  {
    id: 'level-10',
    jp: '頂',
    title: 'Summit seeker',
    description: 'Reach level 10',
    progress: (c) => [c.level, 10],
  },
  {
    id: 'time-attack-20',
    jp: '速',
    title: 'Quick draw',
    description: 'Score 20+ in Time Attack',
    progress: (c) => [c.best.timeAttack, 20],
  },
  {
    id: 'rain-200',
    jp: '嵐',
    title: 'Storm rider',
    description: 'Score 200+ in Kana Rain',
    progress: (c) => [c.best.kanaRain, 200],
  },
  {
    id: 'xp-5000',
    jp: '仙',
    title: 'Kana sage',
    description: 'Earn 5,000 XP',
    progress: (c) => [c.xp, 5000],
  },
]

export function buildAchievementContext(state: {
  cards: Record<string, SrsCard>
  activity: Record<string, DayActivity>
  best: BestScores
  xp: number
}): AchievementContext {
  let totalAnswers = 0
  for (const day of Object.values(state.activity)) totalAnswers += day.reviews

  const matureIds = new Set(
    Object.values(state.cards)
      .filter((c) => maturityOf(c) === 'mature')
      .map((c) => c.id),
  )
  const basic = (script: 'hiragana' | 'katakana') =>
    KANA.filter((k) => k.script === script && k.group === 'basic' && matureIds.has(k.id)).length

  return {
    totalAnswers,
    streak: computeStreak(state.activity),
    mastered: matureIds.size,
    masteredBasicHiragana: basic('hiragana'),
    masteredBasicKatakana: basic('katakana'),
    level: levelFromXp(state.xp).level,
    xp: state.xp,
    best: state.best,
  }
}
