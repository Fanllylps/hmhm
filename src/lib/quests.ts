/**
 * Daily quests: three small missions that reset every local day.
 * Progress is counted in the store (rateCard / recordPractice bump the
 * counters); the XP bonus is granted once per quest per day on completion.
 */

export type QuestId = 'review-10' | 'practice-10' | 'new-5'

export interface QuestDef {
  id: QuestId
  /** How many counted events finish the quest. */
  target: number
  /** Bonus XP granted once when the quest completes. */
  xp: number
}

export const QUESTS: QuestDef[] = [
  { id: 'review-10', target: 10, xp: 30 },
  { id: 'practice-10', target: 10, xp: 20 },
  { id: 'new-5', target: 5, xp: 20 },
]

/** Per-day counted events feeding the quests. */
export interface QuestCounts {
  /** rateCard calls (any rating). */
  reviews: number
  /** recordPractice calls with correct === true. */
  practiceCorrect: number
  /** rateCard calls that introduced a brand-new card. */
  newCards: number
}

export const EMPTY_QUEST_COUNTS: QuestCounts = { reviews: 0, practiceCorrect: 0, newCards: 0 }

function countFor(counts: QuestCounts, id: QuestId): number {
  switch (id) {
    case 'review-10':
      return counts.reviews
    case 'practice-10':
      return counts.practiceCorrect
    case 'new-5':
      return counts.newCards
  }
}

export function questProgress(counts: QuestCounts, def: QuestDef): number {
  return Math.min(countFor(counts, def.id), def.target)
}

export function isQuestDone(counts: QuestCounts, def: QuestDef): boolean {
  return countFor(counts, def.id) >= def.target
}

/**
 * Fold one counted event into today's counters and report which quests
 * completed exactly because of this event (already-claimed ones excluded,
 * so the store can grant each bonus exactly once).
 */
export function applyQuestEvent(
  prev: QuestCounts | undefined,
  claimed: QuestId[],
  patch: Partial<QuestCounts>,
): { counts: QuestCounts; newlyDone: QuestId[] } {
  const counts: QuestCounts = {
    reviews: (prev?.reviews ?? 0) + (patch.reviews ?? 0),
    practiceCorrect: (prev?.practiceCorrect ?? 0) + (patch.practiceCorrect ?? 0),
    newCards: (prev?.newCards ?? 0) + (patch.newCards ?? 0),
  }
  const claimedSet = new Set<string>(claimed)
  const newlyDone = QUESTS.filter(
    (q) => !claimedSet.has(q.id) && isQuestDone(counts, q),
  ).map((q) => q.id)
  return { counts, newlyDone }
}

export function questBonus(ids: QuestId[]): number {
  return ids.reduce((sum, id) => sum + (QUESTS.find((q) => q.id === id)?.xp ?? 0), 0)
}
