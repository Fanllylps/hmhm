import { motion } from 'framer-motion'
import Hanko from './Hanko'
import { dayKey } from '../lib/dates'
import { QUESTS, isQuestDone, questProgress, type QuestId } from '../lib/quests'
import { useLang } from '../lib/i18n'
import { useStore, type Lang } from '../stores/store'

export const QUEST_NAMES: Record<Lang, Record<QuestId, string>> = {
  en: {
    'review-10': 'Review 10 cards',
    'practice-10': '10 correct practice answers',
    'new-5': 'Meet 5 new kana',
  },
  id: {
    'review-10': 'Review 10 kartu',
    'practice-10': '10 jawaban latihan yang benar',
    'new-5': 'Kenalan dengan 5 kana baru',
  },
}

interface QuestStrings {
  title: string
  jp: string
  aside: string
  names: Record<QuestId, string>
  done: string
  allDone: string
  bonus: (xp: number) => string
}

const EN: QuestStrings = {
  title: 'Daily quests',
  jp: '任',
  aside: 'resets at midnight',
  names: QUEST_NAMES.en,
  done: 'Done',
  allDone: 'All quests done — see you tomorrow!',
  bonus: (xp) => `+${xp} XP`,
}

const ID: QuestStrings = {
  title: 'Misi harian',
  jp: '任',
  aside: 'reset tengah malam',
  names: QUEST_NAMES.id,
  done: 'Selesai',
  allDone: 'Semua misi selesai — sampai jumpa besok!',
  bonus: (xp) => `+${xp} XP`,
}

const STR: Record<Lang, QuestStrings> = { en: EN, id: ID }

export default function DailyQuests() {
  const lang = useLang()
  const t = STR[lang]
  const counts =
    useStore((s) => s.questCounts[dayKey(Date.now())]) ??
    ({ reviews: 0, practiceCorrect: 0, newCards: 0 } as const)
  const doneCount = QUESTS.filter((q) => isQuestDone(counts, q)).length

  return (
    <section className="rounded-2xl border border-hairline bg-surface p-5 shadow-soft sm:p-6">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="flex items-baseline gap-2 text-sm font-semibold">
          {t.title}
          <span aria-hidden className="font-kana text-sm text-muted">
            {t.jp}
          </span>
        </h2>
        <span className="text-xs tabular-nums text-muted">
          {doneCount}/{QUESTS.length} · {t.aside}
        </span>
      </div>
      <ul className="flex flex-col gap-3">
        {QUESTS.map((q) => {
          const progress = questProgress(counts, q)
          const done = isQuestDone(counts, q)
          return (
            <li key={q.id}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className={done ? 'font-medium text-matcha' : 'font-medium'}>
                  {done ? `✓ ${t.names[q.id]}` : t.names[q.id]}
                </span>
                <span className="shrink-0 text-xs tabular-nums text-muted">
                  {done ? `${t.done} · ${t.bonus(q.xp)}` : `${progress}/${q.target} · ${t.bonus(q.xp)}`}
                </span>
              </div>
              <div
                className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-hairline"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={q.target}
                aria-label={t.names[q.id]}
              >
                <motion.div
                  className={`h-full rounded-full ${done ? 'bg-matcha' : 'bg-vermilion'}`}
                  initial={false}
                  animate={{ width: `${(progress / q.target) * 100}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </li>
          )
        })}
      </ul>
      {doneCount === QUESTS.length && (
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted">
          <Hanko char="完" size={28} />
          {t.allDone}
        </div>
      )}
    </section>
  )
}
