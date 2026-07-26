import { MEANING_ID } from '../data/meanings-id'
import { useStore, type Lang } from '../stores/store'

export type { Lang }

/** A string in every supported UI language. */
export type Localized = Record<Lang, string>

/** Current UI language (reactive). */
export function useLang(): Lang {
  return useStore((s) => s.settings.language)
}

/** Non-reactive read for callbacks outside React rendering. */
export function currentLang(): Lang {
  return useStore.getState().settings.language
}

/**
 * Meaning of a kanji/word entry in the active language. Falls back to the
 * English meaning stored on the entry itself.
 */
export function localizedMeaning(entryId: string, english: string, lang: Lang): string {
  return lang === 'id' ? (MEANING_ID[entryId] ?? english) : english
}

/** Locale string for date formatting. */
export function dateLocale(lang: Lang): string {
  return lang === 'id' ? 'id-ID' : 'en-US'
}
