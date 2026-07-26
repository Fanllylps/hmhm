import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { useStore } from '../stores/store'

interface Mode {
  to: string
  title: string
  jp: string
  desc: string
  icon: string
}

const MODES: Mode[] = [
  { to: '/practice/quiz', title: 'Quiz', jp: '選択', desc: 'Multiple choice, both directions.', icon: 'く' },
  { to: '/practice/typing', title: 'Typing', jp: '入力', desc: 'Type the romaji, build a combo.', icon: 'た' },
  { to: '/practice/matching', title: 'Matching', jp: '対', desc: 'Pair kana with romaji against the clock.', icon: 'ま' },
  { to: '/practice/time-attack', title: 'Time Attack', jp: '秒', desc: '60 seconds, as many as you can.', icon: 'と' },
  { to: '/practice/kana-rain', title: 'Kana Rain', jp: '雨', desc: 'Type falling kana before they land.', icon: 'あ' },
  { to: '/practice/memory', title: 'Memory Flip', jp: '記憶', desc: 'Concentration — find hidden pairs.', icon: 'め' },
  { to: '/practice/listening', title: 'Listening', jp: '聴く', desc: 'Hear it, pick the right kana.', icon: 'き' },
  { to: '/practice/words', title: 'Word Mode', jp: '言葉', desc: 'Read real Japanese words in kana.', icon: 'ね' },
]

export default function PracticeHubPage() {
  const best = useStore((s) => s.best)
  const bestFor = (to: string): string | null => {
    if (to === '/practice/time-attack' && best.timeAttack > 0) return `Best ${best.timeAttack}`
    if (to === '/practice/kana-rain' && best.kanaRain > 0) return `Best ${best.kanaRain}`
    if (to === '/practice/matching' && best.matchingSec !== null) return `Best ${best.matchingSec}s`
    return null
  }

  return (
    <div>
      <PageHeader
        title="Practice"
        jp="練習"
        subtitle="Games feed the SRS — miss a kana here and it comes back sooner in Review."
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODES.map((m, i) => {
          const score = bestFor(m.to)
          return (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04, duration: 0.25 }}
            >
              <Link
                to={m.to}
                className="group flex items-center gap-4 rounded-2xl border border-hairline bg-surface p-4 shadow-soft transition-all hover:shadow-lift active:scale-[0.99]"
              >
                <span
                  aria-hidden
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-washi font-kana text-2xl transition-colors group-hover:text-vermilion"
                >
                  {m.icon}
                </span>
                <span className="min-w-0">
                  <span className="flex items-baseline gap-2">
                    <span className="font-semibold">{m.title}</span>
                    <span aria-hidden className="font-kana text-xs text-muted">
                      {m.jp}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-muted">{m.desc}</span>
                  {score && (
                    <span className="mt-1.5 inline-block rounded-full bg-matcha/10 px-2 py-0.5 text-xs font-medium text-matcha">
                      {score}
                    </span>
                  )}
                </span>
              </Link>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
