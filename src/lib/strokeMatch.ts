/**
 * Stroke matching for the writing-practice mode. Pure geometry — the DOM-side
 * sampling of KanjiVG paths happens in the component; here we only compare
 * polylines in the 109×109 KanjiVG coordinate space.
 */

export interface Pt {
  x: number
  y: number
}

const dist = (a: Pt, b: Pt) => Math.hypot(a.x - b.x, a.y - b.y)

export function polylineLength(points: Pt[]): number {
  let total = 0
  for (let i = 1; i < points.length; i++) total += dist(points[i - 1], points[i])
  return total
}

/** Resample a polyline to `n` points spaced evenly along its arc length. */
export function resample(points: Pt[], n: number): Pt[] {
  if (points.length === 0) return []
  if (points.length === 1) return Array.from({ length: n }, () => ({ ...points[0] }))
  const total = polylineLength(points)
  if (total === 0) return Array.from({ length: n }, () => ({ ...points[0] }))
  const step = total / (n - 1)
  const out: Pt[] = [{ ...points[0] }]
  let acc = 0
  let i = 1
  let prev = points[0]
  while (out.length < n - 1 && i < points.length) {
    const d = dist(prev, points[i])
    if (acc + d >= step) {
      const t = (step - acc) / d
      const p = { x: prev.x + (points[i].x - prev.x) * t, y: prev.y + (points[i].y - prev.y) * t }
      out.push(p)
      prev = p
      acc = 0
    } else {
      acc += d
      prev = points[i]
      i += 1
    }
  }
  while (out.length < n - 1) out.push({ ...points[points.length - 1] })
  out.push({ ...points[points.length - 1] })
  return out
}

export interface StrokeVerdict {
  ok: boolean
  /** Mean distance between corresponding resampled points. */
  avgDist: number
  reason: 'ok' | 'too-short' | 'wrong-start' | 'wrong-end' | 'wrong-shape' | 'wrong-length'
}

/**
 * Compare a drawn stroke against the reference stroke. Deliberately generous —
 * fingers on phone screens are wobbly — but strict about direction (start/end)
 * because stroke direction is the thing being taught.
 */
export function matchStroke(user: Pt[], ref: Pt[], size = 109): StrokeVerdict {
  const fail = (reason: StrokeVerdict['reason']): StrokeVerdict => ({
    ok: false,
    avgDist: Infinity,
    reason,
  })
  if (user.length < 2) return fail('too-short')

  const refLen = polylineLength(ref)
  const userLen = polylineLength(user)
  if (userLen < Math.min(4, refLen * 0.25)) return fail('too-short')
  const ratio = userLen / Math.max(refLen, 1)
  if (ratio < 0.4 || ratio > 2.6) return fail('wrong-length')

  const endTol = size * 0.28
  if (dist(user[0], ref[0]) > endTol) return fail('wrong-start')
  if (dist(user[user.length - 1], ref[ref.length - 1]) > endTol) return fail('wrong-end')

  const N = 24
  const u = resample(user, N)
  const r = resample(ref, N)
  let sum = 0
  let max = 0
  for (let i = 0; i < N; i++) {
    const d = dist(u[i], r[i])
    sum += d
    if (d > max) max = d
  }
  const avgDist = sum / N
  // Average catches generally-off strokes; the max catches a big detour on an
  // otherwise-close path (right endpoints, wrong shape in the middle).
  if (avgDist > size * 0.17 || max > size * 0.24) {
    return { ok: false, avgDist, reason: 'wrong-shape' }
  }
  return { ok: true, avgDist, reason: 'ok' }
}
