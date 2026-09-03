import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import Layout from './components/Layout'
import Onboarding from './components/Onboarding'
import { useStore } from './stores/store'
import DashboardPage from './pages/DashboardPage'
import ReviewPage from './pages/ReviewPage'
import PracticeHubPage from './pages/PracticeHubPage'
import QuizPage from './pages/QuizPage'
import TypingPage from './pages/TypingPage'
import MatchingPage from './pages/MatchingPage'
import TimeAttackPage from './pages/TimeAttackPage'
import KanaRainPage from './pages/KanaRainPage'
import MemoryFlipPage from './pages/MemoryFlipPage'
import ListeningPage from './pages/ListeningPage'
import WordModePage from './pages/WordModePage'
import KanaChartPage from './pages/KanaChartPage'
import SettingsPage from './pages/SettingsPage'
import WritingPage from './pages/WritingPage'
import AchievementsPage from './pages/AchievementsPage'
import VocabPage from './pages/VocabPage'
import StoriesPage from './pages/StoriesPage'
import StatsPage from './pages/StatsPage'
import AchievementWatcher from './components/AchievementWatcher'
import QuestWatcher from './components/QuestWatcher'
import Tutorial from './components/Tutorial'
import { computeStreak, dayKey } from './lib/dates'
import { msUntilNextReminder, sendStreakReminder } from './lib/reminders'

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

/** Evening streak-rescue nudge: at 20:00, if today has zero reviews, fire a
 * local notification (needs the Settings opt-in + browser permission). */
function useStreakReminder() {
  const enabled = useStore((s) => s.settings.reminders)
  useEffect(() => {
    if (!enabled) return
    let timer = 0
    const schedule = () => {
      timer = window.setTimeout(() => {
        const s = useStore.getState()
        const today = dayKey(Date.now())
        if ((s.activity[today]?.reviews ?? 0) === 0) {
          sendStreakReminder(computeStreak(s.activity, Date.now()), s.settings.language)
        }
        schedule()
      }, msUntilNextReminder(new Date()))
    }
    schedule()
    return () => window.clearTimeout(timer)
  }, [enabled])
}

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  const tutorialSeen = useStore((s) => s.tutorialSeen)
  const tourSeen = useStore((s) => s.tourSeen)
  useTheme()
  useHtmlLang()
  useStreakReminder()
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        {/* Nothing renders behind the onboarding overlay, so keyboard focus
            cannot escape into an invisible app. */}
        {onboarded && tutorialSeen && tourSeen && (
          <>
            <AchievementWatcher />
            <QuestWatcher />
          </>
        )}
        {!onboarded ? (
          <Onboarding />
        ) : !tutorialSeen ? (
          <Tutorial />
        ) : (
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
        )}
      </BrowserRouter>
    </MotionConfig>
  )
}
