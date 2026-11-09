import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listMyGroups } from '../services/groups'
import { listUpcomingForUser, type UpcomingSession } from '../services/sessions'
import type { GroupWithRole } from '../lib/database.types'
import { GroupFormModal } from '../components/groups/GroupFormModal'
import { JoinGroupModal } from '../components/groups/JoinGroupModal'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { ErrorBanner, EmptyState, SkeletonList } from '../components/ui/Feedback'
import {
  CalendarPlusIcon,
  ChevronRightIcon,
  MapPinIcon,
  PlusIcon,
  TicketIcon,
  UsersIcon,
} from '../components/icons'
import { formatDateTime, initials } from '../lib/format'

const RSVP_LABEL: Record<string, string> = {
  going: 'Going',
  maybe: 'Maybe',
  not_going: "Can't go",
}

export default function HomePage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()

  const [myGroups, setMyGroups] = useState<GroupWithRole[] | null>(null)
  const [upcoming, setUpcoming] = useState<UpcomingSession[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  const load = useCallback(() => {
    if (!user) return
    setError(null)
    Promise.all([listMyGroups(user.id), listUpcomingForUser(user.id)])
      .then(([groups, sessions]) => {
        setMyGroups(groups)
        setUpcoming(sessions)
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : 'Failed to load your dashboard.'),
      )
  }, [user])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  const loading = myGroups === null || upcoming === null
  const firstName = profile?.full_name?.trim().split(/\s+/)[0]

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            {firstName ? `Hi, ${firstName}` : 'Welcome'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Here's what's happening across your study groups.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
            <TicketIcon size={15} />
            Join with code
          </Button>
          <Button size="sm" onClick={() => setShowCreate(true)}>
            <PlusIcon size={15} />
            Create group
          </Button>
        </div>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorBanner message={error} onRetry={() => setReloadKey((k) => k + 1)} />
        </div>
      ) : loading ? (
        <div className="mt-6 space-y-6">
          <SkeletonList rows={2} />
          <SkeletonList rows={3} />
        </div>
      ) : (
        <div className="mt-6 grid items-start gap-6 lg:grid-cols-5">
          <Card className="lg:col-span-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-900">My groups</h2>
              <Link
                to="/groups"
                className="inline-flex items-center gap-0.5 rounded-md text-sm font-medium text-brand-700 hover:text-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                Browse all
                <ChevronRightIcon size={14} />
              </Link>
            </div>
            <div className="mt-4">
              {myGroups && myGroups.length > 0 ? (
                <ul className="-m-2 list-none p-0">
                  {myGroups.map((g) => (
                    <li key={g.id}>
                      <Link
                        to={`/groups/${g.id}`}
                        className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
                      >
                        <span
                          aria-hidden="true"
                          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-xs font-semibold text-brand-800"
                        >
                          {initials(g.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">
                            {g.name}
                          </span>
                          <span className="block text-xs text-slate-500">{g.course_code}</span>
                        </span>
                        {g.role === 'owner' ? (
                          <Badge variant="brand">Owner</Badge>
                        ) : (
                          <ChevronRightIcon size={16} className="shrink-0 text-slate-400" />
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<UsersIcon size={24} />}
                  title="You're not in any groups yet"
                  description="Create your own or join a classmate's group with an invite code."
                  action={
                    <div className="flex flex-wrap justify-center gap-2">
                      <Button size="sm" onClick={() => setShowCreate(true)}>
                        Create group
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setShowJoin(true)}>
                        Join with code
                      </Button>
                    </div>
                  }
                />
              )}
            </div>
          </Card>

          <Card className="lg:col-span-3">
            <h2 className="text-lg font-semibold text-slate-900">Upcoming sessions</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              The next study sessions across all your groups.
            </p>
            <div className="mt-4">
              {upcoming && upcoming.length > 0 ? (
                <ul className="list-none space-y-3 p-0">
                  {upcoming.map((s) => (
                    <li key={s.id}>
                      <Link
                        to={`/groups/${s.groups.id}`}
                        className="block rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-brand-300 hover:bg-brand-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-medium text-slate-900">{s.title}</h3>
                          <Badge variant="brand">{s.groups.course_code}</Badge>
                          {s.my_rsvp && (
                            <Badge variant={s.my_rsvp === 'going' ? 'success' : 'warning'}>
                              {RSVP_LABEL[s.my_rsvp]}
                            </Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatDateTime(s.starts_at)} · {s.groups.name}
                        </p>
                        {s.location && (
                          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-500">
                            <MapPinIcon size={14} className="shrink-0" />
                            {s.location}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyState
                  icon={<CalendarPlusIcon size={24} />}
                  title="No upcoming sessions"
                  description="Schedule a session from one of your group pages and it will show up here."
                />
              )}
            </div>
          </Card>
        </div>
      )}

      <GroupFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(group) => {
          setShowCreate(false)
          navigate(`/groups/${group.id}`)
        }}
      />
      <JoinGroupModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(groupId) => {
          setShowJoin(false)
          navigate(`/groups/${groupId}`)
        }}
      />
    </div>
  )
}
