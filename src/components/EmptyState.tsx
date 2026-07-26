import type { ReactNode } from 'react'

export default function EmptyState({
  kana = 'ま',
  title,
  children,
}: {
  kana?: string
  title: string
  children?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-hairline bg-surface px-6 py-16 text-center shadow-soft">
      <span aria-hidden className="mb-4 font-kana text-5xl text-hairline">
        {kana}
      </span>
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <div className="mt-2 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  )
}
