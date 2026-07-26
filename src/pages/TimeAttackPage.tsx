import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { pickChoices, usePracticePool } from '../lib/practice'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Time Attack',
  idleSubtitle: 'Sixty seconds, as many kana as you can.',
  beatClock: 'Beat the clock',
  howTo:
    'A kana appears — tap the matching rōmaji. Each correct answer scores a point. Misses flash the right answer and bring that kana back sooner in your reviews.',
  personalBest: 'Personal best',
  noBest: 'No best score yet — set the first one.',
  start: 'Start',
  idleHint: 'Enter to start · answer with 1–4',
  secondsLeft: (n: number) => `${n} seconds left`,
  score: 'Score',
  announceCorrect: (romaji: string) => `Correct — ${romaji}`,
  announceWrong: (kana: string, romaji: string) => `Wrong — ${kana} is ${romaji}`,
  answerHint: 'Answer with 1–4',
  newRecord: 'New record',
  readIn: (n: number) => `kana read in ${n} seconds`,
  answered: 'Answered',
  accuracy: 'Accuracy',
  best: 'Best',
  playAgain: 'Play again',
  backToPractice: 'Back to practice',
  overHint: 'Enter to play again',
}

const ID: typeof EN = {
  title: 'Time Attack',
  idleSubtitle: 'Enam puluh detik, sebanyak mungkin kana.',
  beatClock: 'Kalahkan waktu',
  howTo:
    'Sebuah kana muncul — ketuk rōmaji yang cocok. Tiap jawaban benar dapat satu poin. Kalau salah, jawaban yang benar berkedip sebentar dan kana itu muncul lagi lebih cepat di review-mu.',
  personalBest: 'Rekor pribadi',
  noBest: 'Belum ada skor terbaik — cetak yang pertama.',
  start: 'Mulai',
  idleHint: 'Enter untuk mulai · jawab dengan 1–4',
  secondsLeft: (n: number) => `Sisa ${n} detik`,
  score: 'Skor',
  announceCorrect: (romaji: string) => `Benar — ${romaji}`,
  announceWrong: (kana: string, romaji: string) => `Salah — ${kana} itu ${romaji}`,
  answerHint: 'Jawab dengan 1–4',
  newRecord: 'Rekor baru',
  readIn: (n: number) => `kana terbaca dalam ${n} detik`,
  answered: 'Dijawab',
  accuracy: 'Akurasi',
  best: 'Terbaik',
  playAgain: 'Main lagi',
  backToPractice: 'Kembali ke latihan',
  overHint: 'Enter untuk main lagi',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const GAME_SECONDS = 60
/** Timer turns vermilion and pulses at/below this many seconds. */
const URGENT_AT = 10
/** How long the correct answer stays highlighted after a miss. */
const WRONG_FLASH_MS = 550

type Phase = 'idle' | 'playing' | 'over'

interface Question {
  entry: KanaEntry
  choices: KanaEntry[]
}

function makeQuestion(pool: KanaEntry[], excludeId: string | null): Question {
  const candidates =
    excludeId !== null && pool.length > 1 ? pool.filter((e) => e.id !== excludeId) : pool
  const entry = candidates[Math.floor(Math.random() * candidates.length)]
  return { entry, choices: pickChoices(entry, pool, 4) }
}

function formatClock(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export default function TimeAttackPage() {
  const livePool = usePracticePool()
  const best = useStore((s) => s.best.timeAttack)
  const recordPractice = useStore((s) => s.recordPractice)
  const submitScore = useStore((s) => s.submitScore)
  const lang = useLang()
  const t = STR[lang]

  const [phase, setPhase] = useState<Phase>('idle')
  const [timeLeft, setTimeLeft] = useState(GAME_SECONDS)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)
  const [question, setQuestion] = useState<Question | null>(null)
  const [qIndex, setQIndex] = useState(0)
  /** Id of the wrongly picked option while the correct answer flashes. */
  const [wrongPick, setWrongPick] = useState<string | null>(null)
  const [newRecord, setNewRecord] = useState(false)

  // Pool is snapshotted at game start so store updates mid-game (every answer
  // touches cards/activity) never reshuffle the running game.
  const poolRef = useRef<KanaEntry[]>([])
  const flashTimer = useRef<number | null>(null)

  const clearFlashTimer = useCallback(() => {
    if (flashTimer.current !== null) {
      window.clearTimeout(flashTimer.current)
      flashTimer.current = null
    }
  }, [])

  useEffect(() => clearFlashTimer, [clearFlashTimer])

  // Single countdown interval for the whole game, cleaned up on unmount.
  useEffect(() => {
    if (phase !== 'playing') return
    const interval = window.setInterval(() => {
      setTimeLeft((t) => Math.max(0, t - 1))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [phase])

  // Time's up → lock in the score.
  useEffect(() => {
    if (phase !== 'playing' || timeLeft > 0) return
    clearFlashTimer()
    const prevBest = useStore.getState().best.timeAttack
    submitScore('timeAttack', score)
    setNewRecord(score > 0 && score > prevBest)
    setPhase('over')
  }, [phase, timeLeft, score, submitScore, clearFlashTimer])

  /** Screen-reader announcement of each answer's result. */
  const [announce, setAnnounce] = useState('')

  const start = useCallback(() => {
    poolRef.current = livePool
    clearFlashTimer()
    setScore(0)
    setAnswered(0)
    setTimeLeft(GAME_SECONDS)
    setWrongPick(null)
    setNewRecord(false)
    setAnnounce('')
    setQuestion(makeQuestion(livePool, null))
    setQIndex(0)
    setPhase('playing')
  }, [livePool, clearFlashTimer])

  const advance = useCallback(() => {
    setWrongPick(null)
    setQuestion((q) => makeQuestion(poolRef.current, q?.entry.id ?? null))
    setQIndex((i) => i + 1)
  }, [])

  const answer = useCallback(
    (choice: KanaEntry) => {
      if (phase !== 'playing' || question === null || wrongPick !== null) return
      const correct = choice.id === question.entry.id
      recordPractice(question.entry.id, correct)
      speak(question.entry.kana, useStore.getState().settings.audio)
      setAnswered((n) => n + 1)
      if (correct) {
        setScore((s) => s + 1)
        setAnnounce(t.announceCorrect(question.entry.romaji))
        advance()
      } else {
        // Flash the right answer briefly, then keep moving.
        setAnnounce(t.announceWrong(question.entry.kana, question.entry.romaji))
        setWrongPick(choice.id)
        flashTimer.current = window.setTimeout(() => {
          flashTimer.current = null
          advance()
        }, WRONG_FLASH_MS)
      }
    },
    [phase, question, wrongPick, recordPractice, advance, t],
  )

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (phase === 'playing') {
          const idx = ['1', '2', '3', '4'].indexOf(e.key)
          if (idx >= 0 && question !== null) {
            e.preventDefault()
            const choice = question.choices[idx]
            if (choice) answer(choice)
          }
          return
        }
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          start()
        }
      },
      [phase, question, answer, start],
    ),
  )

  // ---------- Game over ----------
  if (phase === 'over') {
    const accuracy = answered === 0 ? 0 : Math.round((score / answered) * 100)
    return (
      <div className="mx-auto max-w-md">
        {newRecord && <Confetti />}
        <PageHeader title={t.title} jp="秒" backTo="/practice" />
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-hairline bg-surface p-8 text-center shadow-soft"
        >
          {newRecord ? (
            <div className="flex flex-col items-center gap-2">
              <Hanko char="新" size={52} />
              <span className="text-xs font-semibold uppercase tracking-widest text-vermilion">
                {t.newRecord}
              </span>
            </div>
          ) : (
            <span aria-hidden className="font-kana text-5xl">
              終
            </span>
          )}
          <div className="mt-4 text-6xl font-semibold tabular-nums tracking-tight">{score}</div>
          <p className="mt-1 text-sm text-muted">{t.readIn(GAME_SECONDS)}</p>
          <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums">{answered}</div>
              <div className="mt-0.5 text-xs text-muted">{t.answered}</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold tabular-nums">{accuracy}%</div>
              <div className="mt-0.5 text-xs text-muted">{t.accuracy}</div>
            </div>
            <div className="rounded-xl bg-washi px-2 py-3">
              <div className={`font-semibold tabular-nums ${newRecord ? 'text-vermilion' : ''}`}>
                {best}
              </div>
              <div className="mt-0.5 text-xs text-muted">{t.best}</div>
            </div>
          </div>
          <div className="mt-8 flex flex-col gap-2">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={start}
              className="rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface"
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
          <p className="mt-4 hidden text-xs text-muted sm:block">{t.overHint}</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Playing ----------
  if (phase === 'playing' && question !== null) {
    const urgent = timeLeft <= URGENT_AT
    const flashing = wrongPick !== null
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t.title} jp="秒" backTo="/practice" />

        <div className="flex items-end justify-between">
          <motion.div
            role="timer"
            aria-label={t.secondsLeft(timeLeft)}
            animate={{ scale: urgent ? [1, 1.06, 1] : 1 }}
            transition={
              urgent
                ? { duration: 1, repeat: Infinity, ease: 'easeInOut' }
                : { duration: 0.2 }
            }
            className={`text-5xl font-semibold tabular-nums tracking-tight ${
              urgent ? 'text-vermilion' : ''
            }`}
          >
            {formatClock(timeLeft)}
          </motion.div>
          <div className="text-right">
            <div className="text-xs font-medium uppercase tracking-widest text-muted">
              {t.score}
            </div>
            <div className="h-9 overflow-hidden text-3xl font-semibold tabular-nums leading-9">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={score}
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -12, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="inline-block"
                >
                  {score}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div aria-hidden className="mb-6 mt-4 h-1 overflow-hidden rounded-full bg-hairline">
          <motion.div
            className={`h-full rounded-full ${urgent ? 'bg-vermilion' : 'bg-sumi/70'}`}
            animate={{ width: `${(timeLeft / GAME_SECONDS) * 100}%` }}
            transition={{ ease: 'linear', duration: 1 }}
          />
        </div>

        <span aria-live="polite" className="sr-only">
          {announce}
        </span>

        <div className="relative">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={qIndex}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.15 }}
              className="relative flex h-56 items-center justify-center rounded-2xl border border-hairline bg-surface shadow-soft sm:h-64"
            >
              <span className="absolute left-4 top-4 text-xs font-medium uppercase tracking-widest text-muted">
                {question.entry.script}
              </span>
              <motion.span
                animate={flashing ? { x: [0, -7, 7, -4, 0] } : { x: 0 }}
                transition={{ duration: 0.3 }}
                className="font-kana text-8xl leading-none"
              >
                {question.entry.kana}
              </motion.span>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
          {question.choices.map((choice, i) => {
            const isCorrect = choice.id === question.entry.id
            let style = 'border-hairline bg-surface hover:bg-washi'
            if (flashing) {
              if (isCorrect) style = 'border-matcha bg-matcha/10 text-matcha'
              else if (choice.id === wrongPick)
                style = 'border-vermilion/50 bg-vermilion/5 text-vermilion'
              else style = 'border-hairline bg-surface opacity-40'
            }
            return (
              <motion.button
                key={`${qIndex}-${choice.id}`}
                whileTap={{ scale: 0.96 }}
                animate={flashing && isCorrect ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.25 }}
                onClick={() => answer(choice)}
                disabled={flashing}
                className={`relative min-h-[56px] rounded-2xl border py-3.5 text-xl font-semibold tracking-wide transition-colors ${style}`}
              >
                {flashing && isCorrect ? '✓ ' : flashing && choice.id === wrongPick ? '✕ ' : ''}
                {choice.romaji}
                <span
                  aria-hidden
                  className="absolute right-3.5 top-1/2 hidden -translate-y-1/2 text-xs font-normal text-muted sm:block"
                >
                  {i + 1}
                </span>
              </motion.button>
            )
          })}
        </div>

        <p className="mt-4 hidden text-center text-xs text-muted sm:block">{t.answerHint}</p>
      </div>
    )
  }

  // ---------- Idle ----------
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.title} jp="秒" backTo="/practice" subtitle={t.idleSubtitle} />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-hairline bg-surface p-8 text-center shadow-soft sm:p-10"
      >
        <span aria-hidden className="font-kana text-7xl leading-none">
          速
        </span>
        <h2 className="mt-5 text-xl font-semibold">{t.beatClock}</h2>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{t.howTo}</p>
        <div className="mt-6 flex min-h-[32px] items-center justify-center gap-2.5 text-sm">
          {best > 0 ? (
            <>
              <Hanko char="最" size={30} animate={false} />
              <span className="text-muted">
                {t.personalBest}{' '}
                <span className="font-semibold tabular-nums text-sumi">{best}</span>
              </span>
            </>
          ) : (
            <span className="text-muted">{t.noBest}</span>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={start}
          className="mt-8 w-full rounded-2xl bg-vermilion py-4 text-lg font-medium text-surface"
        >
          {t.start}
        </motion.button>
        <p className="mt-4 hidden text-xs text-muted sm:block">{t.idleHint}</p>
      </motion.div>
    </div>
  )
}
