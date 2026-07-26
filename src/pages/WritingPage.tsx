import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import EmptyState from '../components/EmptyState'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { speak } from '../lib/audio'
import { shuffle, usePracticePool } from '../lib/practice'
import { loadStrokes } from '../lib/strokes'
import { matchStroke, type Pt } from '../lib/strokeMatch'
import { useStore } from '../stores/store'

const VIEW = 109 // KanjiVG coordinate space

interface RefStroke {
  d: string
  pts: Pt[]
}

/** Sample a KanjiVG path into a polyline via a throwaway DOM path element. */
function samplePath(d: string, n = 32): Pt[] {
  const ns = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(ns, 'svg')
  svg.style.position = 'absolute'
  svg.style.visibility = 'hidden'
  svg.style.width = '0'
  svg.style.height = '0'
  const path = document.createElementNS(ns, 'path')
  path.setAttribute('d', d)
  svg.appendChild(path)
  document.body.appendChild(svg)
  const len = path.getTotalLength()
  const pts = Array.from({ length: n }, (_, i) => {
    const p = path.getPointAtLength((len * i) / (n - 1))
    return { x: p.x, y: p.y }
  })
  svg.remove()
  return pts
}

const polyline = (pts: Pt[]) => pts.map((p) => `${p.x},${p.y}`).join(' ')

export default function WritingPage() {
  const fullPool = usePracticePool()
  const recordPractice = useStore((s) => s.recordPractice)

  // Only single glyphs are drawable (yōon digraphs are their component glyphs).
  const pool = useMemo(() => fullPool.filter((e) => [...e.kana].length === 1), [fullPool])

  const [phase, setPhase] = useState<'idle' | 'playing'>('idle')
  const [entry, setEntry] = useState<KanaEntry | null>(null)
  const [strokes, setStrokes] = useState<RefStroke[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [strokeIndex, setStrokeIndex] = useState(0)
  const [drawing, setDrawing] = useState<Pt[]>([])
  const [wrongFlash, setWrongFlash] = useState(0)
  const [showHint, setShowHint] = useState(false)
  const [ghost, setGhost] = useState(true)
  const [glyphDone, setGlyphDone] = useState(false)
  const [completed, setCompleted] = useState(0)
  const [perfect, setPerfect] = useState(0)
  const [seq, setSeq] = useState(0)

  const deckRef = useRef<KanaEntry[]>([])
  const mistakesRef = useRef(0)
  const strokeFailsRef = useRef(0)
  const drawingRef = useRef<Pt[]>([])
  const activePointer = useRef<number | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const timerRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current)
    },
    [],
  )

  const nextEntry = useCallback(() => {
    if (deckRef.current.length === 0) deckRef.current = shuffle(pool)
    const e = deckRef.current.pop()!
    mistakesRef.current = 0
    strokeFailsRef.current = 0
    setEntry(e)
    setStrokes(null)
    setLoadFailed(false)
    setStrokeIndex(0)
    setDrawing([])
    setShowHint(false)
    setGlyphDone(false)
    setSeq((s) => s + 1)
  }, [pool])

  // Load + sample stroke data whenever the glyph changes.
  useEffect(() => {
    if (!entry) return
    let cancelled = false
    loadStrokes(entry.kana)
      .then((paths) => {
        if (cancelled) return
        setStrokes(paths.map((d) => ({ d, pts: samplePath(d) })))
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [entry])

  const start = useCallback(() => {
    deckRef.current = shuffle(pool)
    setCompleted(0)
    setPerfect(0)
    setPhase('playing')
    nextEntry()
  }, [pool, nextEntry])

  const finishGlyph = useCallback(() => {
    if (!entry) return
    setGlyphDone(true)
    const ok = mistakesRef.current <= 1
    recordPractice(entry.id, ok)
    speak(entry.kana, useStore.getState().settings.audio)
    setCompleted((n) => n + 1)
    if (mistakesRef.current === 0) setPerfect((n) => n + 1)
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      nextEntry()
    }, 1100)
  }, [entry, recordPractice, nextEntry])

  const toView = useCallback((clientX: number, clientY: number): Pt => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((clientX - rect.left) / rect.width) * VIEW,
      y: ((clientY - rect.top) / rect.height) * VIEW,
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!strokes || glyphDone || activePointer.current !== null) return
      activePointer.current = e.pointerId
      svgRef.current?.setPointerCapture(e.pointerId)
      const p = toView(e.clientX, e.clientY)
      drawingRef.current = [p]
      setDrawing([p])
    },
    [strokes, glyphDone, toView],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (activePointer.current !== e.pointerId) return
      const p = toView(e.clientX, e.clientY)
      const last = drawingRef.current[drawingRef.current.length - 1]
      if (last && Math.hypot(p.x - last.x, p.y - last.y) < 0.7) return
      drawingRef.current = [...drawingRef.current, p]
      setDrawing(drawingRef.current)
    },
    [toView],
  )

  const onPointerUp = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (activePointer.current !== e.pointerId) return
      activePointer.current = null
      const user = drawingRef.current
      drawingRef.current = []
      setDrawing([])
      if (!strokes || glyphDone) return
      const verdict = matchStroke(user, strokes[strokeIndex].pts, VIEW)
      if (verdict.ok) {
        strokeFailsRef.current = 0
        setShowHint(false)
        const next = strokeIndex + 1
        setStrokeIndex(next)
        if (next >= strokes.length) finishGlyph()
      } else {
        mistakesRef.current += 1
        strokeFailsRef.current += 1
        setWrongFlash((n) => n + 1)
        if (strokeFailsRef.current >= 2) setShowHint(true)
      }
    },
    [strokes, glyphDone, strokeIndex, finishGlyph],
  )

  const skip = useCallback(() => {
    if (!entry) return
    if (timerRef.current !== null) return
    recordPractice(entry.id, false)
    nextEntry()
  }, [entry, recordPractice, nextEntry])

  const restartGlyph = useCallback(() => {
    if (timerRef.current !== null) return
    mistakesRef.current = 0
    strokeFailsRef.current = 0
    setStrokeIndex(0)
    setDrawing([])
    setShowHint(false)
  }, [])

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (phase === 'idle' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault()
          start()
        }
      },
      [phase, start],
    ),
  )

  if (pool.length === 0) {
    return (
      <div className="mx-auto max-w-md">
        <PageHeader title="Writing" jp="書く" backTo="/practice" />
        <EmptyState title="No kana in your pool">
          Enable at least one kana group in Settings first.
        </EmptyState>
      </div>
    )
  }

  if (phase === 'idle') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader
          title="Writing"
          jp="書く"
          subtitle="Draw each stroke in the right order and direction"
          backTo="/practice"
        />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-hairline bg-surface px-6 py-14 text-center shadow-soft"
        >
          <span aria-hidden className="font-kana text-6xl">
            筆
          </span>
          <h2 className="mt-5 text-xl font-semibold">Learn by writing</h2>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
            You hear the sound and see the rōmaji — draw the character stroke by stroke with your
            finger. Wrong strokes shake; two misses reveal a hint. {pool.length} characters in your
            pool.
          </p>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={start}
            className="mt-8 w-full max-w-xs rounded-2xl bg-vermilion px-6 py-4 font-medium text-surface"
          >
            Start writing
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (!entry) return null

  const total = strokes?.length ?? 0

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Writing"
        jp="書く"
        subtitle={`${completed} written · ${perfect} perfect`}
        backTo="/practice"
      />

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={seq}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
        >
          {/* Prompt */}
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="text-3xl font-semibold tracking-wide">{entry.romaji}</span>
            {entry.meaning && <span className="text-sm text-muted">{entry.meaning}</span>}
            <button
              onClick={() => speak(entry.kana, useStore.getState().settings.audio)}
              aria-label="Play audio"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-hairline text-muted transition-colors hover:text-sumi"
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
            </button>
          </div>

          {/* Canvas */}
          <motion.div
            animate={wrongFlash > 0 ? { x: [0, -6, 6, -3, 0] } : {}}
            key={`shake-${wrongFlash}`}
            transition={{ duration: 0.3 }}
            className={`relative mx-auto aspect-square w-full max-w-[340px] overflow-hidden rounded-2xl border bg-surface shadow-soft transition-colors ${
              glyphDone ? 'border-matcha' : 'border-hairline'
            }`}
          >
            <svg
              ref={svgRef}
              viewBox={`0 0 ${VIEW} ${VIEW}`}
              className="h-full w-full touch-none select-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            >
              {/* guide grid */}
              <g stroke="currentColor" strokeWidth="0.5" className="text-hairline" strokeDasharray="2 3">
                <line x1={VIEW / 2} y1="4" x2={VIEW / 2} y2={VIEW - 4} />
                <line x1="4" y1={VIEW / 2} x2={VIEW - 4} y2={VIEW / 2} />
              </g>
              {strokes && (
                <>
                  {/* ghost of the full glyph */}
                  {ghost && (
                    <g
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-hairline"
                    >
                      {strokes.map((s, i) => (
                        <path key={i} d={s.d} />
                      ))}
                    </g>
                  )}
                  {/* accepted strokes snap to the reference shape */}
                  <g
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={glyphDone ? 'text-matcha' : 'text-sumi'}
                  >
                    {strokes.slice(0, strokeIndex).map((s, i) => (
                      <motion.path
                        key={i}
                        d={s.d}
                        initial={{ opacity: 0.4 }}
                        animate={{ opacity: 1 }}
                      />
                    ))}
                  </g>
                  {/* hint: animate the expected next stroke */}
                  {showHint && strokeIndex < strokes.length && !glyphDone && (
                    <motion.path
                      d={strokes[strokeIndex].d}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="text-vermilion/70"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 0.9, repeat: Infinity, repeatDelay: 0.5 }}
                    />
                  )}
                  {/* start-point dot for the next stroke */}
                  {!glyphDone && strokeIndex < strokes.length && (
                    <motion.circle
                      cx={strokes[strokeIndex].pts[0].x}
                      cy={strokes[strokeIndex].pts[0].y}
                      r="3"
                      className="fill-vermilion/60"
                      animate={{ scale: [1, 1.4, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                    />
                  )}
                </>
              )}
              {/* live drawing */}
              {drawing.length > 1 && (
                <polyline
                  points={polyline(drawing)}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="4.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-sumi/80"
                />
              )}
            </svg>

            {!strokes && !loadFailed && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted">
                Loading strokes…
              </div>
            )}
            {loadFailed && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted">
                Stroke data unavailable
                <button onClick={skip} className="font-medium text-vermilion">
                  Skip →
                </button>
              </div>
            )}
            {glyphDone && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute right-3 top-3 rounded-full bg-matcha/15 px-2.5 py-1 text-xs font-semibold text-matcha"
              >
                {mistakesRef.current === 0 ? 'Perfect!' : 'Done'}
              </motion.div>
            )}
          </motion.div>

          {/* stroke progress + controls */}
          <div className="mt-4 flex items-center justify-center gap-1.5" aria-hidden>
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 w-4 rounded-full transition-colors ${
                  i < strokeIndex ? 'bg-matcha' : 'bg-hairline'
                }`}
              />
            ))}
            {total > 0 && (
              <span className="ml-2 text-xs tabular-nums text-muted">
                {Math.min(strokeIndex + 1, total)} / {total}
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={restartGlyph}
              className="min-h-[44px] rounded-xl border border-hairline px-4 text-sm font-medium text-muted transition-colors hover:text-sumi"
            >
              Clear
            </button>
            <button
              onClick={() => setGhost((g) => !g)}
              aria-pressed={ghost}
              className={`min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors ${
                ghost
                  ? 'border-sumi bg-sumi text-surface'
                  : 'border-hairline text-muted hover:text-sumi'
              }`}
            >
              Ghost {ghost ? 'on' : 'off'}
            </button>
            <button
              onClick={skip}
              className="min-h-[44px] rounded-xl border border-hairline px-4 text-sm font-medium text-muted transition-colors hover:text-sumi"
            >
              Skip
            </button>
          </div>
          <p className="mt-3 text-center text-xs text-muted">
            Start each stroke at the pulsing dot · direction matters
          </p>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
