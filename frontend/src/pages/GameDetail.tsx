import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Loader2, AlertCircle } from 'lucide-react'
import { GET_GAME, GET_GAMES } from '../graphql/queries'
import { DELETE_GAME, SYNC_LATEST_VERSION } from '../graphql/mutations'
import { Game } from '../types/game'
import { GameDetailView, LibraryFullInfo } from '../components/GameDetailView'
import { GameModal } from '../components/GameModal'

export function GameDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)

  const { data, loading, error } = useQuery<{ game: Game | null }>(GET_GAME, {
    variables: { id },
    skip: !id,
  })

  const [syncVersion, { loading: syncing }] = useMutation(SYNC_LATEST_VERSION, {
    refetchQueries: [GET_GAME, GET_GAMES],
  })
  const [deleteGame] = useMutation(DELETE_GAME, {
    refetchQueries: [GET_GAMES],
  })

  const game = data?.game

  // Redirect VNDB/F95 games to their discover detail pages — those now handle
  // library mode too, so this route is only for manually-added games.
  useEffect(() => {
    if (!game) return
    if (game.vndbId) {
      navigate(`/discover/game/${game.vndbId}`, { replace: true })
    } else if (game.f95Id) {
      const url = `https://f95zone.to/threads/${game.f95Id}/`
      navigate(`/discover/f95/${encodeURIComponent(url)}`, { replace: true })
    }
  }, [game, navigate])

  const handleDelete = async () => {
    if (!game) return
    if (!confirm(`Delete "${game.title}"? This cannot be undone.`)) return
    await deleteGame({ variables: { id: game.id } })
    navigate('/')
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-40">
        <Loader2 size={28} className="animate-spin text-stone-400" />
      </div>
    )
  }

  if (error || !game) {
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

  // Redirect in progress — don't render the page
  if (game.vndbId || game.f95Id) return null

  const libraryGame: LibraryFullInfo = {
    id: game.id,
    status: game.status,
    devStatus: game.devStatus,
    myVersion: game.myVersion,
    latestVersion: game.latestVersion,
    hasUpdate: game.hasUpdate,
    downloadUrl: game.downloadUrl || undefined,
    notes: game.notes || undefined,
    addedAt: game.addedAt,
    updatedAt: game.updatedAt,
  }

  return (
    <>
      <GameDetailView
        source="manual"
        title={game.title}
        developer={game.developer}
        coverUrl={game.coverUrl}
        description={game.description}
        tags={game.tags}
        screenshots={[]}
        libraryGame={libraryGame}
        onEdit={() => setShowEdit(true)}
        onDelete={handleDelete}
        onSync={game.vndbId ? () => syncVersion({ variables: { id: game.id } }) : undefined}
        syncing={syncing}
        imported={true}
        importing={false}
        onImport={() => {}}
      />
      {showEdit && <GameModal game={game} onClose={() => setShowEdit(false)} />}
    </>
  )
}
