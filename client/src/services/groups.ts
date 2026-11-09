import { supabase } from '../lib/supabaseClient'
import { generateJoinCode, normalizeJoinCode } from '../lib/format'
import type {
  Group,
  GroupRole,
  GroupWithCount,
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

  const rows = (data ?? []) as Array<{ role: string; groups: Group | null }>
  return rows
    .filter((row) => row.groups !== null)
    .map((row) => ({ ...(row.groups as Group), role: row.role as GroupRole }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

/** All groups, newest first, with live member counts. `search` filters by name or course code. */
export async function listGroups(search = ''): Promise<GroupWithCount[]> {
  let query = supabase
    .from('groups')
    .select('*, group_members(count)')
    .order('created_at', { ascending: false })

  const s = search.replace(/[%(),]/g, ' ').trim()
  if (s) {
    query = query.or(`name.ilike.%${s}%,course_code.ilike.%${s}%`)
  }

  const { data, error } = await query
  if (error) throw error

  const rows = data as unknown as Array<Group & { group_members?: Array<{ count: number }> }>
  return rows.map((g) => ({ ...g, member_count: g.group_members?.[0]?.count ?? 0 }))
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

/** Creates a group; the DB trigger adds the creator as its owner member. */
export async function createGroup(userId: string, input: GroupInput): Promise<Group> {
  // Retry on the (rare) join_code unique violation.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await supabase
      .from('groups')
      .insert({ ...input, owner_id: userId, join_code: generateJoinCode() })
      .select()
      .single()
    if (!error) return data as Group
    if (error.code !== '23505') throw error
  }
  throw new Error('Could not generate a unique invite code. Please try again.')
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

export async function findGroupByCode(code: string): Promise<Group | null> {
  const { data, error } = await supabase
    .from('groups')
    .select('*')
    .eq('join_code', normalizeJoinCode(code))
    .maybeSingle()
  if (error) throw error
  return data
}

/** Joins a group after checking capacity. RLS enforces self-join as 'member'. */
export async function joinGroup(userId: string, group: Group): Promise<void> {
  const { count, error: countError } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', group.id)
  if (countError) throw countError
  if ((count ?? 0) >= group.max_members) throw new GroupFullError()

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'member' })
  if (error) {
    if (error.code === '23505') throw new AlreadyMemberError()
    throw error
  }
}
