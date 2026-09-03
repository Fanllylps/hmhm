import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Hanko from './Hanko'
import { QUEST_NAMES } from './DailyQuests'
import { dayKey } from '../lib/dates'
import { QUESTS, type QuestId } from '../lib/quests'
import { haptic } from '../lib/haptics'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

/**
 * Watches today's claimed quests and toasts the moment one completes —
 * so finishing a mission mid-Review/Game feels rewarding immediately,
 * not just when opening the dashboard later.
 */
export default function QuestWatcher() {
  const day = dayKey(Date.now())
  const claimed = useStore((s) => s.questClaimed[day] ?? [])
  const lang: Lang = useLang()

  const [queue, setQueue] = useState<QuestId[]>([])
  const seenRef = useRef<Set<string>>(new Set())
  const mountedRef = useRef(false)
  const dayRef = useRef(day)
  if (dayRef.current !== day) {
    dayRef.current = day
    seenRef.current = new Set()
    mountedRef.current = false
  }

  useEffect(() => {
    // First run: quests finished in an earlier session stay silent — only
    // completions from this session get a toast.
    if (!mountedRef.current) {
      mountedRef.current = true
      claimed.forEach((id) => seenRef.current.add(id))
      return
    }
    const fresh = claimed.filter((id) => !seenRef.current.has(id))
    if (fresh.length === 0) return
    fresh.forEach((id) => seenRef.current.add(id))
    setQueue((q) => [...q, ...fresh])
    haptic('celebrate', useStore.getState().settings.haptics)
  }, [claimed])

  const current = queue[0] ?? null
  useEffect(() => {
    if (!current) return
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3200)
    return () => clearTimeout(t)
  }, [current])

  const xpFor = (id: QuestId) => QUESTS.find((q) => q.id === id)?.xp ?? 0

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-20 z-50 flex justify-center px-4 sm:bottom-8"
    >
      <AnimatePresence>
        {current && (
          <motion.div
            key={`${day}-${current}`}
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="flex items-center gap-3 rounded-2xl border border-hairline bg-surface py-3 pl-3 pr-5 shadow-lift"
          >
            <Hanko char="任" size={38} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-vermilion">
                {lang === 'id' ? 'Misi harian' : 'Daily quest'} · +{xpFor(current)} XP
              </div>
              <div className="text-sm font-semibold">{QUEST_NAMES[lang][current]}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
