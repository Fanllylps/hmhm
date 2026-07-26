import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { customVocabEntry, VOCAB, VOCAB_CATEGORIES } from '../data/vocab'
import type { KanaEntry } from '../data/kana'
import { speak } from '../lib/audio'
import { meaningFor, useLang } from '../lib/i18n'
import { maturityOf, type Maturity } from '../lib/srs'
import { parseVocabImport } from '../lib/vocabImport'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Vocabulary',
  subtitle: 'Everyday words — browse, listen, memorize',
  learnToggle: 'Learn in Review',
  learnDesc: 'Adds these words to your daily SRS queue as new cards.',
  stats: (total: number, started: number, mastered: number) =>
    `${total} words · ${started} started · ${mastered} mastered`,
  categories: {
    greetings: 'Greetings & expressions',
    verbs: 'Verbs',
    adjectives: 'Adjectives',
    time: 'Time',
    questions: 'Question words',
    food: 'Food & drink',
    daily: 'Daily life',
    custom: 'My words',
  } as Record<string, string>,
  aiTitle: 'Add words with AI',
  aiDesc:
    'Copy the prompt, send it to any AI (ChatGPT, Claude, Gemini…), then paste its JSON reply below. New words join this deck — and Review, if learning is on.',
  copyPrompt: 'Copy AI prompt',
  copied: 'Copied! Paste it into your AI of choice.',
  pasteLabel: 'Paste the AI reply here',
  pastePlaceholder: '[{"kana":"ねむい","romaji":"nemui","en":"sleepy","id":"mengantuk"}]',
  addBtn: 'Add words',
  added: (n: number, skipped: number) =>
    `${n} word${n === 1 ? '' : 's'} added${skipped > 0 ? ` · ${skipped} skipped (duplicate/invalid)` : ''}`,
  errNoArray: 'No JSON list found — paste the AI reply that contains [ … ].',
  errInvalid: 'That JSON is broken — copy the AI reply again, complete from [ to ].',
  errEmpty: 'No valid words in that reply — check the format and try again.',
  myWords: (n: number) => `My words (${n})`,
  removeAria: (kana: string) => `Remove ${kana}`,
  emptyCustom: 'Nothing here yet — try the AI prompt above!',
  promptText: `Create 15 everyday Japanese vocabulary words about DAILY LIFE (change the topic and amount as you like).
Reply ONLY with a valid JSON array, no explanations, no markdown, in exactly this format:
[{"kana":"ことば","romaji":"kotoba","en":"word","id":"kata","category":"daily"}]
Rules: "kana" = the word in hiragana/katakana (common kanji allowed), "romaji" = lowercase Hepburn reading, "en" = short English meaning, "id" = short Indonesian meaning, "category" = one lowercase topic word. Skip ultra-basic words like ねこ, いぬ, みず.`,
}

const ID: typeof EN = {
  title: 'Kosakata',
  subtitle: 'Kata sehari-hari — jelajahi, dengarkan, hafalkan',
  learnToggle: 'Pelajari di Review',
  learnDesc: 'Menambahkan kata-kata ini ke antrean SRS harianmu sebagai kartu baru.',
  stats: (total: number, started: number, mastered: number) =>
    `${total} kata · ${started} dimulai · ${mastered} dikuasai`,
  categories: {
    greetings: 'Salam & ungkapan',
    verbs: 'Kata kerja',
    adjectives: 'Kata sifat',
    time: 'Waktu',
    questions: 'Kata tanya',
    food: 'Makanan & minuman',
    daily: 'Kehidupan sehari-hari',
    custom: 'Kosakataku',
  } as Record<string, string>,
  aiTitle: 'Tambah kata lewat AI',
  aiDesc:
    'Salin prompt-nya, kirim ke AI mana pun (ChatGPT, Claude, Gemini…), lalu tempel balasan JSON-nya di bawah. Kata baru masuk ke deck ini — dan ke Review kalau belajarnya aktif.',
  copyPrompt: 'Salin prompt AI',
  copied: 'Tersalin! Tempelkan ke AI favoritmu.',
  pasteLabel: 'Tempel balasan AI di sini',
  pastePlaceholder: '[{"kana":"ねむい","romaji":"nemui","en":"sleepy","id":"mengantuk"}]',
  addBtn: 'Tambahkan kata',
  added: (n: number, skipped: number) =>
    `${n} kata ditambahkan${skipped > 0 ? ` · ${skipped} dilewati (duplikat/tidak valid)` : ''}`,
  errNoArray: 'Tidak menemukan daftar JSON — tempel balasan AI yang berisi [ … ].',
  errInvalid: 'JSON-nya rusak — salin ulang balasan AI, lengkap dari [ sampai ].',
  errEmpty: 'Tidak ada kata valid di balasan itu — cek formatnya lalu coba lagi.',
  myWords: (n: number) => `Kosakataku (${n})`,
  removeAria: (kana: string) => `Hapus ${kana}`,
  emptyCustom: 'Belum ada apa-apa — coba prompt AI di atas!',
  promptText: `Buatkan 15 kosakata bahasa Jepang sehari-hari bertema KEHIDUPAN SEHARI-HARI (ganti tema dan jumlahnya sesukamu).
Balas HANYA dengan JSON array yang valid, tanpa penjelasan, tanpa markdown, persis dengan format ini:
[{"kana":"ことば","romaji":"kotoba","en":"word","id":"kata","category":"daily"}]
Aturan: "kana" = kata dalam hiragana/katakana (kanji umum boleh), "romaji" = cara baca Hepburn huruf kecil, "en" = arti bahasa Inggris singkat, "id" = arti bahasa Indonesia singkat, "category" = satu kata tema huruf kecil. Jangan pakai kata yang terlalu dasar seperti ねこ, いぬ, みず.`,
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const DOT: Record<Maturity, string> = {
  new: 'bg-hairline',
  learning: 'bg-vermilion/60',
  young: 'bg-matcha/50',
  mature: 'bg-matcha',
}

function VocabRow({
  entry,
  onRemove,
}: {
  entry: KanaEntry
  onRemove?: () => void
}) {
  const lang = useLang()
  const t = STR[lang]
  const card = useStore((s) => s.cards[entry.id])
  const audio = useStore((s) => s.settings.audio)
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span
        aria-hidden
        className={`h-2 w-2 shrink-0 rounded-full ${DOT[maturityOf(card)]}`}
      />
      <button
        onClick={() => speak(entry.kana, audio)}
        className="flex min-w-0 flex-1 items-baseline gap-3 text-left"
      >
        <span className="shrink-0 font-kana text-xl leading-tight">{entry.kana}</span>
        <span className="shrink-0 text-sm text-muted">{entry.romaji}</span>
        <span className="min-w-0 flex-1 truncate text-right text-sm text-muted">
          {meaningFor(entry, lang)}
        </span>
      </button>
      {onRemove && (
        <button
          onClick={onRemove}
          aria-label={t.removeAria(entry.kana)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-washi hover:text-vermilion"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function VocabPage() {
  const lang = useLang()
  const t = STR[lang]
  const groups = useStore((s) => s.settings.groups)
  const updateSettings = useStore((s) => s.updateSettings)
  const customVocab = useStore((s) => s.customVocab)
  const cards = useStore((s) => s.cards)
  const addCustomVocab = useStore((s) => s.addCustomVocab)
  const removeCustomVocab = useStore((s) => s.removeCustomVocab)

  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const customEntries = useMemo(() => customVocab.map(customVocabEntry), [customVocab])
  const all = useMemo(() => [...VOCAB, ...customEntries], [customEntries])

  const started = all.filter((e) => cards[e.id] !== undefined).length
  const mastered = all.filter((e) => maturityOf(cards[e.id]) === 'mature').length

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(t.promptText)
    } catch {
      // Clipboard API can be blocked — fall back to a prompt-select textarea.
      const ta = document.createElement('textarea')
      ta.value = t.promptText
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleAdd = () => {
    try {
      const { items, invalid } = parseVocabImport(paste)
      const [added, skippedDupes] = addCustomVocab(items)
      setMsg({ tone: added > 0 ? 'success' : 'error', text: t.added(added, invalid + skippedDupes) })
      if (added > 0) setPaste('')
    } catch (e) {
      const code = e instanceof Error ? e.message : 'invalid-json'
      setMsg({
        tone: 'error',
        text: code === 'no-array' ? t.errNoArray : code === 'empty' ? t.errEmpty : t.errInvalid,
      })
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.title} jp="語彙" subtitle={t.subtitle} backTo="/" />

      {/* Learn-in-review toggle */}
      <div className="mb-4 flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-surface px-5 py-4 shadow-soft">
        <div>
          <div className="font-medium">{t.learnToggle}</div>
          <div className="mt-0.5 text-sm text-muted">{t.learnDesc}</div>
          <div className="mt-1.5 text-xs text-muted">{t.stats(all.length, started, mastered)}</div>
        </div>
        <motion.button
          role="switch"
          aria-checked={groups.vocab}
          aria-label={t.learnToggle}
          whileTap={{ scale: 0.94 }}
          onClick={() => updateSettings({ groups: { ...groups, vocab: !groups.vocab } })}
          className="flex h-11 w-12 shrink-0 items-center justify-center"
        >
          <span
            className={`flex h-[26px] w-12 items-center rounded-full p-[3px] transition-colors duration-200 ${
              groups.vocab ? 'justify-end bg-sumi' : 'justify-start bg-hairline'
            }`}
          >
            <motion.span
              layout
              transition={{ type: 'spring', stiffness: 550, damping: 34 }}
              className="h-5 w-5 rounded-full bg-surface shadow-soft"
            />
          </span>
        </motion.button>
      </div>

      {/* AI import */}
      <section className="mb-6 rounded-2xl border border-hairline bg-surface p-5 shadow-soft">
        <h2 className="flex items-baseline gap-2 font-semibold">
          {t.aiTitle}
          <span aria-hidden className="font-kana text-sm text-muted">
            AI
          </span>
        </h2>
        <p className="mt-1 text-sm text-muted">{t.aiDesc}</p>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={copyPrompt}
          className="mt-4 w-full rounded-2xl bg-sumi py-3 text-sm font-medium text-surface"
        >
          {copied ? t.copied : t.copyPrompt}
        </motion.button>
        <label className="mt-4 block text-sm font-medium">
          {t.pasteLabel}
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder={t.pastePlaceholder}
            spellCheck={false}
            className="mt-2 w-full rounded-xl border border-hairline bg-washi p-3 font-mono text-xs leading-relaxed placeholder:text-muted/50 focus:border-muted/50"
          />
        </label>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleAdd}
          disabled={paste.trim().length === 0}
          className="mt-2 w-full rounded-2xl bg-vermilion py-3 text-sm font-medium text-surface disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.addBtn}
        </motion.button>
        <AnimatePresence>
          {msg && (
            <motion.p
              key={msg.text}
              role="status"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`mt-3 text-sm font-medium ${
                msg.tone === 'success' ? 'text-matcha' : 'text-vermilion'
              }`}
            >
              {msg.text}
            </motion.p>
          )}
        </AnimatePresence>
      </section>

      {/* Custom words */}
      {customEntries.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t.myWords(customEntries.length)}
          </h2>
          <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-soft">
            {customEntries.map((e) => (
              <VocabRow key={e.id} entry={e} onRemove={() => removeCustomVocab(e.kana)} />
            ))}
          </div>
        </section>
      )}

      {/* Built-in deck by category */}
      {VOCAB_CATEGORIES.map((cat) => {
        const entries = VOCAB.filter((e) => e.row === cat)
        if (entries.length === 0) return null
        return (
          <section key={cat} className="mb-6">
            <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {t.categories[cat] ?? cat}
            </h2>
            <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-soft">
              {entries.map((e) => (
                <VocabRow key={e.id} entry={e} />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
