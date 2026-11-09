import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabaseClient'
import { getProfile, updateProfile } from '../services/profiles'
import type { Profile, ProfileUpdates } from '../lib/database.types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  /** Set when the profile fetch fails — surfaced on the profile page. */
  profileError: string | null
  /** True until the initial session lookup finishes. */
  loading: boolean
  /** Syncs a session the auth service just created (avoids the login flash). */
  applySession: (session: Session | null) => void
  refreshProfile: () => Promise<void>
  saveProfile: (updates: ProfileUpdates) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  const userId = session?.user?.id

  useEffect(() => {
    if (!userId) {
      setProfile(null)
      setProfileError(null)
      return
    }
    let cancelled = false
    getProfile(userId)
      .then((p) => {
        if (!cancelled) {
          setProfile(p)
          setProfileError(null)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setProfile(null)
          setProfileError(
            err instanceof Error ? err.message : 'Could not load your profile.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [userId])

  const applySession = useCallback((next: Session | null) => {
    setSession(next)
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!userId) return
    try {
      const p = await getProfile(userId)
      setProfile(p)
      setProfileError(null)
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : 'Could not load your profile.',
      )
    }
  }, [userId])

  const saveProfile = useCallback(
    async (updates: ProfileUpdates) => {
      if (!userId) throw new Error('Not signed in')
      const saved = await updateProfile(userId, updates)
      setProfile(saved)
      setProfileError(null)
    },
    [userId],
  )

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        profileError,
        loading,
        applySession,
        refreshProfile,
        saveProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
