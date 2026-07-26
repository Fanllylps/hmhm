import { useCallback, useMemo, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import { WORDS, type WordEntry } from '../data/words'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { localizedMeaning, useLang } from '../lib/i18n'
import { shuffle } from '../lib/practice'
import { matchesRomaji, normalizeInput } from '../lib/romaji'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Words',
  idleSubtitle: 'Read whole words, type the rōmaji',
  playingSubtitle: 'Type the rōmaji for the whole word',
  intro:
    'Real Japanese words, built from the kana you know. Type the rōmaji and press Enter — the meaning is revealed after every answer.',
  poolSize: (n: number, label: string) => `${n} words · ${label}`,
  start: 'Start reading',
  orEnter: 'or press Enter',
  emptyTitle: 'No words available',
  emptyBody: 'No words match your current script setting.',
  adjustSettings: 'Adjust settings →',
  sessionComplete: 'Session complete',
  summary: (n: number, acc: string) => `${n} word${n === 1 ? '' : 's'} read · ${acc} correct`,
  answered: 'Answered',
  score: 'Score',
  bestStreak: 'Best streak',
  accuracy: 'Accuracy',
  playAgain: 'Play again',
  backToPractice: 'Back to practice',
  enterToPlayAgain: 'Enter to play again',
  streak: 'Streak',
  scoreLower: 'score',
  accuracyLower: 'accuracy',
  correct: 'Correct',
  correctReading: 'Correct reading',
  youTyped: 'you typed',
  playAudio: 'Play audio',
  placeholder: 'rōmaji',
  inputAria: 'Type the rōmaji for the word shown',
  nextWord: 'Next word',
  check: 'Check',
  thisRound: (pos: number, total: number) => `${pos} / ${total} this round`,
  endSession: 'End session',
}

const ID: typeof EN = {
  title: 'Words',
  idleSubtitle: 'Baca kata utuh, ketik rōmaji-nya',
  playingSubtitle: 'Ketik rōmaji untuk seluruh kata',
  intro:
    'Kata-kata Jepang asli, dibentuk dari kana yang sudah kamu kenal. Ketik rōmaji-nya lalu tekan Enter — artinya muncul setiap selesai menjawab.',
  poolSize: (n: number, label: string) => `${n} kata · ${label}`,
  start: 'Mulai membaca',
  orEnter: 'atau tekan Enter',
  emptyTitle: 'Tidak ada kata tersedia',
  emptyBody: 'Tidak ada kata yang cocok dengan setelan aksara kamu.',
  adjustSettings: 'Ubah setelan →',
  sessionComplete: 'Sesi selesai',
  summary: (n: number, acc: string) => `${n} kata dibaca · ${acc} benar`,
  answered: 'Dijawab',
  score: 'Skor',
  bestStreak: 'Streak terbaik',
  accuracy: 'Akurasi',
  playAgain: 'Main lagi',
  backToPractice: 'Kembali ke latihan',
  enterToPlayAgain: 'Enter untuk main lagi',
  streak: 'Streak',
  scoreLower: 'skor',
  accuracyLower: 'akurasi',
  correct: 'Benar',
  correctReading: 'Bacaan yang benar',
  youTyped: 'kamu mengetik',
  playAudio: 'Putar audio',
  placeholder: 'rōmaji',
  inputAria: 'Ketik rōmaji untuk kata yang ditampilkan',
  nextWord: 'Kata berikutnya',
  check: 'Periksa',
  thisRound: (pos: number, total: number) => `${pos} / ${total} putaran ini`,
  endSession: 'Akhiri sesi',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/** Streaks at or above this count burn vermilion. */
const HOT_STREAK = 5

type Phase = 'idle' | 'playing' | 'done'
type Feedback = 'correct' | 'wrong' | null

/** Long words shrink so every word stays on one calm line. */
function wordSizeClass(kana: string): string {
  const n = kana.length
  if (n <= 2) return 'text-8xl sm:text-[7rem]'
  if (n <= 3) return 'text-7xl sm:text-8xl'
  if (n <= 5) return 'text-6xl sm:text-7xl'
  return 'text-5xl sm:text-6xl'
}

function scriptLabel(scripts: 'hiragana' | 'katakana' | 'both'): string {
  return scripts === 'both' ? 'hiragana + katakana' : scripts
}

function AudioButton({ kana }: { kana: string }) {
  const t = STR[useLang()]
  return (
    <button
      type="button"
      onClick={() => speak(kana, useStore.getState().settings.audio)}
      className="mt-3 flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-xs text-muted transition-colors hover:text-sumi"
    >
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
        <path d="M3 6v4h2.5L9 13V3L5.5 6H3z" fill="currentColor" />
        <path
          d="M11 5.5a3.5 3.5 0 010 5"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
      </svg>
      {t.playAudio}
    </button>
  )
}

function StatsRow({
  streak,
  score,
  accuracy,
}: {
  streak: number
  score: number
  accuracy: string
}) {
  const t = STR[useLang()]
  const hot = streak >= HOT_STREAK
  return (
    <div className="mb-4 flex items-end justify-between">
      <div className="flex items-baseline gap-2">
        <span className="text-xs font-medium uppercase tracking-widest text-muted">{t.streak}</span>
        <motion.span
          key={streak}
          initial={{ scale: streak > 0 ? 1.35 : 1 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500, damping: 26 }}
          className={`inline-block text-xl font-semibold tabular-nums ${
            hot ? 'text-vermilion' : streak > 0 ? 'text-sumi' : 'text-muted'
          }`}
        >
          ×{streak}
        </motion.span>
        <AnimatePresence>
          {hot && (
            <motion.span
              aria-hidden
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="text-sm"
            >
              🔥
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center gap-4 text-sm text-muted">
        <span>
          <span className="font-semibold tabular-nums text-sumi">{score}</span> {t.scoreLower}
        </span>
        <span aria-hidden className="h-3 w-px bg-hairline" />
        <span>
          <span className="font-semibold tabular-nums text-sumi">{accuracy}</span> {t.accuracyLower}
        </span>
      </div>
    </div>
  )
}

export default function WordModePage() {
  const scripts = useStore((s) => s.settings.scripts)
  const recordPractice = useStore((s) => s.recordPractice)
  const lang = useLang()
  const t = STR[lang]

  const wordPool = useMemo(
    () => (scripts === 'both' ? WORDS : WORDS.filter((w) => w.script === scripts)),
    [scripts],
  )

  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<WordEntry | null>(null)
  const [seq, setSeq] = useState(0)
  const [input, setInput] = useState('')
  const [typed, setTyped] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  // Snapshot of the word pool taken at game start, so mid-game store updates
  // never reshuffle the running session. No repeats until the deck is spent.
  const deckRef = useRef<WordEntry[]>([])
  const posRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const drawNext = useCallback(() => {
    const deck = deckRef.current
    if (deck.length === 0) return
    let pos = posRef.current + 1
    if (pos >= deck.length) {
      // Deck exhausted — reshuffle, avoiding an immediate repeat.
      const last = deck[deck.length - 1]
      const next = shuffle(deck)
      if (next.length > 1 && next[0].id === last.id) {
        const j = 1 + Math.floor(Math.random() * (next.length - 1))
        ;[next[0], next[j]] = [next[j], next[0]]
      }
      deckRef.current = next
      pos = 0
    }
    posRef.current = pos
    setCurrent(deckRef.current[pos])
    setSeq((n) => n + 1)
  }, [])

  const start = useCallback(() => {
    const snapshot = shuffle(wordPool)
    if (snapshot.length === 0) return
    deckRef.current = snapshot
    posRef.current = 0
    setCurrent(snapshot[0])
    setSeq(0)
    setInput('')
    setTyped('')
    setFeedback(null)
    setStreak(0)
    setBestStreak(0)
    setAnswered(0)
    setCorrectCount(0)
    setPhase('playing')
  }, [wordPool])

  const goNext = useCallback(() => {
    setFeedback(null)
    setInput('')
    setTyped('')
    drawNext()
    inputRef.current?.focus()
  }, [drawNext])

  const endSession = useCallback(() => {
    setFeedback(null)
    setPhase(answered > 0 ? 'done' : 'idle')
  }, [answered])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!current) return
    if (feedback !== null) {
      goNext()
      return
    }
    if (normalizeInput(input).length === 0) return
    const settings = useStore.getState().settings
    const ok = matchesRomaji(input, current, settings.lenient)
    recordPractice(null, ok) // words are not SRS cards
    speak(current.kana, settings.audio)
    setAnswered((n) => n + 1)
    if (ok) {
      setCorrectCount((n) => n + 1)
      const next = streak + 1
      setStreak(next)
      setBestStreak((b) => Math.max(b, next))
    } else {
      setStreak(0)
    }
    setTyped(input)
    setFeedback(ok ? 'correct' : 'wrong')
    inputRef.current?.focus()
  }

  // Enter starts (idle/done) or advances a revealed card when the input has
  // lost focus. Skipped while typing — the form handles Enter itself.
  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (phase !== 'playing') start()
        else if (feedback !== null) goNext()
        else inputRef.current?.focus()
      },
      [phase, feedback, start, goNext],
    ),
  )

  const accuracyLabel =
    answered === 0 ? '—' : `${Math.round((correctCount / answered) * 100)}%`

  // ---------- Empty (defensive: word list never matches the settings) ----------
  if (wordPool.length === 0) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t.title} jp="ことば" backTo="/practice" />
        <EmptyState kana="語" title={t.emptyTitle}>
          {t.emptyBody}
          <div className="mt-4">
            <Link to="/settings" className="font-medium text-vermilion">
              {t.adjustSettings}
            </Link>
          </div>
        </EmptyState>
      </div>
    )
  }

  // ---------- Idle ----------
  if (phase === 'idle') {
    const example = wordPool[0]
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title={t.title}
          jp="ことば"
          subtitle={t.idleSubtitle}
          backTo="/practice"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-hairline bg-surface px-6 py-12 text-center shadow-soft"
        >
          <div aria-hidden className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span className="font-kana text-6xl leading-none">{example.kana}</span>
            <span className="text-2xl text-hairline">→</span>
            <span className="text-left">
              <span className="block text-3xl font-semibold tracking-wide text-muted">
                {example.romaji}
              </span>
              <span className="block text-sm text-muted">
                {localizedMeaning(example.id, example.meaning, lang)}
              </span>
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-sm text-sm text-muted">
            {t.intro}
          </p>
          <p className="mt-3 text-xs text-muted">
            {t.poolSize(wordPool.length, scriptLabel(scripts))}
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={start}
            className="mt-8 w-full rounded-2xl bg-vermilion px-8 py-4 font-medium text-surface sm:w-auto"
          >
            {t.start}
          </motion.button>
          <p className="mt-3 hidden text-xs text-muted sm:block">{t.orEnter}</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Done ----------
  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title={t.title} jp="ことば" backTo="/practice" />
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-hairline bg-surface p-8 text-center shadow-soft"
        >
          <span aria-hidden className="font-kana text-5xl">
            語
          </span>
          <h2 className="mt-4 text-2xl font-semibold">{t.sessionComplete}</h2>
          <p className="mt-1 text-sm text-muted">
            {t.summary(answered, accuracyLabel)}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums">{answered}</div>
              <div className="mt-0.5 text-xs text-muted">{t.answered}</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums text-matcha">{correctCount}</div>
              <div className="mt-0.5 text-xs text-muted">{t.score}</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div
                className={`font-semibold tabular-nums ${
                  bestStreak >= HOT_STREAK ? 'text-vermilion' : ''
                }`}
              >
                ×{bestStreak}
              </div>
              <div className="mt-0.5 text-xs text-muted">{t.bestStreak}</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums">{accuracyLabel}</div>
              <div className="mt-0.5 text-xs text-muted">{t.accuracy}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={start}
              className="rounded-2xl bg-vermilion px-6 py-3 font-medium text-surface"
            >
              {t.playAgain}
            </motion.button>
            <Link
              to="/practice"
              className="rounded-2xl border border-hairline px-6 py-3 font-medium text-muted transition-colors hover:text-sumi"
            >
              {t.backToPractice}
            </Link>
          </div>
          <p className="mt-4 hidden text-xs text-muted sm:block">{t.enterToPlayAgain}</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Playing ----------
  if (!current) return null

  const revealed = feedback !== null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={t.title}
        jp="ことば"
        subtitle={t.playingSubtitle}
        backTo="/practice"
      />

      <StatsRow streak={streak} score={correctCount} accuracy={accuracyLabel} />

      <motion.div
        onClick={revealed ? undefined : () => inputRef.current?.focus()}
        animate={feedback === 'wrong' ? { x: [0, -10, 10, -6, 6, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={`relative flex min-h-[19rem] flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface px-6 py-10 shadow-soft transition-colors duration-200 sm:min-h-[21rem] ${
          feedback === 'wrong'
            ? 'border-vermilion/60'
            : feedback === 'correct'
              ? 'border-matcha/60'
              : 'border-hairline'
        }`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={`${current.id}-${seq}`}
            initial={{ opacity: 0, y: 18, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 1.04 }}
            transition={{ duration: 0.16 }}
            className={`font-kana leading-none ${wordSizeClass(current.kana)}`}
          >
            {current.kana}
          </motion.span>
        </AnimatePresence>

        <div
          role="status"
          aria-live="polite"
          className="mt-5 flex min-h-[7rem] flex-col items-center justify-center"
        >
          {revealed ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <span
                className={`text-[11px] font-medium uppercase tracking-widest ${
                  feedback === 'correct' ? 'text-matcha' : 'text-vermilion'
                }`}
              >
                {feedback === 'correct' ? t.correct : t.correctReading}
              </span>
              <span
                className={`mt-1 text-3xl font-semibold tracking-wide ${
                  feedback === 'correct' ? 'text-matcha' : 'text-vermilion'
                }`}
              >
                {current.romaji}
              </span>
              <span className="mt-1 text-base text-muted">
                “{localizedMeaning(current.id, current.meaning, lang)}”
              </span>
              {feedback === 'wrong' && normalizeInput(typed).length > 0 && (
                <span className="mt-2 text-sm text-muted">
                  {t.youTyped} <span className="line-through">{normalizeInput(typed)}</span>
                </span>
              )}
              <AudioButton kana={current.kana} />
            </motion.div>
          ) : (
            <span className="text-xs font-medium uppercase tracking-widest text-muted">
              {current.script}
            </span>
          )}
        </div>

        {/* Quick matcha flash on a correct answer. */}
        <AnimatePresence>
          {feedback === 'correct' && (
            <motion.div
              key={answered}
              aria-hidden
              initial={{ opacity: 0.4 }}
              animate={{ opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: 'easeOut' }}
              className="pointer-events-none absolute inset-0 rounded-2xl bg-matcha/25"
            />
          )}
        </AnimatePresence>
      </motion.div>

      <form onSubmit={submit} className="mt-5">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoFocus
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          readOnly={revealed}
          placeholder={t.placeholder}
          aria-label={t.inputAria}
          className={`w-full rounded-2xl border bg-surface px-4 py-4 text-center text-xl font-medium tracking-wide shadow-soft transition-colors placeholder:text-muted/50 ${
            feedback === 'wrong'
              ? 'border-vermilion/70 text-vermilion'
              : feedback === 'correct'
                ? 'border-matcha/60 text-matcha'
                : 'border-hairline text-sumi'
          }`}
        />
        <motion.button
          type="submit"
          whileTap={{ scale: 0.98 }}
          className={`mt-3 w-full rounded-2xl py-4 font-medium transition-colors ${
            revealed
              ? 'bg-sumi text-surface'
              : 'border border-hairline bg-surface text-sumi hover:bg-washi'
          }`}
        >
          {revealed ? t.nextWord : t.check}
          <span className="ml-2 hidden text-xs opacity-60 sm:inline">Enter</span>
        </motion.button>
      </form>

      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted">
        <span className="tabular-nums">
          {t.thisRound(Math.min(posRef.current + 1, deckRef.current.length), deckRef.current.length)}
        </span>
        <span aria-hidden className="h-3 w-px bg-hairline" />
        <button
          onClick={endSession}
          className="rounded-full px-4 py-3 font-medium transition-colors hover:text-sumi"
        >
          {t.endSession}
        </button>
      </div>
    </div>
  )
}
