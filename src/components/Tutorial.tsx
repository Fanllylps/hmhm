import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import StrokeOrder from './StrokeOrder'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

/**
 * Animated first-run tour, shown once after onboarding (and again after a
 * full reset). Every slide runs a small looping demo of the feature.
 */

const EN = {
  skip: 'Skip',
  next: 'Next',
  start: 'Start learning',
  slides: [
    {
      title: 'Review every day',
      body: 'Tap a card to flip it, then rate how well you remembered — Again, Hard, Good or Easy.',
    },
    {
      title: 'Smart repetition',
      body: 'What you remember shows up less often. What you forget comes back sooner. A few minutes a day is enough.',
    },
    {
      title: 'Learn by playing',
      body: 'Nine practice games feed the same system — miss something in a game and it returns sooner in Review.',
    },
    {
      title: 'Write, read, expand',
      body: 'Practice stroke order with your finger, read short stories, and add vocabulary with any AI.',
    },
    {
      title: 'Keep your streak',
      body: 'Earn XP, level up, and collect hanko seals. がんばって!',
    },
  ],
  ratings: ['Again', 'Hard', 'Good', 'Easy'],
  intervals: ['1d', '4d', '12d', '1mo'],
}

const ID: typeof EN = {
  skip: 'Lewati',
  next: 'Lanjut',
  start: 'Mulai belajar',
  slides: [
    {
      title: 'Review tiap hari',
      body: 'Ketuk kartu untuk membaliknya, lalu nilai seberapa ingat kamu — Ulangi, Sulit, Bagus, atau Mudah.',
    },
    {
      title: 'Pengulangan yang pintar',
      body: 'Yang kamu ingat muncul makin jarang. Yang kamu lupa balik lebih cepat. Beberapa menit sehari sudah cukup.',
    },
    {
      title: 'Belajar sambil main',
      body: 'Sembilan game latihan terhubung ke sistem yang sama — salah di game, kartunya balik lebih cepat di Review.',
    },
    {
      title: 'Tulis, baca, tambah',
      body: 'Latih urutan goresan dengan jarimu, baca cerita pendek, dan tambah kosakata lewat AI mana pun.',
    },
    {
      title: 'Jaga runtutanmu',
      body: 'Kumpulkan XP, naik level, dan koleksi stempel hanko. がんばって!',
    },
  ],
  ratings: ['Ulangi', 'Sulit', 'Bagus', 'Mudah'],
  intervals: ['1h', '4h', '12h', '1bl'],
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const RATING_TONES = [
  'border-vermilion/40 text-vermilion',
  'border-hairline text-muted',
  'border-sumi bg-sumi text-surface',
  'border-matcha/50 text-matcha',
]

/** Slide 1 — a flashcard that flips itself, then the Good button pulses. */
function DemoFlip({ ratings }: { ratings: string[] }) {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className="[perspective:700px]">
        <motion.div
          animate={{ rotateY: [0, 0, 180, 180, 360] }}
          transition={{ duration: 5, times: [0, 0.3, 0.42, 0.88, 1], repeat: Infinity, ease: 'easeInOut' }}
          className="relative h-40 w-32 [transform-style:preserve-3d]"
        >
          <div className="absolute inset-0 flex items-center justify-center rounded-2xl border border-hairline bg-surface shadow-lift [backface-visibility:hidden]">
            <span className="font-kana text-6xl">あ</span>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-2xl border border-hairline bg-surface shadow-lift [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <span className="font-kana text-4xl">あ</span>
            <span className="text-2xl font-semibold">a</span>
          </div>
        </motion.div>
      </div>
      <div className="flex gap-1.5">
        {ratings.map((r, i) => (
          <motion.span
            key={r}
            animate={i === 2 ? { scale: [1, 1, 1.12, 1, 1] } : {}}
            transition={{ duration: 5, times: [0, 0.55, 0.65, 0.75, 1], repeat: Infinity }}
            className={`rounded-xl border px-2.5 py-1.5 text-xs font-medium ${RATING_TONES[i]}`}
          >
            {r}
          </motion.span>
        ))}
      </div>
    </div>
  )
}

/** Slide 2 — a card hopping along growing intervals. */
function DemoIntervals({ intervals }: { intervals: string[] }) {
  const xs = [0, 56, 128, 216]
  return (
    <div className="flex flex-col items-center">
      <div className="relative h-24 w-[264px]">
        <motion.div
          animate={{ x: xs, scale: [1, 1, 1, 1] }}
          transition={{ duration: 4.5, times: [0, 0.3, 0.6, 1], repeat: Infinity, repeatDelay: 0.8, type: 'tween', ease: 'easeInOut' }}
          className="absolute top-0 flex h-14 w-12 items-center justify-center rounded-xl border border-hairline bg-surface shadow-soft"
        >
          <span className="font-kana text-2xl">か</span>
        </motion.div>
        <div className="absolute bottom-0 left-0 flex w-full items-end">
          {intervals.map((label, i) => (
            <div key={label} className="absolute flex flex-col items-center" style={{ left: xs[i] + 4 }}>
              <span className="h-2 w-2 rounded-full bg-matcha/60" />
              <span className="mt-1 text-xs tabular-nums text-muted">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Slide 3 — game glyphs floating gently. */
function DemoGames() {
  const icons = ['く', 'た', 'ま', '秒', '雨', '聴']
  return (
    <div className="grid grid-cols-3 gap-3">
      {icons.map((g, i) => (
        <motion.span
          key={g}
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1, y: [0, -6, 0] }}
          transition={{
            opacity: { delay: i * 0.1, duration: 0.3 },
            scale: { delay: i * 0.1, type: 'spring', stiffness: 300, damping: 18 },
            y: { duration: 2.2, repeat: Infinity, delay: i * 0.25, ease: 'easeInOut' },
          }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl border border-hairline bg-surface font-kana text-2xl shadow-soft"
        >
          {g}
        </motion.span>
      ))}
    </div>
  )
}

/** Slide 4 — real stroke-order animation + AI chip. */
function DemoWrite() {
  return (
    <div className="flex flex-col items-center gap-3">
      <StrokeOrder char="あ" size={128} />
      <motion.span
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="rounded-full border border-vermilion/40 px-3 py-1 text-xs font-semibold text-vermilion"
      >
        + AI ✨
      </motion.span>
    </div>
  )
}

/** Slide 5 — XP bar filling and a hanko stamping down, on loop. */
function DemoStreak() {
  return (
    <div className="flex w-56 flex-col items-center gap-6">
      <div className="flex items-center gap-6">
        <motion.span
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="font-kana text-5xl text-vermilion"
        >
          炎
        </motion.span>
        <motion.span
          animate={{ scale: [2.2, 1, 1, 1], opacity: [0, 1, 1, 1], rotate: [-20, -8, -8, -8] }}
          transition={{ duration: 3.2, times: [0, 0.18, 0.9, 1], repeat: Infinity, repeatDelay: 0.6 }}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-vermilion font-kana text-xl font-bold text-vermilion"
        >
          済
        </motion.span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
        <motion.div
          animate={{ width: ['8%', '85%'] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1, ease: 'easeOut' }}
          className="h-full rounded-full bg-vermilion"
        />
      </div>
    </div>
  )
}

export default function Tutorial() {
  const completeTutorial = useStore((s) => s.completeTutorial)
  const lang = useLang()
  const t = STR[lang]
  const [step, setStep] = useState(0)
  const last = step === t.slides.length - 1

  const DEMOS = [
    <DemoFlip key="flip" ratings={t.ratings} />,
    <DemoIntervals key="ivl" intervals={t.intervals} />,
    <DemoGames key="games" />,
    <DemoWrite key="write" />,
    <DemoStreak key="streak" />,
  ]

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.slides[step].title}
      className="fixed inset-0 z-50 flex flex-col bg-washi"
    >
      <div className="flex justify-end px-5 pt-[calc(1rem+env(safe-area-inset-top))]">
        <button
          onClick={completeTutorial}
          className="rounded-full px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:text-sumi"
        >
          {t.skip}
        </button>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="flex flex-col items-center text-center"
          >
            <div className="flex h-64 items-center justify-center">{DEMOS[step]}</div>
            <h2 className="mt-8 text-2xl font-semibold tracking-tight">{t.slides[step].title}</h2>
            <p className="mt-2 max-w-sm text-muted">{t.slides[step].body}</p>
          </motion.div>
        </AnimatePresence>

        <div className="mt-10">
          <div aria-hidden className="mb-5 flex justify-center gap-1.5">
            {t.slides.map((_, i) => (
              <motion.span
                key={i}
                animate={{ width: i === step ? 20 : 6, opacity: i === step ? 1 : 0.4 }}
                className={`h-1.5 rounded-full ${i === step ? 'bg-vermilion' : 'bg-muted'}`}
              />
            ))}
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => (last ? completeTutorial() : setStep((s) => s + 1))}
            className="w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft"
          >
            {last ? t.start : t.next}
          </motion.button>
        </div>
      </div>
    </div>
  )
}
