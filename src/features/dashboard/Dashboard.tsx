import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, ArrowDownToLine, ArrowLeftRight, ArrowUpFromLine, FolderOpen,
  HardDrive, Radio, ShieldCheck, Users, Wifi, Zap,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { useOnline } from '../../lib/hooks'
import { formatBytes, relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, EmptyState, ProgressBar, SectionTitle, StatCard } from '../../components/ui'
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

  const stats = useMemo(() => {
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0)
    const active = transfers.filter((t) => t.status === 'active' || t.status === 'queued')
    const done = transfers.filter((t) => t.status === 'done')
    const downloads = files.reduce((sum, f) => sum + f.downloads, 0)
    return { totalBytes, active: active.length, done: done.length, downloads }
  }, [files, transfers])

  const recentFiles = useMemo(() => [...files].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4), [files])
  const ownerName = (id: string) => users.find((u) => u.id === id)?.name ?? 'Inconnu'

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Bonjour, Alex 👋</h1>
          <p className="page-sub">Voici l’état de votre réseau local, {settings.networkName}.</p>
        </div>
        <div className="page-actions">
          <Button variant="blue" onClick={() => navigate('/reseaux')}><Radio size={15} /> Voir les réseaux</Button>
          <Button variant="primary" onClick={() => navigate('/transferts?add=1')}><ArrowUpFromLine size={15} /> Nouveau transfert</Button>
        </div>
      </div>

      <div className="grid stats">
        <StatCard icon={<FolderOpen size={17} />} label="Ressources partagées" value={String(files.length)} hint={`${formatBytes(stats.totalBytes)}`} tone="blue" />
        <StatCard icon={<ArrowLeftRight size={17} />} label="Transferts actifs" value={String(stats.active)} hint={`${stats.done} terminés`} />
        <StatCard icon={<Users size={17} />} label="Appareils connectés" value={String(peers.length + 1)} hint="locale + LAN" tone="violet" />
        <StatCard icon={<ArrowDownToLine size={17} />} label="Téléchargements" value={String(stats.downloads)} hint="depuis le début" tone="warn" />
      </div>

      <div className="grid two">
        <div className="card glow">
          <div className="row between" style={{ marginBottom: 15 }}>
            <SectionTitle>État du réseau</SectionTitle>
            <Badge tone={online ? 'accent' : 'danger'}>{online ? 'Opérationnel' : 'Mode hors ligne'}</Badge>
          </div>
          <div className="row" style={{ gap: 12, marginBottom: 18 }}>
            <div className="stat-icon" style={{ width: 44, height: 44 }}><Wifi size={21} /></div>
            <div className="grow">
              <div className="strong">{settings.networkName}</div>
              <div className="tiny muted">Code de connexion : <span className="mono">{networks.find((n) => n.id === activeNetworkId)?.code ?? 'LOCALNET'}</span></div>
            </div>
            <div className="avatar-stack">
              {users.slice(0, 3).map((u) => <Avatar key={u.id} name={u.name} color={u.color} size="sm" />)}
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
            <SectionTitle>Activité récente</SectionTitle>
            <span className="tiny faint">Temps réel</span>
          </div>
          {activities.slice(0, 5).map((a) => (
            <div className="activity-item" key={a.id}>
              <span className="activity-dot"><ActivityIcon size={14} /></span>
              <div className="grow">
                <div className="small">{a.label}</div>
                <div className="tiny faint">{relativeTime(a.createdAt)} · {ownerName(a.actorId)}</div>
              </div>
            </div>
          ))}
          <Button variant="ghost" className="block" style={{ marginTop: 8 }} onClick={() => navigate('/administration')}>Tout voir</Button>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <SectionTitle>Fichiers récents</SectionTitle>
            <button className="btn ghost sm" onClick={() => navigate('/bibliotheque')}>Voir tout</button>
          </div>
          {recentFiles.length === 0 ? <EmptyState icon={<FolderOpen />} title="Aucun fichier" description="Ajoutez vos premiers fichiers partagés." /> : recentFiles.map((file) => (
            <div className="row" key={file.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => void downloadFile(file)}>
              <FileIcon file={file} />
              <div className="grow">
                <div className="small strong truncate">{file.name}</div>
                <div className="tiny faint">{ownerName(file.ownerId)} · {relativeTime(file.createdAt)}</div>
              </div>
              <span className="tiny muted">{formatBytes(file.size)}</span>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="row between" style={{ marginBottom: 12 }}>
            <SectionTitle>Transferts en cours</SectionTitle>
            <Badge tone={stats.active ? 'accent' : ''}>{stats.active}</Badge>
          </div>
          {transfers.filter((t) => t.status === 'active' || t.status === 'queued').slice(0, 4).map((t) => (
            <div key={t.id} style={{ padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <div className="row between small"><span className="truncate">{t.fileName}</span><span className="tiny muted">{Math.round(t.offset / Math.max(1, t.size) * 100)}%</span></div>
              <div style={{ marginTop: 7 }}><ProgressBar value={t.offset / Math.max(1, t.size) * 100} thin /></div>
            </div>
          ))}
          {stats.active === 0 && (
            <EmptyState icon={<HardDrive />} title="Aucun transfert actif" description="Les transferts en cours apparaîtront ici." action={<Button size="sm" onClick={() => navigate('/transferts?add=1')}>Envoyer un fichier</Button>} />
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
