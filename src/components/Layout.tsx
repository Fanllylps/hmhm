import { useEffect } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'

const NAV = [
  { to: '/', label: 'Home', jp: '家' },
  { to: '/review', label: 'Review', jp: '復' },
  { to: '/practice', label: 'Practice', jp: '遊' },
  { to: '/chart', label: 'Chart', jp: '表' },
  { to: '/settings', label: 'Settings', jp: '設' },
]

function NavItem({ to, label, jp }: { to: string; label: string; jp: string }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors sm:flex-row sm:gap-2 sm:text-sm ${
          isActive ? 'text-vermilion' : 'text-muted hover:text-sumi'
        }`
      }
    >
      <span aria-hidden className="font-kana text-base leading-none sm:text-sm">
        {jp}
      </span>
      {label}
    </NavLink>
  )
}

export default function Layout() {
  const location = useLocation()

  // Every tab starts at the top — otherwise a deep scroll on a long page (the
  // kana chart) carries over and drops you into the middle of the next one.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 hidden border-b border-hairline bg-washi/90 backdrop-blur sm:block">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-vermilion font-kana text-sm font-bold text-vermilion">
              か
            </span>
            <span className="text-base font-semibold tracking-tight">KanaFlow</span>
          </NavLink>
          <nav className="flex items-center gap-1" aria-label="Main">
            {NAV.map((n) => (
              <NavItem key={n.to} {...n} />
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-6 sm:px-6 sm:pb-16 sm:pt-10">
        {/* Keyed on the path so each page remounts and fades in. Deliberately
            no AnimatePresence/exit here: the child is <Outlet />, whose content
            swaps as soon as the route changes, so an exiting wrapper would be
            left holding the *new* page — and could stay stuck at exit opacity. */}
        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
        >
          <Outlet />
        </motion.div>
      </main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
      >
        <div className="mx-auto flex max-w-md items-stretch justify-around px-2 py-1.5">
          {NAV.map((n) => (
            <NavItem key={n.to} {...n} />
          ))}
        </div>
      </nav>
    </div>
  )
}
