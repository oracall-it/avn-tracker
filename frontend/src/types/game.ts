export type GameStatus = 'PLAYING' | 'COMPLETED' | 'WANT' | 'DROPPED' | 'ON_HOLD'
export type DevStatus = 'ONGOING' | 'COMPLETE' | 'ABANDONED'

export interface Game {
  id: string
  title: string
  developer: string
  coverUrl: string
  status: GameStatus
  devStatus: DevStatus
  myVersion: string
  latestVersion: string
  downloadUrl: string
  tags: string[]
  notes: string
  description: string
  vndbId?: string | null
  f95Id?: string | null
  hasUpdate: boolean
  addedAt: string
  updatedAt: string
}

export interface VNDBScreenshot {
  thumbnail: string
  url: string
}

export interface VNDBResult {
  vndbId: string
  title: string
  developer: string
  coverUrl: string
  tags: string[]
  description: string
  screenshots: VNDBScreenshot[]
}

export interface VNDBPage {
  results: VNDBResult[]
  count: number
  more: boolean
}

export interface GameFilter {
  status?: GameStatus | null
  devStatus?: DevStatus | null
  hasUpdate?: boolean | null
  tags?: string[]
  search?: string | null
}

export interface GameInput {
  title: string
  developer?: string
  coverUrl?: string
  status?: GameStatus
  devStatus?: DevStatus
  myVersion?: string
  latestVersion?: string
  downloadUrl?: string
  tags?: string[]
  notes?: string
  description?: string
  vndbId?: string
  f95Id?: string
}

export interface F95SearchItem {
  threadId: string
  threadUrl: string
  title: string
  version: string
  engine: string
  tags: string[]
}

export interface F95SearchResult {
  results: F95SearchItem[]
  totalPages: number
}

export interface F95Game {
  threadId: string
  threadUrl: string
  title: string
  developer: string
  version: string
  coverUrl: string
  description: string
  tags: string[]
  engine: string
  f95Status: string
  screenshots: string[]
}

export interface AppSettings {
  f95Username: string
  f95Connected: boolean
}

export interface SyncResult {
  total: number
  updated: number
  errors: string[]
}

export interface RecommendationLink {
  id: string
  url: string
  title: string
  addedAt: string
}

export const STATUS_LABELS: Record<GameStatus, string> = {
  PLAYING: 'Playing',
  COMPLETED: 'Completed',
  WANT: 'Want',
  DROPPED: 'Dropped',
  ON_HOLD: 'On Hold',
}

export const DEV_STATUS_LABELS: Record<DevStatus, string> = {
  ONGOING: 'Ongoing',
  COMPLETE: 'Complete',
  ABANDONED: 'Abandoned',
}

// Warm-palette status chip classes (light + dark)
export const STATUS_COLORS: Record<GameStatus, string> = {
  PLAYING:   'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  COMPLETED: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  WANT:      'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  DROPPED:   'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  ON_HOLD:   'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
}

export const DEV_STATUS_COLORS: Record<DevStatus, string> = {
  ONGOING:   'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-300 dark:border-cyan-800',
  COMPLETE:  'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  ABANDONED: 'bg-stone-100 text-stone-500 border-stone-200 dark:bg-stone-800 dark:text-stone-500 dark:border-stone-700',
}
