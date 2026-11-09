// Database types mirroring supabase/migrations/*.sql
// (0001 initial schema, 0002 member-insert hardening, 0003 enforced invites & privacy,
//  0004 review hardening.)
//
// These are `type` aliases, not `interface`s: supabase-js's Database generic
// constrains Row types to Record<string, unknown>, and interfaces (unlike type
// aliases) have no implicit index signature, which would resolve rows to `never`.

export type Profile = {
  id: string
  full_name: string
  course: string | null
  bio: string | null
  created_at: string
}

export type ProfileUpdates = Partial<Pick<Profile, 'full_name' | 'course' | 'bio'>>

export type Group = {
  id: string
  name: string
  course_code: string
  description: string | null
  owner_id: string
  max_members: number
  /** Maintained by the trg_group_members_count trigger (0003). */
  member_count: number
  created_at: string
}

export type GroupRole = 'owner' | 'member'

export type GroupMember = {
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
}

export type GroupInvite = {
  group_id: string
  code: string
  created_at: string
}

export type StudySession = {
  id: string
  group_id: string
  created_by: string
  title: string
  starts_at: string
  duration_minutes: number
  location: string | null
  details: string | null
  created_at: string
}

export type RsvpStatus = 'going' | 'maybe' | 'not_going'

export type SessionRsvp = {
  session_id: string
  user_id: string
  status: RsvpStatus
  responded_at: string
}

// Joined query shapes returned by the services

/** A group plus the current user's membership role in it. */
export type GroupWithRole = Group & { role: GroupRole }

export type MemberWithProfile = GroupMember & {
  profiles: Pick<Profile, 'id' | 'full_name' | 'course'> | null
}

/** A session plus the current user's RSVP, if any. */
export type SessionWithRsvp = StudySession & {
  my_rsvp: RsvpStatus | null
}

export type RsvpWithProfile = SessionRsvp & {
  profiles: Pick<Profile, 'id' | 'full_name'> | null
}

// ---------------------------------------------------------------
// Database descriptor for the typed supabase-js client
// ---------------------------------------------------------------

type TableOf<Row extends Record<string, unknown>> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      profiles: TableOf<Profile>
      groups: TableOf<Group>
      group_members: TableOf<GroupMember>
      group_invites: TableOf<GroupInvite>
      study_sessions: TableOf<StudySession>
      session_rsvps: TableOf<SessionRsvp>
    }
    Views: Record<string, never>
    Functions: {
      join_group_by_code: { Args: { p_code: string }; Returns: string }
      is_group_member: { Args: { g: string }; Returns: boolean }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
