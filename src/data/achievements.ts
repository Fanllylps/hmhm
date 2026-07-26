import { KANA } from './kana'
import { maturityOf, type SrsCard } from '../lib/srs'
import { levelFromXp } from '../lib/level'
import type { DayActivity } from '../lib/dates'
import { computeStreak } from '../lib/dates'
import type { BestScores } from '../stores/store'
import type { Localized } from '../lib/i18n'

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
  title: Localized
  description: Localized
  /** [current, target] — unlocked when current >= target. */
  progress: (ctx: AchievementContext) => [number, number]
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-step',
    jp: '初',
    title: { en: 'First step', id: 'Langkah pertama' },
    description: { en: 'Answer your first card', id: 'Jawab kartu pertamamu' },
    progress: (c) => [Math.min(c.totalAnswers, 1), 1],
  },
  {
    id: 'answers-100',
    jp: '百',
    title: { en: 'A hundred strong', id: 'Seratus jawaban' },
    description: { en: 'Answer 100 cards', id: 'Jawab 100 kartu' },
    progress: (c) => [c.totalAnswers, 100],
  },
  {
    id: 'answers-1000',
    jp: '千',
    title: { en: 'One thousand', id: 'Seribu jawaban' },
    description: { en: 'Answer 1,000 cards', id: 'Jawab 1.000 kartu' },
    progress: (c) => [c.totalAnswers, 1000],
  },
  {
    id: 'streak-3',
    jp: '芽',
    title: { en: 'Sprouting', id: 'Mulai bertunas' },
    description: { en: 'Study 3 days in a row', id: 'Belajar 3 hari berturut-turut' },
    progress: (c) => [c.streak, 3],
  },
  {
    id: 'streak-7',
    jp: '週',
    title: { en: 'A full week', id: 'Seminggu penuh' },
    description: { en: 'Study 7 days in a row', id: 'Belajar 7 hari berturut-turut' },
    progress: (c) => [c.streak, 7],
  },
  {
    id: 'streak-30',
    jp: '鬼',
    title: { en: 'Oni mode', id: 'Mode oni' },
    description: { en: 'Study 30 days in a row', id: 'Belajar 30 hari berturut-turut' },
    progress: (c) => [c.streak, 30],
  },
  {
    id: 'mastered-10',
    jp: '習',
    title: { en: 'Taking root', id: 'Mulai mengakar' },
    description: { en: 'Master 10 cards', id: 'Kuasai 10 kartu' },
    progress: (c) => [c.mastered, 10],
  },
  {
    id: 'mastered-50',
    jp: '達',
    title: { en: 'Well versed', id: 'Makin mahir' },
    description: { en: 'Master 50 cards', id: 'Kuasai 50 kartu' },
    progress: (c) => [c.mastered, 50],
  },
  {
    id: 'hiragana-complete',
    jp: '平',
    title: { en: 'Hiragana complete', id: 'Hiragana tamat' },
    description: { en: 'Master all 46 basic hiragana', id: 'Kuasai semua 46 hiragana dasar' },
    progress: (c) => [c.masteredBasicHiragana, 46],
  },
  {
    id: 'katakana-complete',
    jp: '片',
    title: { en: 'Katakana complete', id: 'Katakana tamat' },
    description: { en: 'Master all 46 basic katakana', id: 'Kuasai semua 46 katakana dasar' },
    progress: (c) => [c.masteredBasicKatakana, 46],
  },
  {
    id: 'level-5',
    jp: '昇',
    title: { en: 'Rising', id: 'Terus naik' },
    description: { en: 'Reach level 5', id: 'Capai level 5' },
    progress: (c) => [c.level, 5],
  },
  {
    id: 'level-10',
    jp: '頂',
    title: { en: 'Summit seeker', id: 'Pendaki puncak' },
    description: { en: 'Reach level 10', id: 'Capai level 10' },
    progress: (c) => [c.level, 10],
  },
  {
    id: 'time-attack-20',
    jp: '速',
    title: { en: 'Quick draw', id: 'Gerak cepat' },
    description: { en: 'Score 20+ in Time Attack', id: 'Skor 20+ di Time Attack' },
    progress: (c) => [c.best.timeAttack, 20],
  },
  {
    id: 'rain-200',
    jp: '嵐',
    title: { en: 'Storm rider', id: 'Penunggang badai' },
    description: { en: 'Score 200+ in Kana Rain', id: 'Skor 200+ di Kana Rain' },
    progress: (c) => [c.best.kanaRain, 200],
  },
  {
    id: 'xp-5000',
    jp: '仙',
    title: { en: 'Kana sage', id: 'Petapa kana' },
    description: { en: 'Earn 5,000 XP', id: 'Kumpulkan 5.000 XP' },
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
