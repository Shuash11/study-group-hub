import { useParams } from 'react-router-dom'

export default function GroupDetailPage() {
  const { groupId } = useParams()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Group</h1>
      <p className="mt-1 text-sm text-slate-500">Group ID: {groupId}</p>
    </div>
  )
}
