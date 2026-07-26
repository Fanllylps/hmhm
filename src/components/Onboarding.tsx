import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore, type Settings } from '../stores/store'

type ScriptChoice = Settings['scripts']

const SCRIPTS: { value: ScriptChoice; kana: string; title: string; desc: string }[] = [
  { value: 'hiragana', kana: 'あ', title: 'Hiragana', desc: 'The essential first script' },
  { value: 'katakana', kana: 'ア', title: 'Katakana', desc: 'For loanwords & names' },
  { value: 'both', kana: 'あア', title: 'Both', desc: 'Learn them side by side' },
]

const PACES: { value: number; title: string; desc: string }[] = [
  { value: 5, title: 'Relaxed', desc: '5 new kana a day' },
  { value: 10, title: 'Steady', desc: '10 new kana a day' },
  { value: 20, title: 'Ambitious', desc: '20 new kana a day' },
]

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const [step, setStep] = useState(0)
  const [scripts, setScripts] = useState<ScriptChoice>('hiragana')
  const [pace, setPace] = useState(10)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to KanaFlow"
      className="fixed inset-0 z-50 overflow-y-auto bg-washi"
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-12">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              className="text-center"
            >
              <motion.span
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.1 }}
                className="mx-auto mb-8 flex h-20 w-20 items-center justify-center rounded-full border-2 border-vermilion font-kana text-3xl font-bold text-vermilion"
              >
                か
              </motion.span>
              <h1 className="text-3xl font-semibold tracking-tight">KanaFlow</h1>
              <p className="mx-auto mt-3 max-w-xs text-muted">
                Learn hiragana &amp; katakana with spaced repetition and playful practice games.
              </p>
              <button
                onClick={() => setStep(1)}
                autoFocus
                className="mt-10 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft transition-transform active:scale-[0.98]"
              >
                Get started
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="script"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-2xl font-semibold tracking-tight">What do you want to learn?</h2>
              <p className="mt-1 text-sm text-muted">You can change this anytime in Settings.</p>
              <div className="mt-6 space-y-3">
                {SCRIPTS.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => setScripts(s.value)}
                    aria-pressed={scripts === s.value}
                    className={`flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left shadow-soft transition-all active:scale-[0.99] ${
                      scripts === s.value ? 'border-vermilion' : 'border-hairline hover:border-muted/40'
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-washi font-kana text-xl">
                      {s.kana}
                    </span>
                    <span>
                      <span className="block font-medium">{s.title}</span>
                      <span className="block text-sm text-muted">{s.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-8 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft transition-transform active:scale-[0.98]"
              >
                Continue
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="pace"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
            >
              <h2 className="text-2xl font-semibold tracking-tight">Pick your daily pace</h2>
              <p className="mt-1 text-sm text-muted">How many new kana per day?</p>
              <div className="mt-6 space-y-3">
                {PACES.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPace(p.value)}
                    aria-pressed={pace === p.value}
                    className={`flex w-full items-center justify-between rounded-2xl border bg-surface p-4 text-left shadow-soft transition-all active:scale-[0.99] ${
                      pace === p.value ? 'border-vermilion' : 'border-hairline hover:border-muted/40'
                    }`}
                  >
                    <span>
                      <span className="block font-medium">{p.title}</span>
                      <span className="block text-sm text-muted">{p.desc}</span>
                    </span>
                    <span className="text-lg font-semibold text-muted">{p.value}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => completeOnboarding({ scripts, newPerDay: pace })}
                className="mt-8 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft transition-transform active:scale-[0.98]"
              >
                Start learning
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
