import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Tako from './Tako'
import { haptic } from '../lib/haptics'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

/**
 * Tako as an interactive buddy on the dashboard: he floats above the dock,
 * wiggles for attention now and then, and chats when tapped — contextual
 * nudges first (due cards, streak), then a shuffled bag of tips, kana facts
 * and cheers. Tap again for the next line.
 */

interface BuddyStrings {
  aria: string
  due: (n: number) => string
  streak: (n: number) => string
  lines: string[]
}

const EN: BuddyStrings = {
  aria: 'Talk to Tako',
  due: (n) => `${n} card${n === 1 ? '' : 's'} waiting in Review! Charge! ⚔️`,
  streak: (n) => `A ${n}-day streak?! You're a machine! 🔥`,
  lines: [
    'Fun fact: つ is a wave — "tsu"-nami! 🌊',
    'ん is the only kana with no vowel. Special kid. ✨',
    'Katakana is for loanwords — コーヒー is coffee! ☕',
    'Try Writing mode — your fingers need to memorize too! ✍️',
    'It\'s raining kana in Kana Rain. Bring a keyboard! 🌧️',
    'Mistakes are good — that card comes back sooner and sticks. 💪',
    'Ask an AI for new words on any topic in Vocabulary! 🤖',
    'Secret hanko stamps await you in Achievements… 印',
    'A little every day beats a lot once. Master\'s secret!',
    'がんばって! I believe in you! 🐙',
    'Bored? Stories has short reads with hidden meanings! 📖',
    'Tap any kana in the Chart to watch its strokes!',
  ],
}

const ID: BuddyStrings = {
  aria: 'Ngobrol dengan Tako',
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
  ],
}

const STR: Record<Lang, BuddyStrings> = { en: EN, id: ID }

export default function TakoBuddy({ dueCount, streak }: { dueCount: number; streak: number }) {
  const lang = useLang()
  const t = STR[lang]
  const [line, setLine] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const bagRef = useRef<string[]>([])
  const contextShown = useRef(false)
  const hideTimer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    },
    [],
  )

  const nextLine = (): string => {
    // Lead with what matters right now, once per visit.
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

  const chat = () => {
    haptic('tap', useStore.getState().settings.haptics)
    setLine(nextLine())
    setTick((n) => n + 1)
    if (hideTimer.current !== null) clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => {
      hideTimer.current = null
      setLine(null)
    }, 6000)
  }

  return (
    <div className="pointer-events-none fixed right-3 z-30 bottom-[calc(env(safe-area-inset-bottom)+5.75rem)] sm:bottom-8">
      <AnimatePresence>
        {line && (
          <motion.div
            key={tick}
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            className="pointer-events-auto absolute bottom-full right-1 mb-2 w-60 rounded-2xl border border-hairline bg-surface p-3.5 text-sm leading-relaxed shadow-lift"
          >
            {line}
            <span
              aria-hidden
              className="absolute -bottom-1.5 right-7 h-3.5 w-3.5 rotate-45 rounded-sm border-b border-r border-hairline bg-surface"
            />
          </motion.div>
        )}
      </AnimatePresence>
      <motion.button
        onClick={chat}
        aria-label={t.aria}
        whileTap={{ scale: 0.88, rotate: -6 }}
        // A little attention wiggle every so often.
        animate={{ rotate: [0, 0, -8, 8, -4, 0, 0] }}
        transition={{ duration: 1.1, times: [0, 0.7, 0.76, 0.84, 0.92, 0.97, 1], repeat: Infinity, repeatDelay: 14 }}
        className="pointer-events-auto block drop-shadow-lg"
      >
        <Tako size={64} />
      </motion.button>
    </div>
  )
}
