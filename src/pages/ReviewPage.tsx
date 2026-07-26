import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import EmptyState from '../components/EmptyState'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import { studyEntry } from '../data/study'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { haptic } from '../lib/haptics'
import { meaningFor, useLang } from '../lib/i18n'
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
  type Lang,
} from '../stores/store'

const EN = {
  title: 'Review',
  left: (n: number) => `${n} left in this session`,
  newBadge: 'New',
  showAnswer: 'Show answer',
  spaceKey: 'Space',
  hint: 'Space to flip · 1–4 to rate',
  playAudio: 'Play audio',
  ratings: { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' },
  shortcut: (n: number) => `shortcut ${n}`,
  complete: 'Session complete',
  reviewed: (n: number) => `${n} card${n === 1 ? '' : 's'} reviewed`,
  correct: (p: number) => `${p}% correct`,
  graduated: (n: number) => `${n} kana graduated to mature`,
  keepGoing: 'Keep going — play a game',
  backHome: 'Back home',
  caughtUp: 'All caught up',
  nextIn: (dur: string) =>
    `Next review in ${dur}. Until then, try a practice game — wrong answers bring cards back sooner.`,
  noneScheduled: 'No cards scheduled yet. Start a session tomorrow, or play a practice game.',
  openPractice: 'Open practice modes →',
}

const ID: typeof EN = {
  title: 'Review',
  left: (n: number) => `${n} tersisa di sesi ini`,
  newBadge: 'BARU',
  showAnswer: 'Lihat jawaban',
  spaceKey: 'Spasi',
  hint: 'Spasi untuk membalik · 1–4 untuk menilai',
  playAudio: 'Putar audio',
  ratings: { again: 'Ulangi', hard: 'Sulit', good: 'Bagus', easy: 'Mudah' },
  shortcut: (n: number) => `pintasan ${n}`,
  complete: 'Sesi selesai',
  reviewed: (n: number) => `${n} kartu direview`,
  correct: (p: number) => `${p}% benar`,
  graduated: (n: number) => `${n} kana lulus jadi mature`,
  keepGoing: 'Lanjut — main game',
  backHome: 'Kembali ke beranda',
  caughtUp: 'Semua sudah selesai',
  nextIn: (dur: string) =>
    `Review berikutnya dalam ${dur}. Sambil menunggu, coba game latihan — jawaban salah bikin kartu balik lebih cepat.`,
  noneScheduled: 'Belum ada kartu terjadwal. Mulai sesi besok, atau main game latihan dulu.',
  openPractice: 'Buka mode latihan →',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/** Cards scheduled within this window stay in the current session queue. */
const SESSION_HORIZON_MS = 20 * 60_000

interface QueueItem {
  id: string
  due: number
}

const RATINGS: Rating[] = ['again', 'hard', 'good', 'easy']
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
  const lang = useLang()
  const t = STR[lang]
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
        <h2 className="mt-4 text-2xl font-semibold">{t.complete}</h2>
        <p className="mt-1 text-sm text-muted">
          {t.reviewed(total)} · {t.correct(accuracy)} ·{' '}
          <span className="font-medium text-vermilion">+{xpEarned} XP</span>
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2 text-center text-sm">
          {RATINGS.map((r) => (
            <div key={r} className="rounded-xl bg-washi px-2 py-3">
              <div className="font-semibold">{counts[r]}</div>
              <div className="mt-0.5 text-xs text-muted">{t.ratings[r]}</div>
            </div>
          ))}
        </div>
        {matured.length > 0 && (
          <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted">
            <Hanko char="済" size={28} />
            {t.graduated(matured.length)}
          </div>
        )}
        <div className="mt-8 flex flex-col gap-2">
          <Link
            to="/practice"
            className="rounded-2xl bg-vermilion px-6 py-3 font-medium text-surface transition-transform active:scale-[0.98]"
          >
            {t.keepGoing}
          </Link>
          <Link
            to="/"
            className="rounded-2xl border border-hairline px-6 py-3 font-medium text-muted transition-colors hover:text-sumi"
          >
            {t.backHome}
          </Link>
        </div>
      </motion.div>
    </div>
  )
}

function NothingDue() {
  const state = useStore()
  const stats = computeStats(state)
  const lang = useLang()
  const t = STR[lang]
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={t.title} jp="復習" />
      <EmptyState kana="休" title={t.caughtUp}>
        {stats.nextDueAt ? (
          <>{t.nextIn(formatDuration(stats.nextDueAt - Date.now()))}</>
        ) : (
          <>{t.noneScheduled}</>
        )}
        <div className="mt-4">
          <Link to="/practice" className="font-medium text-vermilion">
            {t.openPractice}
          </Link>
        </div>
      </EmptyState>
    </div>
  )
}

export default function ReviewPage() {
  const rateCard = useStore((s) => s.rateCard)
  const lang = useLang()
  const t = STR[lang]
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
    const poolIds = activePool(s.settings, s.customVocab).map((k) => k.id)
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
  const customVocab = useStore((s) => s.customVocab)
  const entry = current ? (studyEntry(current.id, customVocab) ?? null) : null
  const isNewCard = current !== null && (currentCard === undefined || currentCard.phase === 'new')

  const previews = useMemo(() => {
    if (!current) return null
    const now = Date.now()
    return previewIntervals(currentCard ?? createCard(current.id, now), now)
  }, [current, currentCard])

  const reveal = useCallback(() => {
    if (!current || !entry || revealed) return
    setRevealed(true)
    const { audio, haptics } = useStore.getState().settings
    haptic('tap', haptics)
    speak(entry.kana, audio)
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
        title={t.title}
        jp="復習"
        subtitle={t.left(queue.length)}
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
                aria-label={revealed ? undefined : t.showAnswer}
                aria-hidden={revealed}
                tabIndex={revealed ? -1 : 0}
                className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl border border-hairline bg-surface shadow-soft [backface-visibility:hidden]"
              >
                {isNewCard && (
                  <span className="absolute left-4 top-4 rounded-full bg-vermilion/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-vermilion">
                    {t.newBadge}
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
                {entry.meaning && (
                  <span className="mt-1.5 text-sm text-muted">
                    {meaningFor(entry, lang)}
                  </span>
                )}
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
                  {t.playAudio}
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
                <span>{t.ratings[r]}</span>
                <span className="text-xs opacity-70">
                  {r === 'again' || previews[r].endsWith('m') ? '<' : ''}
                  {previews[r]}
                </span>
                <span className="sr-only">{t.shortcut(i + 1)}</span>
              </motion.button>
            ))}
          </div>
        ) : (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={reveal}
            className="w-full rounded-2xl bg-sumi py-4 font-medium text-surface"
          >
            {t.showAnswer}
            <span className="ml-2 hidden text-xs opacity-60 sm:inline">{t.spaceKey}</span>
          </motion.button>
        )}
      </div>
      <p className="mt-4 hidden text-center text-xs text-muted sm:block">
        {t.hint}
      </p>
    </div>
  )
}
