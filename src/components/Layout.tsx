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
        `flex items-center gap-2 rounded-xl px-3 py-1.5 text-sm font-medium transition-colors ${
          isActive ? 'text-vermilion' : 'text-muted hover:text-sumi'
        }`
      }
    >
      <span aria-hidden className="font-kana text-sm leading-none">
        {jp}
      </span>
      {label}
    </NavLink>
  )
}

/** Mobile dock tab: the active tab expands into a vermilion pill that glides
    between tabs (shared layoutId). */
function DockTab({ to, label, jp }: { to: string; label: string; jp: string }) {
  return (
    <NavLink to={to} end={to === '/'} aria-label={label} className="outline-none">
      {({ isActive }) => (
        <motion.span
          whileTap={{ scale: 0.92 }}
          className="relative flex h-11 items-center justify-center gap-1.5 rounded-full px-3.5"
        >
          {isActive && (
            <motion.span
              layoutId="dock-pill"
              transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              className="absolute inset-0 rounded-full bg-vermilion/10"
            />
          )}
          <span
            aria-hidden
            className={`relative font-kana text-xl leading-none transition-colors duration-200 ${
              isActive ? 'text-vermilion' : 'text-muted'
            }`}
          >
            {jp}
          </span>
          {isActive && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.18, delay: 0.06 }}
              className="relative text-xs font-semibold text-vermilion"
            >
              {label}
            </motion.span>
          )}
        </motion.span>
      )}
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

      {/* Top padding includes the notch/status-bar inset for installed PWAs. */}
      <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[calc(1.5rem+env(safe-area-inset-top))] sm:px-6 sm:pb-16 sm:pt-10">
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

      {/* Floating dock — detached from the screen edge, hanko-tinted active pill. */}
      <nav
        aria-label="Main"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:hidden"
      >
        <div className="pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-0.5 rounded-full border border-hairline bg-surface/95 p-1.5 shadow-lift backdrop-blur">
          {NAV.map((n) => (
            <DockTab key={n.to} {...n} />
          ))}
        </div>
      </nav>
    </div>
  )
}
