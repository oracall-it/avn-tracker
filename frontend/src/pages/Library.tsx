import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { LayoutGrid, List, Plus, Loader2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react'
import { GET_GAMES } from '../graphql/queries'
import { Game, GameFilter } from '../types/game'
import { GameCard } from '../components/GameCard'
import { GameRow } from '../components/GameRow'
import { FilterBar } from '../components/FilterBar'
import { GameModal } from '../components/GameModal'

type View = 'grid' | 'list'

const PER_PAGE_OPTIONS = [12, 24, 48, 96]
const PER_PAGE_ITEMS = [
  ...PER_PAGE_OPTIONS.map(n => ({ value: n, label: `${n} / page` })),
  { value: 0, label: 'All' },
]

function PerPageSelect({ value, onChange }: { value: number; onChange: (n: number) => void }) {
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

  const label = value === 0 ? 'All' : `${value} / page`

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 w-32 bg-white dark:bg-stone-900 border rounded-xl px-3 py-2 text-sm transition-colors focus:outline-none
          ${open ? 'border-amber-400 dark:border-amber-600' : 'border-stone-200 dark:border-stone-700'}
          text-stone-700 dark:text-stone-300`}
      >
        <span className="flex-1 text-left">{label}</span>
        <ChevronDown size={13} className={`flex-none text-stone-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute top-full mt-1.5 right-0 z-30 w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg overflow-hidden py-1">
          {PER_PAGE_ITEMS.map(opt => (
            <button
              key={opt.value}
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

export function Library() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [view, setView] = useState<View>(() => (localStorage.getItem('view') as View) ?? 'grid')
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [perPage, setPerPage] = useState<number>(() => {
    const v = localStorage.getItem('lib-per-page')
    return v ? Number(v) : 24
  })

  // Derive all filter state from URL params
  const page = Number(searchParams.get('page') ?? '1')
  const filter = useMemo<GameFilter>(() => {
    const status = searchParams.get('status') as GameFilter['status']
    const devStatus = searchParams.get('devStatus') as GameFilter['devStatus']
    const hasUpdate = searchParams.get('hasUpdate')
    const tags = searchParams.getAll('tag')
    const search = searchParams.get('search')
    return {
      ...(status ? { status } : {}),
      ...(devStatus ? { devStatus } : {}),
      ...(hasUpdate === 'true' ? { hasUpdate: true } : {}),
      ...(tags.length ? { tags } : {}),
      ...(search ? { search } : {}),
    }
  }, [searchParams])

  const { data, loading, error } = useQuery<{ games: Game[] }>(GET_GAMES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const games = data?.games ?? []
  const seenTags = useRef(new Set<string>())
  const allTags = useMemo(() => {
    games.forEach(g => g.tags.forEach(t => seenTags.current.add(t)))
    return [...seenTags.current].sort()
  }, [games])

  const totalGames = games.length
  const totalPages = perPage === 0 ? 1 : Math.ceil(totalGames / perPage)
  const pagedGames = perPage === 0 ? games : games.slice((page - 1) * perPage, page * perPage)

  const setPage = (p: number) => {
    setSearchParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n }, { replace: true })
  }

  const updateFilter = useCallback((f: GameFilter) => {
    setSearchParams(prev => {
      const n = new URLSearchParams(prev)
      n.set('page', '1')
      f.status ? n.set('status', f.status) : n.delete('status')
      f.devStatus ? n.set('devStatus', f.devStatus) : n.delete('devStatus')
      f.hasUpdate ? n.set('hasUpdate', 'true') : n.delete('hasUpdate')
      n.delete('tag')
      f.tags?.forEach(t => n.append('tag', t))
      f.search ? n.set('search', f.search) : n.delete('search')
      return n
    }, { replace: true })
  }, [setSearchParams])

  const setPerPagePersisted = (n: number) => {
    setPerPage(n)
    setPage(1)
    localStorage.setItem('lib-per-page', String(n))
  }

  const setViewPersisted = (v: View) => { setView(v); localStorage.setItem('view', v) }
  const updateCount = games.filter(g => g.hasUpdate).length

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">My Library</h1>
          <p className="text-sm text-stone-500 dark:text-stone-500 mt-0.5">
            {totalGames} {totalGames === 1 ? 'game' : 'games'}
            {updateCount > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                · {updateCount} {updateCount === 1 ? 'update' : 'updates'} available
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Per-page selector */}
          <PerPageSelect value={perPage} onChange={setPerPagePersisted} />

          {/* View toggle */}
          <div className="flex bg-stone-100 dark:bg-stone-800 rounded-xl p-1 gap-0.5">
            <button
              onClick={() => setViewPersisted('grid')}
              className={`p-2 rounded-lg transition-colors ${view === 'grid' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
              title="Grid"
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewPersisted('list')}
              className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-100 shadow-sm' : 'text-stone-500 hover:text-stone-700 dark:hover:text-stone-300'}`}
              title="List"
            >
              <List size={16} />
            </button>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-xl text-sm font-semibold text-white transition-colors shadow-sm"
          >
            <Plus size={15} />
            Add Game
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6">
        <FilterBar filter={filter} onChange={updateFilter} tags={allTags} />
      </div>

      {/* Content */}
      {loading && games.length === 0 && (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-stone-400" />
        </div>
      )}

      {error && (
        <div className="text-center py-24 text-rose-500">
          Failed to load: {error.message}
        </div>
      )}

      {!loading && !error && games.length === 0 && (
        <div className="text-center py-24">
          <p className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-1">No games found</p>
          <p className="text-sm text-stone-500">Add a game or adjust your filters</p>
        </div>
      )}

      {view === 'grid' && pagedGames.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {pagedGames.map(game => (
            <GameCard key={game.id} game={game} onEdit={setEditGame} />
          ))}
        </div>
      )}

      {view === 'list' && pagedGames.length > 0 && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60">
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Title</th>
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Status</th>
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Dev</th>
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Played</th>
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Latest</th>
                  <th className="text-left pb-3 pt-3 px-4 text-xs font-semibold text-stone-500 dark:text-stone-500 uppercase tracking-wide">Tags</th>
                  <th className="pb-3 pt-3 px-4" />
                </tr>
              </thead>
              <tbody>
                {pagedGames.map(game => (
                  <GameRow key={game.id} game={game} onEdit={setEditGame} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-10">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page <= 1}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            let p: number
            if (totalPages <= 7) p = i + 1
            else if (page <= 4) p = i + 1
            else if (page >= totalPages - 3) p = totalPages - 6 + i
            else p = page - 3 + i
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-amber-600 text-white shadow-sm' : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
              >{p}</button>
            )
          })}
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page >= totalPages}
            className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {showAdd && <GameModal onClose={() => setShowAdd(false)} />}
      {editGame && <GameModal game={editGame} onClose={() => setEditGame(null)} />}
    </div>
  )
}
