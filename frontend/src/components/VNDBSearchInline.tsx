import { useState, useCallback } from 'react'
import { useLazyQuery, useMutation } from '@apollo/client'
import { Search, Plus, Loader2 } from 'lucide-react'
import { SEARCH_VNDB } from '../graphql/queries'
import { IMPORT_FROM_VNDB } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'
import { VNDBResult } from '../types/game'

interface Props {
  onImported: () => void
}

export function VNDBSearchInline({ onImported }: Props) {
  const [query, setQuery] = useState('')
  const [search, { data, loading }] = useLazyQuery<{ searchVNDB: VNDBResult[] }>(SEARCH_VNDB)
  const [importGame, { loading: importing }] = useMutation(IMPORT_FROM_VNDB, { refetchQueries: [GET_GAMES] })
  const [imported, setImported] = useState<Set<string>>(new Set())

  const handleSearch = useCallback(() => {
    if (query.trim()) search({ variables: { query: query.trim() } })
  }, [query, search])

  const handleImport = async (result: VNDBResult) => {
    await importGame({ variables: { vndbId: result.vndbId } })
    setImported(prev => new Set([...prev, result.vndbId]))
    onImported()
  }

  const inputCls = 'flex-1 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors'

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search VNDB for a visual novel…"
          className={inputCls}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl text-white flex items-center gap-1.5 text-sm font-medium transition-colors"
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
        </button>
      </div>

      {data?.searchVNDB?.length === 0 && (
        <p className="text-sm text-stone-500 dark:text-stone-500 text-center py-6">No results found.</p>
      )}

      <div className="space-y-2 max-h-72 overflow-y-auto pr-0.5">
        {data?.searchVNDB.map(result => (
          <div key={result.vndbId} className="flex items-center gap-3 bg-stone-50 dark:bg-stone-800 rounded-xl p-3 border border-stone-200 dark:border-stone-700">
            {result.coverUrl ? (
              <img src={result.coverUrl} alt="" className="w-9 h-14 object-cover rounded-lg shrink-0" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
            ) : (
              <div className="w-9 h-14 bg-stone-200 dark:bg-stone-700 rounded-lg shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{result.title}</div>
              {result.developer && <div className="text-xs text-stone-500 truncate">{result.developer}</div>}
              {result.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {result.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs px-1.5 py-0.5 bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 rounded-md">{tag}</span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => handleImport(result)}
              disabled={importing || imported.has(result.vndbId)}
              className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:bg-stone-300 dark:disabled:bg-stone-700 rounded-lg text-xs text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <Plus size={13} />
              {imported.has(result.vndbId) ? 'Added' : 'Add'}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
