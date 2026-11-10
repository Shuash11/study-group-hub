import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import { FullPageSpinner } from './components/ui/Feedback'
import { ReminderWatcher } from './components/reminders/ReminderWatcher'
import { Layout } from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import ProfilePage from './pages/ProfilePage'

/** Signed-out visitors land on the public group browse instead of a login wall. */
function HomeRoute() {
  const { session, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!session) return <Navigate to="/groups" replace />
  return <Layout><HomePage /></Layout>
}

/** Gates personal areas; group browsing stays public for signed-out visitors. */
function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageSpinner />
  if (!session)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Layout>{children}</Layout>
}

export default function App() {
  return (
    <>
      <ReminderWatcher />
      <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/" element={<HomeRoute />} />
      {/* Public: visitors can browse/search groups; personal data stays gated. */}
      <Route
        path="/groups"
        element={
          <Layout>
            <GroupsPage />
          </Layout>
        }
      />
      <Route
        path="/groups/:groupId"
        element={
          <Layout>
            <GroupDetailPage />
          </Layout>
        }
      />
      <Route
        path="/profile"
        element={
          <RequireAuth>
            <ProfilePage />
          </RequireAuth>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
