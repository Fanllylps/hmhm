import { KANA, type KanaEntry } from '../data/kana'

export type RowScript = 'hiragana' | 'katakana' | 'both'
export type RowOrder = 'sequential' | 'random'
export type DistractorScope = 'row' | 'mixed'

export interface RowDef {
  key: string
  group: 'basic' | 'dakuten' | 'handakuten' | 'yoon'
  /** First kana of the row, used as the chip label. */
  sample: string
}

/** Gojūon order. KANA in data/kana.ts already follows this order. */
export const ROWS: RowDef[] = [
  { key: 'a', group: 'basic', sample: 'あ' },
  { key: 'ka', group: 'basic', sample: 'か' },
  { key: 'sa', group: 'basic', sample: 'さ' },
  { key: 'ta', group: 'basic', sample: 'た' },
  { key: 'na', group: 'basic', sample: 'な' },
  { key: 'ha', group: 'basic', sample: 'は' },
  { key: 'ma', group: 'basic', sample: 'ま' },
  { key: 'ya', group: 'basic', sample: 'や' },
  { key: 'ra', group: 'basic', sample: 'ら' },
  { key: 'wa', group: 'basic', sample: 'わ' },
  { key: 'ga', group: 'dakuten', sample: 'が' },
  { key: 'za', group: 'dakuten', sample: 'ざ' },
  { key: 'da', group: 'dakuten', sample: 'だ' },
  { key: 'ba', group: 'dakuten', sample: 'ば' },
  { key: 'pa', group: 'handakuten', sample: 'ぱ' },
  { key: 'kya', group: 'yoon', sample: 'きゃ' },
  { key: 'sha', group: 'yoon', sample: 'しゃ' },
  { key: 'cha', group: 'yoon', sample: 'ちゃ' },
  { key: 'nya', group: 'yoon', sample: 'にゃ' },
  { key: 'hya', group: 'yoon', sample: 'ひゃ' },
  { key: 'mya', group: 'yoon', sample: 'みゃ' },
  { key: 'rya', group: 'yoon', sample: 'りゃ' },
  { key: 'gya', group: 'yoon', sample: 'ぎゃ' },
  { key: 'ja', group: 'yoon', sample: 'じゃ' },
  { key: 'bya', group: 'yoon', sample: 'びゃ' },
  { key: 'pya', group: 'yoon', sample: 'ぴゃ' },
]

export const ALL_ROW_KEYS: string[] = ROWS.map((r) => r.key)

/** Entries for the chosen rows and script, in gojūon order. */
export function rowEntries(rowKeys: readonly string[], script: RowScript): KanaEntry[] {
  const wanted = new Set(rowKeys)
  return KANA.filter(
    (e) => wanted.has(e.row) && (script === 'both' || e.script === script),
  )
}

function shuffled<T>(arr: readonly T[]): T[] {
  const out = [...arr]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** Sequential keeps gojūon order; random shuffles. Never mutates the input. */
export function orderEntries(entries: readonly KanaEntry[], order: RowOrder): KanaEntry[] {
  return order === 'sequential' ? [...entries] : shuffled(entries)
}
