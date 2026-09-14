import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import Confetti from '../components/Confetti'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import RowPicker from '../components/RowPicker'
import type { KanaEntry } from '../data/kana'
import { speak } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { shuffle } from '../lib/practice'
import {
  ALL_ROW_KEYS,
  orderEntries,
  rowEntries,
  type RowOrder,
  type RowScript,
} from '../lib/rowscope'
import { useStore, type Lang } from '../stores/store'

const EN = {
  subtitle: 'Match each kana to its reading',
  idleTitle: 'Find the pairs',
  idleBody: (n: number) =>
    `Twelve cards hide six kana and their readings, drawn from just the rows you choose — ${n} kana in this pool. Flip two at a time and clear the board in as few moves as you can.`,
  startRound: 'Start round',
  emptyRows: 'Pick at least 1 row to start',
  rowsLabel: 'Rows',
  groupNames: { basic: 'Basic', dakuten: 'Dakuten', handakuten: 'Handakuten', yoon: 'Yoon' },
  selectAll: 'All',
  clear: 'Clear',
  scriptLabel: 'Script',
  scripts: { hiragana: 'Hiragana', katakana: 'Katakana', both: 'Both' },
  orderLabel: 'Order',
  orders: { sequential: 'In order', random: 'Shuffle' },
  distractorsLabel: 'Wrong answers',
  distractors: { row: 'Same row', mixed: 'All kana' },
  selectedCount: (n: number) => `${n} rows selected`,
  pairsProgress: (matched: number, total: number) => `${matched} / ${total} pairs`,
  movesCount: (moves: number) => `${moves} move${moves === 1 ? '' : 's'}`,
  srStatus: (matched: number, total: number, moves: number) =>
    `${matched} of ${total} pairs found in ${moves} moves`,
  ariaKanaCard: (kana: string) => `Kana card ${kana}`,
  ariaReadingCard: (romaji: string) => `Reading card ${romaji}`,
  ariaFaceDown: 'Face-down card',
  missHint: 'Misses just cost you extra moves.',
  allFound: 'All pairs found',
  summary: (pairs: number, moves: number) => `${pairs} pairs in ${moves} move${moves === 1 ? '' : 's'}`,
  perfectMemory: 'Perfect memory — not a single wasted flip.',
  playAgain: 'Play again',
  backToPractice: 'Back to practice',
}

const ID: typeof EN = {
  subtitle: 'Cocokkan tiap kana dengan cara bacanya',
  idleTitle: 'Temukan pasangannya',
  idleBody: (n: number) =>
    `Dua belas kartu menyembunyikan enam kana dan cara bacanya, diambil dari baris pilihanmu — ${n} kana di pool ini. Balik dua kartu sekaligus dan bersihkan papan dengan langkah sesedikit mungkin.`,
  startRound: 'Mulai ronde',
  emptyRows: 'Pilih minimal 1 baris untuk mulai',
  rowsLabel: 'Baris',
  groupNames: { basic: 'Dasar', dakuten: 'Dakuten', handakuten: 'Handakuten', yoon: 'Yoon' },
  selectAll: 'Semua',
  clear: 'Hapus',
  scriptLabel: 'Huruf',
  scripts: { hiragana: 'Hiragana', katakana: 'Katakana', both: 'Keduanya' },
  orderLabel: 'Urutan',
  orders: { sequential: 'Berurutan', random: 'Acak' },
  distractorsLabel: 'Jawaban salah',
  distractors: { row: 'Sebaris', mixed: 'Semua kana' },
  selectedCount: (n: number) => `${n} baris dipilih`,
  pairsProgress: (matched, total) => `${matched} / ${total} pasangan`,
  movesCount: (moves) => `${moves} langkah`,
  srStatus: (matched, total, moves) =>
    `${matched} dari ${total} pasangan ditemukan dalam ${moves} langkah`,
  ariaKanaCard: (kana) => `Kartu kana ${kana}`,
  ariaReadingCard: (romaji) => `Kartu bacaan ${romaji}`,
  ariaFaceDown: 'Kartu tertutup',
  missHint: 'Salah tebak hanya menambah langkah.',
  allFound: 'Semua pasangan ditemukan',
  summary: (pairs, moves) => `${pairs} pasangan dalam ${moves} langkah`,
  perfectMemory: 'Memori sempurna — tidak ada langkah yang terbuang.',
  playAgain: 'Main lagi',
  backToPractice: 'Kembali ke latihan',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

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

function buildDeck(pool: KanaEntry[], order: RowOrder, from: number): { cards: FlipCard[]; next: number } {
  if (pool.length === 0) return { cards: [], next: 0 }
  // Dedupe by romaji so every reading maps to exactly one kana on the board
  // (じ/ぢ, or the same syllable across scripts, would be unwinnable guesses).
  // Sequential pages through the gojuon order; random samples the pool.
  const seen = new Set<string>()
  const picks: KanaEntry[] = []
  let scanned = 0
  const ordered = order === 'sequential' ? pool : shuffle(pool)
  const start = order === 'sequential' ? from % pool.length : 0
  for (; scanned < pool.length && picks.length < PAIRS; scanned++) {
    const entry = ordered[(start + scanned) % pool.length]
    if (seen.has(entry.romaji)) continue
    seen.add(entry.romaji)
    picks.push(entry)
  }
  return {
    cards: shuffle(
      picks.flatMap((entry): FlipCard[] => [
        { uid: `${entry.id}:kana`, face: 'kana', entry },
        { uid: `${entry.id}:romaji`, face: 'romaji', entry },
      ]),
    ),
    next: (start + scanned) % pool.length,
  }
}

function IdleScreen({
  onStart,
  picker,
  canStart,
  kanaCount,
}: {
  onStart: () => void
  picker: ReactNode
  canStart: boolean
  kanaCount: number
}) {
  const lang = useLang()
  const t = STR[lang]
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
      <h2 className="text-xl font-semibold">{t.idleTitle}</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">{t.idleBody(kanaCount)}</p>
      {picker}
      <motion.button
        whileTap={canStart ? { scale: 0.98 } : undefined}
        onClick={onStart}
        disabled={!canStart}
        aria-disabled={!canStart}
        className="mt-6 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface disabled:opacity-40 sm:w-auto sm:px-10"
      >
        {t.startRound}
      </motion.button>
      {!canStart && <p className="mt-3 text-xs text-vermilion">{t.emptyRows}</p>}
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
  const lang = useLang()
  const t = STR[lang]
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
        <h2 className="mt-4 text-2xl font-semibold">{t.allFound}</h2>
        <p className="mt-1 text-sm text-muted">{t.summary(entries.length, moves)}</p>
        {perfect && (
          <p className="mt-2 text-sm font-medium text-matcha">{t.perfectMemory}</p>
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
            {t.playAgain}
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

export default function MemoryFlipPage() {
  const lang = useLang()
  const t = STR[lang]

  const [rowKeys, setRowKeys] = useState<string[]>(ALL_ROW_KEYS)
  const [rowScript, setRowScript] = useState<RowScript>('both')
  const [rowOrder, setRowOrder] = useState<RowOrder>('random')
  const scoped = useMemo(() => rowEntries(rowKeys, rowScript), [rowKeys, rowScript])

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

  // Frozen deck snapshot for the running session, plus paging position.
  const deckPoolRef = useRef<KanaEntry[]>([])
  const orderRef = useRef<RowOrder>('random')
  const pageRef = useRef(0)

  const deal = useCallback(() => {
    clearTimers()
    const { cards, next } = buildDeck(deckPoolRef.current, orderRef.current, pageRef.current)
    pageRef.current = next
    setDeck(cards)
    setFaceUp([])
    setMatched([])
    setMoves(0)
    setRound((r) => r + 1)
    setPhase('playing')
  }, [])

  const start = () => {
    const snapshot = orderEntries(scoped, rowOrder)
    if (snapshot.length === 0) return
    deckPoolRef.current = snapshot
    orderRef.current = rowOrder
    pageRef.current = 0
    deal()
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
      schedule(() => {
        const grown = [...matched, first.entry.id]
        setMatched(grown)
        setFaceUp([])
        speak(first.entry.kana, useStore.getState().settings.audio)
        if (grown.length === pairCount) schedule(() => setPhase('done'), 700)
      }, MATCH_MS)
    } else {
      schedule(() => setFaceUp([]), MISMATCH_MS)
    }
  }

  const entries = deck.filter((c) => c.face === 'kana').map((c) => c.entry)

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Memory Flip"
        jp="記憶"
        subtitle={t.subtitle}
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
            <IdleScreen
              onStart={start}
              canStart={scoped.length > 0}
              kanaCount={scoped.length}
              picker={
                <RowPicker
                  t={t}
                  rows={rowKeys}
                  onToggleRow={(key) =>
                    setRowKeys((prev) =>
                      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
                    )
                  }
                  onSelectAll={() => setRowKeys(ALL_ROW_KEYS)}
                  onClear={() => setRowKeys([])}
                  script={rowScript}
                  onScript={setRowScript}
                  order={rowOrder}
                  onOrder={setRowOrder}
                  distractors="mixed"
                  onDistractors={() => {}}
                  showDistractors={false}
                />
              }
            />
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
                <span>{t.pairsProgress(matched.length, pairCount)}</span>
              </div>
              <span>{t.movesCount(moves)}</span>
            </div>

            <p aria-live="polite" className="sr-only">
              {t.srStatus(matched.length, pairCount, moves)}
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
                          ? t.ariaKanaCard(card.entry.kana)
                          : t.ariaReadingCard(card.entry.romaji)
                        : t.ariaFaceDown
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

            <p className="mt-5 text-center text-xs text-muted">{t.missHint}</p>
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
            <CompletionScreen entries={entries} moves={moves} onPlayAgain={deal} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
