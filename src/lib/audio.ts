let cachedVoice: SpeechSynthesisVoice | null = null

function pickJapaneseVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  cachedVoice =
    voices.find((v) => v.lang === 'ja-JP') ??
    voices.find((v) => v.lang.startsWith('ja')) ??
    null
  return cachedVoice
}

// Some browsers load voices asynchronously; refresh the cache when they arrive.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.addEventListener?.('voiceschanged', () => {
    cachedVoice = null
  })
}

/** Whether this browser supports speech synthesis at all. */
export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/**
 * Whether a Japanese voice is installed. Voices may load asynchronously —
 * listen to `voiceschanged` and re-check before treating false as final.
 */
export function hasJapaneseVoice(): boolean {
  return speechAvailable() && pickJapaneseVoice() !== null
}

/** Speak kana out loud with a ja-JP voice. No-op when unsupported or disabled. */
export function speak(text: string, enabled = true): void {
  if (!enabled) return
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = 'ja-JP'
  utterance.rate = 0.85
  const voice = pickJapaneseVoice()
  if (voice) utterance.voice = voice
  window.speechSynthesis.speak(utterance)
}
