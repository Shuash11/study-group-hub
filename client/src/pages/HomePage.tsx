import { useAuth } from '../context/AuthContext'

export default function HomePage() {
  const { profile } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">
        {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Home'}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        Your groups and upcoming sessions will appear here.
      </p>
    </div>
  )
}
