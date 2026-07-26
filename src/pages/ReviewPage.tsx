import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import EmptyState from '../components/EmptyState'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import { KANA_BY_ID } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import {
  buildQueue,
  createCard,
  formatDuration,
  maturityOf,
  previewIntervals,
  type Rating,
} from '../lib/srs'
import {
  activePool,
  computeStats,
  newIntroducedToday,
  useStore,
  XP_REVIEW,
  XP_REVIEW_AGAIN,
} from '../stores/store'

/** Cards scheduled within this window stay in the current session queue. */
const SESSION_HORIZON_MS = 20 * 60_000

interface QueueItem {
  id: string
  due: number
}

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']
const RATING_LABELS: Record<Rating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}
const RATING_STYLES: Record<Rating, string> = {
  again: 'border-vermilion/40 text-vermilion hover:bg-vermilion/5',
  hard: 'border-hairline text-muted hover:bg-washi',
  good: 'border-sumi bg-sumi text-surface hover:bg-sumi/90',
  easy: 'border-matcha/50 text-matcha hover:bg-matcha/10',
}

function CompletionScreen({
  counts,
  matured,
}: {
  counts: Record<Rating, number>
  matured: string[]
}) {
  const total = RATINGS.reduce((sum, r) => sum + counts[r], 0)
  const accuracy = total === 0 ? 0 : Math.round(((total - counts.again) / total) * 100)
  const xpEarned = (total - counts.again) * XP_REVIEW + counts.again * XP_REVIEW_AGAIN
  return (
    <div className="mx-auto max-w-md text-center">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-hairline bg-surface p-8 shadow-soft"
      >
        <span aria-hidden className="font-kana text-5xl">
          🎉
        </span>
        <h2 className="mt-4 text-2xl font-semibold">Session complete</h2>
        <p className="mt-1 text-sm text-muted">
          {total} card{total === 1 ? '' : 's'} reviewed · {accuracy}% correct ·{' '}
          <span className="font-medium text-vermilion">+{xpEarned} XP</span>
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2 text-center text-sm">
          {RATINGS.map((r) => (
            <div key={r} className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold">{counts[r]}</div>
              <div className="mt-0.5 text-xs text-muted">{RATING_LABELS[r]}</div>
            </div>
          ))}
        </div>
        {matured.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Hanko char="済" size={28} />
            {matured.length} kana graduated to mature
          </div>
        )}
        <div className="mt-8 flex flex-col gap-2">
          <Link
            to="/practice"
            className="rounded-2xl bg-vermilion px-6 py-3 font-medium text-surface transition-transform active:scale-[0.98]"
          >
            Keep going — play a game
          </Link>
          <Link
            to="/"
            className="rounded-2xl border border-hairline px-6 py-3 font-medium text-muted transition-colors hover:text-sumi"
          >
            Back home
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

function NothingDue() {
  const state = useStore()
  const stats = computeStats(state)
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title="Review" jp="復習" />
      <EmptyState kana="休" title="All caught up">
        {stats.nextDueAt ? (
          <>Next review in {formatDuration(stats.nextDueAt - Date.now())}. Until then, try a practice game — wrong answers bring cards back sooner.</>
        ) : (
          <>No cards scheduled yet. Start a session tomorrow, or play a practice game.</>
        )}
        <div className="mt-4">
          <Link to="/practice" className="font-medium text-vermilion">
            Open practice modes →
          </Link>
        </div>
      </EmptyState>
    </div>
  )
}

export default function ReviewPage() {
  const rateCard = useStore((s) => s.rateCard)
  const [queue, setQueue] = useState<QueueItem[] | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [counts, setCounts] = useState<Record<Rating, number>>({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  })
  const [matured, setMatured] = useState<string[]>([])
  const [stampTick, setStampTick] = useState(0)
  const [stampVisible, setStampVisible] = useState(false)
  /** Monotonic per-answer counter so re-queued cards always get a fresh key. */
  const [round, setRound] = useState(0)
  const sessionSize = useRef(0)

  // Build the session once from the persisted snapshot.
  useEffect(() => {
    const s = useStore.getState()
    const now = Date.now()
    const poolIds = activePool(s.settings).map((k) => k.id)
    const limit = s.settings.newPerDay - newIntroducedToday(s.newHistory, now)
    const q = buildQueue(s.cards, poolIds, limit, now)
    const items = [
      ...q.due.map((id) => ({ id, due: s.cards[id]?.nextReview ?? now })),
      ...q.fresh.map((id) => ({ id, due: now })),
    ]
    sessionSize.current = items.length
    setQueue(items)
  }, [])

  useEffect(() => {
    if (!stampVisible) return
    const t = setTimeout(() => setStampVisible(false), 1100)
    return () => clearTimeout(t)
  }, [stampVisible, stampTick])

  const current = queue !== null && queue.length > 0 ? queue[0] : null
  const currentCard = useStore((s) => (current ? s.cards[current.id] : undefined))
  const entry = current ? KANA_BY_ID[current.id] : null
  const isNewCard = current !== null && (currentCard === undefined || currentCard.phase === 'new')

  const previews = useMemo(() => {
    if (!current) return null
    const now = Date.now()
    return previewIntervals(currentCard ?? createCard(current.id, now), now)
  }, [current, currentCard])

  const reveal = useCallback(() => {
    if (!current || !entry || revealed) return
    setRevealed(true)
    speak(entry.kana, useStore.getState().settings.audio)
  }, [current, entry, revealed])

  const answer = useCallback(
    (rating: Rating) => {
      if (!current || !revealed) return
      const before = useStore.getState().cards[current.id]
      const updated = rateCard(current.id, rating)
      if (maturityOf(updated) === 'mature' && maturityOf(before) !== 'mature') {
        setMatured((m) => [...m, current.id])
        setStampTick((t) => t + 1)
        setStampVisible(true)
      }
      setCounts((c) => ({ ...c, [rating]: c[rating] + 1 }))
      setRevealed(false)
      setRound((r) => r + 1)
      setQueue((q) => {
        if (!q || q.length === 0) return q
        const rest = q.slice(1)
        if (updated.nextReview - Date.now() <= SESSION_HORIZON_MS) {
          const item = { id: current.id, due: updated.nextReview }
          const at = rest.findIndex((r) => r.due > item.due)
          if (at === -1) rest.push(item)
          else rest.splice(at, 0, item)
        }
        return rest
      })
    },
    [current, revealed, rateCard],
  )

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault()
          reveal()
          return
        }
        if (revealed) {
          const idx = ['1', '2', '3', '4'].indexOf(e.key)
          if (idx >= 0) answer(RATINGS[idx])
        }
      },
      [reveal, answer, revealed],
    ),
  )

  if (queue === null) return null
  if (queue.length === 0) {
    const answered = RATINGS.reduce((sum, r) => sum + counts[r], 0)
    return answered > 0 ? <CompletionScreen counts={counts} matured={matured} /> : <NothingDue />
  }
  if (!entry || !previews) return null

  const done = sessionSize.current > 0 ? Math.max(0, sessionSize.current - queue.length) : 0

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Review"
        jp="復習"
        subtitle={`${queue.length} left in this session`}
      />

      <div
        aria-hidden
        className="mb-6 h-1 overflow-hidden rounded-full bg-hairline"
      >
        <motion.div
          className="h-full rounded-full bg-vermilion"
          animate={{ width: `${sessionSize.current === 0 ? 0 : (done / sessionSize.current) * 100}%` }}
          transition={{ ease: 'easeOut', duration: 0.3 }}
        />
      </div>

      <div className="relative [perspective:1200px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={`${current!.id}-${round}`}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              animate={{ rotateY: revealed ? 180 : 0 }}
              transition={{ duration: 0.45, ease: [0.2, 0.8, 0.2, 1] }}
              className="relative h-80 w-full [transform-style:preserve-3d] sm:h-96"
            >
              {/* front */}
              <button
                onClick={reveal}
                aria-label={revealed ? undefined : 'Show answer'}
                aria-hidden={revealed}
                tabIndex={revealed ? -1 : 0}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-surface shadow-soft [backface-visibility:hidden]"
              >
                {isNewCard && (
                  <span className="absolute left-4 top-4 rounded-full bg-vermilion/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-vermilion">
                    New
                  </span>
                )}
                <span className="font-kana text-[7rem] leading-none sm:text-[9rem]">{entry.kana}</span>
                <span className="mt-6 text-xs font-medium uppercase tracking-widest text-muted">
                  {entry.script}
                </span>
              </button>
              {/* back — hidden from the a11y tree until revealed so screen
                  readers can't read the answer ahead of the flip */}
              <div
                aria-hidden={!revealed}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-surface shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)]"
              >
                <span className="font-kana text-6xl sm:text-7xl">{entry.kana}</span>
                <span className="mt-4 text-4xl font-semibold tracking-wide">{entry.romaji}</span>
                <button
                  onClick={() => speak(entry.kana, useStore.getState().settings.audio)}
                  tabIndex={revealed ? 0 : -1}
                  className="mt-5 flex items-center gap-1.5 rounded-full border border-hairline px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-sumi"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M3 6v4h2.5L9 13V3L5.5 6H3z"
                      fill="currentColor"
                    />
                    <path
                      d="M11 5.5a3.5 3.5 0 010 5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                    />
                  </svg>
                  Play audio
                </button>
              </div>
            </motion.div>
          </motion.div>
        </AnimatePresence>

        <AnimatePresence>
          {stampVisible && (
            <motion.div
              key={stampTick}
              exit={{ opacity: 0, scale: 0.8 }}
              className="absolute right-4 top-4 z-10"
            >
              <Hanko char="済" size={44} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-6">
        {revealed ? (
          <div className="grid grid-cols-4 gap-2">
            {RATINGS.map((r, i) => (
              <motion.button
                key={r}
                whileTap={{ scale: 0.96 }}
                onClick={() => answer(r)}
                className={`flex min-h-[64px] flex-col items-center justify-center gap-0.5 rounded-2xl border px-2 py-3 font-medium transition-colors ${RATING_STYLES[r]}`}
              >
                <span>{RATING_LABELS[r]}</span>
                <span className="text-xs opacity-70">
                  {r === 'again' || previews[r].endsWith('m') ? '<' : ''}
                  {previews[r]}
                </span>
                <span className="sr-only">shortcut {i + 1}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={reveal}
            className="w-full rounded-2xl bg-sumi py-4 font-medium text-surface"
          >
            Show answer
            <span className="ml-2 hidden text-xs opacity-60 sm:inline">Space</span>
          </motion.button>
        )}
      </div>
      <p className="mt-4 hidden text-center text-xs text-muted sm:block">
        Space to flip · 1–4 to rate
      </p>
    </div>
  )
}
