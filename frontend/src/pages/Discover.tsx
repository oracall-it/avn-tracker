import { useEffect, useState, useRef } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { Search, Plus, Loader2, Check, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { SEARCH_VNDB } from '../graphql/queries'
import { IMPORT_FROM_VNDB } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'
import { VNDBResult, VNDBPage } from '../types/game'

function DiscoverCard({ result, onAdd, added, adding }: {
  result: VNDBResult
  onAdd: (e: React.MouseEvent, r: VNDBResult) => void
  added: boolean
  adding: boolean
}) {
  const navigate = useNavigate()

  return (
    <div
      data-testid="discover-card"
      className="group relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/discover/game/${result.vndbId}`)}
    >
      {/* Cover — full card, no bottom bar */}
      <div className="relative aspect-[2/3] bg-stone-100 dark:bg-stone-800 overflow-hidden">
        {result.coverUrl ? (
          <img
            src={result.coverUrl}
            alt={result.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs">No cover</div>
        )}

        {/* Always-visible bottom gradient + title */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow">{result.title}</p>
          {result.developer && (
            <p className="text-white/60 text-xs mt-0.5 truncate">{result.developer}</p>
          )}
        </div>

        {/* Tags — revealed on hover, overlaid above title area */}
        {result.tags.length > 0 && (
          <div className="absolute top-2 left-2 right-10 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {result.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white/90 rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Add button */}
        <button
          onClick={(e) => onAdd(e, result)}
          disabled={added || adding}
          className={`absolute top-2 right-2 p-2 rounded-full shadow-lg transition-all ${
            added
              ? 'bg-emerald-500 text-white scale-110'
              : 'bg-white/90 dark:bg-stone-900/90 text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 opacity-0 group-hover:opacity-100'
          }`}
          title={added ? 'Added to library' : 'Add to library'}
        >
          {adding ? (
            <Loader2 size={13} className="animate-spin" />
          ) : added ? (
            <Check size={13} />
          ) : (
            <Plus size={13} />
          )}
        </button>
      </div>
    </div>
  )
}

export function Discover() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [adultsOnly, setAdultsOnly] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [search, { data, previousData, loading }] = useLazyQuery<{ searchVNDB: VNDBPage }>(SEARCH_VNDB)
  const [importGame] = useMutation(IMPORT_FROM_VNDB, { refetchQueries: [GET_GAMES] })
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [adding, setAdding] = useState<Set<string>>(new Set())
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const doSearch = (q: string, p: number, adult: boolean) => {
    search({ variables: { query: q.trim(), page: p, adultsOnly: adult } })
  }

  // Load on mount
  useEffect(() => {
    doSearch('', 1, adultsOnly)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Debounced query search — reset to page 1
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setPage(1)
      doSearch(query, 1, adultsOnly)
    }, 700)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, adultsOnly])

  // Page change
  useEffect(() => {
    doSearch(query, page, adultsOnly)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page])

  const handleAdd = async (e: React.MouseEvent, result: VNDBResult) => {
    e.stopPropagation()
    setAdding(prev => new Set([...prev, result.vndbId]))
    try {
      await importGame({ variables: { vndbId: result.vndbId } })
      setAdded(prev => new Set([...prev, result.vndbId]))
    } finally {
      setAdding(prev => { const n = new Set(prev); n.delete(result.vndbId); return n })
    }
  }

  const page_data = data?.searchVNDB ?? previousData?.searchVNDB
  const results = page_data?.results ?? []
  const totalPages = page_data ? Math.ceil(page_data.count / 24) : 0

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Discover</h1>
          <p className="text-sm text-stone-500 dark:text-stone-500 mt-0.5">
            {page_data ? `${page_data.count.toLocaleString()} results` : (query ? 'Searching VNDB…' : 'Popular visual novels')}
          </p>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="flex gap-2 mb-8">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search visual novels on VNDB…"
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 shadow-sm transition-colors"
          />
          {loading && (
            <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />
          )}
        </div>

        {/* Filter toggle */}
        <button
          onClick={() => setShowFilters(v => !v)}
          className={`flex items-center gap-2 px-4 py-3 rounded-2xl border text-sm font-medium transition-colors shadow-sm ${
            showFilters || adultsOnly
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400'
              : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400 hover:border-stone-300 dark:hover:border-stone-600'
          }`}
        >
          <SlidersHorizontal size={15} />
          Filters
          {adultsOnly && <span className="px-1.5 py-0.5 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded text-xs font-bold">18+</span>}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="mb-6 p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm flex flex-wrap gap-4 items-center">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <div
              onClick={() => { setAdultsOnly(v => !v); setPage(1) }}
              className={`relative w-11 h-6 rounded-full transition-colors ${adultsOnly ? 'bg-amber-500' : 'bg-stone-200 dark:bg-stone-700'}`}
            >
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${adultsOnly ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Adult only (18+)</span>
          </label>
          <div className="text-xs text-stone-400 dark:text-stone-600">
            Filters VNDB results to titles tagged with sexual content.
          </div>
        </div>
      )}

      {/* Results */}
      {!loading && results.length === 0 && (
        <div className="text-center py-24">
          <p className="text-stone-500 dark:text-stone-500">
            {query ? `No results for "${query}"` : 'No results'}
          </p>
        </div>
      )}

      {loading && results.length === 0 && (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-stone-400" />
        </div>
      )}

      {results.length > 0 && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {results.map(result => (
              <DiscoverCard
                key={result.vndbId}
                result={result}
                onAdd={handleAdd}
                added={added.has(result.vndbId)}
                adding={adding.has(result.vndbId)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let p: number
                if (totalPages <= 7) {
                  p = i + 1
                } else if (page <= 4) {
                  p = i + 1
                } else if (page >= totalPages - 3) {
                  p = totalPages - 6 + i
                } else {
                  p = page - 3 + i
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    disabled={loading}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${
                      p === page
                        ? 'bg-amber-600 text-white shadow-sm'
                        : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              })}

              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={!page_data?.more || loading}
                aria-label="Next page"
                className="p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>

            </div>
          )}
        </>
      )}
    </div>
  )
}
