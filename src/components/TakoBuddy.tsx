import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useMotionValue } from 'framer-motion'
import Tako, { type TakoMood } from './Tako'
import { haptic } from '../lib/haptics'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

/**
 * Tako as a living desk pet on the dashboard: drag him anywhere (the spot is
 * remembered), he cycles through cute activities on his own — smiling,
 * giggling, typing on a tiny laptop, dozing off — and chats by himself every
 * so often. Tapping him never shows text; he just cracks up.
 */

interface BuddyStrings {
  aria: string
  due: (n: number) => string
  streak: (n: number) => string
  lines: string[]
}

const EN: BuddyStrings = {
  aria: 'Tako (drag me around!)',
  due: (n) => `${n} card${n === 1 ? '' : 's'} waiting in Review! Charge! ⚔️`,
  streak: (n) => `A ${n}-day streak?! You're a machine! 🔥`,
  lines: [
    'Fun fact: つ is a wave — "tsu"-nami! 🌊',
    'ん is the only kana with no vowel. Special kid. ✨',
    'Katakana is for loanwords — コーヒー is coffee! ☕',
    'Try Writing mode — your fingers need to memorize too! ✍️',
    "It's raining kana in Kana Rain. Bring a keyboard! 🌧️",
    'Mistakes are good — that card comes back sooner and sticks. 💪',
    'Ask an AI for new words on any topic in Vocabulary! 🤖',
    'Secret hanko stamps await you in Achievements… 印',
    "A little every day beats a lot once. Master's secret!",
    'がんばって! I believe in you! 🐙',
    'Bored? Stories has short reads with hidden meanings! 📖',
    'Tap any kana in the Chart to watch its strokes!',
    'Psst… you can drag me anywhere you like! 🐙',
  ],
}

const ID: BuddyStrings = {
  aria: 'Tako (seret aku ke mana saja!)',
  due: (n) => `Ada ${n} kartu menunggu di Review! Serbu! ⚔️`,
  streak: (n) => `Streak ${n} hari?! Kamu mesin! 🔥`,
  lines: [
    'Tahu nggak? つ itu kayak ombak — "tsu"-nami! 🌊',
    'ん satu-satunya kana tanpa vokal. Anak spesial. ✨',
    'Katakana buat kata serapan — コーヒー itu kopi! ☕',
    'Coba mode Menulis — jarimu juga harus hafal! ✍️',
    'Lagi hujan kana di Kana Rain. Bawa keyboard! 🌧️',
    'Salah itu bagus — kartunya balik lebih cepat biar nempel. 💪',
    'Minta AI bikin kosakata tema apa saja di menu Kosakata! 🤖',
    'Stempel hanko rahasia menantimu di Pencapaian… 印',
    'Sedikit tapi tiap hari, kalahkan banyak tapi sekali. Rahasia master!',
    'がんばって! Aku percaya sama kamu! 🐙',
    'Bosan? Ada bacaan pendek seru di menu Cerita! 📖',
    'Ketuk kana mana pun di Bagan buat lihat urutan goresannya!',
    'Psst… kamu bisa seret aku ke mana saja lho! 🐙',
  ],
}

const STR: Record<Lang, BuddyStrings> = { en: EN, id: ID }

const POS_KEY = 'kanaflow-tako-pos'
/** Random activity pool — laugh is reserved for taps. */
const MOOD_POOL: TakoMood[] = ['idle', 'idle', 'happy', 'laptop', 'laptop', 'sleepy', 'sleepy', 'idle']

/** Little effects floating next to Tako per mood. */
function MoodFx({ mood }: { mood: TakoMood }) {
  if (mood === 'sleepy') {
    return (
      <div aria-hidden className="pointer-events-none absolute -top-4 right-0">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0, y: 6, x: 0 }}
            animate={{ opacity: [0, 1, 0], y: -18 - i * 4, x: 6 + i * 5 }}
            transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7 }}
            className="absolute right-0 font-kana font-bold text-muted"
            style={{ fontSize: 12 + i * 3 }}
          >
            z
          </motion.span>
        ))}
      </div>
    )
  }
  if (mood === 'laugh') {
    return (
      <motion.span
        aria-hidden
        initial={{ opacity: 0, y: 4, scale: 0.7 }}
        animate={{ opacity: [0, 1, 1, 0], y: -22, scale: 1 }}
        transition={{ duration: 1.4, repeat: Infinity }}
        className="pointer-events-none absolute -top-3 left-1 font-kana text-sm font-bold text-vermilion"
      >
        ワハハ
      </motion.span>
    )
  }
  if (mood === 'happy') {
    return (
      <motion.span
        aria-hidden
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.15, 0.8], rotate: [0, 18] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="pointer-events-none absolute -top-3 right-1 text-sm"
      >
        ✨
      </motion.span>
    )
  }
  return null
}

export default function TakoBuddy({ dueCount, streak }: { dueCount: number; streak: number }) {
  const lang = useLang()
  const t = STR[lang]
  const [line, setLine] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [mood, setMood] = useState<TakoMood>('idle')
  const [bubble, setBubble] = useState({ above: true, alignRight: true })

  const boundsRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)
  const bagRef = useRef<string[]>([])
  const contextShown = useRef(false)
  const hideTimer = useRef<number | null>(null)
  const laughTimer = useRef<number | null>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)

  // ---- restore the dragged position (clamped to this screen) ----
  const updateBubblePlacement = useCallback(() => {
    const r = dragRef.current?.getBoundingClientRect()
    if (!r) return
    setBubble({ above: r.top > 230, alignRight: r.left > 150 })
  }, [])

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(POS_KEY) ?? 'null') as {
        x: number
        y: number
      } | null
      if (saved) {
        const vw = window.innerWidth
        const vh = window.innerHeight
        x.set(Math.min(0, Math.max(-(vw - 90), saved.x)))
        y.set(Math.min(0, Math.max(-(vh - 180), saved.y)))
      }
    } catch {
      // corrupted position — start at the default anchor
    }
    requestAnimationFrame(updateBubblePlacement)
  }, [x, y, updateBubblePlacement])

  // ---- idle activity cycle ----
  useEffect(() => {
    const id = window.setInterval(() => {
      if (draggingRef.current || laughTimer.current !== null) return
      setMood(MOOD_POOL[Math.floor(Math.random() * MOOD_POOL.length)])
    }, 9000)
    return () => clearInterval(id)
  }, [])

  // ---- Tako talks on his own ----
  const speakLine = useCallback(() => {
    const nextLine = (): string => {
      if (!contextShown.current) {
        contextShown.current = true
        if (dueCount > 0) return t.due(dueCount)
        if (streak >= 3) return t.streak(streak)
      }
      if (bagRef.current.length === 0) {
        bagRef.current = [...t.lines].sort(() => Math.random() - 0.5)
      }
      return bagRef.current.pop()!
    }
    setLine(nextLine())
    setTick((n) => n + 1)
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null
      setLine(null)
    }, 6500)
  }, [dueCount, streak, t])

  useEffect(() => {
    let timer: number
    const schedule = (delay: number) => {
      timer = window.setTimeout(() => {
        if (!draggingRef.current) speakLine()
        schedule(20000 + Math.random() * 15000)
      }, delay)
    }
    schedule(3500)
    return () => clearTimeout(timer)
  }, [speakLine])

  useEffect(
    () => () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current)
      if (laughTimer.current !== null) clearTimeout(laughTimer.current)
    },
    [],
  )

  // ---- tap = giggle only, never text ----
  const giggle = () => {
    haptic('tap', useStore.getState().settings.haptics)
    setMood('laugh')
    if (laughTimer.current !== null) clearTimeout(laughTimer.current)
    laughTimer.current = window.setTimeout(() => {
      laughTimer.current = null
      setMood('idle')
    }, 2200)
  }

  return (
    <div ref={boundsRef} className="pointer-events-none fixed inset-0 z-30">
      <motion.div
        ref={dragRef}
        drag
        dragConstraints={boundsRef}
        dragElastic={0.12}
        dragMomentum={false}
        onDragStart={() => {
          draggingRef.current = true
          setLine(null)
        }}
        onDragEnd={() => {
          draggingRef.current = false
          localStorage.setItem(POS_KEY, JSON.stringify({ x: x.get(), y: y.get() }))
          updateBubblePlacement()
        }}
        onTap={giggle}
        role="button"
        aria-label={t.aria}
        style={{ x, y, touchAction: 'none' }}
        whileDrag={{ scale: 1.12, cursor: 'grabbing' }}
        className="pointer-events-auto absolute right-3 cursor-grab drop-shadow-lg bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] sm:bottom-8"
      >
        <AnimatePresence>
          {line && (
            <motion.div
              key={tick}
              initial={{ opacity: 0, y: bubble.above ? 10 : -10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
              className={`absolute w-60 rounded-2xl border border-hairline bg-surface p-3.5 text-sm leading-relaxed shadow-lift ${
                bubble.above ? 'bottom-full mb-2' : 'top-full mt-2'
              } ${bubble.alignRight ? 'right-0' : 'left-0'}`}
            >
              {line}
              <span
                aria-hidden
                className={`absolute h-3.5 w-3.5 rotate-45 rounded-sm bg-surface ${
                  bubble.above
                    ? '-bottom-1.5 border-b border-r border-hairline'
                    : '-top-1.5 border-l border-t border-hairline'
                } ${bubble.alignRight ? 'right-7' : 'left-7'}`}
              />
            </motion.div>
          )}
        </AnimatePresence>
        <MoodFx mood={mood} />
        <Tako size={72} mood={mood} />
      </motion.div>
    </div>
  )
}
