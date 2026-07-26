import { motion } from 'framer-motion'
import Hanko from '../components/Hanko'
import PageHeader from '../components/PageHeader'
import { ACHIEVEMENTS, buildAchievementContext } from '../data/achievements'
import { useStore } from '../stores/store'

export default function AchievementsPage() {
  const cards = useStore((s) => s.cards)
  const activity = useStore((s) => s.activity)
  const best = useStore((s) => s.best)
  const xp = useStore((s) => s.xp)
  const unlocked = useStore((s) => s.unlockedAchievements)

  const ctx = buildAchievementContext({ cards, activity, best, xp })
  const unlockedCount = ACHIEVEMENTS.filter((a) => unlocked[a.id] !== undefined).length

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Achievements"
        jp="実績"
        subtitle={`${unlockedCount} of ${ACHIEVEMENTS.length} hanko collected`}
        backTo="/"
      />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {ACHIEVEMENTS.map((a, i) => {
          const at = unlocked[a.id]
          const isUnlocked = at !== undefined
          const [current, target] = a.progress(ctx)
          const pct = Math.min(1, current / target)
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03, duration: 0.2 }}
              className={`flex items-center gap-4 rounded-2xl border bg-surface p-4 shadow-soft ${
                isUnlocked ? 'border-vermilion/30' : 'border-hairline'
              }`}
            >
              {isUnlocked ? (
                <Hanko char={a.jp} size={48} animate={false} />
              ) : (
                <span
                  aria-hidden
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-hairline font-kana text-lg text-muted/60"
                >
                  {a.jp}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <div className={`font-semibold ${isUnlocked ? '' : 'text-muted'}`}>{a.title}</div>
                <div className="mt-0.5 text-sm text-muted">{a.description}</div>
                {isUnlocked ? (
                  <div className="mt-1 text-xs text-matcha">
                    Unlocked{' '}
                    {new Date(at).toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                ) : (
                  <div className="mt-2 flex items-center gap-2">
                    <div className="h-1 flex-1 overflow-hidden rounded-full bg-hairline">
                      <div
                        className="h-full rounded-full bg-muted/60"
                        style={{ width: `${Math.round(pct * 100)}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted">
                      {Math.min(current, target).toLocaleString()} / {target.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
