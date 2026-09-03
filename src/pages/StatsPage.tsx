import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { studyEntry } from '../data/study'
import { addDays, dayKey } from '../lib/dates'
import { dateLocale, meaningFor, useLang } from '../lib/i18n'
import { leechPool } from '../lib/practice'
import { isDue, isLeech, maturityOf, type Maturity } from '../lib/srs'
import { activePool, useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Statistics',
  subtitle: 'Forecast, trouble spots, and how your deck is maturing',
  forecast: 'Review forecast',
  forecastAside: 'next 30 days',
  dueNow: (n: number) => `${n} due right now`,
  quiet: 'Nothing scheduled in the next 30 days — review some cards first.',
  maturity: 'Deck maturity',
  maturityLabels: { new: 'New', learning: 'Learning', young: 'Young', mature: 'Mature' } as Record<
    Maturity,
    string
  >,
  retention: 'Retention',
  retentionAside: 'last 30 days',
  retentionBody: (correct: number, total: number) => `${correct} correct of ${total} answers`,
  noAnswers: 'No answers in the last 30 days yet.',
  hardest: 'Hardest cards',
  hardestAside: 'most lapses',
  lapses: (n: number) => `${n} lapse${n === 1 ? '' : 's'}`,
  misses: (n: number) => `${n} misses`,
  leech: 'Leech',
  drillLeeches: 'Drill leeches →',
  noLapses: 'No lapses yet — nothing is giving you trouble. 頑張って!',
}

const ID: typeof EN = {
  title: 'Statistik',
  subtitle: 'Prakiraan, titik lemah, dan perkembangan deck-mu',
  forecast: 'Prakiraan review',
  forecastAside: '30 hari ke depan',
  dueNow: (n: number) => `${n} jatuh tempo sekarang`,
  quiet: 'Tidak ada jadwal dalam 30 hari ke depan — review dulu beberapa kartu.',
  maturity: 'Kematangan deck',
  maturityLabels: { new: 'Baru', learning: 'Belajar', young: 'Muda', mature: 'Matang' },
  retention: 'Retensi',
  retentionAside: '30 hari terakhir',
  retentionBody: (correct: number, total: number) => `${correct} benar dari ${total} jawaban`,
  noAnswers: 'Belum ada jawaban dalam 30 hari terakhir.',
  hardest: 'Kartu tersulit',
  hardestAside: 'paling sering lupa',
  lapses: (n: number) => `${n}× lupa`,
  misses: (n: number) => `${n}× salah`,
  leech: 'Bandel',
  drillLeeches: 'Drill kartu bandel →',
  noLapses: 'Belum ada yang bikin kesulitan — mantap. 頑張って!',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const MATURITY_BAR: Record<Maturity, string> = {
  new: 'bg-hairline',
  learning: 'bg-vermilion/50',
  young: 'bg-matcha/45',
  mature: 'bg-matcha',
}

function Card({ title, aside, children }: { title: string; aside?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-soft">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

export default function StatsPage() {
  const lang = useLang()
  const t = STR[lang]
  const cards = useStore((s) => s.cards)
  const settings = useStore((s) => s.settings)
  const activity = useStore((s) => s.activity)
  const customVocab = useStore((s) => s.customVocab)

  const now = Date.now()

  const pool = useMemo(() => activePool(settings, customVocab), [settings, customVocab])
  const poolCards = useMemo(
    () => pool.map((e) => cards[e.id]).filter((c) => c !== undefined),
    [pool, cards],
  )

  // ---- Forecast: reviews per day for the next 30 days ----
  const forecast = useMemo(() => {
    const days = Array.from({ length: 30 }, (_, i) => ({
      key: dayKey(addDays(now, i)),
      ts: addDays(now, i),
      count: 0,
    }))
    const index = new Map(days.map((d, i) => [d.key, i]))
    let overdue = 0
    for (const c of poolCards) {
      if (c.phase === 'new') continue
      if (isDue(c, now)) {
        overdue += 1
        days[0].count += 1
        continue
      }
      const i = index.get(dayKey(c.nextReview))
      if (i !== undefined) days[i].count += 1
    }
    return { days, overdue, max: Math.max(...days.map((d) => d.count)) }
  }, [poolCards, now])

  // ---- Maturity breakdown ----
  const maturity = useMemo(() => {
    const counts: Record<Maturity, number> = { new: 0, learning: 0, young: 0, mature: 0 }
    for (const e of pool) counts[maturityOf(cards[e.id])] += 1
    return counts
  }, [pool, cards])
  const poolTotal = pool.length || 1

  // ---- Retention over the last 30 days ----
  const retention = useMemo(() => {
    let total = 0
    let correct = 0
    for (let i = 0; i < 30; i++) {
      const day = activity[dayKey(addDays(now, -i))]
      if (day) {
        total += day.reviews
        correct += day.correct
      }
    }
    return { total, correct, pct: total === 0 ? null : Math.round((correct / total) * 100) }
  }, [activity, now])

  // ---- Hardest cards ----
  const hardest = useMemo(
    () =>
      Object.values(cards)
        .filter((c) => c.lapses > 0)
        .sort((a, b) => b.lapses - a.lapses)
        .slice(0, 8)
        .map((c) => ({
          card: c,
          entry: studyEntry(c.id, customVocab),
          misses: c.history.filter((h) => h.rating === 'again').length,
        }))
        .filter((h) => h.entry !== undefined),
    [cards, customVocab],
  )

  // ---- Leech drill: enough lapse-heavy kana/kanji for a focused Quiz? ----
  const leeches = useMemo(() => leechPool(cards), [cards])

  const locale = dateLocale(lang)

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5">
      <PageHeader title={t.title} jp="統計" subtitle={t.subtitle} backTo="/" />

      <Card title={t.forecast} aside={t.forecastAside}>
        {forecast.max === 0 ? (
          <p className="text-sm text-muted">{t.quiet}</p>
        ) : (
          <>
            {forecast.overdue > 0 && (
              <p className="mb-3 text-xs font-medium text-vermilion">
                {t.dueNow(forecast.overdue)}
              </p>
            )}
            <div className="flex h-28 items-end gap-[3px]">
              {forecast.days.map((d, i) => (
                <div
                  key={d.key}
                  className="group relative flex-1"
                  title={`${new Date(d.ts).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}: ${d.count}`}
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{
                      height: d.count === 0 ? 2 : `${Math.max(8, (d.count / forecast.max) * 100)}%`,
                    }}
                    transition={{ delay: i * 0.012, duration: 0.3 }}
                    className={`w-full rounded-t-sm ${
                      i === 0 && forecast.overdue > 0 ? 'bg-vermilion/70' : d.count === 0 ? 'bg-hairline' : 'bg-matcha/70'
                    }`}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex justify-between text-[10px] text-muted">
              {[0, 7, 14, 21, 29].map((i) => (
                <span key={i}>
                  {new Date(forecast.days[i].ts).toLocaleDateString(locale, {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              ))}
            </div>
          </>
        )}
      </Card>

      <Card title={t.maturity}>
        <div className="flex h-3 overflow-hidden rounded-full">
          {(Object.keys(maturity) as Maturity[]).map((m) => (
            <div
              key={m}
              className={MATURITY_BAR[m]}
              style={{ width: `${(maturity[m] / poolTotal) * 100}%` }}
            />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm sm:grid-cols-4">
          {(Object.keys(maturity) as Maturity[]).map((m) => (
            <div key={m} className="flex items-center gap-2">
              <span aria-hidden className={`h-2.5 w-2.5 rounded-full ${MATURITY_BAR[m]}`} />
              <span className="text-muted">{t.maturityLabels[m]}</span>
              <span className="ml-auto font-semibold tabular-nums">{maturity[m]}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title={t.retention} aside={t.retentionAside}>
        {retention.pct === null ? (
          <p className="text-sm text-muted">{t.noAnswers}</p>
        ) : (
          <div className="flex items-center gap-4">
            <span className="text-4xl font-semibold tabular-nums">{retention.pct}%</span>
            <div className="flex-1">
              <div className="h-2 overflow-hidden rounded-full bg-hairline">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${retention.pct}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={`h-full rounded-full ${retention.pct >= 80 ? 'bg-matcha' : 'bg-vermilion/70'}`}
                />
              </div>
              <p className="mt-1.5 text-xs text-muted">
                {t.retentionBody(retention.correct, retention.total)}
              </p>
            </div>
          </div>
        )}
      </Card>

      <Card title={t.hardest} aside={t.hardestAside}>
        {hardest.length === 0 ? (
          <p className="text-sm text-muted">{t.noLapses}</p>
        ) : (
          <>
            {leeches.length >= 2 && (
              <Link
                to="/practice/quiz?drill=leech"
                className="mb-3 block rounded-xl bg-vermilion px-4 py-2.5 text-center text-sm font-semibold text-surface transition-transform active:scale-[0.98]"
              >
                {t.drillLeeches}
              </Link>
            )}
            <div className="divide-y divide-hairline">
              {hardest.map(({ card, entry, misses }) => (
                <div key={card.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <span className="w-14 shrink-0 font-kana text-2xl leading-none">
                    {entry!.kana}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {entry!.romaji}
                      {isLeech(card) && (
                        <span className="rounded-full bg-vermilion/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-vermilion">
                          {t.leech}
                        </span>
                      )}
                    </div>
                    {entry!.meaning && (
                      <div className="truncate text-xs text-muted">{meaningFor(entry!, lang)}</div>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-vermilion">{t.lapses(card.lapses)}</div>
                    <div className="text-xs text-muted">{t.misses(misses)}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  )
}
