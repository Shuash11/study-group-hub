import { Link } from 'react-router-dom'
import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import { UsersIcon } from '../icons'
import type { GroupRole, GroupWithCount } from '../../lib/database.types'

export function GroupCard({
  group,
  role,
}: {
  group: GroupWithCount
  role?: GroupRole
}) {
  const full = group.member_count >= group.max_members
  return (
    <Link
      to={`/groups/${group.id}`}
      className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
    >
      <Card className="h-full transition-shadow duration-150 hover:shadow-md motion-reduce:transition-none">
        <div className="flex items-start justify-between gap-2">
          <h3 className="leading-snug font-semibold text-slate-900">{group.name}</h3>
          {role === 'owner' && <Badge variant="brand">Owner</Badge>}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{group.course_code}</Badge>
          <span
            className={`inline-flex items-center gap-1 text-xs ${full ? 'font-medium text-amber-700' : 'text-slate-500'}`}
          >
            <UsersIcon size={14} />
            {group.member_count}/{group.max_members}
            {full && ' · full'}
          </span>
        </div>
        {group.description && (
          <p className="mt-3 line-clamp-2 text-sm text-slate-600">{group.description}</p>
        )}
      </Card>
    </Link>
  )
}
