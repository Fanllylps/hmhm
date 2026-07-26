/** Local-timezone day key, e.g. "2026-07-26". */
export function dayKey(ts: number = Date.now()): string {
  const d = new Date(ts)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

export interface DayActivity {
  reviews: number
  correct: number
}

/**
 * Current streak: consecutive days with at least one review, counting back
 * from today (or from yesterday if today has no activity yet).
 */
export function computeStreak(activity: Record<string, DayActivity>, now: number = Date.now()): number {
  const active = (ts: number) => (activity[dayKey(ts)]?.reviews ?? 0) > 0
  let cursor = now
  if (!active(cursor)) cursor = addDays(cursor, -1)
  let streak = 0
  while (active(cursor)) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}
