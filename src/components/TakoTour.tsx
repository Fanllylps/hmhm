import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

/**
 * Tako's guided dashboard tour — a cute octopus coach walks new players
 * through the home screen, game-style. A vermilion spotlight glides between
 * targets ([data-tour] elements) while Tako explains each one.
 */

interface TourStep {
  /** [data-tour] key to spotlight; undefined = centered narration. */
  target?: string
}

const STEP_TARGETS: TourStep[] = [
  {},
  { target: 'review' },
  { target: 'level' },
  { target: 'stats' },
  { target: 'dock' },
  {},
]

const EN = {
  skip: 'Skip tour',
  steps: [
    {
      body: "Yo! I'm Tako 🐙 — your official KanaFlow guide! My mission: turn your brain into a kana machine. Ready?",
      btn: "Let's go!",
    },
    {
      body: 'This is your battle arena! ⚔️ Cards line up here every day — clear the queue and keep that brain sharp!',
      btn: 'Next!',
    },
    {
      body: 'Every answer drops XP! 💥 Level up from Newcomer to the legendary 仮名仙人… and collect secret hanko stamps on the way.',
      btn: 'Cool!',
    },
    {
      body: 'The streak 🔥 is your life bar. Study every day so the flame never dies — true masters guard it with their lives!',
      btn: 'Got it!',
    },
    {
      body: 'This dock takes you everywhere: Review, nine mini-games, the kana chart, stories, vocabulary… go poke around!',
      btn: 'Nice!',
    },
    {
      body: 'Mission start! Your first cards are already waiting. がんばって, kana warrior! 🐙🔥',
      btn: 'GO! 🔥',
    },
  ],
}

const ID: typeof EN = {
  skip: 'Lewati tur',
  steps: [
    {
      body: 'Yo! Aku Tako 🐙 — pemandu resmimu di KanaFlow! Misiku: mengubah otakmu jadi mesin kana. Siap?',
      btn: 'Gas!',
    },
    {
      body: 'Ini arena tempurmu! ⚔️ Tiap hari kartu-kartu antre di sini — habisi antreannya biar otak tetap tajam!',
      btn: 'Lanjut!',
    },
    {
      body: 'Setiap jawaban menjatuhkan XP! 💥 Naik level dari Newcomer sampai 仮名仙人 yang legendaris… sambil koleksi stempel hanko rahasia.',
      btn: 'Keren!',
    },
    {
      body: 'Streak 🔥 itu nyawamu. Belajar tiap hari biar apinya nggak padam — para master menjaganya mati-matian!',
      btn: 'Oke!',
    },
    {
      body: 'Dermaga ini bisa membawamu ke mana saja: Review, sembilan mini-game, bagan kana, cerita, kosakata… coba-coba semuanya!',
      btn: 'Sip!',
    },
    {
      body: 'Misi dimulai! Kartu pertamamu sudah menunggu. がんばって, pejuang kana! 🐙🔥',
      btn: 'GAS! 🔥',
    },
  ],
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/** The mascot: a vermilion octopus with a hachimaki, bobbing and blinking. */
function Tako({ size = 92 }: { size?: number }) {
  return (
    <motion.svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      animate={{ y: [0, -5, 0], rotate: [0, -2.5, 0, 2.5, 0] }}
      transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
      aria-hidden
    >
      {/* tentacles */}
      <g fill="#D0491F">
        <circle cx="26" cy="88" r="10" />
        <circle cx="43" cy="95" r="10" />
        <circle cx="60" cy="97" r="10" />
        <circle cx="77" cy="95" r="10" />
        <circle cx="94" cy="88" r="10" />
      </g>
      <g fill="#B23D18">
        <circle cx="26" cy="92" r="4" />
        <circle cx="43" cy="99" r="4" />
        <circle cx="60" cy="101" r="4" />
        <circle cx="77" cy="99" r="4" />
        <circle cx="94" cy="92" r="4" />
      </g>
      {/* head */}
      <ellipse cx="60" cy="52" rx="41" ry="39" fill="#D0491F" />
      {/* hachimaki headband */}
      <path d="M20 42 Q60 28 100 42 L100 52 Q60 38 20 52 Z" fill="#FFFDF6" />
      <circle cx="60" cy="41" r="5.5" fill="#D0491F" />
      {/* knot tails */}
      <path d="M99 44 q10 -6 14 -1 q-6 1 -8 6 z" fill="#FFFDF6" />
      <path d="M100 48 q11 0 13 6 q-7 0 -11 3 z" fill="#FFFDF6" />
      {/* eyes */}
      <circle cx="45" cy="60" r="9.5" fill="#FFFDF6" />
      <circle cx="75" cy="60" r="9.5" fill="#FFFDF6" />
      <motion.g
        animate={{ scaleY: [1, 1, 0.08, 1, 1] }}
        style={{ transformOrigin: '60px 60px' }}
        transition={{ duration: 3.8, times: [0, 0.46, 0.52, 0.58, 1], repeat: Infinity }}
      >
        <circle cx="47" cy="60" r="4.4" fill="#26231D" />
        <circle cx="77" cy="60" r="4.4" fill="#26231D" />
        <circle cx="48.6" cy="58.4" r="1.5" fill="#FFFDF6" />
        <circle cx="78.6" cy="58.4" r="1.5" fill="#FFFDF6" />
      </motion.g>
      {/* smile + cheeks */}
      <path d="M52 72 Q60 79 68 72" stroke="#FFFDF6" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      <circle cx="34" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />
      <circle cx="86" cy="68" r="5" fill="#FFFDF6" opacity="0.28" />
    </motion.svg>
  )
}

interface Rect {
  x: number
  y: number
  w: number
  h: number
}

function findTarget(key: string): Element | null {
  for (const el of document.querySelectorAll(`[data-tour="${key}"]`)) {
    if (el.getClientRects().length > 0) return el
  }
  return null
}

export default function TakoTour() {
  const completeTour = useStore((s) => s.completeTour)
  const lang = useLang()
  const t = STR[lang]
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)

  const measure = useCallback(() => {
    const key = STEP_TARGETS[step]?.target
    if (!key) {
      setRect(null)
      return
    }
    const el = findTarget(key)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    setRect({ x: r.left, y: r.top, w: r.width, h: r.height })
  }, [step])

  useEffect(() => {
    const key = STEP_TARGETS[step]?.target
    if (key) {
      const el = findTarget(key)
      // The dock is fixed — only in-flow targets need scrolling into view.
      if (el && getComputedStyle(el).position !== 'fixed') {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    const t1 = setTimeout(measure, 60)
    const t2 = setTimeout(measure, 480)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [step, measure])

  const last = step === STEP_TARGETS.length - 1
  const next = () => (last ? completeTour() : setStep((s) => s + 1))

  // Put the speech panel wherever the spotlight isn't.
  const panelOnTop =
    rect !== null && rect.y + rect.h / 2 > (typeof window !== 'undefined' ? window.innerHeight : 800) * 0.55

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Tour">
      {/* Dim layer: either a moving spotlight cut-out or a full backdrop. */}
      <AnimatePresence>
        {rect ? (
          <motion.div
            key="spot"
            initial={{ opacity: 0 }}
            animate={{
              opacity: 1,
              left: rect.x - 8,
              top: rect.y - 8,
              width: rect.w + 16,
              height: rect.h + 16,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 240, damping: 27 }}
            className="absolute rounded-2xl border-2 border-vermilion"
            style={{ boxShadow: '0 0 0 9999px rgba(15, 12, 8, 0.6)' }}
          />
        ) : (
          <motion.div
            key="dim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[rgba(15,12,8,0.6)]"
          />
        )}
      </AnimatePresence>

      {/* Speech panel */}
      <div
        className="absolute inset-x-0 px-4"
        style={
          panelOnTop
            ? { top: 'calc(env(safe-area-inset-top) + 20px)' }
            : { bottom: 'calc(env(safe-area-inset-bottom) + 20px)' }
        }
      >
        <div className="mx-auto flex max-w-md items-end gap-2">
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className="shrink-0"
          >
            <Tako />
          </motion.div>
          <div className="relative min-w-0 flex-1">
            {/* bubble tail */}
            <span
              aria-hidden
              className="absolute -left-1.5 bottom-7 h-4 w-4 rotate-45 rounded-sm bg-surface"
            />
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 10, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 380, damping: 28 }}
                className="relative rounded-2xl border border-hairline bg-surface p-4 shadow-lift"
              >
                <p className="text-[15px] leading-relaxed">{t.steps[step].body}</p>
                <div className="mt-3.5 flex items-center justify-between gap-3">
                  <button
                    onClick={completeTour}
                    className="whitespace-nowrap rounded-full px-2 py-1 text-xs font-medium text-muted transition-colors hover:text-sumi"
                  >
                    {t.skip}
                  </button>
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="flex gap-1">
                      {STEP_TARGETS.map((_, i) => (
                        <span
                          key={i}
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            i === step ? 'w-4 bg-vermilion' : 'w-1.5 bg-hairline'
                          }`}
                        />
                      ))}
                    </span>
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={next}
                      className="rounded-xl bg-vermilion px-4 py-2 text-sm font-semibold text-surface shadow-soft"
                    >
                      {t.steps[step].btn}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  )
}
