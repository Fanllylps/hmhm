import { useEffect } from 'react'

/**
 * Global keydown listener for shortcuts. Skips events targeted at form fields
 * (so typing modes never fight with shortcut keys) and at links (so Enter on
 * a focused link navigates instead of being hijacked by a page shortcut).
 */
export function useKeyDown(handler: (e: KeyboardEvent) => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target) {
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return
        if (target.closest('a')) return
      }
      handler(e)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handler, enabled])
}
