import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import { AppLayout } from '@/components/app-layout'
import { LoginPage } from '@/pages/login'
import { useThemeStore } from '@/lib/store'
import { useEffect } from 'react'

import { DashboardPage } from '@/pages/dashboard'
import { PlaygroundPage } from '@/pages/playground'
import { MidjourneyPage } from '@/pages/midjourney'
import { SunoPage } from '@/pages/suno'
import ChannelsPage from '@/pages/channels'
import TokensPage from '@/pages/tokens'
import LogsPage from '@/pages/logs'
import UsersPage from '@/pages/users'
import SettingsPage from '@/pages/settings'

const queryClient = new QueryClient()

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = localStorage.getItem('token') !== null
  if (!isAuthenticated) return <Navigate to='/login' replace />
  return <>{children}</>
}

function AppRoutes() {
  const isAuthenticated = localStorage.getItem('token') !== null

  return (
    <Routes>
      <Route path='/login' element={isAuthenticated ? <Navigate to='/dashboard' replace /> : <LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path='/dashboard' element={<DashboardPage />} />
        <Route path='/playground' element={<PlaygroundPage />} />
        <Route path='/midjourney' element={<MidjourneyPage />} />
        <Route path='/suno' element={<SunoPage />} />
        <Route path='/channels' element={<ChannelsPage />} />
        <Route path='/tokens' element={<TokensPage />} />
        <Route path='/logs' element={<LogsPage />} />
        <Route path='/users' element={<UsersPage />} />
        <Route path='/settings' element={<SettingsPage />} />
        <Route path='/' element={<Navigate to='/dashboard' replace />} />
        <Route path='*' element={<Navigate to='/dashboard' replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  useEffect(() => {
    const root = document.documentElement
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const stored = localStorage.getItem('theme')
    const theme = stored === 'light' || stored === 'dark' ? stored : (mq.matches ? 'dark' : 'light')
    root.classList.toggle('dark', theme === 'dark')
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position='top-right' richColors closeButton />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
