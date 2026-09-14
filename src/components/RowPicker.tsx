import { useState } from 'react'
import { toKatakana } from '../data/kana'
import { ROWS, type DistractorScope, type RowOrder, type RowScript } from '../lib/rowscope'

export interface RowPickerText {
  rowsLabel: string
  groupNames: Record<string, string>
  selectAll: string
  clear: string
  scriptLabel: string
  scripts: Record<RowScript, string>
  orderLabel: string
  orders: Record<RowOrder, string>
  distractorsLabel: string
  distractors: Record<DistractorScope, string>
  selectedCount: (n: number) => string
}

interface RowPickerProps {
  t: RowPickerText
  rows: string[]
  onToggleRow: (key: string) => void
  onSelectAll: () => void
  onClear: () => void
  script: RowScript
  onScript: (s: RowScript) => void
  order: RowOrder
  onOrder: (o: RowOrder) => void
  distractors: DistractorScope
  onDistractors: (d: DistractorScope) => void
  showDistractors: boolean
}

const GROUPS = ['basic', 'dakuten', 'handakuten', 'yoon'] as const

/** Chevron marks an accordion header as expandable; it rotates when open. */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={`shrink-0 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Check badge marks a selected chip; border tint alone is not enough signal. */
function CheckBadge() {
  return (
    <span
      aria-hidden
      className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-vermilion text-surface"
    >
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
        <path
          d="M1.8 5.3l2 2 4.4-4.8"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

function Section({
  id,
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  id: string
  title: string
  meta?: string
  open: boolean
  onToggle: () => void
  children: React.ReactNode
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className="flex min-h-[44px] w-full items-center justify-between gap-2 py-1 text-left"
      >
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          {meta && <span className="text-xs text-muted">{meta}</span>}
          <Chevron open={open} />
        </span>
      </button>
      {open && (
        <div id={id} className="mt-1.5">
          {children}
        </div>
      )}
    </div>
  )
}

function Segmented<T extends string>({
  options,
  columns,
  value,
  onPick,
  labelOf,
}: {
  options: readonly T[]
  columns: 2 | 3
  value: T
  onPick: (v: T) => void
  labelOf: (v: T) => string
}) {
  return (
    <div className={`grid gap-2 ${columns === 3 ? 'grid-cols-3' : 'grid-cols-2'}`} role="group">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(opt)}
            className={`relative min-h-[44px] rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-vermilion bg-vermilion/10 text-sumi'
                : 'border-hairline bg-surface text-muted'
            }`}
          >
            {active && <CheckBadge />}
            {labelOf(opt)}
          </button>
        )
      })}
    </div>
  )
}

export default function RowPicker(props: RowPickerProps) {
  const { t } = props
  const selected = new Set(props.rows)

  // Desktop: everything open. Mobile: only groups that already hold a
  // selection start open, so the scroll stays short and one-hand friendly.
  const [open, setOpen] = useState<Record<string, boolean>>(() => {
    const all: Record<string, boolean> = {}
    for (const g of GROUPS) all[g] = true
    all.script = true
    all.order = true
    all.distractors = true
    if (typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches) {
      for (const g of GROUPS) {
        if (!ROWS.some((r) => r.group === g && selected.has(r.key))) all[g] = false
      }
      all.script = false
      all.order = false
      all.distractors = false
    }
    return all
  })
  const toggle = (key: string) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  const groupCount = (group: string) => {
    const defs = ROWS.filter((r) => r.group === group)
    const n = defs.filter((r) => selected.has(r.key)).length
    return `${n}/${defs.length}`
  }

  return (
    <div className="mt-6 space-y-4 text-left">
      <div className="flex min-h-[44px] items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
          {t.rowsLabel}
        </span>
        <span className="flex gap-1">
          <button
            type="button"
            onClick={props.onSelectAll}
            className="min-h-[44px] px-2 text-xs font-medium text-vermilion"
          >
            {t.selectAll}
          </button>
          <button
            type="button"
            onClick={props.onClear}
            className="min-h-[44px] px-2 text-xs font-medium text-muted"
          >
            {t.clear}
          </button>
        </span>
      </div>

      {GROUPS.map((group) => {
        const defs = ROWS.filter((r) => r.group === group)
        if (defs.length === 0) return null
        return (
          <Section
            key={group}
            id={`rowgroup-${group}`}
            title={t.groupNames[group]}
            meta={groupCount(group)}
            open={open[group]}
            onToggle={() => toggle(group)}
          >
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
              {defs.map((row) => {
                const active = selected.has(row.key)
                return (
                  <button
                    key={row.key}
                    type="button"
                    aria-pressed={active}
                    onClick={() => props.onToggleRow(row.key)}
                    className={`relative flex min-h-[48px] w-full flex-col items-center justify-center rounded-xl border px-1 py-1.5 transition-colors ${
                      active
                        ? 'border-vermilion bg-vermilion/10 text-sumi'
                        : 'border-hairline bg-surface text-sumi'
                    }`}
                  >
                    {active && <CheckBadge />}
                    <span className="font-kana text-xl leading-none">
                      {props.script === 'katakana' ? toKatakana(row.sample) : row.sample}
                    </span>
                    <span className="mt-0.5 text-[10px] font-medium tracking-wide text-muted">
                      {row.key}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>
        )
      })}
      <p aria-live="polite" className="text-xs text-muted">
        {t.selectedCount(props.rows.length)}
      </p>

      <Section
        id="rowscript"
        title={t.scriptLabel}
        meta={t.scripts[props.script]}
        open={open.script}
        onToggle={() => toggle('script')}
      >
        <Segmented
          options={['hiragana', 'katakana', 'both'] as const}
          columns={3}
          value={props.script}
          onPick={props.onScript}
          labelOf={(s) => t.scripts[s]}
        />
      </Section>

      <Section
        id="roworder"
        title={t.orderLabel}
        meta={t.orders[props.order]}
        open={open.order}
        onToggle={() => toggle('order')}
      >
        <Segmented
          options={['sequential', 'random'] as const}
          columns={2}
          value={props.order}
          onPick={props.onOrder}
          labelOf={(o) => t.orders[o]}
        />
      </Section>

      {props.showDistractors && (
        <Section
          id="rowdistractors"
          title={t.distractorsLabel}
          meta={t.distractors[props.distractors]}
          open={open.distractors}
          onToggle={() => toggle('distractors')}
        >
          <Segmented
            options={['row', 'mixed'] as const}
            columns={2}
            value={props.distractors}
            onPick={props.onDistractors}
            labelOf={(d) => t.distractors[d]}
          />
        </Section>
      )}
    </div>
  )
}
