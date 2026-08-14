import { useEffect, useState } from 'react'
import { useLazyQuery } from '@apollo/client'
import { Search, Loader2, ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { SEARCH_VNDB, SEARCH_F95 } from '../graphql/queries'
import { VNDBResult, VNDBPage, F95SearchItem, F95SearchResult } from '../types/game'

// ─── VNDB card ───────────────────────────────────────────────────────────────

function VNDBCard({ result }: { result: VNDBResult }) {
  const navigate = useNavigate()

  return (
    <div
      data-testid="discover-card"
      className="group relative bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/discover/game/${result.vndbId}`)}
    >
      <div className="relative aspect-2/3 bg-stone-100 dark:bg-stone-800 overflow-hidden">
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
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow">{result.title}</p>
          {result.developer && (
            <p className="text-white/60 text-xs mt-0.5 truncate">{result.developer}</p>
          )}
        </div>
        {result.tags.length > 0 && (
          <div className="absolute top-2 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {result.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-black/70 backdrop-blur-sm text-white/90 rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── F95 card ────────────────────────────────────────────────────────────────

const F95_STATUS_COLORS: Record<string, string> = {
  abandoned: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800',
  'on hold':  'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  onhold:     'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  completed:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  complete:   'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
}

const CONTENT_TYPE_LABELS = new Set(['vn', 'game', 'mod', 'asset', 'comic', 'animation'])

// Engine → gradient classes for the cover placeholder
function engineGradient(engine: string): string {
  const e = engine.toLowerCase()
  if (e.includes('ren')) return 'from-violet-500 to-purple-700'
  if (e.includes('unity')) return 'from-slate-500 to-slate-700'
  if (e.includes('rpgm') || e.includes('rpg maker')) return 'from-emerald-500 to-teal-700'
  if (e.includes('html')) return 'from-orange-400 to-red-600'
  if (e.includes('twine')) return 'from-cyan-500 to-blue-700'
  if (e.includes('godot')) return 'from-blue-500 to-indigo-700'
  if (e.includes('wolf')) return 'from-red-500 to-rose-700'
  if (e.includes('flash')) return 'from-yellow-400 to-amber-600'
  if (e.includes('java')) return 'from-amber-500 to-orange-700'
  return 'from-stone-500 to-stone-700'
}

function F95Card({ item }: { item: F95SearchItem }) {
  const navigate = useNavigate()

  const statusTag = item.tags.find(t => F95_STATUS_COLORS[t.toLowerCase()])
  const typeTag = item.tags.find(t => CONTENT_TYPE_LABELS.has(t.toLowerCase()))
  const contentTags = item.tags.filter(t =>
    !F95_STATUS_COLORS[t.toLowerCase()] && !CONTENT_TYPE_LABELS.has(t.toLowerCase())
  )

  const initial = item.title.trim().charAt(0).toUpperCase() || '?'

  return (
    <div
      data-testid="f95-card"
      className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200 cursor-pointer"
      onClick={() => navigate(`/discover/f95/${encodeURIComponent(item.threadUrl)}`)}
    >
      {/* Cover placeholder — gradient based on engine, letter initial */}
      <div className={`relative aspect-2/3 bg-linear-to-br ${engineGradient(item.engine)} overflow-hidden`}>
        {/* Faint initial watermark */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-8xl font-black text-white/10 select-none">{initial}</span>
        </div>

        {/* Bottom gradient overlay */}
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent" />

        {/* Engine badge — top left */}
        {item.engine && (
          <div className="absolute top-2 left-2">
            <span className="text-xs px-1.5 py-0.5 bg-black/40 backdrop-blur-sm text-white/80 rounded-md font-medium">
              {item.engine}
            </span>
          </div>
        )}

        {/* Version badge — top right */}
        {item.version && (
          <div className="absolute top-2 right-2">
            <span className="font-mono text-xs px-1.5 py-0.5 bg-amber-500/80 backdrop-blur-sm text-white rounded-md font-bold">
              {item.version}
            </span>
          </div>
        )}

        {/* Content tags on hover */}
        {contentTags.length > 0 && (
          <div className="absolute top-8 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            {contentTags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-black/60 backdrop-blur-sm text-white/90 rounded-md font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom: status/type + title */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="flex flex-wrap gap-1 mb-1.5">
            {statusTag && (
              <span className={`text-xs px-1.5 py-0.5 rounded-md font-semibold border ${F95_STATUS_COLORS[statusTag.toLowerCase()]}`}>
                {statusTag}
              </span>
            )}
            {!statusTag && (
              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium bg-cyan-100/90 dark:bg-cyan-900/80 text-cyan-700 dark:text-cyan-300 border border-cyan-200/80 dark:border-cyan-700/80">
                Ongoing
              </span>
            )}
            {typeTag && (
              <span className="text-xs px-1.5 py-0.5 bg-sky-100/90 dark:bg-sky-900/80 text-sky-700 dark:text-sky-300 rounded-md font-medium border border-sky-200/80 dark:border-sky-700/80">
                {typeTag}
              </span>
            )}
          </div>
          <p className="text-white text-xs font-bold leading-tight line-clamp-2 drop-shadow">{item.title}</p>
        </div>
      </div>
    </div>
  )
}

// ─── VNDB tab ────────────────────────────────────────────────────────────────

function VNDBTab() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize from URL so navigating back restores exact state.
  const [inputValue, setInputValue] = useState(() => searchParams.get('q') ?? '')
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '')
  const [page, setPage] = useState(() => parseInt(searchParams.get('page') ?? '1', 10))
  const [adultsOnly, setAdultsOnly] = useState(() => searchParams.get('adult') !== '0')
  const [showFilters, setShowFilters] = useState(false)

  const [search, { data, previousData, loading }] = useLazyQuery<{ searchVNDB: VNDBPage }>(SEARCH_VNDB)

  // Debounce typed input → debouncedQ, reset page.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(inputValue)
      setPage(1)
    }, 700)
    return () => clearTimeout(t)
  }, [inputValue])

  // Search + sync URL whenever search params change.
  // Fires on mount too, so restoring from URL triggers an immediate search.
  useEffect(() => {
    search({ variables: { query: debouncedQ.trim(), page, adultsOnly } })
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (debouncedQ) next.set('q', debouncedQ); else next.delete('q')
      if (page > 1) next.set('page', String(page)); else next.delete('page')
      if (!adultsOnly) next.set('adult', '0'); else next.delete('adult')
      return next
    }, { replace: true })
  // setSearchParams is stable; intentionally omitted to avoid double-fire.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, page, adultsOnly])

  const page_data = data?.searchVNDB ?? previousData?.searchVNDB
  const results = page_data?.results ?? []
  const totalPages = page_data ? Math.ceil(page_data.count / 24) : 0

  return (
    <>
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
          <input
            type="text"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            placeholder="Search visual novels on VNDB…"
            className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 shadow-sm transition-colors"
          />
          {loading && <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />}
        </div>
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

      {!loading && results.length === 0 && (
        <div className="text-center py-24">
          <p className="text-stone-500 dark:text-stone-500">{debouncedQ ? `No results for "${debouncedQ}"` : 'No results'}</p>
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
              <VNDBCard key={result.vndbId} result={result} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page <= 1 || loading}
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
                  <button key={p} onClick={() => setPage(p)} disabled={loading}
                    className={`w-10 h-10 rounded-xl text-sm font-semibold transition-colors ${p === page ? 'bg-amber-600 text-white shadow-sm' : 'border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-50 dark:hover:bg-stone-800'}`}
                  >{p}</button>
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
    </>
  )
}

// ─── F95Zone tab ─────────────────────────────────────────────────────────────

function F95Tab() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [inputValue, setInputValue] = useState(() => searchParams.get('q') ?? '')
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '')

  const [search, { data, loading, error }] = useLazyQuery<{ searchF95: F95SearchResult }>(SEARCH_F95)

  // Debounce typed input → debouncedQ.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(inputValue), 700)
    return () => clearTimeout(t)
  }, [inputValue])

  // Search + sync URL. Fires on mount, so a non-empty restored query auto-searches.
  useEffect(() => {
    if (debouncedQ.trim()) {
      search({ variables: { query: debouncedQ.trim(), page: 1 } })
    }
    setSearchParams(prev => {
      const next = new URLSearchParams(prev)
      if (debouncedQ) next.set('q', debouncedQ); else next.delete('q')
      return next
    }, { replace: true })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ])

  const items = data?.searchF95.results ?? []

  return (
    <>
      <div className="relative mb-6">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-400 dark:text-stone-500" />
        <input
          type="text"
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          placeholder="Search games on F95Zone…"
          className="w-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-2xl pl-11 pr-4 py-3 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 shadow-sm transition-colors"
        />
        {loading && <Loader2 size={15} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-stone-400" />}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 mb-6">
          <p className="text-rose-600 dark:text-rose-400 text-sm">{error.message}</p>
          {error.message.includes('not logged in') && (
            <p className="text-rose-500 dark:text-rose-500 text-xs mt-1">Go to Settings to configure your F95Zone credentials.</p>
          )}
        </div>
      )}

      {!debouncedQ && !loading && !error && (
        <div className="text-center py-24 text-stone-400 dark:text-stone-600 text-sm">
          Type to search F95Zone games
        </div>
      )}

      {loading && (
        <div className="flex justify-center py-24">
          <Loader2 size={28} className="animate-spin text-stone-400" />
        </div>
      )}

      {!loading && debouncedQ && items.length === 0 && !error && (
        <div className="text-center py-24">
          <p className="text-stone-500 dark:text-stone-500">No results for "{debouncedQ}"</p>
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map(item => (
            <F95Card key={item.threadId || item.threadUrl} item={item} />
          ))}
        </div>
      )}
    </>
  )
}

// ─── Discover page ───────────────────────────────────────────────────────────

type Tab = 'vndb' | 'f95'

export function Discover() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') ?? 'vndb') as Tab

  const switchTab = (t: Tab) => {
    // Reset search state when switching tabs — carry only the tab param.
    setSearchParams({ tab: t })
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100">Discover</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-stone-100 dark:bg-stone-800 rounded-2xl w-fit">
        {([['vndb', 'VNDB'], ['f95', 'F95Zone']] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              tab === key
                ? 'bg-white dark:bg-stone-900 text-stone-900 dark:text-stone-100 shadow-sm'
                : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'vndb' && <VNDBTab />}
      {tab === 'f95' && <F95Tab />}
    </div>
  )
}
