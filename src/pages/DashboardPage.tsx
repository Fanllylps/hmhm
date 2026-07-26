import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import Heatmap from '../components/dashboard/Heatmap'
import ReviewsChart from '../components/dashboard/ReviewsChart'
import { dateLocale, useLang, type Lang } from '../lib/i18n'
import { levelFromXp } from '../lib/level'
import { shareProgressCard } from '../lib/shareCard'
import { formatDuration } from '../lib/srs'
import { computeStats, useStore } from '../stores/store'

const EN = {
  greetings: {
    midnight: 'Burning the midnight oil',
    morning: 'Good morning',
    afternoon: 'Good afternoon',
    evening: 'Good evening',
  },
  timeToReview: 'Time to review',
  dueCount: (n: number) => `${n} due`,
  newCount: (n: number) => `${n} new`,
  waitingForYou: (breakdown: string) => `${breakdown} waiting for you`,
  startReview: 'Start review',
  allCaughtUp: 'All caught up',
  nextReviewIn: (duration: string) => `Next review in ${duration}.`,
  nothingScheduled: 'Nothing scheduled yet — new cards arrive tomorrow.',
  playPractice: 'Play a practice game →',
  dueToday: 'Due today',
  newToday: 'New today',
  dayStreak: 'Day streak',
  mastered: 'Mastered',
  masteredAccuracy: (pct: number) => `Mastered · ${pct}% correct`,
  earnXp: 'Reviews and games earn XP · ',
  xpTotal: (total: string) => `${total} XP total`,
  achievements: 'Achievements →',
  share: 'Share',
  fullStats: 'Full statistics →',
  activity: 'Activity',
  last16Weeks: 'last 16 weeks',
  reviewsPerDay: 'Reviews per day',
  last14Days: 'last 14 days',
  jumpIntoPractice: 'Jump into practice',
  allModes: 'All modes →',
  modes: {
    quiz: 'Quiz',
    typing: 'Typing',
    matching: 'Matching',
    kanaRain: 'Kana Rain',
  },
}

const ID: typeof EN = {
  greetings: {
    midnight: 'Masih begadang, nih',
    morning: 'Selamat pagi',
    afternoon: 'Selamat siang',
    evening: 'Selamat malam',
  },
  timeToReview: 'Waktunya review',
  dueCount: (n: number) => `${n} perlu direview`,
  newCount: (n: number) => `${n} baru`,
  waitingForYou: (breakdown: string) => `${breakdown} menunggumu`,
  startReview: 'Mulai review',
  allCaughtUp: 'Semua sudah selesai',
  nextReviewIn: (duration: string) => `Review berikutnya dalam ${duration}.`,
  nothingScheduled: 'Belum ada jadwal — kartu baru datang besok.',
  playPractice: 'Main game latihan →',
  dueToday: 'Perlu review hari ini',
  newToday: 'Baru hari ini',
  dayStreak: 'Runtutan hari',
  mastered: 'Dikuasai',
  masteredAccuracy: (pct: number) => `Dikuasai · ${pct}% benar`,
  earnXp: 'Review dan game memberi XP · ',
  xpTotal: (total: string) => `total ${total} XP`,
  achievements: 'Pencapaian →',
  share: 'Bagikan',
  fullStats: 'Statistik lengkap →',
  activity: 'Aktivitas',
  last16Weeks: '16 minggu terakhir',
  reviewsPerDay: 'Review per hari',
  last14Days: '14 hari terakhir',
  jumpIntoPractice: 'Langsung ke latihan',
  allModes: 'Semua mode →',
  modes: {
    quiz: 'Kuis',
    typing: 'Mengetik',
    matching: 'Mencocokkan',
    kanaRain: 'Kana Rain',
  },
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

function greetingKey(hour: number): { key: keyof typeof EN.greetings; jp: string } {
  if (hour < 5) return { key: 'midnight', jp: 'こんばんは' }
  if (hour < 12) return { key: 'morning', jp: 'おはよう' }
  if (hour < 18) return { key: 'afternoon', jp: 'こんにちは' }
  return { key: 'evening', jp: 'こんばんは' }
}

function StatTile({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-hairline bg-surface p-4 shadow-soft">
      <div className="flex items-baseline gap-1.5 text-2xl font-semibold tabular-nums">
        {children}
      </div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  )
}

function SectionCard({
  title,
  aside,
  children,
}: {
  title: string
  aside?: string
  children: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {children}
    </section>
  )
}

function LevelCard({
  xp,
  streak,
  mastered,
  totalCards,
}: {
  xp: number
  streak: number
  mastered: number
  totalCards: number
}) {
  const lang = useLang()
  const t = STR[lang]
  const info = levelFromXp(xp)
  const share = () =>
    shareProgressCard(
      {
        level: info.level,
        rankTitle: info.title,
        jpTitle: info.jpTitle,
        totalXp: info.totalXp,
        streak,
        mastered,
        totalCards,
      },
      lang,
    ).catch(() => {})
  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-soft">
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-vermilion font-semibold tabular-nums text-vermilion"
        >
          {info.level}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex min-w-0 items-baseline gap-2">
              <span className="truncate font-semibold">{info.title}</span>
              <span aria-hidden className="hidden whitespace-nowrap font-kana text-sm text-muted sm:inline">
                {info.jpTitle}
              </span>
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-muted">
              {info.intoLevel} / {info.needed} XP
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-hairline">
            <motion.div
              className="h-full rounded-full bg-vermilion"
              initial={{ width: 0 }}
              animate={{ width: `${Math.round(info.progress * 100)}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1.5 flex items-baseline justify-between gap-3 text-xs text-muted">
            <span className="truncate">
              <span className="hidden sm:inline">{t.earnXp}</span>
              {t.xpTotal(info.totalXp.toLocaleString(dateLocale(lang)))}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              <button
                onClick={share}
                className="font-medium text-muted transition-colors hover:text-sumi"
              >
                {t.share} ↗
              </button>
              <Link
                to="/achievements"
                className="font-medium text-vermilion transition-opacity hover:opacity-80"
              >
                {t.achievements}
              </Link>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

export default function DashboardPage() {
  const state = useStore()
  const stats = computeStats(state)
  const lang = useLang()
  const t = STR[lang]

  const practiceModes = [
    { to: '/practice/quiz', label: t.modes.quiz, jp: '選' },
    { to: '/practice/typing', label: t.modes.typing, jp: '打' },
    { to: '/practice/matching', label: t.modes.matching, jp: '対' },
    { to: '/practice/kana-rain', label: t.modes.kanaRain, jp: '雨' },
  ]

  const now = new Date()
  const hello = greetingKey(now.getHours())
  const dateLabel = now.toLocaleDateString(dateLocale(lang), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const pending = stats.dueCount + stats.newRemaining
  const breakdown = [
    stats.dueCount > 0 && t.dueCount(stats.dueCount),
    stats.newRemaining > 0 && t.newCount(stats.newRemaining),
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={t.greetings[hello.key]} jp={hello.jp} subtitle={dateLabel} />

      {/* Primary CTA */}
      {pending > 0 ? (
        <section className="relative overflow-hidden rounded-2xl border border-hairline bg-surface p-6 shadow-soft">
          <span
            aria-hidden
            className="pointer-events-none absolute -right-4 -top-8 select-none font-kana text-[8rem] leading-none text-hairline/60"
          >
            復
          </span>
          <div className="relative">
            <h2 className="text-lg font-semibold">{t.timeToReview}</h2>
            <p className="mt-1 text-sm text-muted">{t.waitingForYou(breakdown)}</p>
            <Link
              to="/review"
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-vermilion px-8 font-medium text-surface shadow-soft transition-transform active:scale-[0.98] sm:w-auto"
            >
              {t.startReview}
              <span aria-hidden className="ml-2">
                →
              </span>
            </Link>
          </div>
        </section>
      ) : (
        <section className="flex items-center gap-5 rounded-2xl border border-hairline bg-surface p-6 shadow-soft">
          <span aria-hidden className="select-none font-kana text-5xl text-matcha/70">
            休
          </span>
          <div>
            <h2 className="text-lg font-semibold">{t.allCaughtUp}</h2>
            <p className="mt-0.5 text-sm text-muted">
              {stats.nextDueAt
                ? t.nextReviewIn(formatDuration(stats.nextDueAt - Date.now()))
                : t.nothingScheduled}
            </p>
            <Link to="/practice" className="mt-2 inline-block text-sm font-medium text-vermilion">
              {t.playPractice}
            </Link>
          </div>
        </section>
      )}

      {/* Level & XP */}
      <LevelCard xp={state.xp} streak={stats.streak} mastered={stats.mastered} totalCards={stats.totalCards} />

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label={t.dueToday}>{stats.dueCount}</StatTile>
        <StatTile label={t.newToday}>{stats.newRemaining}</StatTile>
        <StatTile label={t.dayStreak}>
          {stats.streak}
          <span
            aria-hidden
            className={`font-kana text-lg ${stats.streak > 0 ? 'text-vermilion' : 'text-hairline'}`}
          >
            炎
          </span>
        </StatTile>
        <StatTile
          label={
            stats.accuracy !== null ? t.masteredAccuracy(stats.accuracy) : t.mastered
          }
        >
          {stats.mastered}
          <span className="text-sm font-normal text-muted">/ {stats.totalCards}</span>
          <Hanko char="習" size={20} animate={false} className="ml-auto self-center" />
        </StatTile>
      </div>

      <SectionCard title={t.activity} aside={t.last16Weeks}>
        <Heatmap activity={state.activity} />
      </SectionCard>

      <SectionCard title={t.reviewsPerDay} aside={t.last14Days}>
        <ReviewsChart activity={state.activity} />
        <div className="mt-4 border-t border-hairline pt-3 text-right">
          <Link to="/stats" className="text-xs font-medium text-vermilion">
            {t.fullStats}
          </Link>
        </div>
      </SectionCard>

      {/* Practice shortcuts */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">{t.jumpIntoPractice}</h2>
          <Link
            to="/practice"
            className="text-xs font-medium text-muted transition-colors hover:text-sumi"
          >
            {t.allModes}
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {practiceModes.map((mode) => (
            <Link
              key={mode.to}
              to={mode.to}
              className="flex min-h-[52px] items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-soft transition-all hover:shadow-lift active:scale-[0.97]"
            >
              <span aria-hidden className="font-kana text-2xl text-muted">
                {mode.jp}
              </span>
              <span className="text-sm font-medium">{mode.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  )
}
