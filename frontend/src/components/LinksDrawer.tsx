import { useState, useEffect } from 'react'
import { useQuery, useMutation, useLazyQuery } from '@apollo/client'
import { X, Plus, Link2, Pencil, Trash2, Search, ExternalLink, Loader2, ChevronLeft, ChevronRight, SquareArrowOutUpRight } from 'lucide-react'
import { useDrawerSide } from '../App'
import { GET_RECOMMENDATION_LINKS, FETCH_LINK_TITLE } from '../graphql/queries'
import {
  ADD_RECOMMENDATION_LINK,
  UPDATE_RECOMMENDATION_LINK,
  DELETE_RECOMMENDATION_LINK,
} from '../graphql/mutations'
import { RecommendationLink } from '../types/game'

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

export function LinksDrawer() {
  const { side } = useDrawerSide()
  const isLeft = side === 'left'
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [addMode, setAddMode] = useState(false)
  const [addUrl, setAddUrl] = useState('')
  const [addTitle, setAddTitle] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editUrl, setEditUrl] = useState('')

  const { data } = useQuery<{ recommendationLinks: RecommendationLink[] }>(
    GET_RECOMMENDATION_LINKS,
    { fetchPolicy: 'cache-and-network' }
  )

  const [titleUnfetchable, setTitleUnfetchable] = useState(false)
  const [fetchTitle, { loading: fetchingTitle }] = useLazyQuery<{ fetchLinkTitle: string }>(
    FETCH_LINK_TITLE,
    {
      onCompleted: (d) => {
        setAddTitle(d.fetchLinkTitle)
        setTitleUnfetchable(d.fetchLinkTitle === '')
      },
    }
  )

  const refetchLinks = { refetchQueries: [GET_RECOMMENDATION_LINKS] }
  const [addLink, { loading: adding }] = useMutation(ADD_RECOMMENDATION_LINK, refetchLinks)
  const [updateLink] = useMutation(UPDATE_RECOMMENDATION_LINK, refetchLinks)
  const [deleteLink] = useMutation(DELETE_RECOMMENDATION_LINK, refetchLinks)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsOpen(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen])

  const handleUrlBlur = () => {
    if (isValidUrl(addUrl)) {
      fetchTitle({ variables: { url: addUrl } })
    }
  }

  const handleAdd = async () => {
    const url = addUrl.trim()
    const title = addTitle.trim()
    if (!url || !title) return
    await addLink({ variables: { url, title } })
    setAddUrl('')
    setAddTitle('')
    setAddMode(false)
  }

  const handleEditSave = async (id: string) => {
    const title = editTitle.trim()
    const url = editUrl.trim()
    if (!title || !url) return
    await updateLink({ variables: { id, title, url } })
    setEditId(null)
  }

  const cancelAdd = () => {
    setAddMode(false)
    setAddUrl('')
    setAddTitle('')
    setTitleUnfetchable(false)
  }

  const links = data?.recommendationLinks ?? []
  const filtered = search
    ? links.filter(
        (l) =>
          l.title.toLowerCase().includes(search.toLowerCase()) ||
          l.url.toLowerCase().includes(search.toLowerCase())
      )
    : links

  return (
    <>
      {/* Floating tab — full circle, partially off-screen so the arc always looks clean */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className={`fixed top-[calc(50%-1.75rem)] z-40
                    w-14 h-14 rounded-full
                    bg-amber-600 hover:bg-amber-500 text-white
                    flex items-center shadow-xl transition-all duration-200 group
                    ${isLeft
                      ? 'left-0 justify-end pr-2 ' + (isOpen ? '-translate-x-full invisible pointer-events-none' : '-translate-x-8 hover:-translate-x-4')
                      : 'right-0 justify-start pl-2 ' + (isOpen ? 'translate-x-full invisible pointer-events-none' : 'translate-x-8 hover:translate-x-4')
                    }`}
        title="Saved Lists"
        aria-label="Open saved links"
      >
        {isLeft
          ? <ChevronRight size={16} className="transition-all duration-200 group-hover:-translate-x-2 group-hover:scale-125" />
          : <ChevronLeft  size={16} className="transition-all duration-200 group-hover:translate-x-2 group-hover:scale-125" />
        }
      </button>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[1px] transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        data-testid="links-drawer"
        className={`fixed top-0 h-full w-96 z-50 flex flex-col
                    bg-stone-50 dark:bg-stone-900
                    shadow-2xl transition-transform duration-300
                    ${isLeft
                      ? 'left-0 border-r border-stone-200 dark:border-stone-700 ' + (isOpen ? 'translate-x-0' : '-translate-x-full')
                      : 'right-0 border-l border-stone-200 dark:border-stone-700 ' + (isOpen ? 'translate-x-0' : 'translate-x-full')
                    }`}
      >
        {/* Header */}
        <div className="flex-none flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-700">
          <div className="flex items-center gap-2.5">
            <Link2 size={15} className="text-amber-600 flex-none" />
            <h2 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-widest">
              Saved Lists
            </h2>
            {links.length > 0 && (
              <span className="text-xs bg-stone-200 dark:bg-stone-700 text-stone-600 dark:text-stone-400 rounded-full px-1.5 py-0.5 font-medium tabular-nums">
                {links.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {filtered.length > 0 && (
              <button
                onClick={() => filtered.forEach((l) => window.open(l.url, '_blank', 'noopener,noreferrer'))}
                className="p-1.5 rounded-lg text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                aria-label={`Open all ${filtered.length} link${filtered.length === 1 ? '' : 's'}`}
              >
                <SquareArrowOutUpRight size={14} />
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-800 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              aria-label="Close"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="flex-none px-4 pt-3 pb-2">
          <div className="relative">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search links…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>
        </div>

        {/* Add form / button */}
        <div className="flex-none px-4 pb-3">
          {addMode ? (
            <div className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3 space-y-2">
              <input
                type="url"
                placeholder="Paste URL…"
                value={addUrl}
                onChange={(e) => { setAddUrl(e.target.value); setAddTitle(''); setTitleUnfetchable(false) }}
                onBlur={handleUrlBlur}
                autoFocus
                className="w-full px-3 py-2 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              />
              <div className="relative">
                <input
                  type="text"
                  placeholder={fetchingTitle ? 'Fetching title…' : 'Title'}
                  value={addTitle}
                  onChange={(e) => setAddTitle(e.target.value)}
                  disabled={fetchingTitle}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
                  className="w-full px-3 py-2 pr-8 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500/50 disabled:opacity-50"
                />
                {fetchingTitle && (
                  <Loader2 size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 animate-spin" />
                )}
              </div>
              {titleUnfetchable && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Title couldn't be fetched automatically — type it manually.
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleAdd}
                  disabled={!addUrl.trim() || !addTitle.trim() || fetchingTitle || adding}
                  className="flex-1 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {adding ? <Loader2 size={12} className="animate-spin mx-auto" /> : 'Save'}
                </button>
                <button
                  onClick={cancelAdd}
                  className="flex-1 py-1.5 text-xs font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setAddMode(true)}
              className="w-full flex items-center justify-center gap-2 py-2 text-sm font-medium
                         bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30
                         text-amber-700 dark:text-amber-400
                         border border-dashed border-amber-300 dark:border-amber-700
                         rounded-xl transition-colors"
            >
              <Plus size={14} />
              Add new link
            </button>
          )}
        </div>

        {/* Link list */}
        <div data-testid="link-list" className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-stone-400 dark:text-stone-600">
              {search ? 'No links match your search.' : 'No saved links yet.'}
            </p>
          ) : (
            filtered.map((link) => (
              <div
                key={link.id}
                className="bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl p-3"
              >
                {editId === link.id ? (
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={editUrl}
                      onChange={(e) => setEditUrl(e.target.value)}
                      autoFocus
                      placeholder="URL"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(link.id)
                        if (e.key === 'Escape') setEditId(null)
                      }}
                      className="w-full px-2 py-1.5 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Title"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleEditSave(link.id)
                        if (e.key === 'Escape') setEditId(null)
                      }}
                      className="w-full px-2 py-1.5 text-sm bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditSave(link.id)}
                        disabled={!editTitle.trim() || !editUrl.trim()}
                        className="flex-1 py-1 text-xs font-semibold bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg transition-colors"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditId(null)}
                        className="flex-1 py-1 text-xs font-medium bg-stone-100 dark:bg-stone-700 hover:bg-stone-200 dark:hover:bg-stone-600 text-stone-700 dark:text-stone-300 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-sm font-medium text-stone-900 dark:text-stone-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors group"
                      >
                        <span className="truncate">{link.title}</span>
                        <ExternalLink size={11} className="flex-none opacity-0 group-hover:opacity-60 transition-opacity" />
                      </a>
                      <p className="text-xs text-stone-400 dark:text-stone-600 truncate mt-0.5">
                        {link.url}
                      </p>
                    </div>
                    <div className="flex-none flex gap-0.5 mt-0.5">
                      <button
                        onClick={() => { setEditId(link.id); setEditTitle(link.title); setEditUrl(link.url) }}
                        className="p-2 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors"
                        aria-label="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => deleteLink({ variables: { id: link.id } })}
                        className="p-2 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        aria-label="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
