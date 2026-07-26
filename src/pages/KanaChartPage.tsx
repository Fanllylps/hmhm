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
import { useLang } from '../lib/i18n'
import {
  DAY_MS,
  formatDuration,
  maturityOf,
  type Maturity,
  type Rating,
  type SrsCard,
} from '../lib/srs'
import { useStore, type Lang } from '../stores/store'

type ChartGroup = Exclude<KanaGroup, 'kanji' | 'vocab'>

const EN = {
  subtitle: 'Tap any kana to see its details',
  started: 'started',
  matureCount: 'mature',
  groups: { basic: 'Basic', dakuten: 'Dakuten', handakuten: 'Handakuten', yoon: 'Yōon' },
  sectionAria: (name: string) => `${name} kana`,
  maturity: { new: 'New', learning: 'Learning', young: 'Young', mature: 'Mature' },
  ratings: { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' },
  phases: { new: 'new', learning: 'learning', review: 'review', relearning: 'relearning' },
  playAudio: 'Play audio',
  strokeOrder: 'Stroke order',
  ease: 'Ease',
  interval: 'Interval',
  reps: 'Reps',
  lapses: 'Lapses',
  nextReview: 'Next review',
  dueNow: 'due now',
  inDuration: (d: string) => `in ${d}`,
  recentAnswers: 'Recent answers',
  today: 'today',
  yesterday: 'yesterday',
  daysAgo: (n: number) => `${n}d ago`,
  notStudied: 'Not studied yet — it will appear as a new card in your review sessions.',
  kanji: 'Kanji',
}

const ID: typeof EN = {
  subtitle: 'Ketuk kana untuk lihat detailnya',
  started: 'dimulai',
  matureCount: 'matang',
  groups: { basic: 'Dasar', dakuten: 'Dakuten', handakuten: 'Handakuten', yoon: 'Yōon' },
  sectionAria: (name: string) => `Kana ${name}`,
  maturity: { new: 'Baru', learning: 'Belajar', young: 'Muda', mature: 'Matang' },
  ratings: { again: 'Ulangi', hard: 'Sulit', good: 'Bagus', easy: 'Mudah' },
  phases: { new: 'baru', learning: 'belajar', review: 'review', relearning: 'belajar ulang' },
  playAudio: 'Putar audio',
  strokeOrder: 'Urutan goresan',
  ease: 'Ease',
  interval: 'Interval',
  reps: 'Ulangan',
  lapses: 'Lupa',
  nextReview: 'Review berikutnya',
  dueNow: 'jatuh tempo',
  inDuration: (d: string) => `dalam ${d}`,
  recentAnswers: 'Jawaban terakhir',
  today: 'hari ini',
  yesterday: 'kemarin',
  daysAgo: (n: number) => `${n}h lalu`,
  notStudied: 'Belum dipelajari — akan muncul sebagai kartu baru di sesi review-mu.',
  kanji: 'Kanji',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const MATURITIES: Maturity[] = ['new', 'learning', 'young', 'mature']

const MATURITY_META: Record<Maturity, { cell: string; chip: string }> = {
  new: {
    cell: 'border-hairline bg-surface text-muted',
    chip: 'bg-washi text-muted',
  },
  learning: {
    cell: 'border-vermilion/30 bg-vermilion/10',
    chip: 'bg-vermilion/10 text-vermilion',
  },
  young: {
    cell: 'border-matcha/30 bg-matcha/15',
    chip: 'bg-matcha/15 text-matcha',
  },
  mature: {
    cell: 'border-matcha/50 bg-matcha/25',
    chip: 'bg-matcha/25 text-matcha',
  },
}

const GROUPS: { key: ChartGroup; jp: string; cols: string; aspect: string }[] = [
  { key: 'basic', jp: '清音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'dakuten', jp: '濁音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'handakuten', jp: '半濁音', cols: 'grid-cols-5', aspect: 'aspect-square' },
  { key: 'yoon', jp: '拗音', cols: 'grid-cols-3', aspect: 'aspect-[2/1]' },
]

const RATING_CHIPS: Record<Rating, string> = {
  again: 'bg-vermilion/10 text-vermilion',
  hard: 'bg-washi text-muted',
  good: 'bg-sumi/5 text-sumi',
  easy: 'bg-matcha/15 text-matcha',
}

/** "today", "yesterday", "3d ago" — calendar-day based, local time. */
function relativeDay(ts: number, now: number, t: typeof EN): string {
  const a = new Date(ts)
  a.setHours(0, 0, 0, 0)
  const b = new Date(now)
  b.setHours(0, 0, 0, 0)
  const days = Math.round((b.getTime() - a.getTime()) / DAY_MS)
  if (days <= 0) return t.today
  if (days === 1) return t.yesterday
  return t.daysAgo(days)
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
  const t = STR[useLang()]
  const started = total - counts.new
  const pct = (n: number) => `${total === 0 ? 0 : (n / total) * 100}%`
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-soft sm:p-5">
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <p>
          <span className="font-semibold">{started}</span>
          <span className="text-muted">
            /{total} {t.started}
          </span>
        </p>
        <p className="text-muted">
          <span className="font-semibold text-sumi">{counts.mature}</span> {t.matureCount}
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
            {t.maturity[m]}
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
  const t = STR[useLang()]
  const maturity = maturityOf(card)
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => onOpen(entry.id)}
      aria-label={`${entry.kana}, ${entry.romaji}, ${t.maturity[maturity].toLowerCase()}`}
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
  const t = STR[useLang()]
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
            {t.maturity[maturity]}
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
            {t.playAudio}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-center text-xs font-semibold uppercase tracking-widest text-muted">
          {t.strokeOrder}
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
              <div className="mt-0.5 text-xs text-muted">{t.ease}</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">
                {card.interval > 0 ? formatDuration(card.interval * DAY_MS) : '—'}
              </div>
              <div className="mt-0.5 text-xs text-muted">{t.interval}</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">{card.reps}</div>
              <div className="mt-0.5 text-xs text-muted">{t.reps}</div>
            </div>
            <div className="rounded-xl bg-washi px-1 py-3">
              <div className="text-sm font-semibold">{card.lapses}</div>
              <div className="mt-0.5 text-xs text-muted">{t.lapses}</div>
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-muted">
            {t.nextReview}{' '}
            <span className="font-medium text-sumi">
              {card.nextReview <= now
                ? t.dueNow
                : t.inDuration(formatDuration(card.nextReview - now))}
            </span>
          </p>

          {history.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
                {t.recentAnswers}
              </h3>
              <ul className="mt-2 divide-y divide-hairline">
                {history.map((h, i) => (
                  <li key={`${h.ts}-${i}`} className="flex items-center gap-3 py-2">
                    <span
                      className={`w-14 rounded-full px-2 py-0.5 text-center text-xs font-medium ${RATING_CHIPS[h.rating]}`}
                    >
                      {t.ratings[h.rating]}
                    </span>
                    <span className="flex-1 text-xs capitalize text-muted">
                      {t.phases[h.phase]}
                    </span>
                    <span className="text-xs text-muted">{relativeDay(h.ts, now, t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : (
        <div className="mt-6 rounded-xl bg-washi p-4 text-center text-sm text-muted">
          {t.notStudied}
        </div>
      )}
    </div>
  )
}

export default function KanaChartPage() {
  const cards = useStore((s) => s.cards)
  const t = STR[useLang()]
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
      <PageHeader title="Kana Chart" jp="五十音" subtitle={t.subtitle} backTo="/" />

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
          <section key={sec.key} aria-label={t.sectionAria(t.groups[sec.key])}>
            <div className="mb-3 flex items-center gap-3">
              <h2 className="text-base font-semibold">{t.groups[sec.key]}</h2>
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
            ? `${selected.script === 'hiragana' ? 'Hiragana' : 'Katakana'} · ${
                t.groups[selected.group as ChartGroup] ?? t.kanji
              }`
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
