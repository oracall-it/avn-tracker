import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client'
import { Loader2, AlertCircle } from 'lucide-react'
import { GET_VNDB_GAME, GET_GAMES } from '../graphql/queries'
import { IMPORT_FROM_VNDB, SYNC_LATEST_VERSION, DELETE_GAME } from '../graphql/mutations'
import { VNDBResult, Game } from '../types/game'
import { GameDetailView, LibraryFullInfo } from '../components/GameDetailView'
import { GameModal } from '../components/GameModal'

export function VNDBGameDetail() {
  const { vndbId } = useParams<{ vndbId: string }>()
  const navigate = useNavigate()
  const [imported, setImported] = useState(false)
  const [importing, setImporting] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data, loading, error } = useQuery<{ getVNDBGame: VNDBResult | null }>(GET_VNDB_GAME, {
    variables: { vndbId },
    skip: !vndbId,
  })

  const { data: gamesData } = useQuery<{ games: Game[] }>(GET_GAMES)
  const [importGame] = useMutation(IMPORT_FROM_VNDB, { refetchQueries: [GET_GAMES] })
  const [syncVersion, { loading: syncing }] = useMutation(SYNC_LATEST_VERSION, { refetchQueries: [GET_GAMES] })
  const [deleteGame] = useMutation(DELETE_GAME, { refetchQueries: [GET_GAMES] })

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
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-amber-600 dark:text-amber-400 hover:underline">
          Go back
        </button>
      </div>
    )
  }

  const vn = data.getVNDBGame
  const rawLibraryGame = gamesData?.games.find(g => g.vndbId === vn.vndbId) ?? null

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
        source="vndb"
        title={vn.title}
        developer={vn.developer}
        coverUrl={vn.coverUrl}
        description={vn.description}
        tags={vn.tags}
        screenshots={vn.screenshots ?? []}
        externalUrl={`https://vndb.org/${vn.vndbId}`}
        vndbId={vn.vndbId}
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
