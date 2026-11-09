// Row types mirroring supabase/migrations/0001_initial_schema.sql

export interface Profile {
  id: string
  full_name: string
  course: string | null
  bio: string | null
  created_at: string
}

export type ProfileUpdates = Partial<Pick<Profile, 'full_name' | 'course' | 'bio'>>

export interface Group {
  id: string
  name: string
  course_code: string
  description: string | null
  owner_id: string
  max_members: number
  join_code: string
  created_at: string
}

export type GroupRole = 'owner' | 'member'

export interface GroupMember {
  group_id: string
  user_id: string
  role: GroupRole
  joined_at: string
}

export interface StudySession {
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

export interface SessionRsvp {
  session_id: string
  user_id: string
  status: RsvpStatus
  responded_at: string
}

// Joined query shapes returned by the services

/** A group plus the current user's membership role in it. */
export type GroupWithRole = Group & { role: GroupRole }

/** A group plus its live member count (returned by listGroups). */
export interface GroupWithCount extends Group {
  member_count: number
}

export interface MemberWithProfile extends GroupMember {
  profiles: Pick<Profile, 'id' | 'full_name' | 'course'> | null
}

/** A session plus the current user's RSVP, if any. */
export interface SessionWithRsvp extends StudySession {
  my_rsvp: RsvpStatus | null
}

export interface RsvpWithProfile extends SessionRsvp {
  profiles: Pick<Profile, 'id' | 'full_name'> | null
}
