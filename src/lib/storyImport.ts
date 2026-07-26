import type { Story, StorySentence } from '../data/stories'

/**
 * Parser for AI-generated stories, as forgiving as the vocabulary importer:
 * accepts a single story object or an array of them, fenced or surrounded by
 * prose. Throws 'no-json' | 'invalid-json' | 'empty' for the UI to translate.
 */

const MAX_STORIES = 20
const MAX_SENTENCES = 40
const MAX_LEN = 200

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

const str = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 && v.trim().length <= MAX_LEN ? v.trim() : null

function extractJson(text: string): string {
  const cleaned = text.replace(/```(?:json)?/gi, '').trim()
  // Prefer an array; fall back to a single object.
  const aStart = cleaned.indexOf('[')
  const aEnd = cleaned.lastIndexOf(']')
  const oStart = cleaned.indexOf('{')
  const oEnd = cleaned.lastIndexOf('}')
  if (aStart !== -1 && aEnd > aStart && (oStart === -1 || aStart < oStart)) {
    return cleaned.slice(aStart, aEnd + 1)
  }
  if (oStart !== -1 && oEnd > oStart) return cleaned.slice(oStart, oEnd + 1)
  throw new Error('no-json')
}

function parseSentence(row: unknown): StorySentence | null {
  if (!isRecord(row)) return null
  const jp = str(row.jp) ?? str(row.kana)
  const en = str(row.en)
  const idn = str(row.id) ?? str(row.idn)
  if (!jp || !en || !idn) return null
  return { jp, romaji: str(row.romaji) ?? '', en, idn }
}

function parseStory(row: unknown): Omit<Story, 'id'> | null {
  if (!isRecord(row)) return null
  const title = str(row.title)
  if (!title || !Array.isArray(row.sentences)) return null
  const sentences = row.sentences
    .slice(0, MAX_SENTENCES)
    .map(parseSentence)
    .filter((sen): sen is StorySentence => sen !== null)
  if (sentences.length === 0) return null
  return {
    title,
    titleEn: str(row.titleEn) ?? title,
    titleId: str(row.titleId) ?? str(row.titleIdn) ?? title,
    level: row.level === 'medium' ? 'medium' : 'easy',
    sentences,
  }
}

export function parseStoryImport(text: string): { stories: Omit<Story, 'id'>[]; invalid: number } {
  let parsed: unknown
  try {
    parsed = JSON.parse(extractJson(text))
  } catch (e) {
    if (e instanceof Error && e.message === 'no-json') throw e
    throw new Error('invalid-json')
  }
  const rows = Array.isArray(parsed) ? parsed : [parsed]
  const stories: Omit<Story, 'id'>[] = []
  let invalid = 0
  for (const row of rows.slice(0, MAX_STORIES)) {
    const story = parseStory(row)
    if (story) stories.push(story)
    else invalid += 1
  }
  if (stories.length === 0) throw new Error('empty')
  return { stories, invalid }
}
