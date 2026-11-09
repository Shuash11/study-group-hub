import { supabase } from '../lib/supabaseClient'
import type {
  RsvpStatus,
  RsvpWithProfile,
  SessionWithRsvp,
  StudySession,
} from '../lib/database.types'

export interface SessionInput {
  title: string
  starts_at: string // ISO timestamp
  duration_minutes: number
  location: string | null
  details: string | null
}

/** All of a group's sessions, soonest first, with the current user's RSVP. */
export async function listSessions(
  groupId: string,
  userId: string,
): Promise<SessionWithRsvp[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, session_rsvps(status, user_id)')
    .eq('group_id', groupId)
    .order('starts_at')
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    StudySession & { session_rsvps: Array<{ status: string; user_id: string }> }
  >
  return rows.map(({ session_rsvps, ...session }) => ({
    ...session,
    my_rsvp:
      (session_rsvps.find((r) => r.user_id === userId)?.status as RsvpStatus) ?? null,
  }))
}

export async function createSession(
  groupId: string,
  userId: string,
  input: SessionInput,
): Promise<StudySession> {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({ ...input, group_id: groupId, created_by: userId })
    .select()
    .single()
  if (error) throw error
  return data as StudySession
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('study_sessions').delete().eq('id', sessionId)
  if (error) throw error
}

/** Everyone's RSVP for a session, with names. */
export async function listRsvps(sessionId: string): Promise<RsvpWithProfile[]> {
  const { data, error } = await supabase
    .from('session_rsvps')
    .select('*, profiles(id, full_name)')
    .eq('session_id', sessionId)
    .order('responded_at')
  if (error) throw error
  return (data ?? []) as unknown as RsvpWithProfile[]
}

/** Sets, changes or clears (null) the current user's RSVP. */
export async function setRsvp(
  sessionId: string,
  userId: string,
  status: RsvpStatus | null,
): Promise<void> {
  if (status === null) {
    const { error } = await supabase
      .from('session_rsvps')
      .delete()
      .eq('session_id', sessionId)
      .eq('user_id', userId)
    if (error) throw error
    return
  }
  const { error } = await supabase.from('session_rsvps').upsert({
    session_id: sessionId,
    user_id: userId,
    status,
    responded_at: new Date().toISOString(),
  })
  if (error) throw error
}

export interface UpcomingSession extends SessionWithRsvp {
  groups: { id: string; name: string; course_code: string }
}

/** Next sessions across every group the user belongs to (dashboard). */
export async function listUpcomingForUser(userId: string): Promise<UpcomingSession[]> {
  const { data: memberships, error: memberError } = await supabase
    .from('group_members')
    .select('group_id')
    .eq('user_id', userId)
  if (memberError) throw memberError

  const ids = (memberships ?? []).map((m) => m.group_id as string)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from('study_sessions')
    .select('*, groups(id, name, course_code), session_rsvps(status, user_id)')
    .in('group_id', ids)
    .gte('starts_at', new Date().toISOString())
    .order('starts_at')
    .limit(20)
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<
    StudySession & {
      groups: { id: string; name: string; course_code: string } | null
      session_rsvps: Array<{ status: string; user_id: string }>
    }
  >
  return rows
    .filter((row) => row.groups !== null)
    .map(({ session_rsvps, groups, ...session }) => ({
      ...session,
      groups: groups as { id: string; name: string; course_code: string },
      my_rsvp:
        (session_rsvps.find((r) => r.user_id === userId)?.status as RsvpStatus) ?? null,
    }))
}
