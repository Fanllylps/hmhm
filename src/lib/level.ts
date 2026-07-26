/** Level curve for the XP system. Pure and unit-tested. */

export interface LevelInfo {
  level: number
  title: string
  jpTitle: string
  /** XP earned inside the current level. */
  intoLevel: number
  /** XP needed to go from this level to the next. */
  needed: number
  /** 0..1 progress toward the next level. */
  progress: number
  totalXp: number
}

/** Cost of going from level L to L+1: 100, 150, 200, … (+50 per level). */
export function xpForLevel(level: number): number {
  return 100 + (level - 1) * 50
}

const TITLES: { minLevel: number; title: string; jpTitle: string }[] = [
  { minLevel: 1, title: 'Newcomer', jpTitle: '新人' },
  { minLevel: 3, title: 'Student', jpTitle: '生徒' },
  { minLevel: 5, title: 'Apprentice', jpTitle: '見習い' },
  { minLevel: 8, title: 'Wanderer', jpTitle: '旅人' },
  { minLevel: 11, title: 'Scholar', jpTitle: '学者' },
  { minLevel: 14, title: 'Samurai', jpTitle: '侍' },
  { minLevel: 18, title: 'Sensei', jpTitle: '先生' },
  { minLevel: 22, title: 'Master', jpTitle: '師範' },
  { minLevel: 27, title: 'Kana Sage', jpTitle: '仮名仙人' },
]

export function levelFromXp(totalXp: number): LevelInfo {
  const xp = Math.max(0, Math.floor(totalXp))
  let level = 1
  let remaining = xp
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level)
    level += 1
  }
  const needed = xpForLevel(level)
  const t = [...TITLES].reverse().find((entry) => level >= entry.minLevel) ?? TITLES[0]
  return {
    level,
    title: t.title,
    jpTitle: t.jpTitle,
    intoLevel: remaining,
    needed,
    progress: remaining / needed,
    totalXp: xp,
  }
}
