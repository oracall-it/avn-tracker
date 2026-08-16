import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Hash, Search, X } from 'lucide-react'
import { GameStatus, DevStatus, GameFilter, STATUS_LABELS, DEV_STATUS_LABELS } from '../types/game'

const ALL_STATUSES: (GameStatus | null)[] = [null, 'PLAYING', 'WANT', 'COMPLETED', 'ON_HOLD', 'DROPPED']

interface Props {
  filter: GameFilter
  onChange: (f: GameFilter) => void
  tags: string[]
}

const DEV_STATUS_OPTIONS: { value: DevStatus | null; label: string }[] = [
  { value: null, label: 'Any dev status' },
  { value: 'ONGOING', label: 'Ongoing' },
  { value: 'COMPLETE', label: 'Complete' },
  { value: 'ABANDONED', label: 'Abandoned' },
]

function DevStatusSelect({ value, onChange }: { value: DevStatus | null; onChange: (v: DevStatus | null) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    return () => document.removeEventListener('mousedown', onMouse)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const hasValue = value !== null
  const label = value ? DEV_STATUS_LABELS[value] : 'Dev status'

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 bg-white dark:bg-stone-900 border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none min-w-36 w-36
          ${open || hasValue ? 'border-amber-400 dark:border-amber-600' : 'border-stone-200 dark:border-stone-700'}
          ${hasValue ? 'text-amber-700 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}
      >
        <span className="flex-1 text-left">{label}</span>
        {hasValue ? (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange(null); setOpen(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null); setOpen(false) } }}
            className="flex-none text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown size={13} className={`flex-none text-stone-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 left-0 z-30 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden py-1">
          {DEV_STATUS_OPTIONS.map(opt => (
            <button
              key={opt.value ?? 'all'}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors
                ${opt.value === value
                  ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                  : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const pillBase = 'px-3 py-1.5 rounded-full text-sm font-medium transition-colors border'
const pillActive = 'bg-amber-600 text-white border-amber-600 dark:bg-amber-500 dark:border-amber-500'
const pillInactive = 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-900 dark:hover:text-stone-200'

function TagSelect({ tags, selected, onChange }: {
  tags: string[]
  selected: string[]
  onChange: (tags: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onMouse = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onMouse)
    return () => document.removeEventListener('mousedown', onMouse)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const filtered = search
    ? tags.filter(t => t.toLowerCase().includes(search.toLowerCase()))
    : tags

  const toggle = (tag: string) => {
    onChange(selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  const hasSelection = selected.length > 0

  const label = selected.length === 0
    ? 'All tags'
    : selected.length === 1
      ? selected[0]
      : `${selected.length} tags`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(o => !o); setSearch('') }}
        className={`flex items-center gap-1.5 bg-white dark:bg-stone-900 border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 min-w-52 w-52
          ${open || hasSelection
            ? 'border-amber-400 dark:border-amber-600'
            : 'border-stone-200 dark:border-stone-700'
          }
          ${hasSelection
            ? 'text-amber-700 dark:text-amber-400'
            : 'text-stone-700 dark:text-stone-300'
          }`}
      >
        <Hash size={13} className="flex-none text-stone-400 dark:text-stone-500" />
        <span className="flex-1 text-left">{label}</span>
        {hasSelection ? (
          <span
            role="button"
            tabIndex={0}
            onClick={e => { e.stopPropagation(); onChange([]); setOpen(false) }}
            onKeyDown={e => { if (e.key === 'Enter') { e.stopPropagation(); onChange([]); setOpen(false) } }}
            className="flex-none text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
          >
            <X size={13} />
          </span>
        ) : (
          <ChevronDown
            size={13}
            className={`flex-none text-stone-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        )}
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-30 w-64 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden">
          {tags.length > 8 && (
            <div className="p-2 border-b border-stone-100 dark:border-stone-800">
              <input
                autoFocus
                type="text"
                placeholder="Search tags…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-stone-50 dark:bg-stone-800 rounded-lg px-2.5 py-1.5 text-xs text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none"
              />
            </div>
          )}

          <div className="max-h-64 overflow-y-auto py-1">
            {filtered.map(tag => {
              const isSelected = selected.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggle(tag)}
                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2
                    ${isSelected
                      ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                      : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                >
                  <span className={`w-4 h-4 flex-none rounded border flex items-center justify-center transition-colors
                    ${isSelected
                      ? 'bg-amber-500 border-amber-500 dark:bg-amber-600 dark:border-amber-600'
                      : 'border-stone-300 dark:border-stone-600'
                    }`}
                  >
                    {isSelected && <Check size={11} strokeWidth={3} className="text-white" />}
                  </span>
                  <span className="truncate">{tag}</span>
                </button>
              )
            })}

            {filtered.length === 0 && (
              <p className="px-3 py-4 text-xs text-center text-stone-400 dark:text-stone-600">
                No tags match.
              </p>
            )}
          </div>

          {hasSelection && (
            <div className="border-t border-stone-100 dark:border-stone-800 px-3 py-2">
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FilterBar({ filter, onChange, tags }: Props) {
  const set = (patch: Partial<GameFilter>) => onChange({ ...filter, ...patch })

  return (
    <div className="flex flex-col gap-3">
      {/* My status pills */}
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

      {/* Search + dev status + tag filter */}
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

        <DevStatusSelect
          value={filter.devStatus ?? null}
          onChange={ds => set({ devStatus: ds })}
        />

        {tags.length > 0 && (
          <TagSelect
            tags={tags}
            selected={filter.tags ?? []}
            onChange={tags => set({ tags: tags.length ? tags : undefined })}
          />
        )}
      </div>
    </div>
  )
}
