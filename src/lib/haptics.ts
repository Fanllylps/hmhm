/**
 * Haptic feedback via the Vibration API. Android browsers support it; iOS
 * silently ignores navigator.vibrate, so this is a progressive enhancement.
 * No store import here — call sites pass the user's setting in.
 */

export type HapticKind = 'tap' | 'success' | 'error' | 'celebrate'

const PATTERNS: Record<HapticKind, number | number[]> = {
  /** Card flip, small UI confirmations. */
  tap: 8,
  /** Correct answer. */
  success: 14,
  /** Wrong answer — a firm double buzz. */
  error: [26, 60, 26],
  /** Achievement unlocked / new record. */
  celebrate: [16, 50, 16, 50, 46],
}

export function haptic(kind: HapticKind, enabled = true): void {
  if (!enabled) return
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    // Some browsers throw when vibration is blocked by permissions policy.
  }
}
