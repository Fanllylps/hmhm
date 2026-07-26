import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { addDays, dayKey, type DayActivity } from '../../lib/dates'
import { dateLocale, useLang, type Lang } from '../../lib/i18n'

const DAYS = 14

const EN = {
  barTitle: (count: number, date: string) =>
    `${count} review${count === 1 ? '' : 's'} on ${date}`,
  empty: 'No reviews in the last two weeks — your next session will draw the first bar.',
}

const ID: typeof EN = {
  barTitle: (count: number, date: string) => `${count} review pada ${date}`,
  empty: 'Belum ada review dalam dua minggu terakhir — sesi berikutnya akan menggambar batang pertamamu.',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/**
 * Reviews-per-day bar chart for the last two weeks — pure divs, matcha bars
 * normalized to the busiest day.
 */
export default function ReviewsChart({ activity }: { activity: Record<string, DayActivity> }) {
  const lang = useLang()
  const t = STR[lang]
  const locale = dateLocale(lang)

  const days = useMemo(() => {
    const now = Date.now()
    return Array.from({ length: DAYS }, (_, i) => {
      const ts = addDays(now, i - (DAYS - 1))
      const d = new Date(ts)
      const count = activity[dayKey(ts)]?.reviews ?? 0
      return {
        key: dayKey(ts),
        count,
        weekday: d.toLocaleDateString(locale, { weekday: 'narrow' }),
        title: t.barTitle(
          count,
          d.toLocaleDateString(locale, { month: 'short', day: 'numeric' }),
        ),
        isToday: i === DAYS - 1,
      }
    })
  }, [activity, locale, t])

  const max = Math.max(...days.map((d) => d.count))

  if (max === 0) {
    return <p className="py-8 text-center text-sm text-muted">{t.empty}</p>
  }

  return (
    <div className="flex items-end gap-1.5 sm:gap-2">
      {days.map((d, i) => (
        <div key={d.key} title={d.title} className="flex min-w-0 flex-1 flex-col items-center">
          <div className="flex h-24 w-full flex-col items-center justify-end">
            {d.count > 0 && (
              <span className="mb-1 text-[10px] leading-none text-muted tabular-nums">
                {d.count}
              </span>
            )}
            {d.count > 0 ? (
              <motion.div
                initial={{ height: 0 }}
                // Cap at 80% so the count label always fits above the tallest bar.
                animate={{ height: `${6 + (d.count / max) * 74}%` }}
                transition={{ duration: 0.45, ease: 'easeOut', delay: i * 0.02 }}
                className="w-full max-w-[22px] rounded-t-[4px] bg-matcha"
              />
            ) : (
              <div className="h-[3px] w-full max-w-[22px] rounded-full bg-hairline" />
            )}
          </div>
          <span
            aria-hidden
            className={`mt-1.5 text-[10px] leading-none ${
              d.isToday ? 'font-semibold text-sumi' : 'text-muted'
            }`}
          >
            {d.weekday}
          </span>
        </div>
      ))}
    </div>
  )
}
