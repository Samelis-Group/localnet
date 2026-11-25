import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, FolderOpen,
  HardDrive, Radio, ShieldCheck, Users, Wifi, Zap,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { getPeerId } from '../../lib/transport'
import type { LibraryFile } from '../../lib/types'
import { usePeerStore } from '../../lib/presence'
import { useOnline } from '../../lib/hooks'
import { formatBytes, relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, Card, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core'
import { FileIcon } from '../../components/files/FileRow'
import { downloadFile } from '../../lib/transfer'

export default function Dashboard() {
  const navigate = useNavigate()
  const online = useOnline()
  const files = useAppStore((s) => s.files)
  const transfers = useAppStore((s) => s.transfers)
  const users = useAppStore((s) => s.users)
  const activities = useAppStore((s) => s.activities)
  const settings = useAppStore((s) => s.settings)
  const peers = usePeerStore((s) => s.peers)
  const networks = useAppStore((s) => s.networks)
  const activeNetworkId = useAppStore((s) => s.activeNetworkId)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const me = users.find((u) => u.id === currentUserId)
  const myName = settings.displayName || me?.name || 'Mon appareil'
  const myPeerId = getPeerId()

  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
    const active = transfers.filter((t) => t.status === 'active' || t.status === 'queued')
    const done = transfers.filter((t) => t.status === 'done')
    const downloads = files.reduce((sum, f) => sum + f.downloads, 0)
    return { totalBytes, active: active.length, done: done.length, downloads }
  }, [files, transfers])

  const recentFiles = useMemo(() => [...files].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [files])
  const ownerName = (f: LibraryFile) => {
    if (f.ownerId === currentUserId || f.ownerPeerId === myPeerId) return 'Toi'
    return f.ownerName || users.find((u) => u.id === f.ownerId)?.name || 'Appareil du réseau'
  }
  const actorName = (id: string) => {
    const u = users.find((x) => x.id === id)
    if (!u) return 'Appareil du réseau'
    if (u.id === currentUserId) return 'Toi'
    return u.name
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bonjour, {myName}</h1>
          <p className="page-sub">Voici l’état de votre réseau local, {settings.networkName}.</p>
        </div>
        <div className="page-actions">
          <Button variant="light" color="blue" onClick={() => navigate('/reseaux')}><Radio size={15} /> Voir les réseaux</Button>
          <Button color="primary.8" onClick={() => navigate('/transferts?add=1')}><ArrowUpFromLine size={15} /> Nouveau transfert</Button>
        </div>
      </div>

      <div className="grid stats">
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Ressources partagées</Text><ThemeIcon variant="light" color="blue"><FolderOpen size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{files.length}</Text><Text size="xs" c="dimmed">{formatBytes(stats.totalBytes)}</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Transferts actifs</Text><ThemeIcon variant="light"><ArrowLeftRight size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{stats.active}</Text><Text size="xs" c="dimmed">{stats.done} terminés</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Appareils connectés</Text><ThemeIcon variant="light" color="grape"><Users size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{peers.length + 1}</Text><Text size="xs" c="dimmed">locale + LAN</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Téléchargements</Text><ThemeIcon variant="light" color="yellow"><ArrowDownToLine size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{stats.downloads}</Text><Text size="xs" c="dimmed">depuis le début</Text></Card>
      </div>

      <div className="grid two">
        <div className="card glow">
          <div className="row between" style={{ marginBottom: 15 }}>
            <Text fw={700} mb="sm">État du réseau</Text>
            <Badge variant="light" color={online ? "teal" : "red"}>{online ? "Opérationnel" : "Mode hors ligne"}</Badge>
          </div>
          <div className="row" style={{ gap: 12, marginBottom: 18 }}>
            <div className="stat-icon" style={{ width: 44, height: 44 }}><Wifi size={21} /></div>
            <div className="grow">
              <div className="strong">{settings.networkName}</div>
              <div className="tiny muted">Code de connexion : <span className="mono">{networks.find((n) => n.id === activeNetworkId)?.code ?? 'LOCALNET'}</span></div>
            </div>
            <div className="avatar-stack">
              {users.slice(0, 3).map((u) => <Avatar key={u.id} name={u.name} color={u.color} size="xs" />)}
              <span className="avatar sm" style={{ background: 'var(--panel-3)', color: 'var(--muted)' }}>+{Math.max(0, users.length - 3)}</span>
            </div>
          </div>
          <div className="grid three" style={{ gap: 10 }}>
            <div className="card pad-sm"><div className="tiny faint">Découverte</div><div className="small strong">{settings.autoDiscover ? 'Activée' : 'Désactivée'}</div></div>
            <div className="card pad-sm"><div className="tiny faint">Chiffrement</div><div className="small strong">Actif</div></div>
            <div className="card pad-sm"><div className="tiny faint">Serveur LAN</div><div className="small strong">{settings.serverUrl ? 'Connecté' : 'Local'}</div></div>
          </div>
          <Button className="block" style={{ marginTop: 14 }} onClick={() => navigate('/reseaux')}>Gérer le réseau <Zap size={14} /></Button>
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <Text fw={700} mb="sm">Activité récente</Text>
            <span className="tiny faint">Temps réel</span>
          </div>
          {activities.slice(0, 5).map((a) => (
            <div className="activity-item" key={a.id}>
              <span className="activity-dot"><ActivityIcon size={14} /></span>
              <div className="grow">
                <div className="small">{a.label}</div>
                <div className="tiny faint">{relativeTime(a.createdAt)} · {actorName(a.actorId)}</div>
              </div>
            </div>
          ))}
          <Button variant="subtle" color="gray" className="block" style={{ marginTop: 8 }} onClick={() => navigate('/administration')}>Tout voir</Button>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <Text fw={700} mb="sm">Fichiers récents</Text>
            <button className="btn ghost sm" onClick={() => navigate('/bibliotheque')}>Voir tout</button>
          </div>
          {recentFiles.length === 0 ? <Stack align="center" py="xl" gap="xs"><ThemeIcon size={52} radius="xl" variant="light" color="gray"><FolderOpen size={22}/></ThemeIcon><Text fw={700}>Aucun fichier</Text><Text size="sm" c="dimmed" ta="center">Ajoutez vos premiers fichiers partagés.</Text></Stack> : recentFiles.map((file) => (
            <div className="row" key={file.id} style={{ padding: '10px 0', cursor: 'pointer' }} onClick={() => void downloadFile(file)}>
              <FileIcon file={file} />
              <div className="grow">
                <div className="small strong truncate">{file.name}</div>
                <div className="tiny faint">{ownerName(file)} · {relativeTime(file.createdAt)}</div>
              </div>
              <span className="tiny muted">{formatBytes(file.size)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <Text fw={700} mb="sm">Transferts en cours</Text>
            <Badge variant="light" color={stats.active ? "teal" : "gray"}>{stats.active}</Badge>
          </div>
          {transfers.filter((t) => t.status === 'active' || t.status === 'queued').slice(0, 4).map((t) => (
            <div key={t.id} style={{ padding: '10px 0' }}>
              <div className="row between small"><span className="truncate">{t.fileName}</span><span className="tiny muted">{Math.round(t.offset / Math.max(1, t.size) * 100)}%</span></div>
              <div style={{ marginTop: 7 }}><Progress radius="xl" color="primary.8" size="sm" value={t.offset / Math.max(1, t.size) * 100} /></div>
            </div>
          ))}
          {stats.active === 0 && (
            <Stack align="center" py="md" gap="xs"><ThemeIcon size={44} radius="xl" variant="light" color="gray"><HardDrive size={20}/></ThemeIcon><Text fw={700}>Aucun transfert actif</Text><Text size="sm" c="dimmed" ta="center">Les transferts en cours apparaîtront ici.</Text><Button size="xs" onClick={() => navigate("/transferts?add=1")}>Envoyer un fichier</Button></Stack>
          )}
          <div className="row" style={{ gap: 8, marginTop: 12 }}>
            <ShieldCheck size={15} style={{ color: 'var(--accent)' }} />
            <span className="tiny muted">Intégrité vérifiée par empreinte locale</span>
          </div>
        </div>
      </div>
    </div>
  )
}
