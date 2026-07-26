import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { shuffle, usePracticePool } from '../lib/practice'
import { matchesRomaji, normalizeInput } from '../lib/romaji'
import { useStore } from '../stores/store'

/** How long the correct romaji stays revealed after a miss. */
const WRONG_REVEAL_MS = 1200
/** Duration of the matcha flash after a correct answer. */
const FLASH_MS = 400
/** Combos at or above this count burn vermilion. */
const HOT_COMBO = 5
/** The combo bar reads as "full" at this count (keeps growing numerically). */
const COMBO_BAR_MAX = 10

type Phase = 'idle' | 'playing' | 'done'
type Feedback = 'correct' | 'wrong' | null

function ComboMeter({ combo, best }: { combo: number; best: number }) {
  const hot = combo >= HOT_COMBO
  const pct = (Math.min(combo, COMBO_BAR_MAX) / COMBO_BAR_MAX) * 100
  return (
    <div className="mb-4">
      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium uppercase tracking-widest text-muted">Combo</span>
          <motion.span
            key={combo}
            initial={{ scale: combo > 0 ? 1.35 : 1 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 500, damping: 26 }}
            className={`inline-block text-xl font-semibold tabular-nums ${
              hot ? 'text-vermilion' : combo > 0 ? 'text-sumi' : 'text-muted'
            }`}
          >
            ×{combo}
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
        <span className="text-xs tabular-nums text-muted">Best ×{best}</span>
      </div>
      <div aria-hidden className="mt-1.5 h-1 overflow-hidden rounded-full bg-hairline">
        <motion.div
          className={`h-full rounded-full ${hot ? 'bg-vermilion' : 'bg-matcha'}`}
          animate={{ width: `${pct}%` }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        />
      </div>
    </div>
  )
}

export default function TypingPage() {
  const pool = usePracticePool()
  const recordPractice = useStore((s) => s.recordPractice)

  const [phase, setPhase] = useState<Phase>('idle')
  const [current, setCurrent] = useState<KanaEntry | null>(null)
  const [seq, setSeq] = useState(0)
  const [input, setInput] = useState('')
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)

  // Snapshot of the practice pool taken at game start, so mid-game store
  // updates (recordPractice) never reshuffle the running session.
  const deckRef = useRef<KanaEntry[]>([])
  const posRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const drawNext = useCallback(() => {
    const deck = deckRef.current
    if (deck.length === 0) return
    let pos = posRef.current + 1
    if (pos >= deck.length) {
      const last = deck[deck.length - 1]
      const next = shuffle(deck)
      // Avoid showing the same kana twice in a row across the reshuffle.
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
    const snapshot = shuffle(pool)
    if (snapshot.length === 0) return
    deckRef.current = snapshot
    posRef.current = 0
    setCurrent(snapshot[0])
    setSeq(0)
    setInput('')
    setFeedback(null)
    setCombo(0)
    setBestCombo(0)
    setAnswered(0)
    setCorrectCount(0)
    setPhase('playing')
  }, [pool])

  const endSession = useCallback(() => {
    setFeedback(null)
    setPhase(answered > 0 ? 'done' : 'idle')
  }, [answered])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!current || feedback === 'wrong') return
    if (normalizeInput(input).length === 0) return
    const settings = useStore.getState().settings
    const ok = matchesRomaji(input, current, settings.lenient)
    recordPractice(current.id, ok)
    setAnswered((n) => n + 1)
    speak(current.kana, settings.audio)
    if (ok) {
      const next = combo + 1
      setCombo(next)
      setBestCombo((b) => Math.max(b, next))
      setCorrectCount((n) => n + 1)
      setFeedback('correct')
      setInput('')
      drawNext()
    } else {
      setCombo(0)
      setFeedback('wrong')
    }
    inputRef.current?.focus()
  }

  // After a miss: reveal the correct romaji briefly, then move on.
  useEffect(() => {
    if (feedback !== 'wrong') return
    const t = setTimeout(() => {
      setFeedback(null)
      setInput('')
      drawNext()
      inputRef.current?.focus()
    }, WRONG_REVEAL_MS)
    return () => clearTimeout(t)
  }, [feedback, drawNext])

  // Clear the matcha flash; `seq` re-arms it on rapid consecutive corrects.
  useEffect(() => {
    if (feedback !== 'correct') return
    const t = setTimeout(() => setFeedback(null), FLASH_MS)
    return () => clearTimeout(t)
  }, [feedback, seq])

  // Enter starts (idle) or restarts (done). Skipped while the input has focus.
  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key !== 'Enter') return
        e.preventDefault()
        if (phase === 'playing') inputRef.current?.focus()
        else start()
      },
      [phase, start],
    ),
  )

  const accuracyLabel =
    answered === 0 ? '—' : `${Math.round((correctCount / answered) * 100)}%`

  // ---------- Idle ----------
  if (phase === 'idle') {
    const example = pool[0]
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Typing"
          jp="タイピング"
          subtitle="See the kana, type the rōmaji"
          backTo="/practice"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-hairline bg-surface px-6 py-12 text-center shadow-soft"
        >
          <div aria-hidden className="flex items-center justify-center gap-4">
            <span className="font-kana text-6xl leading-none">{example.kana}</span>
            <span className="text-2xl text-hairline">→</span>
            <span className="text-3xl font-semibold tracking-wide text-muted">
              {example.romaji}
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-sm text-sm text-muted">
            Type each kana's rōmaji and press Enter. Consecutive correct answers
            build your combo — a miss resets it and brings that kana back sooner
            in your reviews.
          </p>
          <p className="mt-3 text-xs text-muted">
            {pool.length} kana in rotation
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={start}
            className="mt-8 w-full rounded-2xl bg-vermilion px-8 py-4 font-medium text-surface sm:w-auto"
          >
            Start typing
          </motion.button>
          <p className="mt-3 hidden text-xs text-muted sm:block">or press Enter</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Done ----------
  if (phase === 'done') {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Typing" jp="タイピング" backTo="/practice" />
        <Confetti />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-hairline bg-surface p-8 text-center shadow-soft"
        >
          <span aria-hidden className="font-kana text-5xl">
            打
          </span>
          <h2 className="mt-4 text-2xl font-semibold">Session complete</h2>
          <p className="mt-1 text-sm text-muted">
            {answered} kana typed · {accuracyLabel} correct
          </p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums">{answered}</div>
              <div className="mt-0.5 text-xs text-muted">Answered</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums text-matcha">{correctCount}</div>
              <div className="mt-0.5 text-xs text-muted">Correct</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div
                className={`font-semibold tabular-nums ${
                  bestCombo >= HOT_COMBO ? 'text-vermilion' : ''
                }`}
              >
                ×{bestCombo}
              </div>
              <div className="mt-0.5 text-xs text-muted">Best combo</div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={start}
              className="rounded-2xl bg-vermilion px-6 py-3 font-medium text-surface"
            >
              Play again
            </motion.button>
            <Link
              to="/practice"
              className="rounded-2xl border border-hairline px-6 py-3 font-medium text-muted transition-colors hover:text-sumi"
            >
              Back to practice
            </Link>
          </div>
          <p className="mt-4 hidden text-xs text-muted sm:block">Enter to play again</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Playing ----------
  if (!current) return null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Typing"
        jp="タイピング"
        subtitle="Type the rōmaji, press Enter"
        backTo="/practice"
      />

      <ComboMeter combo={combo} best={bestCombo} />

      <motion.div
        onClick={() => inputRef.current?.focus()}
        animate={feedback === 'wrong' ? { x: [0, -10, 10, -6, 6, -3, 0] } : { x: 0 }}
        transition={{ duration: 0.4, ease: 'easeInOut' }}
        className={`relative flex h-64 flex-col items-center justify-center overflow-hidden rounded-2xl border bg-surface shadow-soft transition-colors duration-200 sm:h-72 ${
          feedback === 'wrong'
            ? 'border-vermilion/60'
            : feedback === 'correct'
              ? 'border-matcha/60'
              : 'border-hairline'
        }`}
      >
        <div className="flex h-36 items-center justify-center sm:h-40">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={`${current.id}-${seq}`}
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -18, scale: 1.04 }}
              transition={{ duration: 0.16 }}
              className="font-kana text-8xl leading-none sm:text-[7.5rem]"
            >
              {current.kana}
            </motion.span>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex h-10 items-center justify-center">
          {feedback === 'wrong' ? (
            <motion.span
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-3xl font-semibold tracking-wide"
            >
              {current.romaji}
            </motion.span>
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
              key={seq}
              aria-hidden
              initial={{ opacity: 0.5 }}
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
          readOnly={feedback === 'wrong'}
          placeholder="rōmaji"
          aria-label="Type the rōmaji for the kana shown"
          className={`w-full rounded-2xl border bg-surface px-4 py-4 text-center text-xl font-medium tracking-wide shadow-soft transition-colors placeholder:text-muted/50 ${
            feedback === 'wrong'
              ? 'border-vermilion/70 text-vermilion'
              : 'border-hairline text-sumi'
          }`}
        />
      </form>

      <div className="mt-6 flex items-center justify-center gap-4 text-sm text-muted">
        <span>
          <span className="font-semibold tabular-nums text-sumi">{answered}</span> answered
        </span>
        <span aria-hidden className="h-3 w-px bg-hairline" />
        <span>
          <span className="font-semibold tabular-nums text-sumi">{accuracyLabel}</span> accuracy
        </span>
      </div>

      <div className="mt-2 text-center">
        <button
          onClick={endSession}
          className="rounded-full px-5 py-3 text-sm font-medium text-muted transition-colors hover:text-sumi"
        >
          End session
        </button>
      </div>
    </div>
  )
}
