import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { listGroups, listMyGroups } from '../services/groups'
import type { GroupRole, GroupWithCount } from '../lib/database.types'
import { GroupCard } from '../components/groups/GroupCard'
import { GroupFormModal } from '../components/groups/GroupFormModal'
import { JoinGroupModal } from '../components/groups/JoinGroupModal'
import { Button } from '../components/ui/Button'
import { ErrorBanner, EmptyState, SkeletonList } from '../components/ui/Feedback'
import { PlusIcon, SearchIcon, TicketIcon, UsersIcon } from '../components/icons'

export default function GroupsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [groups, setGroups] = useState<GroupWithCount[] | null>(null)
  const [myRoles, setMyRoles] = useState<Record<string, GroupRole>>({})
  const [error, setError] = useState<string | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    let cancelled = false
    setError(null)
    const timer = setTimeout(
      () => {
        Promise.all([listGroups(query), user ? listMyGroups(user.id) : Promise.resolve([])])
          .then(([all, mine]) => {
            if (cancelled) return
            setGroups(all)
            setMyRoles(Object.fromEntries(mine.map((g) => [g.id, g.role])))
          })
          .catch((err) => {
            if (!cancelled)
              setError(
                err instanceof Error ? err.message : 'Failed to load groups.',
              )
          })
      },
      query ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, user, reloadKey])

  const hasQuery = query.trim().length > 0

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Study groups</h1>
          <p className="mt-1 text-sm text-slate-500">
            Browse groups by course, or join one with an invite code.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setShowJoin(true)}>
            <TicketIcon size={16} />
            Join with code
          </Button>
          <Button onClick={() => setShowCreate(true)}>
            <PlusIcon size={16} />
            Create group
          </Button>
        </div>
      </div>

      <div className="relative mt-5 max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search groups by name or course code"
          placeholder="Search by name or course code…"
          className="h-11 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus-visible:border-brand-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
        />
      </div>

      <div className="mt-6">
        {error ? (
          <ErrorBanner
            message={error}
            onRetry={() => {
              setGroups(null)
              setReloadKey((k) => k + 1)
            }}
          />
        ) : groups === null ? (
          <SkeletonList rows={6} />
        ) : groups.length === 0 ? (
          hasQuery ? (
            <EmptyState
              icon={<SearchIcon size={28} />}
              title="No groups match your search"
              description={`Nothing found for “${query.trim()}”. Try a different name or course code.`}
            />
          ) : (
            <EmptyState
              icon={<UsersIcon size={28} />}
              title="No study groups yet"
              description="Be the first — create a group for your course and share the invite code with classmates."
              action={<Button onClick={() => setShowCreate(true)}>Create the first group</Button>}
            />
          )
        ) : (
          <ul className="grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((group) => (
              <li key={group.id}>
                <GroupCard group={group} role={myRoles[group.id]} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <GroupFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSaved={(group) => navigate(`/groups/${group.id}`)}
      />
      <JoinGroupModal
        open={showJoin}
        onClose={() => setShowJoin(false)}
        onJoined={(group) => navigate(`/groups/${group.id}`)}
      />
    </div>
  )
}
