import { supabase } from '../lib/supabaseClient'
import type {
  Group,
  GroupRole,
  GroupWithRole,
  MemberWithProfile,
} from '../lib/database.types'

export interface GroupInput {
  name: string
  course_code: string
  description: string | null
  max_members: number
}

/** The user is already a member of the group. */
export class AlreadyMemberError extends Error {
  constructor() {
    super('You are already a member of this group.')
    this.name = 'AlreadyMemberError'
  }
}

/** The group has reached max_members. */
export class GroupFullError extends Error {
  constructor() {
    super('This group is full.')
    this.name = 'GroupFullError'
  }
}

/** Groups the current user belongs to, with their role in each. */
export async function listMyGroups(userId: string): Promise<GroupWithRole[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('role, groups(*)')
    .eq('user_id', userId)
  if (error) throw error

  const rows = (data ?? []) as unknown as Array<{ role: string; groups: Group | null }>
  return rows
    .filter((row) => row.groups !== null)
    .map((row) => ({ ...(row.groups as Group), role: row.role as GroupRole }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * All groups, newest first. Member counts are aggregate numbers maintained by a
 * trigger — safe for public browsing without exposing any personal data.
 * `search` filters by name or course code (reserved PostgREST characters stripped).
 */
export async function listGroups(search = ''): Promise<Group[]> {
  let query = supabase
    .from('groups')
    .select('*')
    .order('created_at', { ascending: false })

  const s = search.replace(/[%(),"\\]/g, ' ').trim()
  if (s) {
    query = query.or(`name.ilike.%${s}%,course_code.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw error
  return (data ?? []) as unknown as Group[]
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('id', groupId)
    .maybeSingle()
  if (error) throw error
  return data
}

export async function getMembers(groupId: string): Promise<MemberWithProfile[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('*, profiles(id, full_name, course)')
    .eq('group_id', groupId)
    .order('joined_at')
  if (error) throw error
  const rows = data as unknown as MemberWithProfile[]
  return [...rows].sort(
    (a, b) => Number(b.role === 'owner') - Number(a.role === 'owner'),
  )
}

export async function getMyMembership(
  groupId: string,
  userId: string,
): Promise<GroupRole | null> {
  const { data, error } = await supabase
    .from('group_members')
    .select('role')
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return (data?.role as GroupRole) ?? null
}

/**
 * The group's invite code. Only readable by group members (RLS on group_invites),
 * so the UI can show the "share this code" chip without leaking codes to visitors.
 */
export async function getInviteCode(groupId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('group_invites')
    .select('code')
    .eq('group_id', groupId)
    .maybeSingle()
  if (error) throw error
  return data?.code ?? null
}

/**
 * Creates a group; the DB trigger adds the creator as owner and mints a unique
 * 6-character invite code (stored in the protected group_invites table).
 */
export async function createGroup(userId: string, input: GroupInput): Promise<Group> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ ...input, owner_id: userId })
    .select()
    .single()
  if (error) throw error
  return data as unknown as Group
}

export async function updateGroup(groupId: string, input: GroupInput): Promise<void> {
  const { error } = await supabase.from('groups').update(input).eq('id', groupId)
  if (error) throw error
}

export async function deleteGroup(groupId: string): Promise<void> {
  const { error } = await supabase.from('groups').delete().eq('id', groupId)
  if (error) throw error
}

/** Members can leave; owners cannot (they delete the group instead). */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member')
  if (error) throw error
}

/**
 * Group owners remove plain members (RLS policy 0005). The 0004 trigger cleans
 * up the removed member's RSVPs automatically.
 */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId)
    .eq('role', 'member')
  if (error) throw error
}

/**
 * Joins a group by invite code through the join_group_by_code RPC, which is the
 * only way to become a member: it validates the code, blocks duplicates, and
 * enforces capacity atomically under a row lock. Returns the joined group's id.
 */
export async function joinGroupByCode(code: string): Promise<string> {
  const { data, error } = await supabase.rpc('join_group_by_code', { p_code: code })
  if (error) {
    const message = error.message
    if (message.includes('already a member')) throw new AlreadyMemberError()
    if (message.includes('full')) throw new GroupFullError()
    throw new Error(message)
  }
  return data
}
