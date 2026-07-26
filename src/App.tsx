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
  useTheme()
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        {/* Nothing renders behind the onboarding overlay, so keyboard focus
            cannot escape into an invisible app. */}
        {!onboarded ? (
          <Onboarding />
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
