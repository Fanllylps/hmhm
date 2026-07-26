import type { KanaEntry } from './kana'
import type { CustomVocabItem } from '../lib/vocabImport'

/**
 * Built-in everyday vocabulary deck: common words and expressions used daily.
 * Each entry carries its Indonesian meaning inline (meaningId), so the deck is
 * fully bilingual without the separate MEANING_ID map.
 */

const v = (kana: string, romaji: string, en: string, idn: string, cat: string): KanaEntry => ({
  id: `v-${kana}`,
  kana,
  romaji,
  alt: [],
  script: 'vocab',
  group: 'vocab',
  row: cat,
  meaning: en,
  meaningId: idn,
})

export const VOCAB: KanaEntry[] = [
  // ---- Greetings & expressions ----
  v('こんにちは', 'konnichiwa', 'hello', 'halo', 'greetings'),
  v('こんばんは', 'konbanwa', 'good evening', 'selamat malam', 'greetings'),
  v('おやすみなさい', 'oyasuminasai', 'good night', 'selamat tidur', 'greetings'),
  v('すみません', 'sumimasen', 'excuse me · sorry', 'permisi · maaf', 'greetings'),
  v('ごめんなさい', 'gomennasai', "I'm sorry", 'maaf', 'greetings'),
  v('おねがいします', 'onegaishimasu', 'please', 'tolong · mohon', 'greetings'),
  v('はい', 'hai', 'yes', 'ya', 'greetings'),
  v('いいえ', 'iie', 'no', 'tidak', 'greetings'),
  v('だいじょうぶ', 'daijoubu', "it's okay", 'tidak apa-apa', 'greetings'),
  v('いただきます', 'itadakimasu', 'said before eating', 'ucapan sebelum makan', 'greetings'),
  v('ごちそうさま', 'gochisousama', 'said after eating', 'ucapan setelah makan', 'greetings'),
  v('ようこそ', 'youkoso', 'welcome', 'selamat datang', 'greetings'),
  v('じゃあね', 'jaane', 'see you', 'sampai jumpa', 'greetings'),
  v('がんばって', 'ganbatte', 'good luck!', 'semangat!', 'greetings'),
  // ---- Verbs ----
  v('たべる', 'taberu', 'to eat', 'makan', 'verbs'),
  v('のむ', 'nomu', 'to drink', 'minum', 'verbs'),
  v('いく', 'iku', 'to go', 'pergi', 'verbs'),
  v('くる', 'kuru', 'to come', 'datang', 'verbs'),
  v('かえる', 'kaeru', 'to go home', 'pulang', 'verbs'),
  v('みる', 'miru', 'to see · watch', 'melihat · menonton', 'verbs'),
  v('きく', 'kiku', 'to listen · ask', 'mendengar · bertanya', 'verbs'),
  v('はなす', 'hanasu', 'to speak', 'berbicara', 'verbs'),
  v('よむ', 'yomu', 'to read', 'membaca', 'verbs'),
  v('かく', 'kaku', 'to write', 'menulis', 'verbs'),
  v('かう', 'kau', 'to buy', 'membeli', 'verbs'),
  v('ねる', 'neru', 'to sleep', 'tidur', 'verbs'),
  v('おきる', 'okiru', 'to wake up', 'bangun', 'verbs'),
  v('はたらく', 'hataraku', 'to work', 'bekerja', 'verbs'),
  v('べんきょうする', 'benkyousuru', 'to study', 'belajar', 'verbs'),
  v('あるく', 'aruku', 'to walk', 'berjalan', 'verbs'),
  v('はしる', 'hashiru', 'to run', 'berlari', 'verbs'),
  v('わかる', 'wakaru', 'to understand', 'mengerti', 'verbs'),
  // ---- Adjectives ----
  v('いい', 'ii', 'good', 'bagus · baik', 'adjectives'),
  v('わるい', 'warui', 'bad', 'buruk', 'adjectives'),
  v('あつい', 'atsui', 'hot', 'panas', 'adjectives'),
  v('さむい', 'samui', 'cold (weather)', 'dingin', 'adjectives'),
  v('あたたかい', 'atatakai', 'warm', 'hangat', 'adjectives'),
  v('すずしい', 'suzushii', 'cool (weather)', 'sejuk', 'adjectives'),
  v('いそがしい', 'isogashii', 'busy', 'sibuk', 'adjectives'),
  v('ひま', 'hima', 'free (time)', 'senggang', 'adjectives'),
  v('はやい', 'hayai', 'fast · early', 'cepat · awal', 'adjectives'),
  v('おそい', 'osoi', 'slow · late', 'lambat · terlambat', 'adjectives'),
  v('むずかしい', 'muzukashii', 'difficult', 'sulit', 'adjectives'),
  v('かんたん', 'kantan', 'easy · simple', 'mudah', 'adjectives'),
  // ---- Time ----
  v('いま', 'ima', 'now', 'sekarang', 'time'),
  v('まいにち', 'mainichi', 'every day', 'setiap hari', 'time'),
  v('けさ', 'kesa', 'this morning', 'tadi pagi', 'time'),
  v('こんばん', 'konban', 'tonight', 'malam ini', 'time'),
  v('らいしゅう', 'raishuu', 'next week', 'minggu depan', 'time'),
  v('せんしゅう', 'senshuu', 'last week', 'minggu lalu', 'time'),
  v('ことし', 'kotoshi', 'this year', 'tahun ini', 'time'),
  v('とき', 'toki', 'time · moment', 'waktu · saat', 'time'),
  v('いつ', 'itsu', 'when?', 'kapan', 'time'),
  v('いつも', 'itsumo', 'always', 'selalu', 'time'),
  // ---- Question words ----
  v('なに', 'nani', 'what', 'apa', 'questions'),
  v('だれ', 'dare', 'who', 'siapa', 'questions'),
  v('どこ', 'doko', 'where', 'di mana', 'questions'),
  v('どうして', 'doushite', 'why', 'kenapa', 'questions'),
  v('どう', 'dou', 'how', 'bagaimana', 'questions'),
  v('いくら', 'ikura', 'how much', 'berapa (harga)', 'questions'),
  v('どれ', 'dore', 'which one', 'yang mana', 'questions'),
  v('なんじ', 'nanji', 'what time', 'jam berapa', 'questions'),
  // ---- Food & drink ----
  v('ぎゅうにゅう', 'gyuunyuu', 'milk', 'susu', 'food'),
  v('おにぎり', 'onigiri', 'rice ball', 'onigiri', 'food'),
  v('べんとう', 'bentou', 'lunch box', 'bekal', 'food'),
  v('おかし', 'okashi', 'snacks · sweets', 'camilan', 'food'),
  v('くすり', 'kusuri', 'medicine', 'obat', 'food'),
  v('あさごはん', 'asagohan', 'breakfast', 'sarapan', 'food'),
  v('ひるごはん', 'hirugohan', 'lunch', 'makan siang', 'food'),
  v('ばんごはん', 'bangohan', 'dinner', 'makan malam', 'food'),
  v('おさけ', 'osake', 'sake · alcohol', 'sake · minuman beralkohol', 'food'),
  v('おみず', 'omizu', 'water (polite)', 'air (sopan)', 'food'),
  // ---- Daily life ----
  v('わたし', 'watashi', 'I · me', 'saya', 'daily'),
  v('あなた', 'anata', 'you', 'kamu', 'daily'),
  v('せんぱい', 'senpai', 'senior', 'senior', 'daily'),
  v('しごと', 'shigoto', 'work · job', 'pekerjaan', 'daily'),
  v('やすみ', 'yasumi', 'holiday · day off', 'libur', 'daily'),
  v('かいもの', 'kaimono', 'shopping', 'belanja', 'daily'),
  v('りょこう', 'ryokou', 'travel · trip', 'jalan-jalan · wisata', 'daily'),
  v('しゅくだい', 'shukudai', 'homework', 'PR', 'daily'),
  v('てんき', 'tenki', 'weather', 'cuaca', 'daily'),
  v('きょうしつ', 'kyoushitsu', 'classroom', 'ruang kelas', 'daily'),
]

/** A custom vocabulary item shaped like a study entry. */
export function customVocabEntry(item: CustomVocabItem): KanaEntry {
  return {
    id: `vc-${item.kana}`,
    kana: item.kana,
    romaji: item.romaji,
    alt: item.alt,
    script: 'vocab',
    group: 'vocab',
    row: item.category,
    meaning: item.en,
    meaningId: item.idn,
  }
}

/** Category order for the vocabulary browser. */
export const VOCAB_CATEGORIES = [
  'greetings',
  'verbs',
  'adjectives',
  'time',
  'questions',
  'food',
  'daily',
] as const
