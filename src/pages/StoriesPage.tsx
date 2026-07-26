import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { STORIES, type Story } from '../data/stories'
import { speak } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { parseStoryImport } from '../lib/storyImport'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Stories',
  subtitle: 'Short reads in kana — tap a line to hear it and reveal its meaning',
  levels: { easy: 'easy', medium: 'medium' } as Record<Story['level'], string>,
  sentences: (n: number) => `${n} lines`,
  myStories: (n: number) => `My stories (${n})`,
  builtIn: 'Starter stories',
  removeAria: (title: string) => `Remove ${title}`,
  aiTitle: 'New stories with AI',
  aiDesc:
    'Copy the prompt, send it to any AI, then paste its JSON reply here. Ask for any topic or level you like.',
  copyPrompt: 'Copy AI prompt',
  copied: 'Copied! Paste it into your AI of choice.',
  pasteLabel: 'Paste the AI reply here',
  addBtn: 'Add stories',
  added: (n: number, skipped: number) =>
    `${n} stor${n === 1 ? 'y' : 'ies'} added${skipped > 0 ? ` · ${skipped} skipped` : ''}`,
  errNoJson: 'No JSON found — paste the AI reply that contains { … } or [ … ].',
  errInvalid: 'That JSON is broken — copy the AI reply again, complete from start to end.',
  errEmpty: 'No valid story in that reply — check the format and try again.',
  reader: {
    romaji: 'Romaji',
    showAll: 'Show all meanings',
    hideAll: 'Hide all meanings',
    tapHint: 'Tap a line to hear it and see its meaning',
  },
  promptText: `Write 2 very short Japanese stories for a beginner (JLPT N5), about DAILY LIFE (change topic, amount and difficulty as you like).
Reply ONLY with a valid JSON array, no explanations, no markdown, exactly in this format:
[{"title":"ねこの ゆめ","titleEn":"A Cat's Dream","titleId":"Mimpi Kucing","level":"easy","sentences":[{"jp":"ねこが ねます。","romaji":"neko ga nemasu","en":"The cat sleeps.","id":"Kucing itu tidur."}]}]
Rules: sentences in hiragana/katakana with spaces between words (very common kanji allowed), 5-8 short sentences per story, "romaji" = lowercase Hepburn, "en" = English translation, "id" = Indonesian translation, "level" = "easy" or "medium".`,
}

const ID: typeof EN = {
  title: 'Cerita',
  subtitle: 'Bacaan pendek dalam kana — ketuk baris untuk mendengar dan melihat artinya',
  levels: { easy: 'mudah', medium: 'sedang' },
  sentences: (n: number) => `${n} baris`,
  myStories: (n: number) => `Ceritaku (${n})`,
  builtIn: 'Cerita bawaan',
  removeAria: (title: string) => `Hapus ${title}`,
  aiTitle: 'Cerita baru lewat AI',
  aiDesc:
    'Salin prompt-nya, kirim ke AI mana pun, lalu tempel balasan JSON-nya di sini. Minta tema atau level apa pun sesukamu.',
  copyPrompt: 'Salin prompt AI',
  copied: 'Tersalin! Tempelkan ke AI favoritmu.',
  pasteLabel: 'Tempel balasan AI di sini',
  addBtn: 'Tambahkan cerita',
  added: (n: number, skipped: number) =>
    `${n} cerita ditambahkan${skipped > 0 ? ` · ${skipped} dilewati` : ''}`,
  errNoJson: 'Tidak menemukan JSON — tempel balasan AI yang berisi { … } atau [ … ].',
  errInvalid: 'JSON-nya rusak — salin ulang balasan AI dari awal sampai akhir.',
  errEmpty: 'Tidak ada cerita valid di balasan itu — cek formatnya lalu coba lagi.',
  reader: {
    romaji: 'Romaji',
    showAll: 'Tampilkan semua arti',
    hideAll: 'Sembunyikan semua arti',
    tapHint: 'Ketuk sebuah baris untuk mendengar dan melihat artinya',
  },
  promptText: `Buatkan 2 cerita bahasa Jepang sangat pendek untuk pemula (JLPT N5), bertema KEHIDUPAN SEHARI-HARI (ganti tema, jumlah, dan tingkat kesulitan sesukamu).
Balas HANYA dengan JSON array yang valid, tanpa penjelasan, tanpa markdown, persis dengan format ini:
[{"title":"ねこの ゆめ","titleEn":"A Cat's Dream","titleId":"Mimpi Kucing","level":"easy","sentences":[{"jp":"ねこが ねます。","romaji":"neko ga nemasu","en":"The cat sleeps.","id":"Kucing itu tidur."}]}]
Aturan: kalimat dalam hiragana/katakana dengan spasi antarkata (kanji yang sangat umum boleh), 5-8 kalimat pendek per cerita, "romaji" = Hepburn huruf kecil, "en" = terjemahan Inggris, "id" = terjemahan Indonesia, "level" = "easy" atau "medium".`,
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

function localTitle(story: Story, lang: Lang): string {
  return lang === 'id' ? story.titleId : story.titleEn
}

function Reader({ story, onBack }: { story: Story; onBack: () => void }) {
  const lang = useLang()
  const t = STR[lang]
  const audio = useStore((s) => s.settings.audio)
  const [open, setOpen] = useState<Set<number>>(new Set())
  const [showRomaji, setShowRomaji] = useState(false)
  const [allOpen, setAllOpen] = useState(false)

  const toggle = (i: number) => {
    speak(story.sentences[i].jp, audio)
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-xl">
      <button
        onClick={onBack}
        className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-sumi"
      >
        <span aria-hidden>←</span> {t.title}
      </button>
      <div className="mb-5">
        <h1 className="flex items-baseline gap-2.5 font-kana text-2xl font-semibold">
          {story.title}
        </h1>
        <p className="mt-0.5 text-sm text-muted">{localTitle(story, lang)}</p>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button
          onClick={() => setShowRomaji((r) => !r)}
          aria-pressed={showRomaji}
          className={`min-h-[40px] rounded-xl border px-3.5 text-sm font-medium transition-colors ${
            showRomaji ? 'border-sumi bg-sumi text-surface' : 'border-hairline text-muted'
          }`}
        >
          {t.reader.romaji}
        </button>
        <button
          onClick={() => setAllOpen((a) => !a)}
          aria-pressed={allOpen}
          className={`min-h-[40px] rounded-xl border px-3.5 text-sm font-medium transition-colors ${
            allOpen ? 'border-sumi bg-sumi text-surface' : 'border-hairline text-muted'
          }`}
        >
          {allOpen ? t.reader.hideAll : t.reader.showAll}
        </button>
      </div>

      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-soft">
        {story.sentences.map((sen, i) => {
          const revealed = allOpen || open.has(i)
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              className="block w-full px-5 py-4 text-left transition-colors active:bg-washi"
            >
              <span className="font-kana text-xl leading-relaxed">{sen.jp}</span>
              {showRomaji && sen.romaji && (
                <span className="mt-0.5 block text-sm text-muted">{sen.romaji}</span>
              )}
              <AnimatePresence initial={false}>
                {revealed && (
                  <motion.span
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18 }}
                    className="block overflow-hidden"
                  >
                    <span className="mt-1.5 block border-l-2 border-matcha/50 pl-2.5 text-sm text-muted">
                      {lang === 'id' ? sen.idn : sen.en}
                    </span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-center text-xs text-muted">{t.reader.tapHint}</p>
    </div>
  )
}

export default function StoriesPage() {
  const lang = useLang()
  const t = STR[lang]
  const customStories = useStore((s) => s.customStories)
  const addCustomStories = useStore((s) => s.addCustomStories)
  const removeCustomStory = useStore((s) => s.removeCustomStory)

  const [openStory, setOpenStory] = useState<Story | null>(null)
  const [paste, setPaste] = useState('')
  const [msg, setMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [copied, setCopied] = useState(false)

  const allStories = useMemo(() => [...customStories, ...STORIES], [customStories])

  // Keep the open story fresh if it was deleted underneath us.
  const active = openStory && allStories.find((s) => s.id === openStory.id) ? openStory : null

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(t.promptText)
    } catch {
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
      const { stories, invalid } = parseStoryImport(paste)
      const [added, skippedDupes] = addCustomStories(stories)
      setMsg({
        tone: added > 0 ? 'success' : 'error',
        text: t.added(added, invalid + skippedDupes),
      })
      if (added > 0) setPaste('')
    } catch (e) {
      const code = e instanceof Error ? e.message : 'invalid-json'
      setMsg({
        tone: 'error',
        text: code === 'no-json' ? t.errNoJson : code === 'empty' ? t.errEmpty : t.errInvalid,
      })
    }
  }

  if (active) return <Reader story={active} onBack={() => setOpenStory(null)} />

  const StoryCard = ({ story, removable }: { story: Story; removable?: boolean }) => (
    <div className="flex items-center gap-2 rounded-2xl border border-hairline bg-surface p-4 shadow-soft transition-all hover:shadow-lift">
      <button onClick={() => setOpenStory(story)} className="min-w-0 flex-1 text-left">
        <span className="flex items-baseline gap-2">
          <span className="truncate font-kana text-lg font-semibold">{story.title}</span>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              story.level === 'easy' ? 'bg-matcha/15 text-matcha' : 'bg-vermilion/10 text-vermilion'
            }`}
          >
            {t.levels[story.level]}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-muted">
          {localTitle(story, lang)} · {t.sentences(story.sentences.length)}
        </span>
      </button>
      {removable && (
        <button
          onClick={() => removeCustomStory(story.id)}
          aria-label={t.removeAria(story.title)}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-washi hover:text-vermilion"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.title} jp="物語" subtitle={t.subtitle} backTo="/" />

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
            placeholder='[{"title":"…","sentences":[{"jp":"…","en":"…","id":"…"}]}]'
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

      {customStories.length > 0 && (
        <section className="mb-6">
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
            {t.myStories(customStories.length)}
          </h2>
          <div className="space-y-3">
            {customStories.map((s) => (
              <StoryCard key={s.id} story={s} removable />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
          {t.builtIn}
        </h2>
        <div className="space-y-3">
          {STORIES.map((s) => (
            <StoryCard key={s.id} story={s} />
          ))}
        </div>
      </section>
    </div>
  )
}
