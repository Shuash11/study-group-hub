import { supabase } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

/** Create an account. The DB trigger inserts the matching profile row.
 *  `session` is null when the project still requires email confirmation. */
export async function signUp(
  email: string,
  password: string,
  fullName: string,
): Promise<Session | null> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data.session
}

export async function signIn(email: string, password: string): Promise<Session> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data.session
}

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
