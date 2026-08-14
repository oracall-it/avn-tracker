import { useRef, useState } from 'react'
import { useMutation, useQuery } from '@apollo/client'
import { Download, Upload, ArrowLeft, Loader2, Check, X, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EXPORT_LIBRARY, IMPORT_LIBRARY, SET_F95_CREDENTIALS, TEST_F95_CONNECTION } from '../graphql/mutations'
import { GET_GAMES, GET_APP_SETTINGS } from '../graphql/queries'
import { AppSettings } from '../types/game'

export function Settings() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)

  const [exportLib] = useMutation(EXPORT_LIBRARY)
  const [importLib] = useMutation(IMPORT_LIBRARY, { refetchQueries: [GET_GAMES] })

  // F95Zone credentials state
  const { data: settingsData, refetch: refetchSettings } = useQuery<{ appSettings: AppSettings }>(GET_APP_SETTINGS)
  const [f95Username, setF95Username] = useState('')
  const [f95Password, setF95Password] = useState('')
  const [f95Saving, setF95Saving] = useState(false)
  const [f95Error, setF95Error] = useState<string | null>(null)
  const [f95Success, setF95Success] = useState(false)
  const [testing, setTesting] = useState(false)

  const [setCredentials] = useMutation(SET_F95_CREDENTIALS, { refetchQueries: [GET_APP_SETTINGS] })
  const [testConnection] = useMutation(TEST_F95_CONNECTION, { refetchQueries: [GET_APP_SETTINGS] })

  const settings = settingsData?.appSettings

  const handleExport = async () => {
    const { data } = await exportLib()
    const json: string = data?.exportLibrary
    if (!json) return
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `avn-tracker-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    const { data } = await importLib({ variables: { json: text } })
    if (data?.importLibrary) alert('Library imported successfully.')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleSaveF95 = async () => {
    if (!f95Username || !f95Password) return
    setF95Saving(true)
    setF95Error(null)
    setF95Success(false)
    try {
      const { data } = await setCredentials({ variables: { username: f95Username, password: f95Password } })
      if (data?.setF95Credentials) {
        setF95Success(true)
        setF95Username('')
        setF95Password('')
        refetchSettings()
      } else {
        setF95Error('Login failed — check your credentials.')
      }
    } catch (err: unknown) {
      setF95Error(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setF95Saving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setF95Error(null)
    try {
      const { data } = await testConnection()
      if (!data?.testF95Connection) {
        setF95Error('Connection failed — check your credentials in Settings.')
      }
      refetchSettings()
    } catch (err: unknown) {
      setF95Error(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const card = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm'
  const btn = 'flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-300 transition-colors'
  const input = 'w-full bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-900 dark:text-stone-100 focus:outline-none focus:border-amber-400 dark:focus:border-amber-600 transition-colors'

  return (
    <div className="max-w-screen-xl mx-auto px-6 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors font-medium mb-6"
      >
        <ArrowLeft size={15} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-100 mb-6">Settings</h1>

      <div className="max-w-lg space-y-4">
        {/* F95Zone credentials */}
        <div className={card}>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-bold text-stone-900 dark:text-stone-100">F95Zone Account</h2>
            {settings && (
              <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                settings.f95Connected
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${settings.f95Connected ? 'bg-emerald-500' : 'bg-stone-400'}`} />
                {settings.f95Connected ? 'Connected' : 'Not connected'}
              </span>
            )}
          </div>
          <p className="text-sm text-stone-500 dark:text-stone-500 mb-4">
            Required for F95Zone search and import. Credentials are stored locally and never shared.
            {settings?.f95Username && (
              <span className="block mt-1 text-stone-400 dark:text-stone-600">Saved account: <strong className="text-stone-600 dark:text-stone-400">{settings.f95Username}</strong></span>
            )}
          </p>

          <div className="space-y-2 mb-3">
            <input
              type="text"
              value={f95Username}
              onChange={e => setF95Username(e.target.value)}
              placeholder="F95Zone username"
              autoComplete="username"
              className={input}
            />
            <input
              type="password"
              value={f95Password}
              onChange={e => setF95Password(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              onKeyDown={e => { if (e.key === 'Enter') handleSaveF95() }}
              className={input}
            />
          </div>

          {f95Error && (
            <div className="flex items-start gap-2 mb-3 p-3 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl">
              <X size={14} className="text-rose-500 mt-0.5 flex-shrink-0" />
              <p className="text-rose-600 dark:text-rose-400 text-xs">{f95Error}</p>
            </div>
          )}
          {f95Success && (
            <div className="flex items-center gap-2 mb-3 p-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl">
              <Check size={14} className="text-emerald-500" />
              <p className="text-emerald-600 dark:text-emerald-400 text-xs">Connected successfully.</p>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleSaveF95}
              disabled={f95Saving || !f95Username || !f95Password}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
            >
              {f95Saving ? <Loader2 size={14} className="animate-spin" /> : null}
              Save & Connect
            </button>
            {settings?.f95Connected && (
              <button onClick={handleTestConnection} disabled={testing} className={btn}>
                {testing ? <Loader2 size={14} className="animate-spin" /> : <Wifi size={14} />}
                Test
              </button>
            )}
          </div>
        </div>

        {/* Export */}
        <div className={card}>
          <h2 className="font-bold text-stone-900 dark:text-stone-100 mb-1">Export Library</h2>
          <p className="text-sm text-stone-500 dark:text-stone-500 mb-4">
            Download all games as JSON for backup or migration.
          </p>
          <button onClick={handleExport} className={btn}>
            <Download size={15} />
            Export JSON
          </button>
        </div>

        {/* Import */}
        <div className={card}>
          <h2 className="font-bold text-stone-900 dark:text-stone-100 mb-1">Import Library</h2>
          <p className="text-sm text-stone-500 dark:text-stone-500 mb-4">
            Restore from a previously exported JSON. Games with the same ID will be overwritten.
          </p>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          <button onClick={() => fileRef.current?.click()} className={btn}>
            <Upload size={15} />
            Import JSON
          </button>
        </div>
      </div>
    </div>
  )
}
