import { supabase } from '../lib/supabaseClient'
import type { Profile, ProfileUpdates } from '../lib/database.types'

export async function getProfile(id: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  return data
}

/** Upsert so the row is created even if the signup trigger has not run yet. */
export async function updateProfile(
  id: string,
  updates: ProfileUpdates,
): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id, ...updates })
    .select()
    .single()
  if (error) throw error
  return data as Profile
}
