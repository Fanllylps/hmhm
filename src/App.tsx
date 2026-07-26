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

export default function App() {
  const onboarded = useStore((s) => s.onboarded)
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        {!onboarded && <Onboarding />}
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
      </BrowserRouter>
    </MotionConfig>
  )
}
