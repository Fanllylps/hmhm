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

function Segmented<T extends string>({
  options,
  value,
  onPick,
  labelOf,
}: {
  options: readonly T[]
  value: T
  onPick: (v: T) => void
  labelOf: (v: T) => string
}) {
  return (
    <div className="grid grid-cols-3 gap-2" role="group">
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onPick(opt)}
            className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
              active
                ? 'border-vermilion bg-vermilion/10 text-vermilion'
                : 'border-hairline bg-surface text-muted'
            }`}
          >
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
  return (
    <div className="mt-6 space-y-5 text-left">
      <div>
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted">
            {t.rowsLabel}
          </span>
          <span className="flex gap-3">
            <button
              type="button"
              onClick={props.onSelectAll}
              className="min-h-[44px] px-1 text-xs font-medium text-vermilion"
            >
              {t.selectAll}
            </button>
            <button
              type="button"
              onClick={props.onClear}
              className="min-h-[44px] px-1 text-xs font-medium text-muted"
            >
              {t.clear}
            </button>
          </span>
        </div>
        {GROUPS.map((group) => {
          const defs = ROWS.filter((r) => r.group === group)
          if (defs.length === 0) return null
          return (
            <div key={group} className="mt-3">
              <div className="mb-1.5 text-xs text-muted">{t.groupNames[group]}</div>
              <div className="flex flex-wrap gap-2">
                {defs.map((row) => {
                  const active = selected.has(row.key)
                  return (
                    <button
                      key={row.key}
                      type="button"
                      aria-pressed={active}
                      onClick={() => props.onToggleRow(row.key)}
                      className={`flex min-h-[44px] min-w-[56px] flex-col items-center justify-center rounded-xl border px-2 py-1.5 transition-colors ${
                        active
                          ? 'border-vermilion bg-vermilion/10 text-vermilion'
                          : 'border-hairline bg-surface text-muted'
                      }`}
                    >
                      <span className="font-kana text-xl leading-none">
                        {props.script === 'katakana' ? toKatakana(row.sample) : row.sample}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium tracking-wide">
                        {row.key}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        <p aria-live="polite" className="mt-2 text-xs text-muted">
          {t.selectedCount(props.rows.length)}
        </p>
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {t.scriptLabel}
        </div>
        <Segmented
          options={['hiragana', 'katakana', 'both'] as const}
          value={props.script}
          onPick={props.onScript}
          labelOf={(s) => t.scripts[s]}
        />
      </div>

      <div>
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
          {t.orderLabel}
        </div>
        <div className="grid grid-cols-2 gap-2" role="group">
          {(['sequential', 'random'] as const).map((o) => {
            const active = o === props.order
            return (
              <button
                key={o}
                type="button"
                aria-pressed={active}
                onClick={() => props.onOrder(o)}
                className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
                  active
                    ? 'border-vermilion bg-vermilion/10 text-vermilion'
                    : 'border-hairline bg-surface text-muted'
                }`}
              >
                {t.orders[o]}
              </button>
            )
          })}
        </div>
      </div>

      {props.showDistractors && (
        <div>
          <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted">
            {t.distractorsLabel}
          </div>
          <div className="grid grid-cols-2 gap-2" role="group">
            {(['row', 'mixed'] as const).map((d) => {
              const active = d === props.distractors
              return (
                <button
                  key={d}
                  type="button"
                  aria-pressed={active}
                  onClick={() => props.onDistractors(d)}
                  className={`min-h-[44px] rounded-xl border px-2 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'border-vermilion bg-vermilion/10 text-vermilion'
                      : 'border-hairline bg-surface text-muted'
                  }`}
                >
                  {t.distractors[d]}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
