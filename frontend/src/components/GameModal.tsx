import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useMutation } from '@apollo/client'
import { X } from 'lucide-react'
import { Game, GameInput, GameStatus, DevStatus } from '../types/game'
import { ADD_GAME, UPDATE_GAME } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'
import { VNDBSearchInline } from './VNDBSearchInline'

interface Props {
  game?: Game | null
  onClose: () => void
}

type FormValues = {
  title: string
  developer: string
  coverUrl: string
  status: GameStatus
  devStatus: DevStatus
  myVersion: string
  latestVersion: string
  downloadUrl: string
  tagsRaw: string
  notes: string
  description: string
  vndbId: string
}

const inputCls = 'w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2.5 text-sm text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-600 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors'
const labelCls = 'block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5 uppercase tracking-wide'

export function GameModal({ game, onClose }: Props) {
  const [tab, setTab] = useState<'manual' | 'vndb'>('manual')
  const isEdit = !!game

  const { register, handleSubmit, reset } = useForm<FormValues>({
    defaultValues: {
      title: '', developer: '', coverUrl: '', status: 'WANT', devStatus: 'ONGOING',
      myVersion: '', latestVersion: '', downloadUrl: '', tagsRaw: '', notes: '', description: '', vndbId: '',
    },
  })

  useEffect(() => {
    if (game) {
      reset({
        title: game.title, developer: game.developer, coverUrl: game.coverUrl,
        status: game.status, devStatus: game.devStatus, myVersion: game.myVersion,
        latestVersion: game.latestVersion, downloadUrl: game.downloadUrl,
        tagsRaw: game.tags.join(', '), notes: game.notes, description: game.description ?? '', vndbId: game.vndbId ?? '',
      })
    }
  }, [game, reset])

  const [addGame] = useMutation(ADD_GAME, { refetchQueries: [GET_GAMES] })
  const [updateGame] = useMutation(UPDATE_GAME, { refetchQueries: [GET_GAMES] })

  const onSubmit = async (values: FormValues) => {
    const tags = values.tagsRaw.split(',').map(t => t.trim()).filter(Boolean)
    const input: GameInput = {
      title: values.title,
      developer: values.developer || undefined,
      coverUrl: values.coverUrl || undefined,
      status: values.status,
      devStatus: values.devStatus,
      myVersion: values.myVersion || undefined,
      latestVersion: values.latestVersion || undefined,
      downloadUrl: values.downloadUrl || undefined,
      tags,
      notes: values.notes,
      description: values.description,
      vndbId: values.vndbId || undefined,
    }
    if (isEdit) {
      await updateGame({ variables: { id: game.id, input } })
    } else {
      await addGame({ variables: { input } })
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 dark:border-stone-800 shrink-0">
          <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">
            {isEdit ? 'Edit Game' : 'Add Game'}
          </h2>
          <button onClick={onClose} className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        {!isEdit && (
          <div className="flex border-b border-stone-100 dark:border-stone-800 shrink-0 px-6">
            {(['manual', 'vndb'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`py-3 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  tab === t
                    ? 'border-amber-500 text-amber-700 dark:text-amber-400'
                    : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
                }`}
              >
                {t === 'manual' ? 'Manual' : 'Search VNDB'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {!isEdit && tab === 'vndb' ? (
            <VNDBSearchInline onImported={onClose} />
          ) : (
            <form id="game-form" onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className={labelCls}>Title *</label>
                <input {...register('title', { required: true })} className={inputCls} placeholder="Game title" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Developer</label>
                  <input {...register('developer')} className={inputCls} placeholder="Studio name" />
                </div>
                <div>
                  <label className={labelCls}>VNDB ID</label>
                  <input {...register('vndbId')} className={inputCls} placeholder="v12345" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Cover Image URL</label>
                <input {...register('coverUrl')} className={inputCls} placeholder="https://…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Your Status</label>
                  <select {...register('status')} className={inputCls}>
                    <option value="WANT">Want to Play</option>
                    <option value="PLAYING">Playing</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="DROPPED">Dropped</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Dev Status</label>
                  <select {...register('devStatus')} className={inputCls}>
                    <option value="ONGOING">Ongoing</option>
                    <option value="COMPLETE">Complete</option>
                    <option value="ABANDONED">Abandoned</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Version I Played</label>
                  <input {...register('myVersion')} className={inputCls} placeholder="e.g. 0.9.2" />
                </div>
                <div>
                  <label className={labelCls}>Latest Version</label>
                  <input {...register('latestVersion')} className={inputCls} placeholder="e.g. 1.1.0" />
                </div>
              </div>
              <div>
                <label className={labelCls}>Download URL</label>
                <input {...register('downloadUrl')} className={inputCls} placeholder="https://…" />
              </div>
              <div>
                <label className={labelCls}>Tags</label>
                <input {...register('tagsRaw')} className={inputCls} placeholder="RPG, sandbox, romance  (comma-separated)" />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea {...register('description')} rows={4} className={inputCls} placeholder="Game description (auto-filled from VNDB)…" />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea {...register('notes')} rows={3} className={inputCls} placeholder="Personal notes…" />
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        {(isEdit || tab === 'manual') && (
          <div className="px-6 py-4 border-t border-stone-100 dark:border-stone-800 flex justify-end gap-3 shrink-0">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 font-medium">
              Cancel
            </button>
            <button
              type="submit"
              form="game-form"
              className="px-5 py-2 text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold transition-colors"
            >
              {isEdit ? 'Save Changes' : 'Add Game'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
