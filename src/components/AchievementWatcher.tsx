import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Hanko from './Hanko'
import {
  ACHIEVEMENTS,
  buildAchievementContext,
  type AchievementDef,
} from '../data/achievements'
import { useStore } from '../stores/store'

/**
 * Watches the store, unlocks achievements the moment their condition is met,
 * and shows a small hanko-stamp toast for each new unlock.
 */
export default function AchievementWatcher() {
  const cards = useStore((s) => s.cards)
  const activity = useStore((s) => s.activity)
  const best = useStore((s) => s.best)
  const xp = useStore((s) => s.xp)
  const unlocked = useStore((s) => s.unlockedAchievements)
  const unlockAchievements = useStore((s) => s.unlockAchievements)

  const [queue, setQueue] = useState<AchievementDef[]>([])

  useEffect(() => {
    const ctx = buildAchievementContext({ cards, activity, best, xp })
    const fresh = ACHIEVEMENTS.filter((a) => {
      if (unlocked[a.id] !== undefined) return false
      const [current, target] = a.progress(ctx)
      return current >= target
    })
    if (fresh.length > 0) {
      unlockAchievements(fresh.map((a) => a.id))
      setQueue((q) => [...q, ...fresh])
    }
  }, [cards, activity, best, xp, unlocked, unlockAchievements])

  // Show toasts one at a time.
  const current = queue[0] ?? null
  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3200)
    return () => clearTimeout(t)
  }, [current])

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-8"
    >
      <AnimatePresence>
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface py-3 pl-3 pr-5 shadow-lift"
          >
            <Hanko char={current.jp} size={38} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-vermilion">
                Achievement
              </div>
              <div className="text-sm font-semibold">{current.title}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
