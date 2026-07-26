import { describe, expect, it } from 'vitest'
import { matchStroke, polylineLength, resample, type Pt } from './strokeMatch'

const line = (x1: number, y1: number, x2: number, y2: number, steps = 10): Pt[] =>
  Array.from({ length: steps + 1 }, (_, i) => ({
    x: x1 + ((x2 - x1) * i) / steps,
    y: y1 + ((y2 - y1) * i) / steps,
  }))

describe('resample', () => {
  it('returns exactly n evenly spaced points', () => {
    const pts = resample(line(0, 0, 100, 0), 5)
    expect(pts).toHaveLength(5)
    expect(pts[0]).toEqual({ x: 0, y: 0 })
    expect(pts[4].x).toBeCloseTo(100)
    expect(pts[2].x).toBeCloseTo(50, 0)
  })

  it('handles degenerate input', () => {
    expect(resample([], 4)).toEqual([])
    expect(resample([{ x: 3, y: 3 }], 3)).toHaveLength(3)
  })
})

describe('polylineLength', () => {
  it('sums segment lengths', () => {
    expect(polylineLength(line(0, 0, 30, 40))).toBeCloseTo(50)
  })
})

describe('matchStroke', () => {
  const ref = line(10, 10, 90, 90)

  it('accepts a close parallel stroke', () => {
    const v = matchStroke(line(13, 8, 92, 88), ref)
    expect(v.ok).toBe(true)
  })

  it('rejects a stroke drawn in the reverse direction', () => {
    const v = matchStroke(line(90, 90, 10, 10), ref)
    expect(v.ok).toBe(false)
    expect(v.reason).toBe('wrong-start')
  })

  it('rejects a stroke far away', () => {
    const v = matchStroke(line(10, 60, 90, 140), ref)
    expect(v.ok).toBe(false)
  })

  it('rejects a tiny scribble', () => {
    const v = matchStroke(line(10, 10, 14, 12, 2), ref)
    expect(v.ok).toBe(false)
    expect(['too-short', 'wrong-length']).toContain(v.reason)
  })

  it('rejects the right line drawn with the wrong shape', () => {
    // big detour bulging away from the diagonal
    const detour: Pt[] = [...line(10, 10, 50, 90, 5), ...line(50, 90, 90, 90, 5)]
    const v = matchStroke(detour, ref)
    expect(v.ok).toBe(false)
  })
})
