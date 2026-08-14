import { RefreshCw, Pencil, Trash2, Download } from 'lucide-react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Game, STATUS_LABELS, STATUS_COLORS, DEV_STATUS_COLORS, DEV_STATUS_LABELS } from '../types/game'
import { UpdateBadge } from './UpdateBadge'
import { SYNC_LATEST_VERSION, DELETE_GAME } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'

interface Props {
  game: Game
  onEdit: (game: Game) => void
}

function gameDetailUrl(game: Game): string {
  if (game.vndbId) return `/discover/game/${game.vndbId}`
  if (game.f95Id) return `/discover/f95/${encodeURIComponent(`https://f95zone.to/threads/${game.f95Id}/`)}`
  return `/game/${game.id}`
}

export function GameCard({ game, onEdit }: Props) {
  const navigate = useNavigate()
  const [sync, { loading: syncing }] = useMutation(SYNC_LATEST_VERSION, { refetchQueries: [GET_GAMES] })
  const [del] = useMutation(DELETE_GAME, { refetchQueries: [GET_GAMES], variables: { id: game.id } })

  return (
    <div data-testid="game-card" className="group relative flex flex-col bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-stone-300 dark:hover:border-stone-700 transition-all duration-200">
      {/* Cover */}
      <div
        className="relative aspect-[2/3] bg-stone-100 dark:bg-stone-800 overflow-hidden cursor-pointer"
        onClick={() => navigate(gameDetailUrl(game))}
      >
        {game.coverUrl ? (
          <img
            src={game.coverUrl}
            alt={game.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-400 text-xs font-medium">No cover</div>
        )}

        {/* Update dot only — no status badge on cover */}
        {game.hasUpdate && (
          <div className="absolute top-2 right-2">
            <UpdateBadge hasUpdate small />
          </div>
        )}

        {/* Action bar slides up on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-center gap-1.5 translate-y-full group-hover:translate-y-0 transition-transform duration-200">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(game) }}
            className="p-2 bg-white/95 dark:bg-stone-900/95 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 shadow-sm backdrop-blur-sm"
            title="Edit"
          >
            <Pencil size={12} />
          </button>
          {game.vndbId && (
            <button
              onClick={(e) => { e.stopPropagation(); sync({ variables: { id: game.id } }) }}
              disabled={syncing}
              className="p-2 bg-white/95 dark:bg-stone-900/95 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 shadow-sm backdrop-blur-sm disabled:opacity-50"
              title="Sync version"
            >
              <RefreshCw size={12} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
          {game.downloadUrl && (
            <a
              href={game.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="p-2 bg-white/95 dark:bg-stone-900/95 rounded-lg text-stone-700 dark:text-stone-300 hover:bg-white dark:hover:bg-stone-800 shadow-sm backdrop-blur-sm"
              title="Download"
            >
              <Download size={12} />
            </a>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm(`Delete "${game.title}"?`)) del() }}
            className="p-2 bg-rose-500/90 rounded-lg text-white hover:bg-rose-500 shadow-sm"
            title="Delete"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Info — all below cover, nothing on top of image */}
      <div className="p-3 flex flex-col gap-2">
        {/* Title */}
        <button
          onClick={() => navigate(gameDetailUrl(game))}
          className="text-left text-sm font-bold text-stone-900 dark:text-stone-100 leading-snug line-clamp-2 hover:text-amber-700 dark:hover:text-amber-400 transition-colors"
        >
          {game.title}
        </button>

        {/* Developer */}
        {game.developer && (
          <p className="text-xs text-stone-500 dark:text-stone-500 truncate -mt-1">{game.developer}</p>
        )}

        {/* Status + Dev status on separate line */}
        <div className="flex flex-wrap gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${STATUS_COLORS[game.status]}`}>
            {STATUS_LABELS[game.status]}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DEV_STATUS_COLORS[game.devStatus]}`}>
            {DEV_STATUS_LABELS[game.devStatus]}
          </span>
        </div>

        {/* Version row */}
        {(game.myVersion || game.latestVersion) && (
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {game.myVersion && (
              <span className="text-stone-500 dark:text-stone-500">
                <span className="text-stone-400 dark:text-stone-600">played </span>
                <span className="font-mono font-semibold text-stone-700 dark:text-stone-300">{game.myVersion}</span>
              </span>
            )}
            {game.myVersion && game.latestVersion && (
              <span className="text-stone-300 dark:text-stone-700">·</span>
            )}
            {game.latestVersion && (
              <span>
                <span className="text-stone-400 dark:text-stone-600">latest </span>
                <span className={`font-mono font-semibold ${game.hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}>
                  {game.latestVersion}
                </span>
              </span>
            )}
          </div>
        )}

        {/* Tags — separate row, clearly below status */}
        {game.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5 border-t border-stone-100 dark:border-stone-800">
            {game.tags.slice(0, 3).map(tag => (
              <span key={tag} className="text-xs px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md">
                {tag}
              </span>
            ))}
            {game.tags.length > 3 && (
              <span className="text-xs text-stone-400 dark:text-stone-600 self-center">+{game.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
