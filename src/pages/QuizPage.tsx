import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { type KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { pickChoices, usePracticePool } from '../lib/practice'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Quiz',
  subtitle: 'Multiple choice, both directions',
  ready: 'Ready when you are',
  intro: (n: number) =>
    `Endless rounds from your pool of ${n} kana. Questions flip direction at random — miss one and it comes back sooner in Review.`,
  startBtn: 'Start quiz',
  idleHint: 'Enter to start · 1–4 to answer',
  streak: 'Streak',
  best: 'Best',
  answered: 'Answered',
  accuracy: 'Accuracy',
  chooseReading: 'Choose the reading',
  chooseScript: (script: string) => `Choose the ${script}`,
  announceCorrect: 'Correct',
  announceWrong: (kana: string, romaji: string) => `Incorrect — ${kana} is ${romaji}`,
  answerHint: '1–4 to answer',
}

const ID: typeof EN = {
  title: 'Quiz',
  subtitle: 'Pilihan ganda, dua arah',
  ready: 'Mulai saat kamu siap',
  intro: (n: number) =>
    `Ronde tanpa akhir dari ${n} kana di pool-mu. Arah pertanyaan berganti secara acak — kalau salah, kana itu muncul lagi lebih cepat di Review.`,
  startBtn: 'Mulai quiz',
  idleHint: 'Enter untuk mulai · Jawab dengan 1–4',
  streak: 'Runtutan',
  best: 'Terbaik',
  answered: 'Dijawab',
  accuracy: 'Akurasi',
  chooseReading: 'Pilih cara bacanya',
  chooseScript: (script: string) => `Pilih ${script}-nya`,
  announceCorrect: 'Benar',
  announceWrong: (kana: string, romaji: string) => `Salah — ${kana} itu ${romaji}`,
  answerHint: 'Jawab dengan 1–4',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/** Feedback pause before the next question slides in. */
const ADVANCE_MS = 900

/** 'kana' = kana prompt → romaji options; 'romaji' = the reverse. */
type Direction = 'kana' | 'romaji'

interface Question {
  entry: KanaEntry
  choices: KanaEntry[]
  direction: Direction
}

function nextQuestion(pool: KanaEntry[], lastId: string | null): Question {
  const candidates = pool.length > 1 ? pool.filter((e) => e.id !== lastId) : pool
  const entry = candidates[Math.floor(Math.random() * candidates.length)]
  return {
    entry,
    choices: pickChoices(entry, pool, 4),
    direction: Math.random() < 0.5 ? 'kana' : 'romaji',
  }
}

type ChoiceState = 'idle' | 'correct' | 'wrong' | 'reveal' | 'dimmed'

const CHOICE_STYLES: Record<ChoiceState, string> = {
  idle: 'border-hairline bg-surface hover:bg-washi',
  correct: 'border-matcha bg-matcha/10 text-matcha',
  wrong: 'border-vermilion bg-vermilion/10 text-vermilion',
  reveal: 'border-matcha/60 bg-matcha/5 text-matcha',
  dimmed: 'border-hairline bg-surface opacity-40',
}

function Flame({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      width="14"
      height="14"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M8 1c.3 2-.6 3.1-1.6 4.2C5.3 6.4 4.4 7.6 4.4 9.4a3.6 3.6 0 007.2 0c0-1.2-.5-2.2-1.2-3.1-.2.8-.7 1.4-1.3 1.7C9.8 6 9.1 3 8 1z" />
    </svg>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex h-6 items-center gap-1 text-base font-semibold tabular-nums">
        {children}
      </div>
      <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  )
}

export default function QuizPage() {
  const livePool = usePracticePool()
  const recordPractice = useStore((s) => s.recordPractice)
  const lang = useLang()
  const t = STR[lang]

  /** Snapshot of the practice pool, frozen at game start. */
  const [pool, setPool] = useState<KanaEntry[] | null>(null)
  const [question, setQuestion] = useState<Question | null>(null)
  const [round, setRound] = useState(0)
  /** id of the picked choice while feedback is showing, null otherwise. */
  const [picked, setPicked] = useState<string | null>(null)
  const [answered, setAnswered] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  /** Bumped on every correct answer so the flame re-pulses. */
  const [pulseKey, setPulseKey] = useState(0)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current)
    },
    [],
  )

  const start = useCallback(() => {
    const snapshot = livePool
    setPool(snapshot)
    setQuestion(nextQuestion(snapshot, null))
    setRound(1)
  }, [livePool])

  const pick = useCallback(
    (choice: KanaEntry) => {
      if (!question || !pool || picked !== null) return
      const correct = choice.id === question.entry.id
      setPicked(choice.id)
      recordPractice(question.entry.id, correct)
      speak(question.entry.kana, useStore.getState().settings.audio)
      setAnswered((n) => n + 1)
      if (correct) {
        const next = streak + 1
        setCorrectCount((n) => n + 1)
        setStreak(next)
        setBestStreak((b) => Math.max(b, next))
        setPulseKey((k) => k + 1)
      } else {
        setStreak(0)
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null
        setPicked(null)
        setRound((r) => r + 1)
        setQuestion(nextQuestion(pool, question.entry.id))
      }, ADVANCE_MS)
    },
    [question, pool, picked, streak, recordPractice],
  )

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (question === null) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            start()
          }
          return
        }
        const idx = ['1', '2', '3', '4'].indexOf(e.key)
        if (idx >= 0 && idx < question.choices.length) pick(question.choices[idx])
      },
      [question, pick, start],
    ),
  )

  // ---------- Idle / start screen ----------
  if (question === null || pool === null) {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t.title} jp="選択" subtitle={t.subtitle} backTo="/practice" />
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="rounded-2xl border border-hairline bg-surface px-6 py-12 text-center shadow-soft"
        >
          <div aria-hidden className="flex items-baseline justify-center gap-5">
            <span className="font-kana text-6xl">あ</span>
            <span className="text-2xl text-muted">⇄</span>
            <span className="text-5xl font-semibold tracking-wide">a</span>
          </div>
          <h2 className="mt-7 text-lg font-semibold">{t.ready}</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t.intro(livePool.length)}</p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={start}
            className="mt-8 w-full rounded-2xl bg-vermilion py-3.5 font-medium text-surface sm:w-auto sm:px-12"
          >
            {t.startBtn}
          </motion.button>
          <p className="mt-4 hidden text-xs text-muted sm:block">{t.idleHint}</p>
        </motion.div>
      </div>
    )
  }

  // ---------- Playing ----------
  const pickedCorrect = picked !== null && picked === question.entry.id
  const accuracy = answered === 0 ? '—' : `${Math.round((correctCount / answered) * 100)}%`

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.title} jp="選択" subtitle={t.subtitle} backTo="/practice" />

      <div className="mb-5 grid grid-cols-4 divide-x divide-hairline rounded-2xl border border-hairline bg-surface py-3 shadow-soft">
        <Stat label={t.streak}>
          <motion.span
            key={pulseKey}
            animate={pulseKey > 0 ? { scale: [1, 1.5, 1] } : undefined}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className={streak > 0 ? 'text-vermilion' : 'text-muted/50'}
          >
            <Flame />
          </motion.span>
          <span className={streak > 0 ? 'text-vermilion' : undefined}>{streak}</span>
        </Stat>
        <Stat label={t.best}>{bestStreak}</Stat>
        <Stat label={t.answered}>{answered}</Stat>
        <Stat label={t.accuracy}>{accuracy}</Stat>
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={round}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex h-56 flex-col items-center justify-center rounded-2xl border border-hairline bg-surface shadow-soft sm:h-64">
            {question.direction === 'kana' ? (
              <span className="font-kana text-7xl leading-none sm:text-8xl">
                {question.entry.kana}
              </span>
            ) : (
              <span className="text-6xl font-semibold leading-none tracking-wide sm:text-7xl">
                {question.entry.romaji}
              </span>
            )}
            <span className="mt-6 text-xs font-medium uppercase tracking-widest text-muted">
              {question.direction === 'kana'
                ? t.chooseReading
                : t.chooseScript(question.entry.script)}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {question.choices.map((choice, i) => {
              const isAnswer = choice.id === question.entry.id
              const state: ChoiceState =
                picked === null
                  ? 'idle'
                  : picked === choice.id
                    ? isAnswer
                      ? 'correct'
                      : 'wrong'
                    : isAnswer
                      ? 'reveal'
                      : 'dimmed'
              return (
                <motion.button
                  key={choice.id}
                  whileTap={picked === null ? { scale: 0.96 } : undefined}
                  animate={state === 'wrong' ? { x: [0, -6, 6, -3, 0] } : undefined}
                  transition={{ duration: 0.3 }}
                  onClick={() => pick(choice)}
                  disabled={picked !== null}
                  className={`relative flex min-h-[72px] items-center justify-center rounded-2xl border px-4 py-4 shadow-soft transition-colors duration-200 sm:min-h-[80px] ${CHOICE_STYLES[state]}`}
                >
                  <span
                    aria-hidden
                    className="absolute left-3.5 top-2.5 hidden text-xs font-medium text-muted sm:block"
                  >
                    {i + 1}
                  </span>
                  {question.direction === 'kana' ? (
                    <span className="text-xl font-semibold tracking-wide sm:text-2xl">
                      {choice.romaji}
                    </span>
                  ) : (
                    <span className="font-kana text-3xl sm:text-4xl">{choice.kana}</span>
                  )}
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <span aria-live="polite" className="sr-only">
        {picked !== null &&
          (pickedCorrect
            ? t.announceCorrect
            : t.announceWrong(question.entry.kana, question.entry.romaji))}
      </span>

      <p className="mt-4 hidden text-center text-xs text-muted sm:block">{t.answerHint}</p>
    </div>
  )
}
