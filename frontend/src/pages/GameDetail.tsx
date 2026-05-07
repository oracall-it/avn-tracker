import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { ArrowLeft, Download, ExternalLink, RefreshCw, Pencil, Trash2, Loader2, AlertCircle } from 'lucide-react'
import { GET_GAME, GET_GAMES, GET_VNDB_GAME } from '../graphql/queries'
import { VNDBScreenshot } from '../types/game'
import { DELETE_GAME, SYNC_LATEST_VERSION } from '../graphql/mutations'
import { Game, STATUS_LABELS, STATUS_COLORS, DEV_STATUS_LABELS, DEV_STATUS_COLORS } from '../types/game'
import { UpdateBadge } from '../components/UpdateBadge'
import { GameModal } from '../components/GameModal'
import { ScreenshotCarousel } from '../components/ScreenshotCarousel'

const TAGS_INITIAL = 12

export function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [tagsExpanded, setTagsExpanded] = useState(false)

  const { data, loading, error } = useQuery<{ game: Game | null }>(GET_GAME, {
    variables: { id },
    skip: !id,
  })

  const [sync, { loading: syncing }] = useMutation(SYNC_LATEST_VERSION, {
    refetchQueries: [GET_GAME, GET_GAMES],
    variables: { id },
  })

  const [del] = useMutation(DELETE_GAME, {
    refetchQueries: [GET_GAMES],
    variables: { id },
  })

  const { data: vndbData } = useQuery<{ getVNDBGame: { screenshots: VNDBScreenshot[] } | null }>(
    GET_VNDB_GAME,
    { variables: { vndbId: data?.game?.vndbId }, skip: !data?.game?.vndbId }
  )

  const handleDelete = async () => {
    if (!confirm(`Delete "${data?.game?.title}"? This cannot be undone.`)) return
    await del()
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (error || !data?.game) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-rose-500" />
        <p className="text-stone-700 dark:text-stone-300 font-semibold">Game not found</p>
        <button onClick={() => navigate('/')} className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:underline">
          Back to Library
        </button>
      </div>
    )
  }

  const game = data.game
  const screenshots = vndbData?.getVNDBGame?.screenshots ?? []
  const visibleTags = tagsExpanded ? game.tags : game.tags.slice(0, TAGS_INITIAL)
  const hiddenCount = game.tags.length - TAGS_INITIAL

  return (
    <>
      <div className="max-w-screen-xl mx-auto px-6 pt-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors font-medium"
        >
          <ArrowLeft size={15} />
          Back
        </button>
      </div>

      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Left: Cover + actions */}
          <div className="shrink-0 w-full md:w-64">
            <div className="w-full md:w-64 aspect-[2/3] bg-stone-100 dark:bg-stone-800 rounded-2xl overflow-hidden shadow-lg">
              {game.coverUrl ? (
                <img
                  src={game.coverUrl}
                  alt={game.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">No cover</div>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              {game.downloadUrl && (
                <a
                  href={game.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold transition-colors"
                >
                  <Download size={15} />
                  Download
                </a>
              )}
              {game.vndbId && (
                <a
                  href={`https://vndb.org/${game.vndbId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium transition-colors border border-stone-200 dark:border-stone-700"
                >
                  <ExternalLink size={14} />
                  View on VNDB
                </a>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEdit(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium transition-colors border border-stone-200 dark:border-stone-700"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-xl text-sm font-medium transition-colors border border-rose-200 dark:border-rose-800"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>

          {/* Right: Details */}
          <div className="flex-1 min-w-0 space-y-6">
            {/* Title + badges */}
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${STATUS_COLORS[game.status]}`}>
                  {STATUS_LABELS[game.status]}
                </span>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-semibold ${DEV_STATUS_COLORS[game.devStatus]}`}>
                  {DEV_STATUS_LABELS[game.devStatus]}
                </span>
                <UpdateBadge hasUpdate={game.hasUpdate} />
              </div>
              <h1 className="text-3xl font-bold text-stone-900 dark:text-stone-100 leading-tight">{game.title}</h1>
              {game.developer && (
                <p className="text-base text-stone-500 dark:text-stone-500 mt-1">{game.developer}</p>
              )}
            </div>

            {/* Description */}
            {game.description && (
              <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">Description</h2>
                <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
                  {game.description.replace(/\[url=[^\]]+\]([^\[]+)\[\/url\]/g, '$1').replace(/\[.*?\]/g, '')}
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

            {/* Version panel */}
            <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
              <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-4">Version</h2>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-500 mb-2">Version I Played</p>
                  <p className="font-mono text-xl font-bold text-stone-900 dark:text-stone-100">
                    {game.myVersion || <span className="text-stone-400 dark:text-stone-600 font-normal text-base">—</span>}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 dark:text-stone-500 mb-2">Latest Version</p>
                  <div className="flex items-center gap-2">
                    <p className={`font-mono text-xl font-bold ${game.hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-stone-900 dark:text-stone-100'}`}>
                      {game.latestVersion || <span className="text-stone-400 dark:text-stone-600 font-normal text-base">—</span>}
                    </p>
                    {game.vndbId && (
                      <button
                        onClick={() => sync()}
                        disabled={syncing}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 disabled:opacity-40 transition-colors"
                        title="Sync latest version from VNDB"
                      >
                        <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {game.hasUpdate && (
                <div className="mt-4 pt-4 border-t border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3">
                  <p className="text-sm text-amber-700 dark:text-amber-400">
                    New version available: <span className="font-mono font-bold">{game.latestVersion}</span>
                    {game.downloadUrl && (
                      <a href={game.downloadUrl} target="_blank" rel="noopener noreferrer" className="ml-3 inline-flex items-center gap-1 underline hover:no-underline">
                        <Download size={12} /> Download
                      </a>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Tags */}
            {game.tags.length > 0 && (
              <div>
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">
                  Tags ({game.tags.length})
                </h2>
                <div className="flex flex-wrap gap-2">
                  {visibleTags.map(tag => (
                    <span key={tag} className="px-2.5 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-lg text-sm font-medium border border-stone-200 dark:border-stone-700">
                      {tag}
                    </span>
                  ))}
                  {!tagsExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => setTagsExpanded(true)}
                      className="px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg text-sm font-semibold border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors"
                    >
                      +{hiddenCount} more
                    </button>
                  )}
                  {tagsExpanded && hiddenCount > 0 && (
                    <button
                      onClick={() => setTagsExpanded(false)}
                      className="px-2.5 py-1 bg-stone-50 dark:bg-stone-800 text-stone-500 rounded-lg text-sm font-medium border border-stone-200 dark:border-stone-700 hover:bg-stone-100 transition-colors"
                    >
                      Show less
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Notes */}
            {game.notes && (
              <div>
                <h2 className="text-xs font-bold text-stone-500 dark:text-stone-500 uppercase tracking-widest mb-3">Notes</h2>
                <div className="bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-2xl p-5">
                  <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap leading-relaxed">{game.notes}</p>
                </div>
              </div>
            )}

            {/* Metadata */}
            <div className="text-xs text-stone-400 dark:text-stone-600 space-y-0.5 pt-2 border-t border-stone-100 dark:border-stone-800">
              {game.vndbId && <p>VNDB: <span className="font-mono">{game.vndbId}</span></p>}
              <p>Added {new Date(game.addedAt).toLocaleDateString()}</p>
              <p>Updated {new Date(game.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {showEdit && <GameModal game={game} onClose={() => setShowEdit(false)} />}
    </>
  )
}
