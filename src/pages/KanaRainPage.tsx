import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion'
import Confetti from '../components/Confetti'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { usePracticePool } from '../lib/practice'
import { matchesRomaji, normalizeInput } from '../lib/romaji'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Kana Rain',
  subtitle: 'Type the romaji before the kana reaches the ground.',
  howToPlay: 'How to play',
  rule1: 'Kana fall from the top. Type the romaji and press Enter — an exact match pops on its own.',
  rule2: (points: number) =>
    `The lowest kana pops first, +${points} points each. The rain falls faster as your score climbs.`,
  rule3: (lives: number) =>
    `A kana that reaches the ground costs one of your ${lives} lives — and comes back sooner in Review.`,
  bestScore: 'Best score',
  start: 'Start the rain',
  rainStopped: 'The rain has stopped',
  popped: (n: number) =>
    `${n} kana popped${n === 0 ? ' — the first drops are the hardest' : ''}`,
  newRecord: 'New record!',
  best: (n: number) => `Best ${n}`,
  playAgain: 'Play again',
  backToPractice: 'Back to practice',
  score: 'Score',
  livesLeft: (lives: number, total: number) => `${lives} of ${total} lives left`,
  end: 'End',
  fallingKana: 'Falling kana',
  placeholder: 'type romaji…',
  inputAria: 'Type the romaji of a falling kana',
  hint: 'Enter to pop · exact matches pop on their own · Esc to quit',
}

const ID: typeof EN = {
  title: 'Kana Rain',
  subtitle: 'Ketik romaji sebelum kana menyentuh tanah.',
  howToPlay: 'Cara main',
  rule1: 'Kana berjatuhan dari atas. Ketik romaji-nya lalu tekan Enter — yang persis cocok meletus sendiri.',
  rule2: (points: number) =>
    `Kana paling bawah meletus lebih dulu, +${points} poin per kana. Hujan makin cepat seiring skormu naik.`,
  rule3: (lives: number) =>
    `Kana yang menyentuh tanah mengurangi satu dari ${lives} nyawamu — dan muncul lagi lebih cepat di Review.`,
  bestScore: 'Skor terbaik',
  start: 'Mulai hujannya',
  rainStopped: 'Hujan sudah berhenti',
  popped: (n: number) =>
    `${n} kana meletus${n === 0 ? ' — tetes pertama memang paling sulit' : ''}`,
  newRecord: 'Rekor baru!',
  best: (n: number) => `Terbaik ${n}`,
  playAgain: 'Main lagi',
  backToPractice: 'Kembali ke latihan',
  score: 'Skor',
  livesLeft: (lives: number, total: number) => `${lives} dari ${total} nyawa tersisa`,
  end: 'Selesai',
  fallingKana: 'Kana yang berjatuhan',
  placeholder: 'ketik romaji…',
  inputAria: 'Ketik romaji dari kana yang jatuh',
  hint: 'Enter untuk meletuskan · yang persis cocok meletus sendiri · Esc untuk keluar',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const LIVES = 3
const POINTS = 10
const MAX_FALLERS = 6
/** How long a popped kana lingers for its celebration animation (ms). */
const POP_MS = 340
/** Fall speed as fraction of the play area per second, ramping with score. */
const BASE_SPEED = 0.075
const SPEED_RAMP = 0.0035
const SPEED_MAX = 0.24
/** Seconds between spawns, tightening as the score climbs. */
const SPAWN_START = 3.1
const SPAWN_MIN = 1.05
const SPAWN_RAMP = 0.065

type Phase = 'idle' | 'playing' | 'over'

interface Faller {
  id: number
  entry: KanaEntry
  /** Horizontal position in percent of the play area width. */
  x: number
  /** Fall progress 0 → 1 (1 = landed). */
  y: number
  /** Fraction of the play area fallen per second. */
  speed: number
  state: 'fall' | 'pop'
  popAt?: number
}

function spellings(entry: KanaEntry, lenient: boolean): string[] {
  return lenient ? [entry.romaji, ...entry.alt] : [entry.romaji]
}

/** The lowest (closest to landing) falling kana that the input matches. */
function lowestMatch(fallers: Faller[], typed: string, lenient: boolean): Faller | null {
  let best: Faller | null = null
  for (const f of fallers) {
    if (f.state !== 'fall') continue
    if (!matchesRomaji(typed, f.entry, lenient)) continue
    if (!best || f.y > best.y) best = f
  }
  return best
}

function Heart({ filled }: { filled: boolean }) {
  return (
    <motion.span
      animate={{ scale: filled ? 1 : 0.82, opacity: filled ? 1 : 0.45 }}
      transition={{ type: 'spring', stiffness: 500, damping: 24 }}
      className={filled ? 'text-vermilion' : 'text-hairline'}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
        <path
          d="M12 20.3C7.2 17 3 13.4 3 8.9 3 6 5.3 3.8 8 3.8c1.6 0 3 .8 4 2 1-1.2 2.4-2 4-2 2.7 0 5 2.2 5 5.1 0 4.5-4.2 8.1-9 11.4z"
          fill={filled ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth={filled ? 0 : 1.6}
        />
      </svg>
    </motion.span>
  )
}

const IDLE_RAIN = [
  { kana: 'あ', left: 16, duration: 5.6, delay: 0 },
  { kana: 'カ', left: 44, duration: 6.6, delay: 1.6 },
  { kana: 'ん', left: 72, duration: 6.0, delay: 3.1 },
]

function IdleScreen({ best, onStart }: { best: number; onStart: () => void }) {
  const t = STR[useLang()]
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="rounded-2xl border border-hairline bg-surface p-6 shadow-soft sm:p-8"
    >
      <div aria-hidden className="relative h-28 overflow-hidden rounded-xl bg-washi">
        {IDLE_RAIN.map((r) => (
          <motion.span
            key={r.kana}
            initial={{ y: -40 }}
            animate={{ y: 140 }}
            transition={{ duration: r.duration, delay: r.delay, repeat: Infinity, ease: 'linear' }}
            className="absolute top-0 font-kana text-3xl text-muted/70"
            style={{ left: `${r.left}%` }}
          >
            {r.kana}
          </motion.span>
        ))}
        <div className="absolute inset-x-6 bottom-3 border-t border-dashed border-hairline" />
      </div>

      <h2 className="mt-6 text-lg font-semibold">{t.howToPlay}</h2>
      <ul className="mt-3 space-y-2.5 text-sm text-muted">
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion/60" />
          {t.rule1}
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion/60" />
          {t.rule2(POINTS)}
        </li>
        <li className="flex gap-2.5">
          <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-vermilion/60" />
          {t.rule3(LIVES)}
        </li>
      </ul>

      {best > 0 && (
        <div className="mt-6 flex items-center justify-between rounded-xl bg-washi px-4 py-3 text-sm">
          <span className="text-muted">{t.bestScore}</span>
          <span className="font-semibold tabular-nums">{best}</span>
        </div>
      )}

      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="mt-6 w-full rounded-2xl bg-vermilion py-4 font-medium text-surface"
      >
        {t.start}
        <span className="ml-2 hidden text-xs opacity-70 sm:inline">Enter</span>
      </motion.button>
    </motion.div>
  )
}

function GameOverScreen({
  score,
  best,
  newRecord,
  onPlayAgain,
}: {
  score: number
  best: number
  newRecord: boolean
  onPlayAgain: () => void
}) {
  const t = STR[useLang()]
  const popped = score / POINTS
  return (
    <div className="text-center">
      {newRecord && <Confetti />}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-hairline bg-surface p-8 shadow-soft"
      >
        <span aria-hidden className="font-kana text-5xl text-muted">
          雨
        </span>
        <h2 className="mt-4 text-2xl font-semibold">{t.rainStopped}</h2>
        <p className="mt-1 text-sm text-muted">
          {t.popped(popped)}
        </p>
        <div className="mt-6 text-6xl font-semibold tabular-nums">{score}</div>
        <div className="mt-3 flex items-center justify-center gap-2 text-sm text-muted">
          {newRecord ? (
            <>
              <Hanko char="新" size={30} />
              <span className="font-semibold text-vermilion">{t.newRecord}</span>
            </>
          ) : (
            <>{t.best(best)}</>
          )}
        </div>
        <div className="mt-8 flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onPlayAgain}
            className="rounded-2xl bg-vermilion px-6 py-3 font-medium text-surface"
          >
            {t.playAgain}
            <span className="ml-2 hidden text-xs opacity-70 sm:inline">Enter</span>
          </motion.button>
          <Link
            to="/practice"
            className="rounded-2xl border border-hairline px-6 py-3 font-medium text-muted transition-colors hover:text-sumi"
          >
            {t.backToPractice}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

export default function KanaRainPage() {
  const recordPractice = useStore((s) => s.recordPractice)
  const submitScore = useStore((s) => s.submitScore)
  const lenient = useStore((s) => s.settings.lenient)
  const audio = useStore((s) => s.settings.audio)
  const best = useStore((s) => s.best.kanaRain)
  const livePool = usePracticePool()
  const lang = useLang()
  const t = STR[lang]

  const [phase, setPhase] = useState<Phase>('idle')
  const [fallers, setFallers] = useState<Faller[]>([])
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(LIVES)
  const [input, setInput] = useState('')
  const [wrong, setWrong] = useState(false)
  const [missTick, setMissTick] = useState(0)
  const [newRecord, setNewRecord] = useState(false)

  const fallersRef = useRef<Faller[]>([])
  const scoreRef = useRef(0)
  const livesRef = useRef(LIVES)
  const spawnAccumRef = useRef(0)
  const idRef = useRef(0)
  const lastLaneRef = useRef(-1)
  const poolRef = useRef<KanaEntry[]>([])
  const bestAtStartRef = useRef(0)
  const phaseRef = useRef<Phase>('idle')
  const refocusTimerRef = useRef<number | undefined>(undefined)
  const inputRef = useRef<HTMLInputElement>(null)
  const shakeControls = useAnimationControls()

  useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  useEffect(() => () => window.clearTimeout(refocusTimerRef.current), [])

  const startGame = useCallback(() => {
    poolRef.current = livePool // snapshot — store updates mid-game won't reshuffle
    bestAtStartRef.current = useStore.getState().best.kanaRain
    fallersRef.current = []
    scoreRef.current = 0
    livesRef.current = LIVES
    spawnAccumRef.current = 99 // first kana spawns immediately
    idRef.current = 0
    lastLaneRef.current = -1
    setFallers([])
    setScore(0)
    setLives(LIVES)
    setInput('')
    setWrong(false)
    setMissTick(0)
    setNewRecord(false)
    setPhase('playing')
  }, [livePool])

  const quitGame = useCallback(() => {
    fallersRef.current = []
    setFallers([])
    setInput('')
    setPhase('idle')
  }, [])

  const hit = useCallback(
    (target: Faller) => {
      fallersRef.current = fallersRef.current.map((f) =>
        f.id === target.id ? { ...f, state: 'pop' as const, popAt: performance.now() } : f,
      )
      scoreRef.current += POINTS
      setScore(scoreRef.current)
      setFallers(fallersRef.current)
      setInput('')
      recordPractice(target.entry.id, true)
      speak(target.entry.kana, audio)
    },
    [recordPractice, audio],
  )

  const handleChange = useCallback(
    (value: string) => {
      setInput(value)
      const typed = normalizeInput(value)
      if (!typed) return
      const target = lowestMatch(fallersRef.current, typed, lenient)
      if (!target) return
      // Auto-pop only when the input can't still grow into another falling
      // kana's romaji (e.g. "n" while な is on screen waits for Enter).
      const ambiguous = fallersRef.current.some(
        (f) =>
          f.state === 'fall' &&
          f.id !== target.id &&
          spellings(f.entry, lenient).some((s) => s.length > typed.length && s.startsWith(typed)),
      )
      if (!ambiguous) hit(target)
    },
    [lenient, hit],
  )

  const handleSubmit = useCallback(() => {
    const typed = normalizeInput(input)
    if (!typed) return
    const target = lowestMatch(fallersRef.current, typed, lenient)
    if (target) {
      hit(target)
    } else {
      setInput('')
      setWrong(true)
      void shakeControls.start({ x: [0, -7, 7, -4, 0], transition: { duration: 0.32 } })
    }
  }, [input, lenient, hit, shakeControls])

  // Clear the wrong-answer border flash.
  useEffect(() => {
    if (!wrong) return
    const t = window.setTimeout(() => setWrong(false), 450)
    return () => window.clearTimeout(t)
  }, [wrong])

  // Keep the input focused while playing (mobile keyboard stays up).
  useEffect(() => {
    if (phase === 'playing') inputRef.current?.focus()
  }, [phase])

  const refocusSoon = useCallback(() => {
    window.clearTimeout(refocusTimerRef.current)
    refocusTimerRef.current = window.setTimeout(() => {
      if (phaseRef.current === 'playing') inputRef.current?.focus()
    }, 10)
  }, [])

  // ---- Game loop: spawn + fall + land, all via requestAnimationFrame ----
  useEffect(() => {
    if (phase !== 'playing') return
    let raf = 0
    let last = performance.now()

    const spawn = () => {
      const active = fallersRef.current.filter((f) => f.state === 'fall')
      if (active.length >= MAX_FALLERS) return
      // Never two concurrent fallers that accept the same romaji.
      const taken = new Set(active.flatMap((f) => [f.entry.romaji, ...f.entry.alt]))
      const candidates = poolRef.current.filter(
        (e) => !taken.has(e.romaji) && !e.alt.some((a) => taken.has(a)),
      )
      if (candidates.length === 0) return
      const entry = candidates[Math.floor(Math.random() * candidates.length)]
      const lanes = [0, 1, 2, 3, 4].filter((l) => l !== lastLaneRef.current)
      const lane = lanes[Math.floor(Math.random() * lanes.length)]
      lastLaneRef.current = lane
      const pops = scoreRef.current / POINTS
      const speed =
        Math.min(SPEED_MAX, BASE_SPEED + pops * SPEED_RAMP) * (0.9 + Math.random() * 0.25)
      fallersRef.current = [
        ...fallersRef.current,
        {
          id: idRef.current++,
          entry,
          x: 12 + lane * 19 + (Math.random() * 8 - 4),
          y: 0,
          speed,
          state: 'fall',
        },
      ]
    }

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.1)
      last = now

      const pops = scoreRef.current / POINTS
      spawnAccumRef.current += dt
      if (spawnAccumRef.current >= Math.max(SPAWN_MIN, SPAWN_START - pops * SPAWN_RAMP)) {
        spawnAccumRef.current = 0
        spawn()
      }

      let missed = false
      const kept: Faller[] = []
      for (const f of fallersRef.current) {
        if (f.state === 'pop') {
          if (now - (f.popAt ?? now) < POP_MS) kept.push(f)
          continue
        }
        const y = f.y + f.speed * dt
        if (y >= 1) {
          missed = true
          livesRef.current -= 1
          recordPractice(f.entry.id, false)
        } else {
          kept.push({ ...f, y })
        }
      }
      fallersRef.current = kept

      if (missed) {
        setLives(livesRef.current)
        setMissTick((t) => t + 1)
        if (livesRef.current <= 0) {
          // Game over: stop the loop, submit, celebrate if it's a record.
          fallersRef.current = []
          setFallers([])
          const final = scoreRef.current
          submitScore('kanaRain', final)
          setNewRecord(final > bestAtStartRef.current && final > 0)
          setPhase('over')
          return
        }
      }

      setFallers(kept)
      raf = requestAnimationFrame(step)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [phase, recordPractice, submitScore])

  // Enter / Space starts a game from the idle and game-over screens.
  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          startGame()
        }
      },
      [startGame],
    ),
    phase !== 'playing',
  )

  return (
    <div className="mx-auto max-w-xl">
      {/* The full header only outside of play — during a game every vertical
          pixel matters on a phone with the keyboard up. */}
      {phase !== 'playing' && (
        <PageHeader
          title={t.title}
          jp="雨"
          subtitle={t.subtitle}
          backTo="/practice"
        />
      )}

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'idle' && (
          <motion.div key="idle" exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
            <IdleScreen best={best} onStart={startGame} />
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-baseline gap-2.5">
                <span aria-hidden className="font-kana text-sm text-muted">
                  雨
                </span>
                <div className="text-sm text-muted">
                  {t.score}{' '}
                  <span className="ml-1 text-lg font-semibold tabular-nums text-sumi">
                    {score}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div
                  role="status"
                  aria-label={t.livesLeft(lives, LIVES)}
                  className="flex items-center gap-1.5"
                >
                  {Array.from({ length: LIVES }, (_, i) => (
                    <Heart key={i} filled={i < lives} />
                  ))}
                </div>
                <button
                  onClick={quitGame}
                  className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-sumi"
                >
                  {t.end}
                </button>
              </div>
            </div>

            <div
              aria-label={t.fallingKana}
              onPointerDown={(e) => {
                e.preventDefault()
                inputRef.current?.focus()
              }}
              className="relative h-[calc(100dvh-19rem)] min-h-[260px] cursor-text overflow-hidden rounded-2xl border border-hairline bg-surface shadow-soft sm:h-[60dvh] sm:min-h-[340px]"
            >
              {/* ground line */}
              <div
                aria-hidden
                className="absolute inset-x-5 bottom-[7%] border-t border-dashed border-hairline"
              />
              {/* miss flash */}
              {missTick > 0 && (
                <motion.div
                  key={missTick}
                  initial={{ opacity: 0.45 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.7, ease: 'easeOut' }}
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[10%] bg-vermilion/25"
                />
              )}

              <AnimatePresence>
                {fallers.map((f) => (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, x: '-50%' }}
                    animate={{ opacity: 1, x: '-50%' }}
                    exit={{ opacity: 0, x: '-50%' }}
                    transition={{ duration: 0.15 }}
                    className="pointer-events-none absolute"
                    style={{ left: `${f.x}%`, top: `${f.y * 92 - 6}%` }}
                  >
                    <motion.span
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={
                        f.state === 'pop'
                          ? { scale: 1.5, y: -12, opacity: 0 }
                          : { scale: 1, y: 0, opacity: 1 }
                      }
                      transition={
                        f.state === 'pop'
                          ? { duration: 0.28, ease: 'easeOut' }
                          : { type: 'spring', stiffness: 400, damping: 26 }
                      }
                      className={`block select-none font-kana text-3xl transition-colors duration-300 sm:text-4xl ${
                        f.state === 'pop'
                          ? 'text-matcha'
                          : f.y > 0.7
                            ? 'text-vermilion'
                            : 'text-sumi'
                      }`}
                    >
                      {f.entry.kana}
                    </motion.span>
                    {f.state === 'pop' && (
                      <motion.span
                        initial={{ opacity: 0, y: 2, x: '-50%' }}
                        animate={{ opacity: [1, 0], y: -20, x: '-50%' }}
                        transition={{ duration: 0.4, ease: 'easeOut' }}
                        className="absolute -top-1 left-1/2 text-sm font-semibold text-matcha"
                      >
                        +{POINTS}
                      </motion.span>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <motion.input
              ref={inputRef}
              animate={shakeControls}
              value={input}
              onChange={(e) => handleChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSubmit()
                } else if (e.key === 'Escape') {
                  e.preventDefault()
                  quitGame()
                }
              }}
              onBlur={refocusSoon}
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
              maxLength={8}
              placeholder={t.placeholder}
              aria-label={t.inputAria}
              className={`mt-3 w-full rounded-2xl border bg-surface px-4 py-3.5 text-center text-lg tracking-widest shadow-soft transition-colors ${
                wrong ? 'border-vermilion' : 'border-hairline'
              }`}
            />
            <p className="mt-3 hidden text-center text-xs text-muted sm:block">
              {t.hint}
            </p>
          </motion.div>
        )}

        {phase === 'over' && (
          <motion.div
            key="over"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            <GameOverScreen
              score={score}
              best={best}
              newRecord={newRecord}
              onPlayAgain={startGame}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
