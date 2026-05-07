import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, ExternalLink, Plus, Check, Loader2, AlertCircle } from 'lucide-react'
import { GET_VNDB_GAME, GET_GAMES } from '../graphql/queries'
import { IMPORT_FROM_VNDB } from '../graphql/mutations'
import { VNDBResult } from '../types/game'
import { ScreenshotCarousel } from '../components/ScreenshotCarousel'

const TAGS_INITIAL = 15

export function VNDBGameDetail() {
  const { vndbId } = useParams<{ vndbId: string }>()
  const navigate = useNavigate()
  const [tagsExpanded, setTagsExpanded] = useState(false)
  const [imported, setImported] = useState(false)
  const [importing, setImporting] = useState(false)

  const { data, loading, error } = useQuery<{ getVNDBGame: VNDBResult | null }>(GET_VNDB_GAME, {
    variables: { vndbId },
    skip: !vndbId,
  })

  const [importGame] = useMutation(IMPORT_FROM_VNDB, { refetchQueries: [GET_GAMES] })

  const handleImport = async () => {
    if (!vndbId) return
    setImporting(true)
    try {
      await importGame({ variables: { vndbId } })
      setImported(true)
    } finally {
      setImporting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (error || !data?.getVNDBGame) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-rose-500" />
        <p className="text-stone-700 dark:text-stone-300 font-semibold">Visual novel not found on VNDB</p>
        <button onClick={() => navigate('/discover')} className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:underline">
          Back to Discover
        </button>
      </div>
    )
  }

  const vn = data.getVNDBGame
  const screenshots = vn.screenshots ?? []
  const visibleTags = tagsExpanded ? vn.tags : vn.tags.slice(0, TAGS_INITIAL)
  const hiddenCount = vn.tags.length - TAGS_INITIAL

  return (
    <>
      <div className="max-w-screen-xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors font-medium"
        >
          <ArrowLeft size={15} />
          Back to Discover
        </button>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Cover */}
          <div className="shrink-0 w-full md:w-64">
            <div className="w-full md:w-64 aspect-[2/3] bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-hidden shadow-lg">
              {vn.coverUrl ? (
                <img
                  src={vn.coverUrl}
                  alt={vn.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">No cover</div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={handleImport}
                disabled={imported || importing}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                  imported
                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {importing ? <Loader2 size={15} className="animate-spin" />
                  : imported ? <Check size={15} />
                  : <Plus size={15} />}
                {imported ? 'Added to Library' : 'Add to Library'}
              </button>

              <a
                href={`https://vndb.org/${vn.vndbId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium transition-colors border border-stone-200 dark:border-stone-700"
              >
                <ExternalLink size={14} />
                View on VNDB
              </a>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 min-w-0 space-y-6">
            <div>
              <p className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-1">Visual Novel</p>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">{vn.title}</h1>
              {vn.developer && (
                <p className="text-base text-stone-500 dark:text-stone-500 mt-1">{vn.developer}</p>
              )}
            </div>

            {/* Description */}
            {vn.description && (
              <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">Description</h2>
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {vn.description.replace(/\[url=[^\]]+\]([^\[]+)\[\/url\]/g, '$1').replace(/\[.*?\]/g, '')}
                </p>
              </div>
            )}

            {/* Screenshots — 3D carousel */}
            {screenshots.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                  Screenshots ({screenshots.length})
                </h2>
                <ScreenshotCarousel screenshots={screenshots} />
              </div>
            )}

            {/* Tags */}
            {vn.tags.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map(tag => (
                    <span key={tag} className="px-3 py-1.5 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700">
                      {tag}
                    </span>
                  ))}
                  {!tagsExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => setTagsExpanded(true)}
                      className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-xl text-sm font-medium border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                  {tagsExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => setTagsExpanded(false)}
                      className="px-3 py-1.5 bg-stone-50 dark:bg-stone-800 text-stone-500 rounded-xl text-sm font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="text-xs text-stone-400 dark:text-stone-600">
              VNDB ID: {vn.vndbId}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
