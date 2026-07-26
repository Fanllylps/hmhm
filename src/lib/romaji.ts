export interface RomajiTarget {
  romaji: string
  alt?: string[]
}

export function normalizeInput(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * Check a typed romaji answer against an entry. Lenient mode also accepts
 * the alternative spellings (si/shi, ti/chi, tu/tsu, hu/fu, jya/ja, …).
 */
export function matchesRomaji(input: string, target: RomajiTarget, lenient: boolean): boolean {
  const typed = normalizeInput(input)
  if (typed.length === 0) return false
  if (typed === target.romaji) return true
  if (!lenient) return false
  return (target.alt ?? []).includes(typed)
}
