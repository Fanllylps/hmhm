import type { Lang } from '../stores/store'

/**
 * Evening streak-rescue reminder. Best-effort local Notification fired from
 * the running page (no push server): if the tab is open past 20:00 with zero
 * reviews today, nudge the user before the streak dies at midnight. The
 * in-app Tako rescue line is the reliable half; this is the bonus half.
 */

/** Local hour the reminder fires. */
export const REMINDER_HOUR = 20

export function msUntilNextReminder(now: Date = new Date()): number {
  const next = new Date(now)
  next.setHours(REMINDER_HOUR, 0, 0, 0)
  if (next.getTime() <= now.getTime()) next.setDate(next.getDate() + 1)
  return next.getTime() - now.getTime()
}

export type ReminderPermission = 'granted' | 'denied' | 'default' | 'unsupported'

export function reminderPermission(): ReminderPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission as ReminderPermission
}

export async function requestReminderPermission(): Promise<ReminderPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  try {
    return (await Notification.requestPermission()) as ReminderPermission
  } catch {
    return reminderPermission()
  }
}

export function streakReminderText(
  streak: number,
  lang: Lang,
): { title: string; body: string } {
  if (lang === 'id') {
    return {
      title: 'KanaFlow',
      body:
        streak > 0
          ? `Streak ${streak} harimu hangus tengah malam ini! Satu review cepat menyelamatkannya. 🔥`
          : 'Belum belajar hari ini — yuk, 5 menit saja sebelum tidur. 🌙',
    }
  }
  return {
    title: 'KanaFlow',
    body:
      streak > 0
        ? `Your ${streak}-day streak dies at midnight! One quick review saves it. 🔥`
        : 'No study today yet — 5 minutes before bed is enough. 🌙',
  }
}

/** Fire the notification. Returns false when there is nothing to show with. */
export function sendStreakReminder(streak: number, lang: Lang): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false
  if (Notification.permission !== 'granted') return false
  try {
    const { title, body } = streakReminderText(streak, lang)
    new Notification(title, { body, tag: 'kanaflow-streak' })
    return true
  } catch {
    return false
  }
}
