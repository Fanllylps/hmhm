import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useLang } from '../lib/i18n'
import { useStore, type Lang, type Settings } from '../stores/store'

type ScriptChoice = Settings['scripts']

const EN = {
  tagline: 'Learn hiragana & katakana with spaced repetition and playful practice games.',
  getStarted: 'Get started',
  whatLearn: 'What do you want to learn?',
  changeLater: 'You can change this anytime in Settings.',
  scripts: {
    hiragana: { title: 'Hiragana', desc: 'The essential first script' },
    katakana: { title: 'Katakana', desc: 'For loanwords & names' },
    both: { title: 'Both', desc: 'Learn them side by side' },
  },
  continue: 'Continue',
  pickPace: 'Pick your daily pace',
  paceQuestion: 'How many new kana per day?',
  paces: [
    { value: 5, title: 'Relaxed', desc: '5 new kana a day' },
    { value: 10, title: 'Steady', desc: '10 new kana a day' },
    { value: 20, title: 'Ambitious', desc: '20 new kana a day' },
  ],
  start: 'Start learning',
}

const ID: typeof EN = {
  tagline: 'Belajar hiragana & katakana dengan spaced repetition dan game latihan yang seru.',
  getStarted: 'Mulai',
  whatLearn: 'Mau belajar yang mana?',
  changeLater: 'Bisa diubah kapan saja di Setelan.',
  scripts: {
    hiragana: { title: 'Hiragana', desc: 'Aksara pertama yang wajib' },
    katakana: { title: 'Katakana', desc: 'Untuk kata serapan & nama' },
    both: { title: 'Keduanya', desc: 'Belajar berdampingan' },
  },
  continue: 'Lanjut',
  pickPace: 'Pilih ritme harianmu',
  paceQuestion: 'Berapa kana baru per hari?',
  paces: [
    { value: 5, title: 'Santai', desc: '5 kana baru per hari' },
    { value: 10, title: 'Stabil', desc: '10 kana baru per hari' },
    { value: 20, title: 'Ambisius', desc: '20 kana baru per hari' },
  ],
  start: 'Mulai belajar',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const SCRIPT_KANA: Record<ScriptChoice, string> = {
  hiragana: 'あ',
  katakana: 'ア',
  both: 'あア',
}

export default function Onboarding() {
  const completeOnboarding = useStore((s) => s.completeOnboarding)
  const updateSettings = useStore((s) => s.updateSettings)
  const lang = useLang()
  const t = STR[lang]
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
      {/* Language switch, visible from the very first screen */}
      <div className="absolute right-4 top-[calc(1rem+env(safe-area-inset-top))] flex rounded-full border border-hairline bg-surface p-0.5 text-xs font-semibold">
        {(['en', 'id'] as Lang[]).map((l) => (
          <button
            key={l}
            onClick={() => updateSettings({ language: l })}
            aria-pressed={lang === l}
            className={`rounded-full px-2.5 py-1 uppercase transition-colors ${
              lang === l ? 'bg-sumi text-surface' : 'text-muted'
            }`}
          >
            {l}
          </button>
        ))}
      </div>

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
              <p className="mx-auto mt-3 max-w-xs text-muted">{t.tagline}</p>
              <button
                onClick={() => setStep(1)}
                autoFocus
                className="mt-10 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft transition-transform active:scale-[0.98]"
              >
                {t.getStarted}
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
              <h2 className="text-2xl font-semibold tracking-tight">{t.whatLearn}</h2>
              <p className="mt-1 text-sm text-muted">{t.changeLater}</p>
              <div className="mt-6 space-y-3">
                {(Object.keys(t.scripts) as ScriptChoice[]).map((value) => (
                  <button
                    key={value}
                    onClick={() => setScripts(value)}
                    aria-pressed={scripts === value}
                    className={`flex w-full items-center gap-4 rounded-2xl border bg-surface p-4 text-left shadow-soft transition-all active:scale-[0.99] ${
                      scripts === value ? 'border-vermilion' : 'border-hairline hover:border-muted/40'
                    }`}
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-washi font-kana text-xl">
                      {SCRIPT_KANA[value]}
                    </span>
                    <span>
                      <span className="block font-medium">{t.scripts[value].title}</span>
                      <span className="block text-sm text-muted">{t.scripts[value].desc}</span>
                    </span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="mt-8 w-full rounded-2xl bg-vermilion px-6 py-3.5 font-medium text-surface shadow-soft transition-transform active:scale-[0.98]"
              >
                {t.continue}
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
              <h2 className="text-2xl font-semibold tracking-tight">{t.pickPace}</h2>
              <p className="mt-1 text-sm text-muted">{t.paceQuestion}</p>
              <div className="mt-6 space-y-3">
                {t.paces.map((p) => (
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
                {t.start}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
