import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { signOut } from '../../services/auth'
import { initials } from '../../lib/format'
import { BookOpenIcon, HomeIcon, LogOutIcon, UserIcon, UsersIcon } from '../icons'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none ${
    isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

export function Navbar() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch {
      setSigningOut(false)
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 md:px-6">
        <NavLink
          to="/"
          aria-label="Study Group Hub home"
          className="flex items-center gap-2 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
            <BookOpenIcon size={18} />
          </span>
          <span className="hidden text-sm font-semibold text-slate-900 sm:block">
            Study Group Hub
          </span>
        </NavLink>

        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/" end className={linkClass} aria-label="Home">
            <HomeIcon size={18} />
            <span className="hidden md:inline">Home</span>
          </NavLink>
          <NavLink to="/groups" className={linkClass} aria-label="Groups">
            <UsersIcon size={18} />
            <span className="hidden md:inline">Groups</span>
          </NavLink>
          {session && (
            <NavLink to="/profile" className={linkClass} aria-label="Profile">
              <UserIcon size={18} />
              <span className="hidden md:inline">Profile</span>
            </NavLink>
          )}
          {session ? (
            <>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
                className="ml-1 flex min-h-[40px] items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 disabled:opacity-60 motion-reduce:transition-none"
              >
                <LogOutIcon size={18} />
                <span className="hidden md:inline">Sign out</span>
              </button>
              <span
                aria-hidden="true"
                title={profile?.full_name ?? undefined}
                className="ml-1 hidden h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800 sm:flex"
              >
                {initials(profile?.full_name)}
              </span>
            </>
          ) : (
            <NavLink
              to="/login"
              className="ml-1 inline-flex min-h-[40px] items-center rounded-lg bg-brand-600 px-4 text-sm font-medium text-white transition-colors hover:bg-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 motion-reduce:transition-none"
            >
              Sign in
            </NavLink>
          )}
        </nav>
      </div>
    </header>
  )
}
