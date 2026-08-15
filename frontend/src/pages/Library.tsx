import { useState, useMemo, useRef } from 'react'
import { useQuery } from '@apollo/client'
import { LayoutGrid, List, Plus, Loader2 } from 'lucide-react'
import { GET_GAMES } from '../graphql/queries'
import { Game, GameFilter } from '../types/game'
import { GameCard } from '../components/GameCard'
import { GameRow } from '../components/GameRow'
import { FilterBar } from '../components/FilterBar'
import { GameModal } from '../components/GameModal'

type View = 'grid' | 'list'

export function Library() {
  const [view, setView] = useState<View>(() => (localStorage.getItem('view') as View) ?? 'grid')
  const [filter, setFilter] = useState<GameFilter>({})
  const [editGame, setEditGame] = useState<Game | null>(null)
  const [showAdd, setShowAdd] = useState(false)

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

  const setViewPersisted = (v: View) => { setView(v); localStorage.setItem('view', v) }
  const updateCount = games.filter(g => g.hasUpdate).length

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">My Library</h1>
          <p className="text-sm text-stone-500 dark:text-stone-500 mt-0.5">
            {games.length} {games.length === 1 ? 'game' : 'games'}
            {updateCount > 0 && (
              <span className="ml-2 text-amber-600 dark:text-amber-400 font-medium">
                · {updateCount} {updateCount === 1 ? 'update' : 'updates'} available
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
        <FilterBar filter={filter} onChange={setFilter} tags={allTags} />
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

      {view === 'grid' && games.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {games.map(game => (
            <GameCard key={game.id} game={game} onEdit={setEditGame} />
          ))}
        </div>
      )}

      {view === 'list' && games.length > 0 && (
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
                {games.map(game => (
                  <GameRow key={game.id} game={game} onEdit={setEditGame} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showAdd && <GameModal onClose={() => setShowAdd(false)} />}
      {editGame && <GameModal game={editGame} onClose={() => setEditGame(null)} />}
    </div>
  )
}
