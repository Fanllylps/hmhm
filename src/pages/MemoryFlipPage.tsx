import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { speak } from '../lib/audio'
import { shuffle, usePracticePool } from '../lib/practice'
import { useStore } from '../stores/store'

const PAIRS = 6
/** How long a mismatched pair stays face-up before flipping back. */
const MISMATCH_MS = 900
/** Small pause after the second flip so the reveal is readable before the pop. */
const MATCH_MS = 380

type Phase = 'idle' | 'playing' | 'done'

interface FlipCard {
  uid: string
  face: 'kana' | 'romaji'
  entry: KanaEntry
}

function buildDeck(pool: KanaEntry[]): FlipCard[] {
  // Dedupe by romaji so every reading maps to exactly one kana on the board
  // (じ/ぢ, or the same syllable across scripts, would be unwinnable guesses).
  const seen = new Set<string>()
  const picks: KanaEntry[] = []
  for (const entry of shuffle(pool)) {
    if (seen.has(entry.romaji)) continue
    seen.add(entry.romaji)
    picks.push(entry)
    if (picks.length === PAIRS) break
  }
  return shuffle(
    picks.flatMap((entry): FlipCard[] => [
      { uid: `${entry.id}:kana`, face: 'kana', entry },
      { uid: `${entry.id}:romaji`, face: 'romaji', entry },
    ]),
  )
}

function IdleScreen({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-8 text-center shadow-soft">
      <div aria-hidden className="mb-6 flex items-end justify-center gap-2.5">
        <span className="flex h-20 w-14 -rotate-6 select-none items-center justify-center rounded-xl border border-hairline bg-washi font-kana text-2xl text-hairline shadow-soft">
          〇
        </span>
        <span className="flex h-20 w-14 -translate-y-1 select-none items-center justify-center rounded-xl border border-hairline bg-surface font-kana text-4xl shadow-soft">
          め
        </span>
        <span className="flex h-20 w-14 rotate-6 select-none items-center justify-center rounded-xl border border-hairline bg-washi font-kana text-2xl text-hairline shadow-soft">
          〇
        </span>
      </div>
      <h2 className="text-xl font-semibold">Find the pairs</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Twelve cards hide six kana and their readings. Flip two at a time and
        clear the board in as few moves as you can — a missed pair brings that
        kana back for review sooner.
      </p>
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={onStart}
        className="mt-8 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface sm:w-auto sm:px-10"
      >
        Start round
      </motion.button>
    </div>
  )
}

function CompletionScreen({
  entries,
  moves,
  onPlayAgain,
}: {
  entries: KanaEntry[]
  moves: number
  onPlayAgain: () => void
}) {
  const perfect = moves === entries.length
  return (
    <div className="mx-auto max-w-md text-center">
      <Confetti />
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-hairline bg-surface p-8 shadow-soft"
      >
        <div className="flex justify-center">
          <Hanko char="完" size={52} />
        </div>
        <h2 className="mt-4 text-2xl font-semibold">All pairs found</h2>
        <p className="mt-1 text-sm text-muted">
          {entries.length} pairs in {moves} move{moves === 1 ? '' : 's'}
        </p>
        {perfect && (
          <p className="mt-2 text-sm font-medium text-matcha">
            Perfect memory — not a single wasted flip.
          </p>
        )}
        <div className="mt-6 grid grid-cols-6 gap-1.5">
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl bg-washi px-1 py-2 text-center">
              <div className="font-kana text-xl leading-none">{e.kana}</div>
              <div className="mt-1 text-[10px] text-muted">{e.romaji}</div>
            </div>
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
      </motion.div>
    </div>
  )
}

export default function MemoryFlipPage() {
  const pool = usePracticePool()
  const recordPractice = useStore((s) => s.recordPractice)

  const [phase, setPhase] = useState<Phase>('idle')
  const [deck, setDeck] = useState<FlipCard[]>([])
  const [faceUp, setFaceUp] = useState<string[]>([])
  const [matched, setMatched] = useState<string[]>([])
  const [moves, setMoves] = useState(0)
  const [round, setRound] = useState(0)

  const timers = useRef<number[]>([])
  const schedule = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  const clearTimers = () => {
    for (const t of timers.current) window.clearTimeout(t)
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const pairCount = deck.length / 2

  const start = () => {
    clearTimers()
    // Snapshot the pool now — mid-game store updates must not reshuffle the board.
    setDeck(buildDeck(pool))
    setFaceUp([])
    setMatched([])
    setMoves(0)
    setRound((r) => r + 1)
    setPhase('playing')
  }

  const handleFlip = (card: FlipCard) => {
    if (phase !== 'playing') return
    if (faceUp.length === 2) return // a pair is still resolving
    if (matched.includes(card.entry.id) || faceUp.includes(card.uid)) return

    const next = [...faceUp, card.uid]
    setFaceUp(next)
    if (next.length < 2) return

    const first = deck.find((c) => c.uid === next[0])
    if (!first) return
    setMoves((m) => m + 1)

    if (first.entry.id === card.entry.id) {
      recordPractice(first.entry.id, true)
      schedule(() => {
        const grown = [...matched, first.entry.id]
        setMatched(grown)
        setFaceUp([])
        speak(first.entry.kana, useStore.getState().settings.audio)
        if (grown.length === pairCount) schedule(() => setPhase('done'), 700)
      }, MATCH_MS)
    } else {
      // The kana glyph is the thing being learned — penalize its card.
      const kanaCard = [first, card].find((c) => c.face === 'kana') ?? first
      recordPractice(kanaCard.entry.id, false)
      schedule(() => setFaceUp([]), MISMATCH_MS)
    }
  }

  const entries = deck.filter((c) => c.face === 'kana').map((c) => c.entry)

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Memory Flip"
        jp="記憶"
        subtitle="Match each kana to its reading"
        backTo="/practice"
      />

      <AnimatePresence mode="wait" initial={false}>
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
          >
            <IdleScreen onStart={start} />
          </motion.div>
        )}

        {phase === 'playing' && (
          <motion.div
            key={`play-${round}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <div className="mb-4 flex items-center justify-between text-sm text-muted">
              <div className="flex items-center gap-2.5">
                <div aria-hidden className="flex gap-1.5">
                  {Array.from({ length: pairCount }, (_, i) => (
                    <motion.span
                      key={i}
                      animate={{ scale: i < matched.length ? [1, 1.5, 1] : 1 }}
                      transition={{ duration: 0.35 }}
                      className={`h-2 w-2 rounded-full ${
                        i < matched.length ? 'bg-matcha' : 'bg-hairline'
                      }`}
                    />
                  ))}
                </div>
                <span>
                  {matched.length} / {pairCount} pairs
                </span>
              </div>
              <span>
                {moves} move{moves === 1 ? '' : 's'}
              </span>
            </div>

            <p aria-live="polite" className="sr-only">
              {matched.length} of {pairCount} pairs found in {moves} moves
            </p>

            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 sm:gap-3">
              {deck.map((card, i) => {
                const isMatched = matched.includes(card.entry.id)
                const isUp = isMatched || faceUp.includes(card.uid)
                return (
                  <motion.button
                    key={card.uid}
                    type="button"
                    onClick={() => handleFlip(card)}
                    disabled={isMatched}
                    whileTap={isUp ? undefined : { scale: 0.96 }}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.25 }}
                    aria-label={
                      isUp
                        ? card.face === 'kana'
                          ? card.entry.kana
                          : card.entry.romaji
                        : 'Face-down card'
                    }
                    className="relative aspect-square w-full [perspective:800px]"
                  >
                    <motion.div
                      animate={
                        isMatched
                          ? { rotateY: 180, scale: [1, 1.07, 1] }
                          : { rotateY: isUp ? 180 : 0, scale: 1 }
                      }
                      transition={{
                        rotateY: { duration: 0.4, ease: [0.2, 0.8, 0.2, 1] },
                        scale: { duration: 0.35 },
                      }}
                      className="relative h-full w-full [transform-style:preserve-3d]"
                    >
                      {/* back (face-down) */}
                      <span className="absolute inset-0 flex items-center justify-center rounded-2xl border border-hairline bg-washi shadow-soft [backface-visibility:hidden]">
                        <span aria-hidden className="select-none font-kana text-4xl text-hairline">
                          〇
                        </span>
                      </span>
                      {/* face */}
                      <span
                        className={`absolute inset-0 flex items-center justify-center rounded-2xl border shadow-soft [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                          isMatched
                            ? 'border-matcha/40 bg-matcha/10 text-matcha'
                            : 'border-hairline bg-surface'
                        }`}
                      >
                        {card.face === 'kana' ? (
                          <span aria-hidden className="font-kana text-4xl leading-none">
                            {card.entry.kana}
                          </span>
                        ) : (
                          <span aria-hidden className="text-2xl font-semibold tracking-wide">
                            {card.entry.romaji}
                          </span>
                        )}
                      </span>
                    </motion.div>
                  </motion.button>
                )
              })}
            </div>

            <p className="mt-5 text-center text-xs text-muted">
              Misses send that kana back to review sooner.
            </p>
          </motion.div>
        )}

        {phase === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <CompletionScreen entries={entries} moves={moves} onPlayAgain={start} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
