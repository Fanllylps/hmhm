import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import type { KanaEntry } from '../data/kana'
import { useKeyDown } from '../hooks/useKeyDown'
import { hasJapaneseVoice, speak, speechAvailable } from '../lib/audio'
import { useLang } from '../lib/i18n'
import { pickChoices, usePracticePool } from '../lib/practice'
import { useStore, type Lang } from '../stores/store'

const EN = {
  title: 'Listening',
  idleSubtitle: 'Hear a kana, pick the one you heard',
  trainEar: 'Train your ear',
  intro: (n: number) =>
    `Each round speaks one of the ${n} kana in your pool. Misses pull that card back into review sooner.`,
  startBtn: 'Start listening',
  noSpeech:
    'This browser has no speech support — Listening needs a Japanese text-to-speech voice. Try Chrome, Edge or Safari.',
  noVoice:
    'No Japanese voice was found on this device, so audio may be silent or mispronounced. Install a Japanese TTS voice (or try another browser) for the real experience.',
  soundOn: 'Make sure your device sound is on',
  poolSubtitle: (n: number) => `${n} kana in the pool`,
  streak: 'Streak',
  streakBest: (best: number) => `Streak · best ${best}`,
  accuracy: 'Accuracy',
  answered: 'Answered',
  replayAria: 'Replay audio',
  tapAgain: 'Tap to hear again',
  spaceKey: 'Space',
  answerHint: '1–4 to answer · Space to replay',
}

const ID: typeof EN = {
  title: 'Listening',
  idleSubtitle: 'Dengar sebuah kana, pilih yang kamu dengar',
  trainEar: 'Latih telingamu',
  intro: (n: number) =>
    `Tiap ronde mengucapkan salah satu dari ${n} kana di pool-mu. Kalau salah, kartu itu kembali ke review lebih cepat.`,
  startBtn: 'Mulai mendengarkan',
  noSpeech:
    'Browser ini tidak punya dukungan text-to-speech — Listening butuh suara text-to-speech bahasa Jepang. Coba Chrome, Edge, atau Safari.',
  noVoice:
    'Suara bahasa Jepang tidak ditemukan di perangkat ini, jadi audio mungkin tidak berbunyi atau salah ucap. Pasang suara TTS bahasa Jepang (atau coba browser lain) untuk pengalaman yang sesungguhnya.',
  soundOn: 'Pastikan suara perangkatmu menyala',
  poolSubtitle: (n: number) => `${n} kana di pool`,
  streak: 'Runtutan',
  streakBest: (best: number) => `Runtutan · terbaik ${best}`,
  accuracy: 'Akurasi',
  answered: 'Dijawab',
  replayAria: 'Putar ulang audio',
  tapAgain: 'Ketuk untuk dengar lagi',
  spaceKey: 'Spasi',
  answerHint: 'Jawab dengan 1–4 · Spasi untuk putar ulang',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

/** Pause on the feedback state before the next kana is spoken. */
const ADVANCE_MS = 1100

interface Round {
  entry: KanaEntry
  choices: KanaEntry[]
}

function SpeakerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden>
      <path d="M3 6v4h2.5L9 13V3L5.5 6H3z" fill="currentColor" />
      <path
        d="M11 5.5a3.5 3.5 0 010 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M12.75 3.6a6 6 0 010 8.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  )
}

function StatPill({ value, label, accent }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface px-2 py-3 text-center shadow-soft">
      <div className={`text-lg font-semibold leading-tight ${accent ? 'text-vermilion' : ''}`}>
        {value}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  )
}

export default function ListeningPage() {
  // Kanji are excluded: TTS picks one reading arbitrarily, which would make
  // "pick what you heard" ambiguous and unfair.
  const rawPool = usePracticePool()
  const livePool = useMemo(() => {
    const kanaOnly = rawPool.filter((e) => e.group !== 'kanji')
    return kanaOnly.length > 0 ? kanaOnly : rawPool
  }, [rawPool])
  const recordPractice = useStore((s) => s.recordPractice)
  const lang = useLang()
  const t = STR[lang]

  const [phase, setPhase] = useState<'idle' | 'playing'>('idle')
  const [round, setRound] = useState<Round | null>(null)
  const [roundIndex, setRoundIndex] = useState(0)
  /** Id of the chosen option; null while the round is still open. */
  const [picked, setPicked] = useState<string | null>(null)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  /** Bumped on every utterance so the speaker ripple replays. */
  const [playTick, setPlayTick] = useState(0)

  // Snapshot the pool at game start so store updates mid-game don't reshuffle.
  const poolRef = useRef<KanaEntry[]>([])
  const advanceTimer = useRef<number | null>(null)

  // TTS capability: voices can load asynchronously, so re-check on voiceschanged.
  const [tts, setTts] = useState<'unsupported' | 'no-voice' | 'ready'>(() =>
    speechAvailable() ? (hasJapaneseVoice() ? 'ready' : 'no-voice') : 'unsupported',
  )
  useEffect(() => {
    if (!speechAvailable()) return
    const update = () => setTts(hasJapaneseVoice() ? 'ready' : 'no-voice')
    update()
    window.speechSynthesis.addEventListener('voiceschanged', update)
    return () => window.speechSynthesis.removeEventListener('voiceschanged', update)
  }, [])

  useEffect(
    () => () => {
      if (advanceTimer.current !== null) clearTimeout(advanceTimer.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
    },
    [],
  )

  // Audio is the point of this mode — always speak, regardless of settings.audio.
  const play = useCallback((text: string) => {
    speak(text, true)
    setPlayTick((t) => t + 1)
  }, [])

  const nextRound = useCallback(
    (previousId: string | null) => {
      const pool = poolRef.current
      if (pool.length === 0) return
      const candidates =
        pool.length > 1 && previousId !== null ? pool.filter((e) => e.id !== previousId) : pool
      const entry = candidates[Math.floor(Math.random() * candidates.length)]
      setRound({ entry, choices: pickChoices(entry, pool, 4) })
      setPicked(null)
      setRoundIndex((i) => i + 1)
      play(entry.kana)
    },
    [play],
  )

  // Started from a tap/keypress — the user gesture unlocks speechSynthesis.
  const start = useCallback(() => {
    poolRef.current = livePool
    setPhase('playing')
    setStreak(0)
    setBestStreak(0)
    setCorrectCount(0)
    setTotalCount(0)
    nextRound(null)
  }, [livePool, nextRound])

  const choose = useCallback(
    (index: number) => {
      if (!round || picked !== null) return
      const choice = round.choices[index]
      if (!choice) return
      const correct = choice.id === round.entry.id
      setPicked(choice.id)
      recordPractice(round.entry.id, correct)
      setTotalCount((n) => n + 1)
      if (correct) {
        setCorrectCount((n) => n + 1)
        const next = streak + 1
        setStreak(next)
        setBestStreak((b) => Math.max(b, next))
      } else {
        setStreak(0)
        // Replay while the correct kana is highlighted, so sound and shape connect.
        play(round.entry.kana)
      }
      advanceTimer.current = window.setTimeout(() => nextRound(round.entry.id), ADVANCE_MS)
    },
    [round, picked, streak, recordPractice, play, nextRound],
  )

  useKeyDown(
    useCallback(
      (e: KeyboardEvent) => {
        if (phase === 'idle') {
          if ((e.key === 'Enter' || e.key === ' ') && tts !== 'unsupported') {
            e.preventDefault()
            start()
          }
          return
        }
        if (e.key === ' ' || e.key.toLowerCase() === 'r') {
          e.preventDefault()
          if (round) play(round.entry.kana)
          return
        }
        const idx = ['1', '2', '3', '4'].indexOf(e.key)
        if (idx >= 0) choose(idx)
      },
      [phase, start, round, play, choose, tts],
    ),
  )

  const accuracy = totalCount === 0 ? null : Math.round((correctCount / totalCount) * 100)

  if (phase === 'idle') {
    return (
      <div className="mx-auto max-w-xl">
        <PageHeader title={t.title} jp="聴く" subtitle={t.idleSubtitle} backTo="/practice" />
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center rounded-2xl border border-hairline bg-surface px-6 py-14 text-center shadow-soft"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-washi text-sumi">
            <SpeakerIcon size={36} />
          </div>
          <h2 className="mt-6 text-xl font-semibold">{t.trainEar}</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">{t.intro(livePool.length)}</p>
          <motion.button
            whileTap={tts === 'unsupported' ? undefined : { scale: 0.98 }}
            onClick={start}
            disabled={tts === 'unsupported'}
            className="mt-8 w-full max-w-xs rounded-2xl bg-vermilion px-6 py-4 font-medium text-surface disabled:cursor-not-allowed disabled:opacity-40"
          >
            {t.startBtn}
          </motion.button>
          {tts === 'unsupported' ? (
            <p className="mt-4 max-w-sm text-xs font-medium text-vermilion" role="alert">
              {t.noSpeech}
            </p>
          ) : tts === 'no-voice' ? (
            <p className="mt-4 max-w-sm text-xs font-medium text-vermilion" role="alert">
              {t.noVoice}
            </p>
          ) : (
            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted">
              <SpeakerIcon size={13} />
              {t.soundOn}
            </p>
          )}
        </motion.div>
      </div>
    )
  }

  if (!round) return null

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title={t.title}
        jp="聴く"
        subtitle={t.poolSubtitle(poolRef.current.length)}
        backTo="/practice"
      />

      <div className="mb-5 grid grid-cols-3 gap-2">
        <StatPill
          value={streak > 0 ? `🔥 ${streak}` : '0'}
          label={bestStreak > 0 ? t.streakBest(bestStreak) : t.streak}
          accent={streak > 0}
        />
        <StatPill value={accuracy === null ? '—' : `${accuracy}%`} label={t.accuracy} />
        <StatPill value={`${totalCount}`} label={t.answered} />
      </div>

      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={roundIndex}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex flex-col items-center rounded-2xl border border-hairline bg-surface px-6 py-8 shadow-soft">
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => play(round.entry.kana)}
              aria-label={t.replayAria}
              className="relative flex h-24 w-24 items-center justify-center rounded-full bg-sumi text-surface shadow-lift"
            >
              <motion.span
                key={playTick}
                initial={{ opacity: 0.35, scale: 1 }}
                animate={{ opacity: 0, scale: 1.65 }}
                transition={{ duration: 0.9, ease: 'easeOut' }}
                aria-hidden
                className="absolute inset-0 rounded-full border-2 border-sumi"
              />
              <SpeakerIcon size={40} />
            </motion.button>
            <p className="mt-3 text-xs text-muted">
              {t.tapAgain}
              <span className="hidden sm:inline"> · {t.spaceKey}</span>
            </p>
            <div className="mt-1 flex h-9 items-center" aria-live="polite">
              <AnimatePresence>
                {picked !== null && (
                  <motion.span
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className={`text-2xl font-semibold tracking-wide ${
                      picked === round.entry.id ? 'text-matcha' : 'text-vermilion'
                    }`}
                  >
                    {round.entry.romaji}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {round.choices.map((c, i) => {
              const answered = picked !== null
              const isCorrect = answered && c.id === round.entry.id
              const isWrongPick = answered && picked === c.id && !isCorrect
              const tone = isCorrect
                ? 'border-matcha bg-matcha/10'
                : isWrongPick
                  ? 'border-vermilion bg-vermilion/10'
                  : answered
                    ? 'border-hairline bg-surface opacity-40'
                    : 'border-hairline bg-surface shadow-soft hover:border-sumi/30'
              return (
                <motion.button
                  key={c.id}
                  whileTap={answered ? undefined : { scale: 0.96 }}
                  onClick={() => choose(i)}
                  disabled={answered}
                  className={`relative flex min-h-[104px] flex-col items-center justify-center rounded-2xl border py-5 transition-colors ${tone}`}
                >
                  <span
                    aria-hidden
                    className="absolute left-3 top-2.5 hidden text-xs text-muted/70 sm:block"
                  >
                    {i + 1}
                  </span>
                  <span className="font-kana text-5xl leading-none sm:text-6xl">{c.kana}</span>
                  <span
                    className={`mt-2 h-4 text-xs font-medium leading-none transition-opacity ${
                      answered ? 'opacity-100' : 'opacity-0'
                    } ${isCorrect ? 'text-matcha' : isWrongPick ? 'text-vermilion' : 'text-muted'}`}
                  >
                    {c.romaji}
                  </span>
                </motion.button>
              )
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-5 hidden text-center text-xs text-muted sm:block">{t.answerHint}</p>
    </div>
  )
}
