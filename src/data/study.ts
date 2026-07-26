import { KANA_BY_ID } from './kana'
import { KANJI_BY_ID } from './kanji'

/** Combined id → entry lookup across everything studyable (kana + kanji). */
export const STUDY_BY_ID = { ...KANA_BY_ID, ...KANJI_BY_ID }
