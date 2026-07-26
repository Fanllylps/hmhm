export type Script = 'hiragana' | 'katakana' | 'kanji' | 'vocab'
export type KanaGroup = 'basic' | 'dakuten' | 'handakuten' | 'yoon' | 'kanji' | 'vocab'

export interface KanaEntry {
  id: string
  kana: string
  romaji: string
  /** Accepted alternative romaji spellings (lenient input mode / other readings). */
  alt: string[]
  script: Script
  group: KanaGroup
  /** Gojūon row key (e.g. 'a', 'kya') — or a topic key for kanji entries. */
  row: string
  /** English meaning — kanji and vocabulary entries only. */
  meaning?: string
  /** Indonesian meaning carried on the entry itself (custom vocabulary). */
  meaningId?: string
}

interface BaseDef {
  h: string
  romaji: string
  alt?: string[]
  group: KanaGroup
  row: string
}

/** Hiragana → Katakana: standard kana blocks are offset by 0x60. */
export const toKatakana = (s: string): string =>
  [...s].map((c) => String.fromCharCode(c.charCodeAt(0) + 0x60)).join('')

const b = (h: string, romaji: string, row: string, alt?: string[]): BaseDef => ({
  h,
  romaji,
  row,
  alt,
  group: 'basic',
})
const d = (h: string, romaji: string, row: string, alt?: string[]): BaseDef => ({
  h,
  romaji,
  row,
  alt,
  group: 'dakuten',
})
const p = (h: string, romaji: string, row: string, alt?: string[]): BaseDef => ({
  h,
  romaji,
  row,
  alt,
  group: 'handakuten',
})
const y = (h: string, romaji: string, row: string, alt?: string[]): BaseDef => ({
  h,
  romaji,
  row,
  alt,
  group: 'yoon',
})

const BASE: BaseDef[] = [
  // ---- Basic gojūon (46) ----
  b('あ', 'a', 'a'), b('い', 'i', 'a'), b('う', 'u', 'a'), b('え', 'e', 'a'), b('お', 'o', 'a'),
  b('か', 'ka', 'ka'), b('き', 'ki', 'ka'), b('く', 'ku', 'ka'), b('け', 'ke', 'ka'), b('こ', 'ko', 'ka'),
  b('さ', 'sa', 'sa'), b('し', 'shi', 'sa', ['si']), b('す', 'su', 'sa'), b('せ', 'se', 'sa'), b('そ', 'so', 'sa'),
  b('た', 'ta', 'ta'), b('ち', 'chi', 'ta', ['ti']), b('つ', 'tsu', 'ta', ['tu']), b('て', 'te', 'ta'), b('と', 'to', 'ta'),
  b('な', 'na', 'na'), b('に', 'ni', 'na'), b('ぬ', 'nu', 'na'), b('ね', 'ne', 'na'), b('の', 'no', 'na'),
  b('は', 'ha', 'ha'), b('ひ', 'hi', 'ha'), b('ふ', 'fu', 'ha', ['hu']), b('へ', 'he', 'ha'), b('ほ', 'ho', 'ha'),
  b('ま', 'ma', 'ma'), b('み', 'mi', 'ma'), b('む', 'mu', 'ma'), b('め', 'me', 'ma'), b('も', 'mo', 'ma'),
  b('や', 'ya', 'ya'), b('ゆ', 'yu', 'ya'), b('よ', 'yo', 'ya'),
  b('ら', 'ra', 'ra'), b('り', 'ri', 'ra'), b('る', 'ru', 'ra'), b('れ', 're', 'ra'), b('ろ', 'ro', 'ra'),
  b('わ', 'wa', 'wa'), b('を', 'wo', 'wa', ['o']), b('ん', 'n', 'wa', ['nn']),
  // ---- Dakuten (20) ----
  d('が', 'ga', 'ga'), d('ぎ', 'gi', 'ga'), d('ぐ', 'gu', 'ga'), d('げ', 'ge', 'ga'), d('ご', 'go', 'ga'),
  d('ざ', 'za', 'za'), d('じ', 'ji', 'za', ['zi']), d('ず', 'zu', 'za'), d('ぜ', 'ze', 'za'), d('ぞ', 'zo', 'za'),
  d('だ', 'da', 'da'), d('ぢ', 'ji', 'da', ['di', 'dji']), d('づ', 'zu', 'da', ['du', 'dzu']), d('で', 'de', 'da'), d('ど', 'do', 'da'),
  d('ば', 'ba', 'ba'), d('び', 'bi', 'ba'), d('ぶ', 'bu', 'ba'), d('べ', 'be', 'ba'), d('ぼ', 'bo', 'ba'),
  // ---- Handakuten (5) ----
  p('ぱ', 'pa', 'pa'), p('ぴ', 'pi', 'pa'), p('ぷ', 'pu', 'pa'), p('ぺ', 'pe', 'pa'), p('ぽ', 'po', 'pa'),
  // ---- Yōon (33) ----
  y('きゃ', 'kya', 'kya'), y('きゅ', 'kyu', 'kya'), y('きょ', 'kyo', 'kya'),
  y('しゃ', 'sha', 'sha', ['sya']), y('しゅ', 'shu', 'sha', ['syu']), y('しょ', 'sho', 'sha', ['syo']),
  y('ちゃ', 'cha', 'cha', ['tya', 'cya']), y('ちゅ', 'chu', 'cha', ['tyu', 'cyu']), y('ちょ', 'cho', 'cha', ['tyo', 'cyo']),
  y('にゃ', 'nya', 'nya'), y('にゅ', 'nyu', 'nya'), y('にょ', 'nyo', 'nya'),
  y('ひゃ', 'hya', 'hya'), y('ひゅ', 'hyu', 'hya'), y('ひょ', 'hyo', 'hya'),
  y('みゃ', 'mya', 'mya'), y('みゅ', 'myu', 'mya'), y('みょ', 'myo', 'mya'),
  y('りゃ', 'rya', 'rya'), y('りゅ', 'ryu', 'rya'), y('りょ', 'ryo', 'rya'),
  y('ぎゃ', 'gya', 'gya'), y('ぎゅ', 'gyu', 'gya'), y('ぎょ', 'gyo', 'gya'),
  y('じゃ', 'ja', 'ja', ['jya', 'zya']), y('じゅ', 'ju', 'ja', ['jyu', 'zyu']), y('じょ', 'jo', 'ja', ['jyo', 'zyo']),
  y('びゃ', 'bya', 'bya'), y('びゅ', 'byu', 'bya'), y('びょ', 'byo', 'bya'),
  y('ぴゃ', 'pya', 'pya'), y('ぴゅ', 'pyu', 'pya'), y('ぴょ', 'pyo', 'pya'),
]

export const KANA: KanaEntry[] = BASE.flatMap((def): KanaEntry[] => [
  {
    id: `h-${def.h}`,
    kana: def.h,
    romaji: def.romaji,
    alt: def.alt ?? [],
    script: 'hiragana',
    group: def.group,
    row: def.row,
  },
  {
    id: `k-${toKatakana(def.h)}`,
    kana: toKatakana(def.h),
    romaji: def.romaji,
    alt: def.alt ?? [],
    script: 'katakana',
    group: def.group,
    row: def.row,
  },
])

export const KANA_BY_ID: Record<string, KanaEntry> = Object.fromEntries(
  KANA.map((k) => [k.id, k]),
)

/**
 * Chart layout in traditional gojūon order (hiragana glyphs; convert with
 * toKatakana for the katakana chart). `null` marks empty grid slots.
 */
export const CHART_LAYOUT: Record<Exclude<KanaGroup, 'kanji' | 'vocab'>, (string | null)[][]> = {
  basic: [
    ['あ', 'い', 'う', 'え', 'お'],
    ['か', 'き', 'く', 'け', 'こ'],
    ['さ', 'し', 'す', 'せ', 'そ'],
    ['た', 'ち', 'つ', 'て', 'と'],
    ['な', 'に', 'ぬ', 'ね', 'の'],
    ['は', 'ひ', 'ふ', 'へ', 'ほ'],
    ['ま', 'み', 'む', 'め', 'も'],
    ['や', null, 'ゆ', null, 'よ'],
    ['ら', 'り', 'る', 'れ', 'ろ'],
    ['わ', null, null, null, 'を'],
    ['ん', null, null, null, null],
  ],
  dakuten: [
    ['が', 'ぎ', 'ぐ', 'げ', 'ご'],
    ['ざ', 'じ', 'ず', 'ぜ', 'ぞ'],
    ['だ', 'ぢ', 'づ', 'で', 'ど'],
    ['ば', 'び', 'ぶ', 'べ', 'ぼ'],
  ],
  handakuten: [['ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ']],
  yoon: [
    ['きゃ', 'きゅ', 'きょ'],
    ['しゃ', 'しゅ', 'しょ'],
    ['ちゃ', 'ちゅ', 'ちょ'],
    ['にゃ', 'にゅ', 'にょ'],
    ['ひゃ', 'ひゅ', 'ひょ'],
    ['みゃ', 'みゅ', 'みょ'],
    ['りゃ', 'りゅ', 'りょ'],
    ['ぎゃ', 'ぎゅ', 'ぎょ'],
    ['じゃ', 'じゅ', 'じょ'],
    ['びゃ', 'びゅ', 'びょ'],
    ['ぴゃ', 'ぴゅ', 'ぴょ'],
  ],
}
