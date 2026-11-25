import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { ColorSchemeScript, MantineProvider } from '@mantine/core'
import '@mantine/core/styles.css'
import './styles/global.css'
import { App } from './app/router'
import { useAppStore } from './lib/store'
import { configurePresence } from './lib/presence'
import { autoDetectServer, getServerUrl, setServerUrl, startTransport, subscribeStatus, updateIdentity } from './lib/transport'
import { resumePendingTransfers } from './lib/transfer'
import { syncRemoteLibrary } from './lib/lan'
import theme from './theme'

function Root() {
  const settingsTheme = useAppStore((s) => s.settings.theme)
  return (
    <MantineProvider theme={theme} forceColorScheme={settingsTheme}>
      <App />
    </MantineProvider>
  )
}

async function start() {
  await useAppStore.getState().boot()
  let state = useAppStore.getState()
  document.documentElement.dataset.theme = state.settings.theme
  startTransport({
    serverUrl: state.settings.serverUrl,
    identity: { name: state.settings.displayName || state.users.find((u) => u.id === state.currentUserId)?.name || 'Utilisateur', color: '#01a275', device: 'Navigateur' },
  })
  configurePresence()
  subscribeStatus((s) => { if (s.connected) void syncRemoteLibrary().catch(() => {}) })
  useAppStore.subscribe((next, prev) => {
    const n = next.users.find((u) => u.id === next.currentUserId)
    const p = prev.users.find((u) => u.id === prev.currentUserId)
    const nameChanged = (next.settings.displayName || n?.name) !== (prev.settings.displayName || p?.name)
    if (n && (nameChanged || n.color !== p?.color || n.device !== p?.device)) {
      updateIdentity({ name: next.settings.displayName || n.name, color: n.color, device: n.device })
    }
  })
  void autoDetectServer(state.settings.serverUrl).then((detected) => {
    if (!detected) return
    const current = useAppStore.getState().settings.serverUrl
    if (current !== detected) useAppStore.getState().setSettings({ serverUrl: detected })
    if (getServerUrl() !== detected) setServerUrl(detected)
    void syncRemoteLibrary().catch(() => {})
  })
  resumePendingTransfers()
  registerSW({ immediate: true })

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ColorSchemeScript defaultColorScheme={state.settings.theme} />
      <Root />
    </StrictMode>,
  )
}

void start()
