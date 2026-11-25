import { useEffect, useState, type FormEvent } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ActionIcon, AppShell, Badge, Box, Burger, Button, Group, ScrollArea, Stack, Text, TextInput, Tooltip, UnstyledButton } from '@mantine/core'
import {
  IconAdjustments, IconArrowLeftRight, IconChevronRight, IconDevices, IconFolderOpen, IconLayoutDashboard, IconLogout, IconMessageCircle,
  IconMoon, IconSearch, IconSettings, IconShieldCheck, IconSun, IconUpload, IconUsers, IconWifi, IconWifiOff,
} from '@tabler/icons-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { useOnline } from '../../lib/hooks'
import { subscribeStatus } from '../../lib/transport'

const simpleNav = [
  { to: '/bibliotheque', label: 'Partage', icon: IconFolderOpen },
]

const advancedNav = [
  { to: '/bibliotheque', label: 'Fichiers', icon: IconFolderOpen },
  { to: '/reseaux', label: 'Appareils', icon: IconDevices },
  { to: '/transferts', label: 'Transferts', icon: IconArrowLeftRight },
  { to: '/membres', label: 'Membres', icon: IconUsers },
  { to: '/messages', label: 'Messagerie', icon: IconMessageCircle },
  { to: '/administration', label: 'Administration', icon: IconShieldCheck },
  { to: '/parametres', label: 'Paramètres', icon: IconSettings },
  { to: '/tableau-de-bord', label: 'Tableau de bord', icon: IconLayoutDashboard },
]

const titles: Record<string, string> = {
  '/': 'Tableau de bord', '/reseaux': 'Appareils', '/transferts': 'Transferts', '/bibliotheque': 'Fichiers partagés',
  '/membres': 'Membres', '/messages': 'Messagerie locale', '/administration': 'Administration', '/parametres': 'Paramètres',
}

function NavItem({ to, label, icon: Icon, end, onClick }: { to: string; label: string; icon: typeof IconLayoutDashboard; end?: boolean; onClick?: () => void }) {
  return (
    <NavLink to={to} end={end} onClick={onClick} style={{ textDecoration: 'none' }}>
      {({ isActive }) => (
        <UnstyledButton
          style={{
            display: 'flex', alignItems: 'center', gap: 11, width: '100%', padding: '10px 12px', borderRadius: 11,
            color: isActive ? 'var(--samelis-bright)' : 'var(--muted)',
            background: isActive ? 'rgba(1,162,117,0.14)' : 'transparent',
            fontWeight: 600, fontSize: 13,
          }}
        >
          <Icon size={17} />
          <span style={{ flex: 1 }}>{label}</span>
          {isActive && <Box style={{ width: 5, height: 5, borderRadius: 5, background: 'var(--samelis-bright)' }} />}
        </UnstyledButton>
      )}
    </NavLink>
  )
}

export function AppLayout() {
  const [opened, setOpened] = useState(false)
  const [query, setQuery] = useState('')
  const location = useLocation()
  const navigate = useNavigate()
  const online = useOnline()
  const peers = usePeerStore((s) => s.peers)
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const users = useAppStore((s) => s.users)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const me = users.find((u) => u.id === currentUserId)
  const [lan, setLan] = useState({ connected: false, url: settings.serverUrl, status: 'disconnected' as 'disconnected' | 'probing' | 'connected' | 'error' })
  useEffect(() => subscribeStatus(setLan), [])

  const title = titles[location.pathname] ?? 'LocalNet'
  const advanced = settings.advancedMode
  const nav = advanced ? advancedNav : simpleNav

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark'
    setSettings({ theme: next })
    document.documentElement.dataset.theme = next
  }

  const submitSearch = (event: FormEvent) => {
    event.preventDefault()
    navigate(query.trim() ? `/bibliotheque?q=${encodeURIComponent(query.trim())}` : '/bibliotheque')
  }

  const isDark = settings.theme === 'dark'
  return (
    <AppShell
      header={{ height: 68 }}
      navbar={{ width: 260, breakpoint: 'md', collapsed: { mobile: !opened } }}
      padding={0}
      styles={{
        header: { background: isDark ? 'rgba(6,11,20,0.82)' : 'rgba(255,255,255,0.82)', backdropFilter: 'blur(16px)', borderBottom: 0 },
        navbar: { background: isDark ? 'linear-gradient(180deg, rgba(10,20,34,0.96), rgba(6,11,20,0.98))' : 'linear-gradient(180deg, rgba(255,255,255,0.96), rgba(244,247,251,0.98))', borderRight: 0 },
        main: { background: 'transparent' },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px={{ base: 'sm', sm: 'lg' }} gap="sm" wrap="nowrap">
          <Burger opened={opened} onClick={() => setOpened((v) => !v)} hiddenFrom="md" size="sm" />
          <Box style={{ minWidth: 0, flex: 1 }}>
            <Text fw={700} size="sm" lh={1.2} truncate>{title}</Text>
            <Text size="xs" c="dimmed" visibleFrom="sm">Votre réseau. Vos fichiers. Votre communauté.</Text>
          </Box>
          {advanced && (
            <form onSubmit={submitSearch} style={{ width: 'min(330px, 34vw)' }} className="hidden-mobile">
              <TextInput
                value={query} onChange={(e) => setQuery(e.currentTarget.value)} placeholder="Rechercher un fichier…"
                leftSection={<IconSearch size={15} />} radius="md"
              />
            </form>
          )}

          <Badge color={lan.connected ? 'primary' : lan.status === 'probing' ? 'blue' : 'yellow'} variant="light" visibleFrom="sm">
            {lan.connected ? 'Connecté' : lan.status === 'probing' ? 'Connexion…' : 'Non connecté'}
          </Badge>
          <Badge color={lan.connected ? 'primary' : lan.status === 'probing' ? 'blue' : 'yellow'} variant="light" hiddenFrom="sm">
            {lan.connected ? 'OK' : lan.status === 'probing' ? '…' : 'Off'}
          </Badge>
          {advanced && <Badge color="gray" variant="light" visibleFrom="sm">{peers.length + 1} appareil(s)</Badge>}
          {!online && <Badge color="red" variant="light" leftSection={<IconWifiOff size={12} />}>Hors ligne</Badge>}

          <Tooltip label="Changer de thème">
            <ActionIcon variant="default" size="lg" radius="md" onClick={toggleTheme} aria-label="Changer de thème">
              {settings.theme === 'dark' ? <IconSun size={17} /> : <IconMoon size={17} />}
            </ActionIcon>
          </Tooltip>

          {advanced && (
            <Tooltip label="Mode simple">
              <ActionIcon variant="filled" color="primary" size="lg" radius="md" onClick={() => setSettings({ advancedMode: false })} aria-label="Mode simple" visibleFrom="sm">
                <IconAdjustments size={17} />
              </ActionIcon>
            </Tooltip>
          )}

          <Button variant="gradient" gradient={{ from: '#2ed3a0', to: '#01a275', deg: 100 }} leftSection={<IconUpload size={15} />} onClick={() => navigate('/bibliotheque?add=1')} visibleFrom="sm">
            Ajouter
          </Button>
          <ActionIcon variant="gradient" gradient={{ from: '#2ed3a0', to: '#01a275', deg: 100 }} size="lg" radius="md" onClick={() => navigate('/bibliotheque?add=1')} hiddenFrom="sm" aria-label="Ajouter">
            <IconUpload size={17} />
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Group gap={11} mb={22} px={4}>
          <div className="brand-mark">L</div>
          <div>
            <Text fw={800} size="lg" lh={1.1} style={{ letterSpacing: -0.4 }}>LocalNet</Text>
            <Text size="10px" c="dimmed" tt="uppercase" style={{ letterSpacing: 1.1 }}>Réseau local</Text>
          </div>
        </Group>

        <AppShell.Section grow component={ScrollArea}>
          {!advanced ? (
            <Box px={4}>
              <Text size="sm" fw={700} mb={4}>Partage simple</Text>
              <Text size="xs" c="dimmed" mb="md">Ajoute un fichier, clique sur la personne, c’est envoyé.</Text>
              <UnstyledButton onClick={() => setSettings({ advancedMode: true })} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px', borderRadius: 12, background: 'rgba(255,255,255,0.04)', color: 'var(--text)' }}>
                <IconAdjustments size={18} />
                <Box style={{ flex: 1 }}>
                  <Text size="sm" fw={700}>Mode avancé</Text>
                  <Text size="xs" c="dimmed">Voir tous les menus et réglages</Text>
                </Box>
                <IconChevronRight size={14} />
              </UnstyledButton>
            </Box>
          ) : (
            <>
              <Text size="10px" fw={700} c="dimmed" tt="uppercase" px={12} mb={6} style={{ letterSpacing: 1.4 }}>Tous les menus</Text>
              <Stack gap={2} mb="md">
                {nav.map((item) => <NavItem key={item.to} {...item} onClick={() => setOpened(false)} />)}
              </Stack>
              <UnstyledButton onClick={() => setSettings({ advancedMode: false })} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px', borderRadius: 11, color: 'var(--muted)' }}>
                <IconAdjustments size={17} /><span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Revenir au mode simple</span>
              </UnstyledButton>
            </>
          )}
        </AppShell.Section>

        <AppShell.Section>
          {advanced && (
            <Box className="glass-panel" p="sm" style={{ borderRadius: 14, marginBottom: 10 }}>
              <Group justify="space-between" mb={6}>
                <Group gap={7}><IconWifi size={13} color="var(--muted)" /><Text size="xs" fw={700} c="dimmed">Partage local</Text></Group>
                <Box className={`dot ${lan.connected ? '' : 'warn'}`} />
              </Group>
              <Text size="sm" fw={700} truncate>{lan.connected ? 'Connecté' : 'Non connecté'}</Text>
              <Text size="xs" c="dimmed">{peers.length + 1} appareil(s) en ligne</Text>
            </Box>
          )}

          <UnstyledButton component={NavLink} to="/parametres" onClick={() => setOpened(false)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 8px 2px', borderTop: 0 }}>
            <div className="avatar" style={{ background: me?.color ?? '#01a275' }}>{(settings.displayName || me?.name || 'U').split(/\s+/).slice(0,2).map(p=>p[0]).join('').toUpperCase()}</div>
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="sm" fw={700} truncate>{settings.displayName || me?.name}</Text>
              <Text size="xs" c="dimmed">{advanced ? 'Mode avancé' : 'Partage simple'}</Text>
            </Box>
            <IconLogout size={14} color="var(--muted)" />
          </UnstyledButton>
        </AppShell.Section>
      </AppShell.Navbar>

      <AppShell.Main>
        <main className="page"><Outlet /></main>
      </AppShell.Main>
    </AppShell>
  )
}
