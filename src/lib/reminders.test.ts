import { describe, expect, it } from 'vitest'
import { REMINDER_HOUR, msUntilNextReminder, streakReminderText } from './reminders'

describe('msUntilNextReminder', () => {
  it('fires today when it is still before 20:00', () => {
    const now = new Date(2026, 6, 26, 19, 0, 0)
    expect(msUntilNextReminder(now)).toBe(60 * 60 * 1000)
  })

  it('rolls over to tomorrow after 20:00', () => {
    const now = new Date(2026, 6, 26, 21, 0, 0)
    expect(msUntilNextReminder(now)).toBe(23 * 60 * 60 * 1000)
  })

  it('is always within (0, 24h]', () => {
    for (let h = 0; h < 24; h++) {
      const ms = msUntilNextReminder(new Date(2026, 6, 26, h, 30, 0))
      expect(ms).toBeGreaterThan(0)
      expect(ms).toBeLessThanOrEqual(24 * 60 * 60 * 1000)
    }
  })

  it('targets the configured hour', () => {
    expect(REMINDER_HOUR).toBe(20)
  })
})

describe('streakReminderText', () => {
  it('mentions the streak when there is one (en + id)', () => {
    expect(streakReminderText(5, 'en').body).toContain('5-day streak')
    expect(streakReminderText(5, 'id').body).toContain('Streak 5 hari')
  })

  it('falls back to a gentle nudge at zero streak', () => {
    expect(streakReminderText(0, 'en').body).toContain('No study today')
    expect(streakReminderText(0, 'id').body).toContain('Belum belajar')
  })
})
