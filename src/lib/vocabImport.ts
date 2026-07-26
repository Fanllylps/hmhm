/**
 * Parser for AI-generated vocabulary. The user copies a ready-made prompt,
 * sends it to any AI, and pastes the JSON reply here — so this parser is
 * deliberately forgiving about the noise AIs add around their JSON.
 */

export interface CustomVocabItem {
  kana: string
  romaji: string
  alt: string[]
  /** English meaning. */
  en: string
  /** Indonesian meaning. */
  idn: string
  category: string
}

const MAX_ITEMS = 200
const MAX_LEN = 60

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= MAX_LEN ? v.trim() : null

/** Strip markdown fences / prose and find the JSON array an AI replied with. */
function extractJsonArray(text: string): string {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  const start = cleaned.indexOf('[')
  const end = cleaned.lastIndexOf(']')
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('no-array')
  }
  return cleaned.slice(start, end + 1)
}

/**
 * Parse pasted AI output into vocabulary items. Throws Error('no-array' |
 * 'invalid-json' | 'empty') for the UI to translate; silently skips rows
 * that don't match the schema (returned separately for reporting).
 */
export function parseVocabImport(text: string): { items: CustomVocabItem[]; invalid: number } {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJsonArray(text))
  } catch (e) {
    if (e instanceof Error && e.message === 'no-array') throw e
    throw new Error('invalid-json')
  }
  if (!Array.isArray(parsed)) throw new Error('no-array')

  const items: CustomVocabItem[] = []
  let invalid = 0
  const seen = new Set<string>()
  for (const row of parsed.slice(0, MAX_ITEMS)) {
    if (!isRecord(row)) {
      invalid += 1
      continue
    }
    const kana = str(row.kana)
    const romaji = str(row.romaji)?.toLowerCase() ?? null
    const en = str(row.en)
    const idn = str(row.id) ?? str(row.idn)
    if (!kana || !romaji || !en || !idn || seen.has(kana)) {
      invalid += 1
      continue
    }
    seen.add(kana)
    const alt = Array.isArray(row.alt)
      ? row.alt
          .map((a) => (typeof a === 'string' ? a.trim().toLowerCase() : ''))
          .filter((a) => a.length > 0 && a.length <= MAX_LEN)
          .slice(0, 6)
      : []
    items.push({
      kana,
      romaji,
      alt,
      en,
      idn,
      category: str(row.category) ?? 'custom',
    })
  }
  if (items.length === 0) throw new Error('empty')
  return { items, invalid }
}
