import { describe, expect, it } from 'vitest'
import {
  EMPTY_QUEST_COUNTS,
  QUESTS,
  applyQuestEvent,
  isQuestDone,
  questBonus,
  questProgress,
} from './quests'

describe('questProgress', () => {
  it('caps at the target', () => {
    const def = QUESTS[0] // review-10
    expect(questProgress({ ...EMPTY_QUEST_COUNTS, reviews: 4 }, def)).toBe(4)
    expect(questProgress({ ...EMPTY_QUEST_COUNTS, reviews: 99 }, def)).toBe(10)
  })

  it('maps each quest to its own counter', () => {
    const counts = { reviews: 10, practiceCorrect: 3, newCards: 5 }
    expect(isQuestDone(counts, QUESTS[0])).toBe(true)
    expect(isQuestDone(counts, QUESTS[1])).toBe(false)
    expect(isQuestDone(counts, QUESTS[2])).toBe(true)
  })
})

describe('applyQuestEvent', () => {
  it('starts from empty when there is no entry yet', () => {
    const { counts, newlyDone } = applyQuestEvent(undefined, [], { reviews: 1 })
    expect(counts).toEqual({ reviews: 1, practiceCorrect: 0, newCards: 0 })
    expect(newlyDone).toEqual([])
  })

  it('reports a quest exactly once at completion', () => {
    const nine = { ...EMPTY_QUEST_COUNTS, reviews: 9 }
    const first = applyQuestEvent(nine, [], { reviews: 1 })
    expect(first.newlyDone).toEqual(['review-10'])
    const second = applyQuestEvent(first.counts, ['review-10'], { reviews: 1 })
    expect(second.newlyDone).toEqual([])
  })

  it('can complete several quests with one event', () => {
    const almost = { reviews: 9, practiceCorrect: 9, newCards: 4 }
    const { newlyDone } = applyQuestEvent(almost, [], {
      reviews: 1,
      practiceCorrect: 1,
      newCards: 1,
    })
    expect(newlyDone).toEqual(['review-10', 'practice-10', 'new-5'])
  })
})

describe('questBonus', () => {
  it('sums the XP of the given quests', () => {
    expect(questBonus(['review-10', 'practice-10', 'new-5'])).toBe(70)
    expect(questBonus([])).toBe(0)
  })
})
