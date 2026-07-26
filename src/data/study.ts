import { KANA_BY_ID, type KanaEntry } from './kana'
import { KANJI_BY_ID } from './kanji'
import { customVocabEntry, VOCAB } from './vocab'
import type { CustomVocabItem } from '../lib/vocabImport'

/** Combined id → entry lookup across everything studyable (kana + kanji + vocab). */
export const STUDY_BY_ID: Record<string, KanaEntry> = {
  ...KANA_BY_ID,
  ...KANJI_BY_ID,
  ...Object.fromEntries(VOCAB.map((e) => [e.id, e])),
}

/** Resolve any study id, including dynamic custom-vocabulary ids (vc-…). */
export function studyEntry(id: string, customVocab: CustomVocabItem[]): KanaEntry | undefined {
  const builtin = STUDY_BY_ID[id]
  if (builtin) return builtin
  if (id.startsWith('vc-')) {
    const item = customVocab.find((c) => `vc-${c.kana}` === id)
    if (item) return customVocabEntry(item)
  }
  return undefined
}
