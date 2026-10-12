import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@legity/data/auth'
import { GroupProvider } from '@legity/data/group'
import { useMyGroups, useProfile } from '@legity/data/queries'
import { TabBar } from './components/TabBar'
import { NoGroup } from './pages/NoGroup'
import { Spinner } from './components/ui'

/** Signed-in routes only. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  if (loading) return <div className="screen no-tabs"><Spinner /></div>
  if (!session) return <Navigate to="/welcome" replace />
  return (
    <GroupProvider>
      <Outlet />
    </GroupProvider>
  )
}

/** Main app: needs finished onboarding and at least one group. */
export function AppShell() {
  const profile = useProfile()
  const groups = useMyGroups()

  if (profile.isLoading || groups.isLoading) return <div className="screen no-tabs"><Spinner /></div>
  if (profile.error || !profile.data) {
    return (
      <div className="screen no-tabs">
        <p className="error">Couldn&apos;t load your profile. {profile.error?.message}</p>
      </div>
    )
  }
  if (!profile.data.onboarded_at) return <Navigate to="/onboarding" replace />
  if ((groups.data ?? []).length === 0) return <NoGroup />

  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
