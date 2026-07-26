import { useMemo } from 'react'
import { KANA, type KanaEntry } from '../data/kana'
import { activePool, useStore } from '../stores/store'

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/**
 * Pool for practice modes: prefer kana the user has already met in the SRS,
 * fall back to the full active pool while their deck is still tiny.
 */
export function usePracticePool(min = 8): KanaEntry[] {
  const settings = useStore((s) => s.settings)
  const cards = useStore((s) => s.cards)
  return useMemo(() => {
    const pool = activePool(settings)
    const seen = pool.filter((e) => cards[e.id] !== undefined)
    const chosen = seen.length >= min ? seen : pool
    return chosen.length > 0 ? chosen : KANA.filter((e) => e.script === 'hiragana' && e.group === 'basic')
  }, [settings, cards, min])
}

/**
 * Multiple-choice options: the correct entry plus distractors from the pool
 * with distinct romaji, shuffled.
 */
export function pickChoices(correct: KanaEntry, pool: KanaEntry[], count = 4): KanaEntry[] {
  // Dedupe across primary AND alt spellings so sound-alikes never share a
  // round (を "wo"/alt "o" vs お "o" would make Listening rounds unwinnable).
  const spellings = (entry: KanaEntry) => [entry.romaji, ...entry.alt]
  const seen = new Set(spellings(correct))
  const distractors: KanaEntry[] = []
  const conflicts = (entry: KanaEntry) => spellings(entry).some((r) => seen.has(r))
  const add = (entry: KanaEntry) => {
    for (const r of spellings(entry)) seen.add(r)
    distractors.push(entry)
  }
  for (const entry of shuffle(pool)) {
    if (distractors.length >= count - 1) break
    if (entry.id === correct.id || conflicts(entry)) continue
    if (entry.script !== correct.script) continue
    add(entry)
  }
  // Tiny pools (e.g. only yōon rows) may need cross-script fillers.
  if (distractors.length < count - 1) {
    for (const entry of shuffle(pool)) {
      if (distractors.length >= count - 1) break
      if (entry.id === correct.id || conflicts(entry)) continue
      add(entry)
    }
  }
  return shuffle([correct, ...distractors])
}
