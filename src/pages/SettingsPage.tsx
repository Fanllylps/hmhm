import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { speak } from '../lib/audio'
import { dayKey } from '../lib/dates'
import {
  buildExportPayload,
  parseImportPayload,
  SCHEMA_VERSION,
  useStore,
  type Settings,
} from '../stores/store'

const SCRIPT_OPTIONS: { value: Settings['scripts']; label: string; jp: string }[] = [
  { value: 'hiragana', label: 'Hiragana', jp: 'あ' },
  { value: 'katakana', label: 'Katakana', jp: 'ア' },
  { value: 'both', label: 'Both', jp: 'あア' },
]

const GROUP_OPTIONS: {
  key: keyof Settings['groups']
  label: string
  description: string
  jp: string
}[] = [
  { key: 'basic', label: 'Basic', description: 'Gojūon — the core sounds', jp: 'あ' },
  { key: 'dakuten', label: 'Dakuten & handakuten', description: 'ga · za · da · ba · pa', jp: 'が' },
  { key: 'yoon', label: 'Yōon', description: 'kya · shu · cho combinations', jp: 'きゃ' },
  { key: 'kanji', label: 'Kanji (JLPT N5)', description: '80 kanji with meanings & readings', jp: '日' },
]

const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20, 30]

const THEME_OPTIONS: { value: Settings['theme']; label: string; jp: string }[] = [
  { value: 'system', label: 'System', jp: '自' },
  { value: 'light', label: 'Light', jp: '昼' },
  { value: 'dark', label: 'Dark', jp: '夜' },
]

/** Small switch: sumi track when on, hairline when off, spring-animated knob. */
function Toggle({
  checked,
  onChange,
  disabled = false,
  label,
}: {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  label: string
}) {
  return (
    <motion.button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.94 }}
      onClick={() => onChange(!checked)}
      className={`flex h-11 w-12 shrink-0 items-center justify-center ${
        disabled ? 'cursor-not-allowed opacity-40' : ''
      }`}
    >
      <span
        className={`flex h-[26px] w-12 items-center rounded-full p-[3px] transition-colors duration-200 ${
          checked ? 'justify-end bg-sumi' : 'justify-start bg-hairline'
        }`}
      >
        <motion.span
          layout
          transition={{ type: 'spring', stiffness: 550, damping: 34 }}
          className="h-5 w-5 rounded-full bg-surface shadow-soft"
        />
      </span>
    </motion.button>
  )
}

function Section({ title, jp, children }: { title: string; jp: string; children: ReactNode }) {
  return (
    <section className="mb-7">
      <h2 className="mb-2.5 flex items-baseline gap-2 px-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        {title}
        <span aria-hidden className="font-kana text-sm normal-case tracking-normal">
          {jp}
        </span>
      </h2>
      <div className="divide-y divide-hairline rounded-2xl border border-hairline bg-surface shadow-soft">
        {children}
      </div>
    </section>
  )
}

/** Toggle row: text on the left, switch on the right. */
function SwitchRow({
  label,
  description,
  note,
  jp,
  checked,
  onChange,
  disabled,
}: {
  label: string
  description: string
  note?: string
  jp?: string
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5">
      <div className="flex min-w-0 items-center gap-3.5">
        {jp && (
          <span aria-hidden className="w-8 shrink-0 text-center font-kana text-2xl text-muted">
            {jp}
          </span>
        )}
        <div className="min-w-0">
          <div className="font-medium">{label}</div>
          <div className="mt-0.5 text-sm text-muted">{description}</div>
          {note && <div className="mt-1 text-xs text-vermilion/80">{note}</div>}
        </div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={label} />
    </div>
  )
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const cardCount = useStore((s) => Object.keys(s.cards).length)
  const updateSettings = useStore((s) => s.updateSettings)
  const importAll = useStore((s) => s.importAll)
  const resetProgress = useStore((s) => s.resetProgress)

  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [dataMsg, setDataMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Auto-dismiss data messages; cleared on unmount.
  useEffect(() => {
    if (!dataMsg) return
    const t = setTimeout(() => setDataMsg(null), 5000)
    return () => clearTimeout(t)
  }, [dataMsg])

  const enabledGroups = GROUP_OPTIONS.filter((g) => settings.groups[g.key]).length

  const setGroup = (key: keyof Settings['groups'], value: boolean) => {
    const next = { ...settings.groups, [key]: value }
    // Guard: at least one group must stay enabled.
    if (!next.basic && !next.dakuten && !next.yoon && !next.kanji) return
    updateSettings({ groups: next })
  }

  const setAudio = (enabled: boolean) => {
    updateSettings({ audio: enabled })
    // A tiny sample so turning it on confirms the voice works.
    if (enabled) speak('こんにちは', true)
  }

  const handleExport = () => {
    const payload = buildExportPayload(useStore.getState())
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kanaflow-backup-${dayKey()}.json`
    a.click()
    URL.revokeObjectURL(url)
    setDataMsg({ tone: 'success', text: 'Backup downloaded.' })
  }

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      const text = await file.text()
      const data = parseImportPayload(text)
      importAll(data)
      setDataMsg({ tone: 'success', text: 'Progress restored — welcome back.' })
    } catch {
      setDataMsg({ tone: 'error', text: 'That file doesn’t look like a KanaFlow backup.' })
    }
  }

  const handleReset = () => {
    resetProgress()
    setConfirmReset(false)
    setDataMsg({ tone: 'success', text: 'Progress cleared — fresh start.' })
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Settings" jp="設定" subtitle="Tune your study flow" backTo="/" />

      <Section title="Study" jp="学">
        <div className="px-5 py-4">
          <div className="font-medium">Script</div>
          <p className="mt-0.5 text-sm text-muted">Which kana appear in reviews and games.</p>
          <div role="radiogroup" aria-label="Script" className="mt-3 flex rounded-xl bg-washi p-1">
            {SCRIPT_OPTIONS.map((opt) => {
              const active = settings.scripts === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ scripts: opt.value })}
                  className={`relative min-h-[44px] flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${
                    active ? 'text-sumi' : 'text-muted hover:text-sumi'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-script-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg border border-hairline bg-surface shadow-soft"
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-1.5">
                    <span aria-hidden className="font-kana text-base">
                      {opt.jp}
                    </span>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {GROUP_OPTIONS.map((g) => {
          const on = settings.groups[g.key]
          const locked = on && enabledGroups === 1
          return (
            <SwitchRow
              key={g.key}
              jp={g.jp}
              label={g.label}
              description={g.description}
              note={locked ? 'Keep at least one group on' : undefined}
              checked={on}
              disabled={locked}
              onChange={(next) => setGroup(g.key, next)}
            />
          )
        })}

        <div className="px-5 py-4">
          <div className="font-medium">New cards per day</div>
          <p className="mt-0.5 text-sm text-muted">How many unseen kana each day introduces.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {NEW_PER_DAY_OPTIONS.map((n) => {
              const active = settings.newPerDay === n
              return (
                <motion.button
                  key={n}
                  whileTap={{ scale: 0.96 }}
                  aria-pressed={active}
                  onClick={() => updateSettings({ newPerDay: n })}
                  className={`min-h-[44px] min-w-[52px] rounded-xl border px-4 text-sm font-medium transition-colors ${
                    active
                      ? 'border-sumi bg-sumi text-surface'
                      : 'border-hairline text-muted hover:text-sumi'
                  }`}
                >
                  {n}
                </motion.button>
              )
            })}
          </div>
        </div>
      </Section>

      <Section title="Experience" jp="音">
        <div className="px-5 py-4">
          <div className="font-medium">Theme</div>
          <p className="mt-0.5 text-sm text-muted">
            Washi cream by day, warm sumi night by dark.
          </p>
          <div role="radiogroup" aria-label="Theme" className="mt-3 flex rounded-xl bg-washi p-1">
            {THEME_OPTIONS.map((opt) => {
              const active = settings.theme === opt.value
              return (
                <button
                  key={opt.value}
                  role="radio"
                  aria-checked={active}
                  onClick={() => updateSettings({ theme: opt.value })}
                  className={`relative min-h-[44px] flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${
                    active ? 'text-sumi' : 'text-muted hover:text-sumi'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="settings-theme-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      className="absolute inset-0 rounded-lg border border-hairline bg-surface shadow-soft"
                    />
                  )}
                  <span className="relative flex items-center justify-center gap-1.5">
                    <span aria-hidden className="font-kana text-base">
                      {opt.jp}
                    </span>
                    {opt.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
        <SwitchRow
          label="Audio"
          description="Speak kana aloud with a Japanese voice."
          checked={settings.audio}
          onChange={setAudio}
        />
        <SwitchRow
          label="Lenient romaji"
          description="Accept shi/si, chi/ti, tsu/tu, fu/hu, ja/jya…"
          checked={settings.lenient}
          onChange={(next) => updateSettings({ lenient: next })}
        />
      </Section>

      <Section title="Data" jp="保">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div>
            <div className="font-medium">Export progress</div>
            <div className="mt-0.5 text-sm text-muted">
              Download a JSON backup — {cardCount} card{cardCount === 1 ? '' : 's'}, stats and
              scores.
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            className="min-h-[44px] shrink-0 rounded-xl border border-hairline px-4 text-sm font-medium text-sumi transition-colors hover:bg-washi"
          >
            Export
          </motion.button>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div>
            <div className="font-medium">Import progress</div>
            <div className="mt-0.5 text-sm text-muted">Restore from a KanaFlow backup file.</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] shrink-0 rounded-xl border border-hairline px-4 text-sm font-medium text-sumi transition-colors hover:bg-washi"
          >
            Import
          </motion.button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div>
            <div className="font-medium">Reset progress</div>
            <div className="mt-0.5 text-sm text-muted">
              Deletes cards, stats and scores. Settings are kept.
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setConfirmReset(true)}
            className="min-h-[44px] shrink-0 rounded-xl border border-vermilion/40 px-4 text-sm font-medium text-vermilion transition-colors hover:bg-vermilion/5"
          >
            Reset…
          </motion.button>
        </div>
      </Section>

      <AnimatePresence>
        {dataMsg && (
          <motion.p
            key={dataMsg.text}
            role="status"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`-mt-3 mb-4 px-1 text-sm font-medium ${
              dataMsg.tone === 'success' ? 'text-matcha' : 'text-vermilion'
            }`}
          >
            {dataMsg.text}
          </motion.p>
        )}
      </AnimatePresence>

      <p className="mt-10 text-center text-xs text-muted">
        <span aria-hidden className="font-kana">
          かな
        </span>{' '}
        KanaFlow · schema v{SCHEMA_VERSION}
      </p>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="Reset progress?">
        <p className="text-sm text-muted">
          This deletes all cards, stats and scores — settings are kept. There is no undo, so
          consider exporting a backup first.
        </p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setConfirmReset(false)}
            className="min-h-[48px] flex-1 rounded-2xl border border-hairline px-4 font-medium text-muted transition-colors hover:text-sumi"
          >
            Cancel
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="min-h-[48px] flex-1 rounded-2xl bg-vermilion px-4 font-medium text-surface"
          >
            Reset everything
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
