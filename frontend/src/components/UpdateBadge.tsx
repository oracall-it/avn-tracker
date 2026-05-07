interface Props {
  hasUpdate: boolean
  small?: boolean
}

export function UpdateBadge({ hasUpdate, small }: Props) {
  if (!hasUpdate) return null
  if (small) {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full bg-amber-500 shrink-0 ring-2 ring-white dark:ring-stone-900"
        title="Update available"
      />
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
      Update available
    </span>
  )
}
