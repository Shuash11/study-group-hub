import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  deleteGroup,
  getGroup,
  getInviteCode,
  getMembers,
  getMyMembership,
  leaveGroup,
} from '../services/groups'
import { listSessions } from '../services/sessions'
import { friendlyDbError } from '../lib/errors'
import type {
  Group,
  GroupRole,
  MemberWithProfile,
  SessionWithRsvp,
} from '../lib/database.types'
import { GroupFormModal } from '../components/groups/GroupFormModal'
import { JoinGroupModal } from '../components/groups/JoinGroupModal'
import { SessionCard } from '../components/sessions/SessionCard'
import { SessionFormModal } from '../components/sessions/SessionFormModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { ErrorBanner, EmptyState, SkeletonList } from '../components/ui/Feedback'
import {
  ArrowLeftIcon,
  CalendarPlusIcon,
  PencilIcon,
  TicketIcon,
  TrashIcon,
  UsersIcon,
} from '../components/icons'
import { formatDate, isUpcoming, initials } from '../lib/format'

export default function GroupDetailPage() {
  const { groupId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [group, setGroup] = useState<Group | null>(null)
  const [members, setMembers] = useState<MemberWithProfile[]>([])
  const [sessions, setSessions] = useState<SessionWithRsvp[]>([])
  const [myRole, setMyRole] = useState<GroupRole | null>(null)
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showLeave, setShowLeave] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [showSessionForm, setShowSessionForm] = useState(false)

  // Only the newest load() result is applied (no stale-response races, M4).
  const seqRef = useRef(0)
  const copyTimer = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!groupId) return
    const seq = ++seqRef.current
    setLoadError(null)
    try {
      const [g, m, role, groupSessions] = await Promise.all([
        getGroup(groupId),
        getMembers(groupId),
        user ? getMyMembership(groupId, user.id) : Promise.resolve(null),
        user ? listSessions(groupId, user.id) : Promise.resolve([]),
      ])
      if (seq !== seqRef.current) return
      setGroup(g)
      setMembers(m)
      setMyRole(role)
      setSessions(groupSessions)
    } catch (err) {
      if (seq === seqRef.current)
        setLoadError(err instanceof Error ? err.message : 'Failed to load this group.')
    } finally {
      if (seq === seqRef.current) setInitialLoading(false)
    }
  }, [groupId, user])

  useEffect(() => {
    load()
  }, [load])

  // The invite code is member-only data (RLS on group_invites).
  useEffect(() => {
    if (!groupId || !user || myRole === null) {
      setInviteCode(null)
      return
    }
    let cancelled = false
    getInviteCode(groupId)
      .then((code) => {
        if (!cancelled) setInviteCode(code)
      })
      .catch(() => {
        if (!cancelled) setInviteCode(null)
      })
    return () => {
      cancelled = true
    }
  }, [groupId, user, myRole])

  useEffect(() => {
    return () => {
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
    }
  }, [])

  async function copyCode() {
    if (!inviteCode) return
    try {
      await navigator.clipboard.writeText(inviteCode)
      setCopied(true)
      if (copyTimer.current !== null) clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard unavailable — the code is visible on screen anyway.
    }
  }

  const isOwner = myRole === 'owner'
  const isMember = myRole !== null

  if (initialLoading) {
    return <SkeletonList rows={4} />
  }

  if (loadError) {
    return (
      <div className="space-y-4">
        <BackLink />
        <ErrorBanner message={loadError} onRetry={load} />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-4">
        <BackLink />
        <EmptyState
          icon={<UsersIcon size={28} />}
          title="Group not found"
          description="This group may have been deleted."
          action={
            <Button variant="secondary" onClick={() => navigate('/groups')}>
              Back to groups
            </Button>
          }
        />
      </div>
    )
  }

  const owner = members.find((m) => m.role === 'owner')
  const full = group.member_count >= group.max_members
  const upcoming = sessions.filter((s) => isUpcoming(s.starts_at))
  const past = [...sessions.filter((s) => !isUpcoming(s.starts_at))].reverse()

  return (
    <div className="space-y-6">
      <BackLink />

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900 md:text-2xl">
                {group.name}
              </h1>
              <Badge variant="brand">{group.course_code}</Badge>
              {isOwner && <Badge variant="success">You own this group</Badge>}
            </div>
            {group.description && (
              <p className="mt-2 max-w-2xl text-sm text-slate-600">{group.description}</p>
            )}
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <UsersIcon size={14} />
                {group.member_count}/{group.max_members} members
                {full && !isMember && ' · full'}
              </span>
              <span>Created {formatDate(group.created_at)}</span>
              {isMember && owner?.profiles?.full_name && (
                <span>Owner: {owner.profiles.full_name}</span>
              )}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {isMember ? (
              <>
                {isOwner ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                      <PencilIcon size={15} />
                      Edit group
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                      <TrashIcon size={15} />
                      Delete
                    </Button>
                  </>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => setShowLeave(true)}>
                    Leave group
                  </Button>
                )}
                {inviteCode && (
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label={`Copy invite code ${inviteCode}`}
                    className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-lg border border-dashed border-brand-300 bg-brand-50 px-3 py-1.5 font-mono text-sm font-semibold tracking-[0.2em] text-brand-800 transition-colors hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
                  >
                    <TicketIcon size={15} className="tracking-normal" />
                    {inviteCode}
                    <span role="status" className="font-sans text-xs font-medium normal-case tracking-normal text-brand-700">
                      {copied ? 'Copied!' : 'Copy'}
                    </span>
                  </button>
                )}
              </>
            ) : (
              <Button
                onClick={() => (user ? setShowJoin(true) : navigate('/login'))}
                disabled={full}
              >
                {full ? 'Group is full' : 'Join group'}
              </Button>
            )}
          </div>
        </div>
        {actionError && (
          <div className="mt-4">
            <ErrorBanner message={actionError} />
          </div>
        )}
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Members</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {group.member_count} of {group.max_members} spots filled
          </p>
          <div className="mt-4">
            {members.length === 0 && !isMember ? (
              <EmptyState
                icon={<UsersIcon size={24} />}
                title="Members-only"
                description="Join this group to see who's in it."
              />
            ) : (
              <ul className="list-none space-y-3 p-0">
                {members.map((m) => (
                  <li key={m.user_id} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-semibold text-brand-800"
                    >
                      {initials(m.profiles?.full_name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {m.profiles?.full_name || 'Unnamed member'}
                        {m.user_id === user?.id && (
                          <span className="ml-1.5 text-xs font-normal text-slate-500">
                            (you)
                          </span>
                        )}
                      </span>
                      {m.profiles?.course && (
                        <span className="block truncate text-xs text-slate-500">
                          {m.profiles.course}
                        </span>
                      )}
                    </span>
                    {m.role === 'owner' && <Badge variant="brand">Owner</Badge>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Study sessions</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                {isMember
                  ? 'RSVP so your group knows who is coming.'
                  : 'Join this group to see and schedule sessions.'}
              </p>
            </div>
            {isMember && (
              <Button size="sm" onClick={() => setShowSessionForm(true)}>
                <CalendarPlusIcon size={15} />
                Schedule session
              </Button>
            )}
          </div>

          <div className="mt-4 space-y-3">
            {sessions.length === 0 ? (
              <EmptyState
                icon={<CalendarPlusIcon size={24} />}
                title={isMember ? 'No sessions scheduled yet' : 'Members-only area'}
                description={
                  isMember
                    ? 'Schedule the first session and invite your group.'
                    : 'Sessions are visible to group members only.'
                }
                action={
                  isMember ? (
                    <Button size="sm" onClick={() => setShowSessionForm(true)}>
                      Schedule the first session
                    </Button>
                  ) : undefined
                }
              />
            ) : (
              <>
                {upcoming.length > 0 && (
                  <ul className="list-none space-y-3 p-0">
                    {upcoming.map((s) => (
                      <SessionCard key={s.id} session={s} onChanged={load} />
                    ))}
                  </ul>
                )}
                {past.length > 0 && (
                  <>
                    <h3 className="pt-2 text-sm font-semibold text-slate-500">
                      Past sessions
                    </h3>
                    <ul className="list-none space-y-3 p-0">
                      {past.map((s) => (
                        <SessionCard key={s.id} session={s} onChanged={load} />
                      ))}
                    </ul>
                  </>
                )}
              </>
            )}
          </div>
        </Card>
      </div>

      <GroupFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        initial={group}
        currentMemberCount={group.member_count}
        onSaved={(updated) => setGroup(updated)}
      />
      <JoinGroupModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={() => load()}
      />
      <SessionFormModal
        open={showSessionForm}
        onClose={() => setShowSessionForm(false)}
        groupId={group.id}
        onCreated={load}
      />
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        title="Delete this group?"
        message={`“${group.name}” and its sessions will be permanently removed for all members. This cannot be undone.`}
        confirmLabel="Delete group"
        danger
        onConfirm={async () => {
          try {
            await deleteGroup(group.id)
            navigate('/groups', { replace: true })
          } catch (err) {
            setShowDelete(false)
            setActionError(friendlyDbError(err, 'Could not delete the group.'))
          }
        }}
      />
      <ConfirmDialog
        open={showLeave}
        onClose={() => setShowLeave(false)}
        title="Leave this group?"
        message="You'll stop seeing its sessions and will need a new invite to rejoin."
        confirmLabel="Leave group"
        danger
        onConfirm={async () => {
          if (!user) return
          try {
            await leaveGroup(group.id, user.id)
            navigate('/groups', { replace: true })
          } catch (err) {
            setShowLeave(false)
            setActionError(friendlyDbError(err, 'Could not leave the group.'))
          }
        }}
      />
    </div>
  )
}

function BackLink() {
  return (
    <Link
      to="/groups"
      className="inline-flex min-h-[40px] items-center gap-1.5 rounded-md px-1 text-sm font-medium text-slate-600 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
    >
      <ArrowLeftIcon size={16} />
      All groups
    </Link>
  )
}
