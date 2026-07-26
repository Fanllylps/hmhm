import EmptyState from './EmptyState'
import PageHeader from './PageHeader'

/** Temporary stub used while a page is under construction. */
export default function ComingSoon({ title, backTo = '/practice' }: { title: string; backTo?: string }) {
  return (
    <div className="mx-auto max-w-md">
      <PageHeader title={title} backTo={backTo} />
      <EmptyState title="Coming soon">This screen is being built.</EmptyState>
    </div>
  )
}
