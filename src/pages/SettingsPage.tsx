import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import Modal from '../components/Modal'
import PageHeader from '../components/PageHeader'
import { speak } from '../lib/audio'
import { dayKey } from '../lib/dates'
import { haptic } from '../lib/haptics'
import { useLang } from '../lib/i18n'
import {
  buildExportPayload,
  parseImportPayload,
  SCHEMA_VERSION,
  useStore,
  type Lang,
  type Settings,
} from '../stores/store'

const EN = {
  title: 'Settings',
  subtitle: 'Tune your study flow',
  study: 'Study',
  script: 'Script',
  scriptDesc: 'Which kana appear in reviews and games.',
  scripts: { hiragana: 'Hiragana', katakana: 'Katakana', both: 'Both' },
  groups: {
    basic: { label: 'Basic', desc: 'Gojūon — the core sounds' },
    dakuten: { label: 'Dakuten & handakuten', desc: 'ga · za · da · ba · pa' },
    yoon: { label: 'Yōon', desc: 'kya · shu · cho combinations' },
    kanji: { label: 'Kanji (JLPT N5)', desc: '80 kanji with meanings & readings' },
    vocab: { label: 'Daily vocabulary', desc: 'Everyday words & phrases — built-in + yours' },
  },
  keepOne: 'Keep at least one group on',
  newPerDay: 'New cards per day',
  newPerDayDesc: 'How many unseen kana each day introduces.',
  experience: 'Experience',
  language: 'Language',
  languageDesc: 'Applies to the whole app.',
  theme: 'Theme',
  themeDesc: 'Washi cream by day, warm sumi night by dark.',
  themes: { system: 'System', light: 'Light', dark: 'Dark' },
  audio: 'Audio',
  audioDesc: 'Speak kana aloud with a Japanese voice.',
  haptics: 'Haptics',
  hapticsDesc: 'Vibrate on answers and unlocks. Android — iPhones ignore this.',
  lenient: 'Lenient romaji',
  lenientDesc: 'Accept shi/si, chi/ti, tsu/tu, fu/hu, ja/jya…',
  data: 'Data',
  export: 'Export progress',
  exportDesc: (n: number) => `Download a JSON backup — ${n} card${n === 1 ? '' : 's'}, stats and scores.`,
  exportBtn: 'Export',
  import: 'Import progress',
  importDesc: 'Restore from a KanaFlow backup file.',
  importBtn: 'Import',
  reset: 'Reset progress',
  resetDesc: 'Wipes everything and restarts like a fresh install.',
  resetBtn: 'Reset…',
  msgExported: 'Backup downloaded.',
  msgImported: 'Progress restored — welcome back.',
  msgBadFile: 'That file doesn’t look like a KanaFlow backup.',
  msgReset: 'Progress cleared — fresh start.',
  resetTitle: 'Reset progress?',
  resetBody:
    'This deletes all cards, stats, scores and your custom words & stories, then brings back the welcome tour — a true fresh start. There is no undo, so consider exporting a backup first.',
  cancel: 'Cancel',
  resetConfirm: 'Reset everything',
}

const ID: typeof EN = {
  title: 'Setelan',
  subtitle: 'Atur cara belajarmu',
  study: 'Belajar',
  script: 'Aksara',
  scriptDesc: 'Kana mana yang muncul di review dan game.',
  scripts: { hiragana: 'Hiragana', katakana: 'Katakana', both: 'Keduanya' },
  groups: {
    basic: { label: 'Dasar', desc: 'Gojūon — bunyi-bunyi inti' },
    dakuten: { label: 'Dakuten & handakuten', desc: 'ga · za · da · ba · pa' },
    yoon: { label: 'Yōon', desc: 'gabungan kya · shu · cho' },
    kanji: { label: 'Kanji (JLPT N5)', desc: '80 kanji dengan arti & cara baca' },
    vocab: { label: 'Kosakata harian', desc: 'Kata & frasa sehari-hari — bawaan + tambahanmu' },
  },
  keepOne: 'Minimal satu kelompok harus aktif',
  newPerDay: 'Kartu baru per hari',
  newPerDayDesc: 'Berapa kana baru yang diperkenalkan tiap hari.',
  experience: 'Pengalaman',
  language: 'Bahasa',
  languageDesc: 'Berlaku untuk seluruh aplikasi.',
  theme: 'Tema',
  themeDesc: 'Krem washi di siang hari, sumi hangat di malam hari.',
  themes: { system: 'Sistem', light: 'Terang', dark: 'Gelap' },
  audio: 'Audio',
  audioDesc: 'Ucapkan kana dengan suara bahasa Jepang.',
  haptics: 'Getaran',
  hapticsDesc: 'Bergetar saat menjawab. Khusus Android — iPhone mengabaikannya.',
  lenient: 'Romaji longgar',
  lenientDesc: 'Terima shi/si, chi/ti, tsu/tu, fu/hu, ja/jya…',
  data: 'Data',
  export: 'Ekspor progres',
  exportDesc: (n: number) => `Unduh cadangan JSON — ${n} kartu, statistik, dan skor.`,
  exportBtn: 'Ekspor',
  import: 'Impor progres',
  importDesc: 'Pulihkan dari file cadangan KanaFlow.',
  importBtn: 'Impor',
  reset: 'Hapus progres',
  resetDesc: 'Menghapus semuanya dan mulai ulang seperti baru pasang.',
  resetBtn: 'Hapus…',
  msgExported: 'Cadangan berhasil diunduh.',
  msgImported: 'Progres dipulihkan — selamat datang kembali.',
  msgBadFile: 'File itu sepertinya bukan cadangan KanaFlow.',
  msgReset: 'Progres dihapus — mulai dari awal.',
  resetTitle: 'Hapus progres?',
  resetBody:
    'Semua kartu, statistik, skor, serta kosakata & cerita tambahanmu akan dihapus, lalu tur sambutan muncul lagi — benar-benar mulai dari awal. Tidak bisa dibatalkan, jadi sebaiknya ekspor cadangan dulu.',
  cancel: 'Batal',
  resetConfirm: 'Hapus semuanya',
}

const STR: Record<Lang, typeof EN> = { en: EN, id: ID }

const SCRIPT_JP: Record<Settings['scripts'], string> = {
  hiragana: 'あ',
  katakana: 'ア',
  both: 'あア',
}
const GROUP_KEYS = ['basic', 'dakuten', 'yoon', 'kanji', 'vocab'] as const
const GROUP_JP: Record<(typeof GROUP_KEYS)[number], string> = {
  basic: 'あ',
  dakuten: 'が',
  yoon: 'きゃ',
  kanji: '日',
  vocab: '語',
}
const NEW_PER_DAY_OPTIONS = [5, 10, 15, 20, 30]
const THEME_JP: Record<Settings['theme'], string> = { system: '自', light: '昼', dark: '夜' }
const LANG_OPTIONS: { value: Lang; label: string; jp: string }[] = [
  { value: 'en', label: 'English', jp: '英' },
  { value: 'id', label: 'Indonesia', jp: '尼' },
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

/** Segmented control with an animated active pill. */
function Segmented<T extends string>({
  ariaLabel,
  layoutId,
  options,
  value,
  onChange,
}: {
  ariaLabel: string
  layoutId: string
  options: { value: T; label: string; jp: string }[]
  value: T
  onChange: (next: T) => void
}) {
  return (
    <div role="radiogroup" aria-label={ariaLabel} className="mt-3 flex rounded-xl bg-washi p-1">
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={`relative min-h-[44px] flex-1 rounded-lg px-2 text-sm font-medium transition-colors ${
              active ? 'text-sumi' : 'text-muted hover:text-sumi'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
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
  )
}

export default function SettingsPage() {
  const settings = useStore((s) => s.settings)
  const cardCount = useStore((s) => Object.keys(s.cards).length)
  const updateSettings = useStore((s) => s.updateSettings)
  const importAll = useStore((s) => s.importAll)
  const resetProgress = useStore((s) => s.resetProgress)
  const lang = useLang()
  const t = STR[lang]

  const fileRef = useRef<HTMLInputElement>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const [dataMsg, setDataMsg] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)

  // Auto-dismiss data messages; cleared on unmount.
  useEffect(() => {
    if (!dataMsg) return
    const timer = setTimeout(() => setDataMsg(null), 5000)
    return () => clearTimeout(timer)
  }, [dataMsg])

  const enabledGroups = GROUP_KEYS.filter((g) => settings.groups[g]).length

  const setGroup = (key: (typeof GROUP_KEYS)[number], value: boolean) => {
    const next = { ...settings.groups, [key]: value }
    // Guard: at least one group must stay enabled.
    if (!next.basic && !next.dakuten && !next.yoon && !next.kanji && !next.vocab) return
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
    setDataMsg({ tone: 'success', text: t.msgExported })
  }

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file
    if (!file) return
    try {
      const text = await file.text()
      const data = parseImportPayload(text)
      importAll(data)
      setDataMsg({ tone: 'success', text: t.msgImported })
    } catch {
      setDataMsg({ tone: 'error', text: t.msgBadFile })
    }
  }

  const handleReset = () => {
    resetProgress()
    setConfirmReset(false)
    setDataMsg({ tone: 'success', text: t.msgReset })
  }

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title={t.title} jp="設定" subtitle={t.subtitle} backTo="/" />

      <Section title={t.study} jp="学">
        <div className="px-5 py-4">
          <div className="font-medium">{t.script}</div>
          <p className="mt-0.5 text-sm text-muted">{t.scriptDesc}</p>
          <Segmented
            ariaLabel={t.script}
            layoutId="settings-script-pill"
            value={settings.scripts}
            onChange={(scripts) => updateSettings({ scripts })}
            options={(['hiragana', 'katakana', 'both'] as const).map((value) => ({
              value,
              label: t.scripts[value],
              jp: SCRIPT_JP[value],
            }))}
          />
        </div>

        {GROUP_KEYS.map((key) => {
          const on = settings.groups[key]
          const locked = on && enabledGroups === 1
          return (
            <SwitchRow
              key={key}
              jp={GROUP_JP[key]}
              label={t.groups[key].label}
              description={t.groups[key].desc}
              note={locked ? t.keepOne : undefined}
              checked={on}
              disabled={locked}
              onChange={(next) => setGroup(key, next)}
            />
          )
        })}

        <div className="px-5 py-4">
          <div className="font-medium">{t.newPerDay}</div>
          <p className="mt-0.5 text-sm text-muted">{t.newPerDayDesc}</p>
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

      <Section title={t.experience} jp="音">
        <div className="px-5 py-4">
          <div className="font-medium">{t.language}</div>
          <p className="mt-0.5 text-sm text-muted">{t.languageDesc}</p>
          <Segmented
            ariaLabel={t.language}
            layoutId="settings-lang-pill"
            value={settings.language}
            onChange={(language) => updateSettings({ language })}
            options={LANG_OPTIONS}
          />
        </div>
        <div className="px-5 py-4">
          <div className="font-medium">{t.theme}</div>
          <p className="mt-0.5 text-sm text-muted">{t.themeDesc}</p>
          <Segmented
            ariaLabel={t.theme}
            layoutId="settings-theme-pill"
            value={settings.theme}
            onChange={(theme) => updateSettings({ theme })}
            options={(['system', 'light', 'dark'] as const).map((value) => ({
              value,
              label: t.themes[value],
              jp: THEME_JP[value],
            }))}
          />
        </div>
        <SwitchRow
          label={t.audio}
          description={t.audioDesc}
          checked={settings.audio}
          onChange={setAudio}
        />
        <SwitchRow
          label={t.haptics}
          description={t.hapticsDesc}
          checked={settings.haptics}
          onChange={(next) => {
            updateSettings({ haptics: next })
            // A sample buzz so turning it on confirms it works on this device.
            if (next) haptic('success', true)
          }}
        />
        <SwitchRow
          label={t.lenient}
          description={t.lenientDesc}
          checked={settings.lenient}
          onChange={(next) => updateSettings({ lenient: next })}
        />
      </Section>

      <Section title={t.data} jp="保">
        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div>
            <div className="font-medium">{t.export}</div>
            <div className="mt-0.5 text-sm text-muted">{t.exportDesc(cardCount)}</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={handleExport}
            className="min-h-[44px] shrink-0 rounded-xl border border-hairline px-4 text-sm font-medium text-sumi transition-colors hover:bg-washi"
          >
            {t.exportBtn}
          </motion.button>
        </div>

        <div className="flex items-center justify-between gap-4 px-5 py-3.5">
          <div>
            <div className="font-medium">{t.import}</div>
            <div className="mt-0.5 text-sm text-muted">{t.importDesc}</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => fileRef.current?.click()}
            className="min-h-[44px] shrink-0 rounded-xl border border-hairline px-4 text-sm font-medium text-sumi transition-colors hover:bg-washi"
          >
            {t.importBtn}
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
            <div className="font-medium">{t.reset}</div>
            <div className="mt-0.5 text-sm text-muted">{t.resetDesc}</div>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => setConfirmReset(true)}
            className="min-h-[44px] shrink-0 rounded-xl border border-vermilion/40 px-4 text-sm font-medium text-vermilion transition-colors hover:bg-vermilion/5"
          >
            {t.resetBtn}
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

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title={t.resetTitle}>
        <p className="text-sm text-muted">{t.resetBody}</p>
        <div className="mt-6 flex gap-2">
          <button
            onClick={() => setConfirmReset(false)}
            className="min-h-[48px] flex-1 rounded-2xl border border-hairline px-4 font-medium text-muted transition-colors hover:text-sumi"
          >
            {t.cancel}
          </button>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="min-h-[48px] flex-1 rounded-2xl bg-vermilion px-4 font-medium text-surface"
          >
            {t.resetConfirm}
          </motion.button>
        </div>
      </Modal>
    </div>
  )
}
