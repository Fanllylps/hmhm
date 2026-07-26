/**
 * Shared loader for KanjiVG stroke data (served locally from /strokes).
 * Data © Ulrich Apel / KanjiVG, CC BY-SA 3.0 — http://kanjivg.tagaini.net
 */

const cache = new Map<string, string[]>()

export function strokeFileFor(char: string): string {
  return `/strokes/${char.codePointAt(0)!.toString(16).padStart(5, '0')}.svg`
}

function parseStrokes(svgText: string): string[] {
  const doc = new DOMParser().parseFromString(svgText, 'image/svg+xml')
  return [...doc.querySelectorAll('path')]
    .map((p) => p.getAttribute('d'))
    .filter((d): d is string => d !== null)
}

/** Fetch and parse the stroke paths (in stroke order) for one glyph. */
export async function loadStrokes(char: string): Promise<string[]> {
  const cached = cache.get(char)
  if (cached) return cached
  const res = await fetch(strokeFileFor(char))
  if (!res.ok) throw new Error(`stroke data ${res.status}`)
  const parsed = parseStrokes(await res.text())
  if (parsed.length === 0) throw new Error('no strokes')
  cache.set(char, parsed)
  return parsed
}
