import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Center, Loader, Stack, Text } from '@mantine/core'
import { AppLayout } from '../components/layout/AppLayout'
import { Toaster } from '../components/ui'
import { ErrorBoundary } from './ErrorBoundary'

const Dashboard = lazy(() => import('../features/dashboard/Dashboard'))
const Networks = lazy(() => import('../features/networks/Networks'))
const Transfers = lazy(() => import('../features/transfers/Transfers'))
const Library = lazy(() => import('../features/library/Library'))
const Members = lazy(() => import('../features/members/Members'))
const Messages = lazy(() => import('../features/messages/Messages'))
const Admin = lazy(() => import('../features/admin/Admin'))
const SettingsPage = lazy(() => import('../features/settings/Settings'))
const SharePage = lazy(() => import('../features/share/SharePage'))

function PageFallback() {
  return (
    <Center py={80}>
      <Stack align="center" gap="sm">
        <Loader color="primary.8" />
        <Text c="dimmed" size="sm">Chargement…</Text>
      </Stack>
    </Center>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/bibliotheque" replace />} />
              <Route path="reseaux" element={<Networks />} />
              <Route path="appareils" element={<Networks />} />
              <Route path="transferts" element={<Transfers />} />
              <Route path="bibliotheque" element={<Library />} />
              <Route path="membres" element={<Members />} />
              <Route path="messages" element={<Messages />} />
              <Route path="administration" element={<Admin />} />
              <Route path="parametres" element={<SettingsPage />} />
              <Route path="tableau-de-bord" element={<Dashboard />} />
            </Route>
            <Route path="partage/:id" element={<SharePage />} />
            <Route path="*" element={<Navigate to="/bibliotheque" replace />} />
          </Routes>
        </Suspense>
        <Toaster />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
