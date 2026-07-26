import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { loadStrokes } from '../lib/strokes'

/**
 * Animated stroke-order diagram for a single glyph, drawn from KanjiVG
 * data (© Ulrich Apel, CC BY-SA 3.0 — served locally from /strokes).
 */

const STROKE_SECONDS = 0.55
const STROKE_GAP = 0.25

export default function StrokeOrder({ char, size = 130 }: { char: string; size?: number }) {
  const [strokes, setStrokes] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)
  /** Bumped by the replay button to restart the draw animation. */
  const [run, setRun] = useState(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setStrokes(null)
    loadStrokes(char)
      .then((parsed) => {
        if (!cancelled) setStrokes(parsed)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [char])

  if (failed) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-xl border border-hairline bg-washi text-center"
        style={{ width: size, height: size }}
      >
        <span aria-hidden className="font-kana text-3xl text-muted">
          {char}
        </span>
        <span className="mt-1 px-2 text-[10px] text-muted">stroke data unavailable</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div
        className="relative rounded-xl border border-hairline bg-washi"
        style={{ width: size, height: size }}
        role="img"
        aria-label={`Stroke order for ${char}`}
      >
        {strokes && (
          <svg viewBox="0 0 109 109" className="absolute inset-0 h-full w-full p-1.5">
            {/* faint guide of the finished glyph */}
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-hairline"
            >
              {strokes.map((d, i) => (
                <path key={`guide-${i}`} d={d} />
              ))}
            </g>
            {/* animated strokes, drawn one after another */}
            <g
              key={run}
              fill="none"
              stroke="currentColor"
              strokeWidth={4}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-sumi"
            >
              {strokes.map((d, i) => (
                <motion.path
                  key={i}
                  d={d}
                  initial={reduced ? { pathLength: 1 } : { pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={
                    reduced
                      ? { duration: 0 }
                      : {
                          duration: STROKE_SECONDS,
                          delay: i * (STROKE_SECONDS + STROKE_GAP),
                          ease: 'easeInOut',
                        }
                  }
                />
              ))}
            </g>
          </svg>
        )}
        {!strokes && (
          <span className="absolute inset-0 flex items-center justify-center font-kana text-2xl text-hairline">
            {char}
          </span>
        )}
      </div>
      <button
        onClick={() => setRun((r) => r + 1)}
        className="rounded-full border border-hairline px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-sumi"
      >
        ↻ Replay{strokes ? ` · ${strokes.length} strokes` : ''}
      </button>
    </div>
  )
}
