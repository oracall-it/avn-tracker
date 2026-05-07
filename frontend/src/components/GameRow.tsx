import { ExternalLink, RefreshCw, Pencil, Trash2 } from 'lucide-react'
import { useMutation } from '@apollo/client'
import { useNavigate } from 'react-router-dom'
import { Game, STATUS_LABELS, STATUS_COLORS, DEV_STATUS_LABELS, DEV_STATUS_COLORS } from '../types/game'
import { UpdateBadge } from './UpdateBadge'
import { SYNC_LATEST_VERSION, DELETE_GAME } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'

interface Props {
  game: Game
  onEdit: (game: Game) => void
}

export function GameRow({ game, onEdit }: Props) {
  const navigate = useNavigate()
  const [sync, { loading: syncing }] = useMutation(SYNC_LATEST_VERSION, { refetchQueries: [GET_GAMES] })
  const [del] = useMutation(DELETE_GAME, { refetchQueries: [GET_GAMES], variables: { id: game.id } })

  return (
    <tr className="border-b border-stone-100 dark:border-stone-800 hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors group">
      {/* Title + cover */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div
            className="shrink-0 w-8 h-12 rounded-lg overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer"
            onClick={() => navigate(`/game/${game.id}`)}
          >
            {game.coverUrl ? (
              <img
                src={game.coverUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
            ) : null}
          </div>
          <div className="min-w-0">
            <button
              onClick={() => navigate(`/game/${game.id}`)}
              className="text-left text-sm font-semibold text-stone-900 dark:text-stone-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors truncate block max-w-[240px]"
            >
              {game.title}
            </button>
            {game.developer && (
              <div className="text-xs text-stone-500 truncate max-w-[240px]">{game.developer}</div>
            )}
          </div>
          <UpdateBadge hasUpdate={game.hasUpdate} small />
        </div>
      </td>

      {/* Status */}
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[game.status]}`}>
          {STATUS_LABELS[game.status]}
        </span>
      </td>

      {/* Dev status */}
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${DEV_STATUS_COLORS[game.devStatus]}`}>
          {DEV_STATUS_LABELS[game.devStatus]}
        </span>
      </td>

      {/* My version */}
      <td className="py-3 px-4">
        <span className="font-mono text-sm text-stone-700 dark:text-stone-300">
          {game.myVersion || <span className="text-stone-400 dark:text-stone-600">—</span>}
        </span>
      </td>

      {/* Latest version — version only, no game name */}
      <td className="py-3 px-4">
        <span className={`font-mono text-sm font-medium ${game.hasUpdate ? 'text-amber-600 dark:text-amber-400' : 'text-stone-700 dark:text-stone-300'}`}>
          {game.latestVersion || <span className="text-stone-400 dark:text-stone-600 font-normal">—</span>}
        </span>
      </td>

      {/* Tags */}
      <td className="py-3 px-4">
        <div className="flex flex-wrap gap-1">
          {game.tags.slice(0, 3).map(tag => (
            <span key={tag} className="text-xs px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-md border border-stone-200 dark:border-stone-700">
              {tag}
            </span>
          ))}
          {game.tags.length > 3 && (
            <span className="text-xs text-stone-400 dark:text-stone-600">+{game.tags.length - 3}</span>
          )}
        </div>
      </td>

      {/* Actions */}
      <td className="py-3 px-4">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(game)}
            className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800"
            title="Edit"
          >
            <Pencil size={14} />
          </button>
          {game.vndbId && (
            <button
              onClick={() => sync({ variables: { id: game.id } })}
              disabled={syncing}
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800 disabled:opacity-40"
              title="Sync version"
            >
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            </button>
          )}
          {game.downloadUrl && (
            <a
              href={game.downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800"
              title="Download"
            >
              <ExternalLink size={14} />
            </a>
          )}
          <button
            onClick={() => { if (confirm(`Delete "${game.title}"?`)) del() }}
            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </td>
    </tr>
  )
}
