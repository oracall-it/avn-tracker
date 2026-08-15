import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useLazyQuery, useMutation, useQuery } from '@apollo/client'
import { Loader2, AlertCircle } from 'lucide-react'
import { GET_F95_GAME, GET_GAMES } from '../graphql/queries'
import { IMPORT_FROM_F95, SYNC_F95_VERSION, DELETE_GAME } from '../graphql/mutations'
import { F95Game, Game } from '../types/game'
import { GameDetailView, LibraryFullInfo } from '../components/GameDetailView'
import { GameModal } from '../components/GameModal'

export function F95GameDetail() {
  const { threadUrl } = useParams<{ threadUrl: string }>()
  const navigate = useNavigate()
  const decodedUrl = threadUrl ? decodeURIComponent(threadUrl) : ''
  const [imported, setImported] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const [getGame, { data, loading, error }] = useLazyQuery<{ getF95Game: F95Game }>(GET_F95_GAME)
  const { data: gamesData } = useQuery<{ games: Game[] }>(GET_GAMES)
  const [importGame] = useMutation(IMPORT_FROM_F95, { refetchQueries: [GET_GAMES] })
  const [syncVersion, { loading: syncing }] = useMutation(SYNC_F95_VERSION, { refetchQueries: [GET_GAMES] })
  const [deleteGame] = useMutation(DELETE_GAME, { refetchQueries: [GET_GAMES] })

  useEffect(() => {
    if (decodedUrl) getGame({ variables: { threadUrl: decodedUrl } })
  }, [decodedUrl])

  const handleImport = async () => {
    if (!decodedUrl) return
    setImporting(true)
    try {
      await importGame({ variables: { threadUrl: decodedUrl } })
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

  if (error) {
    return (
      <div className="max-w-screen-xl mx-auto px-6 py-12 text-center">
        <AlertCircle size={32} className="mx-auto mb-3 text-rose-500" />
        <p className="text-stone-700 dark:text-stone-300 font-semibold">{error.message}</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const game = data?.getF95Game
  if (!game) return null

  const rawLibraryGame = gamesData?.games.find(g => g.f95Id === game.threadId) ?? null

  const libraryGame: LibraryFullInfo | null = rawLibraryGame ? {
    id: rawLibraryGame.id,
    status: rawLibraryGame.status,
    devStatus: rawLibraryGame.devStatus,
    myVersion: rawLibraryGame.myVersion,
    latestVersion: rawLibraryGame.latestVersion,
    hasUpdate: rawLibraryGame.hasUpdate,
    downloadUrl: rawLibraryGame.downloadUrl || undefined,
    notes: rawLibraryGame.notes || undefined,
    addedAt: rawLibraryGame.addedAt,
    updatedAt: rawLibraryGame.updatedAt,
  } : null

  const handleDelete = async () => {
    if (!rawLibraryGame) return
    await deleteGame({ variables: { id: rawLibraryGame.id } })
    setImported(false)
  }

  const handleSync = () => {
    if (!rawLibraryGame) return
    syncVersion({ variables: { id: rawLibraryGame.id } })
  }

  return (
    <>
      <GameDetailView
        source="f95"
        title={game.title}
        developer={game.developer}
        coverUrl={game.coverUrl}
        description={game.description}
        tags={game.tags}
        screenshots={(game.screenshots ?? []).map(src => ({ thumbnail: src, url: src }))}
        externalUrl={decodedUrl}
        engine={game.engine || undefined}
        libraryGame={libraryGame}
        onEdit={() => setShowEdit(true)}
        onDelete={handleDelete}
        onSync={handleSync}
        syncing={syncing}
        imported={imported || !!libraryGame}
        importing={importing}
        onImport={handleImport}
      />
      {showEdit && rawLibraryGame && (
        <GameModal game={rawLibraryGame} onClose={() => setShowEdit(false)} />
      )}
    </>
  )
}
