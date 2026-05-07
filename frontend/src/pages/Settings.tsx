import { useRef } from 'react'
import { useMutation } from '@apollo/client'
import { Download, Upload, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { EXPORT_LIBRARY, IMPORT_LIBRARY } from '../graphql/mutations'
import { GET_GAMES } from '../graphql/queries'

export function Settings() {
  const navigate = useNavigate()
  const fileRef = useRef<HTMLInputElement>(null)
  const [exportLib] = useMutation(EXPORT_LIBRARY)
  const [importLib] = useMutation(IMPORT_LIBRARY, { refetchQueries: [GET_GAMES] })

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

  const card = 'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm'
  const btn = 'flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-semibold text-stone-700 dark:text-stone-300 transition-colors'

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
