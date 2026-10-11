import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './hooks/auth'
import { AppShell, RequireAuth } from './AppShell'
import { SignIn } from './pages/SignIn'
import { Join } from './pages/Join'
import { Onboarding } from './pages/Onboarding'
import { Today } from './pages/Today'
import { League } from './pages/League'
import { Trends } from './pages/Trends'
import { Me } from './pages/Me'
import { ProfileSettings } from './pages/ProfileSettings'
import { BlackoutSettings } from './pages/BlackoutSettings'
import { Devices } from './pages/Devices'
import { Groups } from './pages/Groups'
import { GroupManage } from './pages/GroupManage'
import { MemberPage } from './pages/MemberPage'
import { LogNight } from './pages/LogNight'
import { Appearance } from './pages/Appearance'
import { ImportHistory } from './pages/ImportHistory'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: true } },
})

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <HashRouter>
          <Routes>
            <Route path="/welcome" element={<SignIn />} />
            <Route path="/join" element={<Join />} />
            <Route path="/join/:code" element={<Join />} />
            <Route element={<RequireAuth />}>
              <Route path="/onboarding" element={<Onboarding />} />
              <Route element={<AppShell />}>
                <Route path="/today" element={<Today />} />
                <Route path="/league" element={<League />} />
                <Route path="/trends" element={<Trends />} />
                <Route path="/me" element={<Me />} />
                <Route path="/me/profile" element={<ProfileSettings />} />
                <Route path="/me/blackout" element={<BlackoutSettings />} />
                <Route path="/me/appearance" element={<Appearance />} />
                <Route path="/me/devices" element={<Devices />} />
                <Route path="/me/devices/import" element={<ImportHistory />} />
                <Route path="/me/groups" element={<Groups />} />
                <Route path="/me/groups/:id" element={<GroupManage />} />
                <Route path="/me/groups/:id/members/:userId" element={<MemberPage />} />
                <Route path="/log" element={<LogNight />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/today" replace />} />
          </Routes>
        </HashRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}
