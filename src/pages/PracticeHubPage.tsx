import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Practice',
  subtitle: 'Games feed the SRS — miss a kana here and it comes back sooner in Review.',
  best: (v: string) => `Best ${v}`,
  desc: {
    quiz: 'Multiple choice, both directions.',
    typing: 'Type the romaji, build a combo.',
    matching: 'Pair kana with romaji against the clock.',
    timeAttack: '60 seconds, as many as you can.',
    kanaRain: 'Type falling kana before they land.',
    memory: 'Concentration — find hidden pairs.',
    listening: 'Hear it, pick the right kana.',
    words: 'Read real Japanese words in kana.',
    writing: 'Draw each character stroke by stroke.',
    vocab: 'Browse & memorize everyday vocabulary.',
  },
}

const ID: typeof EN = {
  title: 'Latihan',
  subtitle: 'Game terhubung ke SRS — salah jawab kana di sini dan dia balik lebih cepat di Review.',
  best: (v: string) => `Terbaik ${v}`,
  desc: {
    quiz: 'Pilihan ganda, dua arah.',
    typing: 'Ketik romajinya, bangun kombo.',
    matching: 'Pasangkan kana dengan romaji melawan waktu.',
    timeAttack: '60 detik, jawab sebanyak mungkin.',
    kanaRain: 'Ketik kana yang jatuh sebelum mendarat.',
    memory: 'Permainan konsentrasi — temukan pasangan tersembunyi.',
    listening: 'Dengarkan, lalu pilih kana yang benar.',
    words: 'Baca kata Jepang asli dalam kana.',
    writing: 'Gambar tiap karakter goresan demi goresan.',
    vocab: 'Jelajahi & hafalkan kosakata sehari-hari.',
  },
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

interface Mode {
  to: string
  title: string
  jp: string
  key: keyof typeof EN.desc
  icon: string
}

// Mode titles are product names — identical in every language.
const MODES: Mode[] = [
  { to: '/practice/quiz', title: 'Quiz', jp: '選択', key: 'quiz', icon: 'く' },
  { to: '/practice/typing', title: 'Typing', jp: '入力', key: 'typing', icon: 'た' },
  { to: '/practice/matching', title: 'Matching', jp: '対', key: 'matching', icon: 'ま' },
  { to: '/practice/time-attack', title: 'Time Attack', jp: '秒', key: 'timeAttack', icon: 'と' },
  { to: '/practice/kana-rain', title: 'Kana Rain', jp: '雨', key: 'kanaRain', icon: 'あ' },
  { to: '/practice/memory', title: 'Memory Flip', jp: '記憶', key: 'memory', icon: 'め' },
  { to: '/practice/listening', title: 'Listening', jp: '聴く', key: 'listening', icon: 'き' },
  { to: '/practice/words', title: 'Word Mode', jp: '言葉', key: 'words', icon: 'ね' },
  { to: '/practice/writing', title: 'Writing', jp: '書く', key: 'writing', icon: '筆' },
  { to: '/vocab', title: 'Vocabulary', jp: '語彙', key: 'vocab', icon: '語' },
]

export default function PracticeHubPage() {
  const best = useStore((s) => s.best)
  const lang = useLang()
  const t = STR[lang]
  const bestFor = (to: string): string | null => {
    if (to === '/practice/time-attack' && best.timeAttack > 0) return t.best(`${best.timeAttack}`)
    if (to === '/practice/kana-rain' && best.kanaRain > 0) return t.best(`${best.kanaRain}`)
    if (to === '/practice/matching' && best.matchingSec !== null) return t.best(`${best.matchingSec}s`)
    return null
  }

  return (
    <div>
      <PageHeader
        title={t.title}
        jp="練習"
        subtitle={t.subtitle}
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
                  <span className="mt-0.5 block text-sm text-muted">{t.desc[m.key]}</span>
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
