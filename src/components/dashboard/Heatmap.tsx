import { useEffect, useMemo, useRef } from 'react'
import { addDays, dayKey, type DayActivity } from '../../lib/dates'

const WEEKS = 16
/** Cell size (12px) + column gap (3px) — used to place month labels. */
const COL_PITCH = 15
/** Day-label gutter (w-8 = 32px) + first column gap (3px). */
const GUTTER = 35

const LEVEL_CLASSES = [
  'bg-hairline/60',
  'bg-matcha/30',
  'bg-matcha/55',
  'bg-matcha/80',
  'bg-matcha',
]

function levelClass(count: number): string {
  if (count === 0) return LEVEL_CLASSES[0]
  if (count < 5) return LEVEL_CLASSES[1]
  if (count < 15) return LEVEL_CLASSES[2]
  if (count < 30) return LEVEL_CLASSES[3]
  return LEVEL_CLASSES[4]
}

interface Cell {
  key: string
  count: number
  title: string
  future: boolean
}

interface Week {
  /** Month label shown above this column when a new month starts here. */
  month: string | null
  days: Cell[]
}

/**
 * GitHub-style activity heatmap: the last 16 weeks as columns, Mon–Sun rows,
 * cells shaded by that day's review count.
 */
export default function Heatmap({ activity }: { activity: Record<string, DayActivity> }) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const weeks = useMemo<Week[]>(() => {
    const now = Date.now()
    // Monday of the current week (getDay: 0 = Sun … 6 = Sat).
    const thisMonday = addDays(now, -((new Date(now).getDay() + 6) % 7))
    let prevMonth = new Date(addDays(thisMonday, -WEEKS * 7)).getMonth()
    return Array.from({ length: WEEKS }, (_, i) => {
      const monday = addDays(thisMonday, (i - (WEEKS - 1)) * 7)
      const mondayDate = new Date(monday)
      const month = mondayDate.getMonth()
      const label =
        month === prevMonth
          ? null
          : mondayDate.toLocaleDateString(undefined, { month: 'short' })
      prevMonth = month
      return {
        month: label,
        days: Array.from({ length: 7 }, (_, d) => {
          const ts = addDays(monday, d)
          const count = activity[dayKey(ts)]?.reviews ?? 0
          const date = new Date(ts).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          return {
            key: dayKey(ts),
            count,
            title: `${count} review${count === 1 ? '' : 's'} on ${date}`,
            future: ts > now,
          }
        }),
      }
    })
  }, [activity])

  // Start scrolled to the most recent weeks on narrow screens.
  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollLeft = el.scrollWidth
  }, [])

  return (
    <div>
      <div ref={scrollRef} className="overflow-x-auto pb-1">
        <div className="w-max">
          <div aria-hidden className="relative h-4" style={{ marginLeft: GUTTER }}>
            {weeks.map(
              (week, i) =>
                week.month && (
                  <span
                    key={i}
                    className="absolute top-0 text-[10px] leading-none text-muted"
                    style={{ left: i * COL_PITCH }}
                  >
                    {week.month}
                  </span>
                ),
            )}
          </div>
          <div className="flex gap-[3px]">
            <div aria-hidden className="flex w-8 flex-col gap-[3px]">
              {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => (
                <div key={i} className="flex h-3 items-center text-[9px] leading-none text-muted">
                  {d}
                </div>
              ))}
            </div>
            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-[3px]">
                {week.days.map((cell) =>
                  cell.future ? (
                    <div key={cell.key} className="h-3 w-3" />
                  ) : (
                    <div
                      key={cell.key}
                      title={cell.title}
                      className={`h-3 w-3 rounded-[3px] ${levelClass(cell.count)}`}
                    />
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[10px] text-muted">
        <span className="mr-0.5">Less</span>
        {LEVEL_CLASSES.map((c) => (
          <span key={c} aria-hidden className={`h-3 w-3 rounded-[3px] ${c}`} />
        ))}
        <span className="ml-0.5">More</span>
      </div>
    </div>
  )
}
