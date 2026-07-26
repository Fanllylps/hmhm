import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { shuffle, usePracticePool } from '../lib/practice'
import { useStore } from '../stores/store'

const ROUND_SIZE = 6
/** Let the final pair's pop animation play before swapping to the summary. */
const COMPLETE_DELAY_MS = 600
const SHAKE_MS = 450

interface Tile {
  key: string
  entry: KanaEntry
  kind: 'kana' | 'romaji'
}

/**
 * Pick a round of entries with pairwise-distinct romaji so every tile has
 * exactly one partner (じ/ぢ share "ji", and both scripts collide in
 * "both" mode).
 */
function pickRound(pool: KanaEntry[], size: number): KanaEntry[] {
  const chosen: KanaEntry[] = []
  const seen = new Set<string>()
  for (const entry of shuffle(pool)) {
    if (chosen.length >= size) break
    if (seen.has(entry.romaji)) continue
    seen.add(entry.romaji)
    chosen.push(entry)
  }
  return chosen
}

function buildTiles(round: KanaEntry[]): Tile[] {
  return shuffle(
    round.flatMap((entry): Tile[] => [
      { key: `${entry.id}-kana`, entry, kind: 'kana' },
      { key: `${entry.id}-romaji`, entry, kind: 'romaji' },
    ]),
  )
}

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function CompletionCard({
  seconds,
  moves,
  pairs,
  newBest,
  entries,
  onPlayAgain,
}: {
  seconds: number
  moves: number
  pairs: number
  newBest: boolean
  entries: KanaEntry[]
  onPlayAgain: () => void
}) {
  const best = useStore((s) => s.best.matchingSec)
  const perfect = moves === pairs
  return (
    <div className="mx-auto max-w-md text-center">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-hairline bg-surface p-8 shadow-soft"
      >
        <p className="text-xs font-medium uppercase tracking-widest text-muted">Board cleared</p>
        <div className="mt-3 text-6xl font-semibold tabular-nums tracking-tight">
          {formatClock(seconds)}
        </div>
        <p className="mt-2 text-sm text-muted">
          {perfect
            ? 'Perfect round — every move was a match.'
            : `${moves} moves to clear ${pairs} pairs.`}
        </p>

        {newBest && (
          <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-vermilion">
            <Hanko char="速" size={30} />
            New best time
          </div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-washi px-2 py-3">
            <div className="font-semibold tabular-nums">
              {best !== null ? formatClock(best) : '—'}
            </div>
            <div className="mt-0.5 text-xs text-muted">Best</div>
          </div>
          <div className="rounded-xl bg-washi px-2 py-3">
            <div className="font-semibold tabular-nums">{moves}</div>
            <div className="mt-0.5 text-xs text-muted">Moves</div>
          </div>
          <div className="rounded-xl bg-washi px-2 py-3">
            <div className="font-semibold tabular-nums">{pairs}</div>
            <div className="mt-0.5 text-xs text-muted">Pairs</div>
          </div>
        </div>

        <div aria-hidden className="mt-6 flex justify-center gap-2 font-kana text-2xl text-muted">
          {entries.map((e) => (
            <span key={e.id}>{e.kana}</span>
          ))}
        </div>

        <div className="mt-8 flex flex-col gap-2">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={onPlayAgain}
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

export default function MatchingPage() {
  const pool = usePracticePool()
  const poolRef = useRef(pool)
  poolRef.current = pool
  const recordPractice = useStore((s) => s.recordPractice)
  const submitMatchingTime = useStore((s) => s.submitMatchingTime)
  const best = useStore((s) => s.best.matchingSec)

  const [roundId, setRoundId] = useState(0)
  const [round, setRound] = useState<KanaEntry[] | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  /** Entry ids whose pair has been cleared. */
  const [cleared, setCleared] = useState<ReadonlySet<string>>(new Set())
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [shakeKeys, setShakeKeys] = useState<readonly string[]>([])
  const [moves, setMoves] = useState(0)
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [finishedSec, setFinishedSec] = useState<number | null>(null)
  const [newBest, setNewBest] = useState(false)
  const [showComplete, setShowComplete] = useState(false)

  const startRound = useCallback(() => {
    const entries = pickRound(poolRef.current, ROUND_SIZE)
    setRound(entries)
    setTiles(buildTiles(entries))
    setCleared(new Set())
    setSelectedKey(null)
    setShakeKeys([])
    setMoves(0)
    setStartedAt(null)
    setElapsedMs(0)
    setFinishedSec(null)
    setNewBest(false)
    setShowComplete(false)
    setRoundId((r) => r + 1)
  }, [])

  // Snapshot the pool into a round once on mount so mid-game store updates
  // (recordPractice) never reshuffle the board.
  useEffect(() => {
    startRound()
  }, [startRound])

  // Count-up timer, running from the first tap until the board is cleared.
  useEffect(() => {
    if (startedAt === null || finishedSec !== null) return
    const id = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 250)
    return () => window.clearInterval(id)
  }, [startedAt, finishedSec])

  // Mismatch shake: brief lockout, then deselect back to neutral.
  useEffect(() => {
    if (shakeKeys.length === 0) return
    const t = window.setTimeout(() => setShakeKeys([]), SHAKE_MS)
    return () => window.clearTimeout(t)
  }, [shakeKeys])

  // Hold the cleared board for a beat before showing the summary.
  useEffect(() => {
    if (finishedSec === null) return
    const t = window.setTimeout(() => setShowComplete(true), COMPLETE_DELAY_MS)
    return () => window.clearTimeout(t)
  }, [finishedSec])

  const tap = (tile: Tile) => {
    if (finishedSec !== null || shakeKeys.length > 0 || cleared.has(tile.entry.id)) return
    if (startedAt === null) setStartedAt(Date.now())
    if (selectedKey === null) {
      setSelectedKey(tile.key)
      return
    }
    if (selectedKey === tile.key) {
      setSelectedKey(null)
      return
    }
    const first = tiles.find((t) => t.key === selectedKey)
    if (!first) {
      setSelectedKey(tile.key)
      return
    }

    setMoves((m) => m + 1)
    setSelectedKey(null)

    if (first.entry.id === tile.entry.id && first.kind !== tile.kind) {
      // A kana ↔ romaji pair: clear it and feed the SRS.
      recordPractice(tile.entry.id, true)
      speak(tile.entry.kana, useStore.getState().settings.audio)
      const nextCleared = new Set(cleared).add(tile.entry.id)
      setCleared(nextCleared)
      if (round !== null && nextCleared.size === round.length) {
        const sec = Math.max(1, Math.round((Date.now() - (startedAt ?? Date.now())) / 1000))
        const prev = useStore.getState().best.matchingSec
        setNewBest(prev === null || sec < prev)
        setFinishedSec(sec)
        submitMatchingTime(sec)
      }
    } else {
      // Wrong pair: every involved kana gets pulled earlier in the SRS.
      const ids = new Set([first.entry.id, tile.entry.id])
      for (const id of ids) recordPractice(id, false)
      setShakeKeys([first.key, tile.key])
    }
  }

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (finishedSec !== null && e.key === 'Enter') {
          e.preventDefault()
          startRound()
        }
      },
      [finishedSec, startRound],
    ),
  )

  if (round === null) return null

  if (showComplete && finishedSec !== null) {
    return (
      <CompletionCard
        seconds={finishedSec}
        moves={moves}
        pairs={round.length}
        newBest={newBest}
        entries={round}
        onPlayAgain={startRound}
      />
    )
  }

  const displaySec = finishedSec ?? Math.floor(elapsedMs / 1000)

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Matching"
        jp="対"
        subtitle="Pair each kana with its romaji"
        backTo="/practice"
        actions={
          best !== null ? (
            <div className="rounded-full border border-hairline bg-surface px-3.5 py-1.5 text-sm tabular-nums text-muted shadow-soft">
              Best {formatClock(best)}
            </div>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-3 items-center rounded-2xl border border-hairline bg-surface px-5 py-3 shadow-soft">
        <div>
          <div
            className={`text-xl font-semibold tabular-nums ${startedAt === null ? 'text-muted' : ''}`}
          >
            {formatClock(displaySec)}
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted">Time</div>
        </div>
        <div className="text-center">
          <div className="text-xl font-semibold tabular-nums">{moves}</div>
          <div className="text-[11px] uppercase tracking-widest text-muted">Moves</div>
        </div>
        <div className="text-right">
          <div className="text-xl font-semibold tabular-nums">
            {cleared.size}
            <span className="text-muted">/{round.length}</span>
          </div>
          <div className="text-[11px] uppercase tracking-widest text-muted">Pairs</div>
        </div>
      </div>

      <div key={roundId} className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
        {tiles.map((tile, i) => {
          const isCleared = cleared.has(tile.entry.id)
          const isSelected = selectedKey === tile.key
          const isShaking = shakeKeys.includes(tile.key)
          const look = isCleared
            ? 'pointer-events-none border-matcha/60 bg-matcha/10 text-matcha'
            : isShaking
              ? 'border-vermilion bg-vermilion/5 text-vermilion ring-1 ring-vermilion/60'
              : isSelected
                ? 'border-sumi bg-surface shadow-lift ring-1 ring-sumi'
                : 'border-hairline bg-surface shadow-soft'
          return (
            <motion.div
              key={tile.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.22 }}
            >
              <motion.button
                type="button"
                onClick={() => tap(tile)}
                disabled={isCleared}
                aria-pressed={isSelected}
                aria-label={
                  tile.kind === 'kana' ? `Kana ${tile.entry.kana}` : `Romaji ${tile.entry.romaji}`
                }
                whileTap={isCleared ? undefined : { scale: 0.96 }}
                animate={
                  isCleared
                    ? {
                        opacity: 0,
                        scale: [1, 1.12, 0.75],
                        transition: { duration: 0.4, times: [0, 0.4, 1] },
                      }
                    : isShaking
                      ? {
                          x: [0, -7, 7, -5, 5, 0],
                          opacity: 1,
                          scale: 1,
                          transition: { duration: 0.4 },
                        }
                      : {
                          x: 0,
                          opacity: 1,
                          scale: isSelected ? 1.04 : 1,
                          transition: { duration: 0.18 },
                        }
                }
                className={`flex aspect-square w-full items-center justify-center rounded-2xl border transition-colors ${look}`}
              >
                {tile.kind === 'kana' ? (
                  <span className="font-kana text-5xl leading-none">{tile.entry.kana}</span>
                ) : (
                  <span className="text-xl font-semibold tracking-wide sm:text-2xl">
                    {tile.entry.romaji}
                  </span>
                )}
              </motion.button>
            </motion.div>
          )
        })}
      </div>

      <AnimatePresence>
        {startedAt === null && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="mt-5 text-center text-sm text-muted"
          >
            Tap a kana, then its romaji. The timer starts on your first tap.
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  )
}
