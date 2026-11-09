import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './context/AuthContext'
import { FullPageSpinner } from './components/ui/Feedback'
import { Layout } from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import GroupsPage from './pages/GroupsPage'
import GroupDetailPage from './pages/GroupDetailPage'
import ProfilePage from './pages/ProfilePage'

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
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <HomePage />
          </RequireAuth>
        }
      />
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
  )
}
