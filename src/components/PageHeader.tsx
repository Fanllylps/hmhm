import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

export default function PageHeader({
  title,
  jp,
  subtitle,
  backTo,
  actions,
}: {
  title: string
  /** Small kana/kanji flourish shown next to the title. */
  jp?: string
  subtitle?: string
  backTo?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 sm:mb-8">
      <div>
        {backTo && (
          <Link
            to={backTo}
            className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-muted transition-colors hover:text-sumi"
          >
            <span aria-hidden>←</span> Back
          </Link>
        )}
        <h1 className="flex items-baseline gap-2.5 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
          {jp && (
            <span aria-hidden className="font-kana text-base font-medium text-muted">
              {jp}
            </span>
          )}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}
