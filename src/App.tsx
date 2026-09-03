import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Layout from './components/Layout'
import Onboarding from './components/Onboarding'
import { useStore } from './stores/store'
import AchievementWatcher from './components/AchievementWatcher'
import Tutorial from './components/Tutorial'

// Code-split the heavy pages so the first load stays small (was a single
// 532KB bundle). Layout/Onboarding/Tutorial stay eager for first paint.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReviewPage = lazy(() => import('./pages/ReviewPage'))
const PracticeHubPage = lazy(() => import('./pages/PracticeHubPage'))
const QuizPage = lazy(() => import('./pages/QuizPage'))
const TypingPage = lazy(() => import('./pages/TypingPage'))
const MatchingPage = lazy(() => import('./pages/MatchingPage'))
const TimeAttackPage = lazy(() => import('./pages/TimeAttackPage'))
const KanaRainPage = lazy(() => import('./pages/KanaRainPage'))
const MemoryFlipPage = lazy(() => import('./pages/MemoryFlipPage'))
const ListeningPage = lazy(() => import('./pages/ListeningPage'))
const WordModePage = lazy(() => import('./pages/WordModePage'))
const KanaChartPage = lazy(() => import('./pages/KanaChartPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const WritingPage = lazy(() => import('./pages/WritingPage'))
const AchievementsPage = lazy(() => import('./pages/AchievementsPage'))
const VocabPage = lazy(() => import('./pages/VocabPage'))
const StoriesPage = lazy(() => import('./pages/StoriesPage'))
const StatsPage = lazy(() => import('./pages/StatsPage'))

/** Keep the document language in sync for screen readers and hyphenation. */
function useHtmlLang() {
  const lang = useStore((s) => s.settings.language)
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])
}

/** Apply the theme: toggle .dark on <html> and keep the browser UI tinted. */
function useTheme() {
  const theme = useStore((s) => s.settings.theme)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'system' && mq.matches)
      document.documentElement.classList.toggle('dark', dark)
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute('content', dark ? '#1A1712' : '#FAF6ED')
    }
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [theme])
}

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  const tutorialSeen = useStore((s) => s.tutorialSeen)
  const tourSeen = useStore((s) => s.tourSeen)
  useTheme()
  useHtmlLang()
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        {/* Nothing renders behind the onboarding overlay, so keyboard focus
            cannot escape into an invisible app. */}
        {onboarded && tutorialSeen && tourSeen && <AchievementWatcher />}
        {!onboarded ? (
          <Onboarding />
        ) : !tutorialSeen ? (
          <Tutorial />
        ) : (
        <Suspense
          fallback={
            <div className="mx-auto max-w-xl p-8 text-center text-sm text-muted">
              Loading…
            </div>
          }
        >
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="review" element={<ReviewPage />} />
            <Route path="practice" element={<PracticeHubPage />} />
            <Route path="practice/quiz" element={<QuizPage />} />
            <Route path="practice/typing" element={<TypingPage />} />
            <Route path="practice/matching" element={<MatchingPage />} />
            <Route path="practice/time-attack" element={<TimeAttackPage />} />
            <Route path="practice/kana-rain" element={<KanaRainPage />} />
            <Route path="practice/memory" element={<MemoryFlipPage />} />
            <Route path="practice/listening" element={<ListeningPage />} />
            <Route path="practice/words" element={<WordModePage />} />
            <Route path="practice/writing" element={<WritingPage />} />
            <Route path="achievements" element={<AchievementsPage />} />
            <Route path="vocab" element={<VocabPage />} />
            <Route path="stories" element={<StoriesPage />} />
            <Route path="stats" element={<StatsPage />} />
            <Route path="chart" element={<KanaChartPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
        </Suspense>
        )}
      </BrowserRouter>
    </MotionConfig>
  )
}
