import { ApolloClient, InMemoryCache, ApolloProvider } from '@apollo/client'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { createContext, useContext, useEffect, useState } from 'react'

type DrawerSide = 'left' | 'right'
interface DrawerSideCtx { side: DrawerSide; setSide: (s: DrawerSide) => void }
const DrawerSideContext = createContext<DrawerSideCtx>({ side: 'right', setSide: () => {} })
export function useDrawerSide() { return useContext(DrawerSideContext) }
import { BookOpen, Compass, Settings2, Sun, Moon } from 'lucide-react'
import { Library } from './pages/Library'
import { Discover } from './pages/Discover'
import { GameDetail } from './pages/GameDetail'
import { VNDBGameDetail } from './pages/VNDBGameDetail'
import { F95GameDetail } from './pages/F95GameDetail'
import { Settings } from './pages/Settings'
import { LinksDrawer } from './components/LinksDrawer'

const client = new ApolloClient({
  uri: '/graphql',
  cache: new InMemoryCache(),
})

function Nav() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') === 'dark')
  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
      isActive
        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
        : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800'
    }`

  return (
    <header className="sticky top-0 z-30 bg-white/90 dark:bg-stone-950/90 backdrop-blur border-b border-stone-200 dark:border-stone-800">
      <div className="max-w-screen-xl mx-auto px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <NavLink to="/">
            <img
              src={dark ? '/logo_dark.png' : '/logo_light.png'}
              alt="AVN Tracker"
              className="h-12 w-auto object-contain cursor-pointer"
            />
          </NavLink>
          <nav className="flex items-center gap-1">
            <NavLink to="/" end className={linkCls}>
              <BookOpen size={15} />
              Library
            </NavLink>
            <NavLink to="/discover" className={linkCls}>
              <Compass size={15} />
              Discover
            </NavLink>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Toggle theme"
          >
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <NavLink
            to="/settings"
            className="p-2 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-stone-100 dark:hover:bg-stone-800 transition-colors"
            title="Settings"
          >
            <Settings2 size={16} />
          </NavLink>
        </div>
      </div>
    </header>
  )
}

export default function App() {
  const [drawerSide, setDrawerSide] = useState<DrawerSide>(() =>
    (localStorage.getItem('drawer-side') as DrawerSide) ?? 'right'
  )
  const setSide = (s: DrawerSide) => { setDrawerSide(s); localStorage.setItem('drawer-side', s) }

  return (
    <ApolloProvider client={client}>
      <BrowserRouter>
        <DrawerSideContext.Provider value={{ side: drawerSide, setSide }}>
        <div className="min-h-screen bg-stone-50 dark:bg-stone-950 transition-colors">
          <Nav />
          <LinksDrawer />
          <Routes>
            <Route path="/" element={<Library />} />
            <Route path="/discover" element={<Discover />} />
            <Route path="/game/:id" element={<GameDetail />} />
            <Route path="/discover/game/:vndbId" element={<VNDBGameDetail />} />
            <Route path="/discover/f95/:threadUrl" element={<F95GameDetail />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </div>
        </DrawerSideContext.Provider>
      </BrowserRouter>
    </ApolloProvider>
  )
}
