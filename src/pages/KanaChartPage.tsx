import { useCallback, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import Hanko from '../components/Hanko'
import Modal from '../components/Modal'
import StrokeOrder from '../components/StrokeOrder'
import PageHeader from '../components/PageHeader'
import {
  CHART_LAYOUT,
  KANA_BY_ID,
  toKatakana,
  type KanaEntry,
  type KanaGroup,
  type Script,
} from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import {
  DAY_MS,
  formatDuration,
  maturityOf,
  type Maturity,
  type Rating,
  type SrsCard,
} from '../lib/srs'
import { useStore } from '../stores/store'

const MATURITIES: Maturity[] = ['new', 'learning', 'young', 'mature']

const MATURITY_META: Record<Maturity, { label: string; cell: string; chip: string }> = {
  new: {
    label: 'New',
    cell: 'border-hairline bg-surface text-muted',
    chip: 'bg-washi text-muted',
  },
  learning: {
    label: 'Learning',
    cell: 'border-vermilion/30 bg-vermilion/10',
    chip: 'bg-vermilion/10 text-vermilion',
  },
  young: {
    label: 'Young',
    cell: 'border-matcha/30 bg-matcha/15',
    chip: 'bg-matcha/15 text-matcha',
  },
  mature: {
    label: 'Mature',
    cell: 'border-matcha/50 bg-matcha/25',
    chip: 'bg-matcha/25 text-matcha',
  },
}

const GROUPS: { key: KanaGroup; en: string; jp: string; cols: string; aspect: string }[] = [
  { key: 'basic', en: 'Basic', jp: '清音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'dakuten', en: 'Dakuten', jp: '濁音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'handakuten', en: 'Handakuten', jp: '半濁音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'yoon', en: 'Yōon', jp: '拗音', cols: 'grid-cols-3', aspect: 'aspect-[2/1]' },
]

const GROUP_LABEL: Record<KanaGroup, string> = {
  basic: 'Basic',
  dakuten: 'Dakuten',
  handakuten: 'Handakuten',
  yoon: 'Yōon',
}

const RATING_LABELS: Record<Rating, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
}

const RATING_CHIPS: Record<Rating, string> = {
  again: 'bg-vermilion/10 text-vermilion',
  hard: 'bg-washi text-muted',
  good: 'bg-sumi/5 text-sumi',
  easy: 'bg-matcha/15 text-matcha',
}

/** "today", "yesterday", "3d ago" — calendar-day based, local time. */
function relativeDay(ts: number, now: number): string {
  const a = new Date(ts)
  a.setHours(0, 0, 0, 0)
  const b = new Date(now)
  b.setHours(0, 0, 0, 0)
  const days = Math.round((b.getTime() - a.getTime()) / DAY_MS)
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  return `${days}d ago`
}

function ScriptToggle({ script, onChange }: { script: Script; onChange: (s: Script) => void }) {
  return (
    <div className="flex rounded-full border border-hairline bg-surface p-1 shadow-soft">
      {(['hiragana', 'katakana'] as const).map((s) => (
        <button
          key={s}
          aria-pressed={script === s}
          onClick={() => onChange(s)}
          className={`relative min-h-[44px] flex-1 rounded-full px-4 text-sm font-medium transition-colors ${
            script === s ? 'text-surface' : 'text-muted hover:text-sumi'
          }`}
        >
          {script === s && (
            <motion.span
              layoutId="script-pill"
              className="absolute inset-0 rounded-full bg-sumi"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
            />
          )}
          <span className="relative flex items-center justify-center gap-1.5">
            {s === 'hiragana' ? 'Hiragana' : 'Katakana'}
            <span aria-hidden className="font-kana text-base leading-none">
              {s === 'hiragana' ? 'あ' : 'ア'}
            </span>
          </span>
        </button>
      ))}
    </div>
  )
}

function ProgressSummary({ counts, total }: { counts: Record<Maturity, number>; total: number }) {
  const started = total - counts.new
  const pct = (n: number) => `${total === 0 ? 0 : (n / total) * 100}%`
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p>
          <span className="font-semibold">{started}</span>
          <span className="text-muted">/{total} started</span>
        </p>
        <p className="text-muted">
          <span className="font-semibold text-sumi">{counts.mature}</span> mature
        </p>
      </div>
      <div aria-hidden className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-hairline">
        <motion.div
          className="bg-matcha"
          animate={{ width: pct(counts.mature) }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
        <motion.div
          className="bg-matcha/45"
          animate={{ width: pct(counts.young) }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
        <motion.div
          className="bg-vermilion/60"
          animate={{ width: pct(counts.learning) }}
          transition={{ ease: 'easeOut', duration: 0.4 }}
        />
      </div>
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-1.5">
        {MATURITIES.map((m) => (
          <span key={m} className="flex items-center gap-1.5 text-xs text-muted">
            <span aria-hidden className={`h-3 w-3 rounded border ${MATURITY_META[m].cell}`} />
            {MATURITY_META[m].label}
          </span>
        ))}
      </div>
    </div>
  )
}

function KanaCell({
  entry,
  card,
  aspect,
  onOpen,
}: {
  entry: KanaEntry
  card: SrsCard | undefined
  aspect: string
  onOpen: (id: string) => void
}) {
  const maturity = maturityOf(card)
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => onOpen(entry.id)}
      aria-label={`${entry.kana}, ${entry.romaji}, ${MATURITY_META[maturity].label.toLowerCase()}`}
      className={`relative flex min-h-[44px] flex-col items-center justify-center rounded-xl border transition-colors ${aspect} ${MATURITY_META[maturity].cell}`}
    >
      <span
        className={`font-kana leading-none ${
          entry.kana.length > 1 ? 'text-lg sm:text-2xl' : 'text-2xl sm:text-3xl'
        }`}
      >
        {entry.kana}
      </span>
      <span className="mt-1 text-[10px] leading-none text-muted">{entry.romaji}</span>
      {maturity === 'mature' && (
        <span className="absolute right-1 top-1">
          <Hanko size={16} animate={false} />
        </span>
      )}
    </motion.button>
  )
}

function CardDetail({ entry, card }: { entry: KanaEntry; card: SrsCard | undefined }) {
  const maturity = maturityOf(card)
  const studied = card !== undefined && card.phase !== 'new'
  const now = Date.now()
  const history = studied ? card.history.slice(-10).reverse() : []

  return (
    <div>
      <div className="flex flex-col items-center text-center">
        <span className="font-kana text-7xl leading-none">{entry.kana}</span>
        <span className="mt-3 text-2xl font-semibold tracking-wide">{entry.romaji}</span>
        <div className="mt-4 flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${MATURITY_META[maturity].chip}`}
          >
            {MATURITY_META[maturity].label}
          </span>
          <button
            onClick={() => speak(entry.kana, useStore.getState().settings.audio)}
            className="flex min-h-[32px] items-center gap-1.5 rounded-full border border-hairline px-3 py-1 text-sm text-muted transition-colors hover:text-sumi"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
              <path d="M3 6v4h2.5L9 13V3L5.5 6H3z" fill="currentColor" />
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
      </div>

      <div className="mt-6">
        <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
          Stroke order
        </h3>
        <div className="mt-3 flex items-start justify-center gap-4">
          {[...entry.kana].map((glyph) => (
            <StrokeOrder key={glyph} char={glyph} size={entry.kana.length > 1 ? 108 : 132} />
          ))}
        </div>
        <p className="mt-2 text-center text-[10px] text-muted/80">
          Stroke data ©{' '}
          <a
            href="https://kanjivg.tagaini.net"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-hairline underline-offset-2"
          >
            KanjiVG
          </a>{' '}
          (Ulrich Apel), CC BY-SA 3.0
        </p>
      </div>

      {studied ? (
        <>
          <div className="mt-6 grid grid-cols-4 gap-2 text-center">
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">{card.ease.toFixed(2)}</div>
              <div className="mt-0.5 text-xs text-muted">Ease</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">
                {card.interval > 0 ? formatDuration(card.interval * DAY_MS) : '—'}
              </div>
              <div className="mt-0.5 text-xs text-muted">Interval</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">{card.reps}</div>
              <div className="mt-0.5 text-xs text-muted">Reps</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">{card.lapses}</div>
              <div className="mt-0.5 text-xs text-muted">Lapses</div>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            Next review{' '}
            <span className="font-medium text-sumi">
              {card.nextReview <= now ? 'due now' : `in ${formatDuration(card.nextReview - now)}`}
            </span>
          </p>

          {history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
                Recent answers
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {history.map((h, i) => (
                  <li key={`${h.ts}-${i}`} className="flex items-center gap-3 py-2">
                    <span
                      className={`w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${RATING_CHIPS[h.rating]}`}
                    >
                      {RATING_LABELS[h.rating]}
                    </span>
                    <span className="flex-1 text-xs capitalize text-muted">{h.phase}</span>
                    <span className="text-xs text-muted">{relativeDay(h.ts, now)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-xl bg-washi p-4 text-center text-sm text-muted">
          Not studied yet — it will appear as a new card in your review sessions.
        </div>
      )}
    </div>
  )
}

export default function KanaChartPage() {
  const cards = useStore((s) => s.cards)
  const [script, setScript] = useState<Script>(() =>
    useStore.getState().settings.scripts === 'katakana' ? 'katakana' : 'hiragana',
  )
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)

  const sections = useMemo(
    () =>
      GROUPS.map((g) => ({
        ...g,
        rows: CHART_LAYOUT[g.key].map((row) =>
          row.map((glyph): KanaEntry | null => {
            if (glyph === null) return null
            const id = script === 'hiragana' ? `h-${glyph}` : `k-${toKatakana(glyph)}`
            return KANA_BY_ID[id] ?? null
          }),
        ),
      })),
    [script],
  )

  const { counts, total } = useMemo(() => {
    const c: Record<Maturity, number> = { new: 0, learning: 0, young: 0, mature: 0 }
    let n = 0
    for (const sec of sections) {
      for (const row of sec.rows) {
        for (const entry of row) {
          if (entry === null) continue
          n += 1
          c[maturityOf(cards[entry.id])] += 1
        }
      }
    }
    return { counts: c, total: n }
  }, [sections, cards])

  const openDetail = useCallback((id: string) => {
    setSelectedId(id)
    setModalOpen(true)
    const entry = KANA_BY_ID[id] as KanaEntry | undefined
    if (entry) speak(entry.kana, useStore.getState().settings.audio)
  }, [])

  const closeDetail = useCallback(() => setModalOpen(false), [])

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape' && modalOpen) closeDetail()
      },
      [modalOpen, closeDetail],
    ),
  )

  const selected = selectedId !== null ? ((KANA_BY_ID[selectedId] as KanaEntry | undefined) ?? null) : null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Kana Chart"
        jp="五十音"
        subtitle="Tap any kana to see its details"
        backTo="/"
      />

      <ScriptToggle script={script} onChange={setScript} />

      <div className="mt-4">
        <ProgressSummary counts={counts} total={total} />
      </div>

      <motion.div
        key={script}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="mt-8 space-y-8 pb-4"
      >
        {sections.map((sec) => (
          <section key={sec.key} aria-label={`${sec.en} kana`}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-semibold">{sec.en}</h2>
              <span aria-hidden className="font-kana text-sm text-muted">
                {sec.jp}
              </span>
              <div aria-hidden className="h-px flex-1 bg-hairline" />
            </div>
            <div className={`grid gap-1.5 sm:gap-2 ${sec.cols}`}>
              {sec.rows.flatMap((row, ri) =>
                row.map((entry, ci) =>
                  entry !== null ? (
                    <KanaCell
                      key={entry.id}
                      entry={entry}
                      card={cards[entry.id] as SrsCard | undefined}
                      aspect={sec.aspect}
                      onOpen={openDetail}
                    />
                  ) : (
                    <div key={`${sec.key}-${ri}-${ci}`} aria-hidden />
                  ),
                ),
              )}
            </div>
          </section>
        ))}
      </motion.div>

      <Modal
        open={modalOpen}
        onClose={closeDetail}
        title={
          selected
            ? `${selected.script === 'hiragana' ? 'Hiragana' : 'Katakana'} · ${GROUP_LABEL[selected.group]}`
            : undefined
        }
      >
        {selected && (
          <CardDetail entry={selected} card={cards[selected.id] as SrsCard | undefined} />
        )}
      </Modal>
    </div>
  )
}
