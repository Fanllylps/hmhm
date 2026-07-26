import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import Heatmap from '../components/dashboard/Heatmap'
import ReviewsChart from '../components/dashboard/ReviewsChart'
import { formatDuration } from '../lib/srs'
import { computeStats, useStore } from '../stores/store'

const PRACTICE_MODES = [
  { to: '/practice/quiz', label: 'Quiz', jp: '選' },
  { to: '/practice/typing', label: 'Typing', jp: '打' },
  { to: '/practice/matching', label: 'Matching', jp: '対' },
  { to: '/practice/kana-rain', label: 'Kana Rain', jp: '雨' },
]

function greeting(hour: number): { en: string; jp: string } {
  if (hour < 5) return { en: 'Burning the midnight oil', jp: 'こんばんは' }
  if (hour < 12) return { en: 'Good morning', jp: 'おはよう' }
  if (hour < 18) return { en: 'Good afternoon', jp: 'こんにちは' }
  return { en: 'Good evening', jp: 'こんばんは' }
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

export default function DashboardPage() {
  const state = useStore()
  const stats = computeStats(state)

  const now = new Date()
  const hello = greeting(now.getHours())
  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  const pending = stats.dueCount + stats.newRemaining
  const breakdown = [
    stats.dueCount > 0 && `${stats.dueCount} due`,
    stats.newRemaining > 0 && `${stats.newRemaining} new`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title={hello.en} jp={hello.jp} subtitle={dateLabel} />

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
            <h2 className="text-lg font-semibold">Time to review</h2>
            <p className="mt-1 text-sm text-muted">{breakdown} waiting for you</p>
            <Link
              to="/review"
              className="mt-5 inline-flex min-h-[52px] w-full items-center justify-center rounded-2xl bg-vermilion px-8 font-medium text-surface shadow-soft transition-transform active:scale-[0.98] sm:w-auto"
            >
              Start review
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
            <h2 className="text-lg font-semibold">All caught up</h2>
            <p className="mt-0.5 text-sm text-muted">
              {stats.nextDueAt
                ? `Next review in ${formatDuration(stats.nextDueAt - Date.now())}.`
                : 'Nothing scheduled yet — new cards arrive tomorrow.'}
            </p>
            <Link to="/practice" className="mt-2 inline-block text-sm font-medium text-vermilion">
              Play a practice game →
            </Link>
          </div>
        </section>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Due today">{stats.dueCount}</StatTile>
        <StatTile label="New today">{stats.newRemaining}</StatTile>
        <StatTile label="Day streak">
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
            stats.accuracy !== null ? `Mastered · ${stats.accuracy}% correct` : 'Mastered'
          }
        >
          {stats.mastered}
          <span className="text-sm font-normal text-muted">/ {stats.totalCards}</span>
          <Hanko char="習" size={20} animate={false} className="ml-auto self-center" />
        </StatTile>
      </div>

      <SectionCard title="Activity" aside="last 16 weeks">
        <Heatmap activity={state.activity} />
      </SectionCard>

      <SectionCard title="Reviews per day" aside="last 14 days">
        <ReviewsChart activity={state.activity} />
      </SectionCard>

      {/* Practice shortcuts */}
      <section>
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-semibold">Jump into practice</h2>
          <Link
            to="/practice"
            className="text-xs font-medium text-muted transition-colors hover:text-sumi"
          >
            All modes →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {PRACTICE_MODES.map((mode) => (
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
