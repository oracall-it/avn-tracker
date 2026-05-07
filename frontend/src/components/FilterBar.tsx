import { Search, X } from 'lucide-react'
import { GameStatus, GameFilter, STATUS_LABELS } from '../types/game'

const ALL_STATUSES: (GameStatus | null)[] = [null, 'PLAYING', 'WANT', 'COMPLETED', 'ON_HOLD', 'DROPPED']

interface Props {
  filter: GameFilter
  onChange: (f: GameFilter) => void
  tags: string[]
}

const pillBase = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border'
const pillActive = 'bg-amber-600 text-white border-amber-600 dark:bg-amber-500 dark:border-amber-500'
const pillInactive = 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-200'

export function FilterBar({ filter, onChange, tags }: Props) {
  const set = (patch: Partial<GameFilter>) => onChange({ ...filter, ...patch })

  return (
    <div className="flex flex-col gap-3">
      {/* Status pills */}
      <div className="flex flex-wrap gap-2">
        {ALL_STATUSES.map(status => (
          <button
            key={status ?? 'all'}
            onClick={() => set({ status })}
            className={`${pillBase} ${filter.status === status ? pillActive : pillInactive}`}
          >
            {status ? STATUS_LABELS[status] : 'All'}
          </button>
        ))}
        <button
          onClick={() => set({ hasUpdate: filter.hasUpdate ? null : true })}
          className={`${pillBase} ${filter.hasUpdate ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700' : pillInactive}`}
        >
          Has updates
        </button>
      </div>

      {/* Search + tag filter */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            value={filter.search ?? ''}
            onChange={e => set({ search: e.target.value || null })}
            placeholder="Search title or developer…"
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl pl-9 pr-8 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors"
          />
          {filter.search && (
            <button
              onClick={() => set({ search: null })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {tags.length > 0 && (
          <select
            value={filter.tag ?? ''}
            onChange={e => set({ tag: e.target.value || null })}
            className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-700 dark:text-stone-300 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors"
          >
            <option value="">All tags</option>
            {tags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        )}
      </div>
    </div>
  )
}
