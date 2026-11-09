import { useAuth } from '../context/AuthContext'

export default function ProfilePage() {
  const { user, profile } = useAuth()
  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Profile</h1>
      <p className="mt-1 text-sm text-slate-500">Signed in as {user?.email}</p>
      <p className="text-sm text-slate-500">Name: {profile?.full_name}</p>
    </div>
  )
}
