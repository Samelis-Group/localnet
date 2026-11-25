import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { Avatar, Badge, Button, Card, Group, Progress, Stack, Text, ThemeIcon } from '@mantine/core'
import { useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, ArchiveRestore, Database, Download, HardDrive, History, Server,
  ShieldCheck, Trash2, Upload, Users, Wifi,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { storageInfo } from '../../lib/db'
import { formatBytes, relativeTime } from '../../lib/format'
import { toast } from '../../lib/toast'
import type { ActivityType, AppSnapshot } from '../../lib/types'

const activityTone: Record<ActivityType, string> = {
  upload: 'accent', download: 'blue', member: 'violet', network: '', message: '', admin: 'warn', security: 'danger',
}

export default function Admin() {
  const navigate = useNavigate()
  const users = useAppStore((s) => s.users)
  const files = useAppStore((s) => s.files)
  const transfers = useAppStore((s) => s.transfers)
  const activities = useAppStore((s) => s.activities)
  const settings = useAppStore((s) => s.settings)
  const networks = useAppStore((s) => s.networks)
  const exportData = useAppStore((s) => s.exportData)
  const importData = useAppStore((s) => s.importData)
  const resetDemo = useAppStore((s) => s.resetDemo)
  const peers = usePeerStore((s) => s.peers)
  const [storage, setStorage] = useState({ usage: 0, quota: 0 })
  const [filter, setFilter] = useState<ActivityType | 'all'>('all')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { void storageInfo().then(setStorage) }, [])

  const visible = useMemo(() => filter === 'all' ? activities : activities.filter((a) => a.type === filter), [activities, filter])
  const totalSize = files.reduce((sum, f) => sum + f.size, 0)
  const percent = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 2.4

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text()) as AppSnapshot
      if (!Array.isArray(data.files) || !Array.isArray(data.users)) throw new Error('format invalide')
      importData(data)
      toast.success('Sauvegarde restaurée')
    } catch {
      toast.error('Fichier de sauvegarde invalide')
    }
    event.target.value = ''
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Administration</h1>
          <p className="page-sub">Supervision, stockage, journal d’activité et sauvegardes du réseau.</p>
        </div>
        <div className="page-actions">
          <Button variant="light" color="blue" onClick={exportData}><Download size={15} /> Exporter</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Restaurer</Button>
        </div>
      </div>

      <div className="grid stats">
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Utilisateurs</Text><ThemeIcon variant="light"><Users size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{users.length}</Text><Text size="xs" c="dimmed">{networks.length} réseaux</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Données partagées</Text><ThemeIcon variant="light" color="blue"><HardDrive size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{formatBytes(totalSize)}</Text><Text size="xs" c="dimmed">{files.length} fichiers</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Appareils en ligne</Text><ThemeIcon variant="light" color="grape"><Server size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{peers.length + 1}</Text><Text size="xs" c="dimmed">détection locale</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Événements journalisés</Text><ThemeIcon variant="light" color="yellow"><ActivityIcon size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{activities.length}</Text><Text size="xs" c="dimmed">opérations sensibles</Text></Card>
      </div>

      <div className="grid two">
        <div className="card">
          <Text fw={700} mb="sm">Stockage du serveur local</Text>
          <div className="row between" style={{ marginBottom: 8 }}><span className="small strong">{formatBytes(storage.usage)} utilisés</span><span className="tiny faint">{storage.quota ? `${formatBytes(storage.quota)} disponibles` : 'quota navigateur'}</span></div>
          <Progress radius="xl" color="primary.8" value={percent} />
          <div className="grid three" style={{ gap: 9, marginTop: 16 }}>
            <div className="card pad-sm"><div className="tiny faint">Fichiers</div><div className="small strong">{files.length}</div></div>
            <div className="card pad-sm"><div className="tiny faint">Transferts</div><div className="small strong">{transfers.length}</div></div>
            <div className="card pad-sm"><div className="tiny faint">Empreintes</div><div className="small strong">{files.filter((f) => f.hash).length}</div></div>
          </div>
        </div>

        <div className="card">
          <Text fw={700} mb="sm">Services du réseau</Text>
          {[
            { icon: Wifi, label: 'Interface web', detail: settings.serverUrl || 'serveur local', ok: true },
            { icon: ShieldCheck, label: 'Authentification & permissions', detail: 'contrôle par rôle', ok: true },
            { icon: Database, label: 'Persistance IndexedDB', detail: 'données hors ligne', ok: true },
            { icon: Server, label: 'Relais WebSocket LAN', detail: settings.serverUrl ? 'connecté' : 'non configuré', ok: Boolean(settings.serverUrl) },
          ].map((s) => (
            <div className="row" key={s.label} style={{ gap: 10, padding: '10px 0' }}>
              <s.icon size={16} color="var(--accent)" />
              <div className="grow"><div className="small strong">{s.label}</div><div className="tiny faint">{s.detail}</div></div>
              <Badge variant="light" color={s.ok ? "teal" : "yellow"}>{s.ok ? "Actif" : "Local"}</Badge>
            </div>
          ))}
          <Button variant="subtle" color="gray" className="block" style={{ marginTop: 12 }} onClick={() => navigate('/parametres')}>Configurer le serveur</Button>
        </div>
      </div>

      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 12, gap: 10 }}>
          <Text fw={700} mb="sm">Journal d’activité <small>{visible.length}</small></Text>
          <div className="chip-row">
            {(['all', 'upload', 'download', 'member', 'network', 'message', 'admin', 'security'] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'Tout' : f}</button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? <Stack align="center" py="xl" gap="xs"><ThemeIcon size={52} radius="xl" variant="light" color="gray"><History size={22}/></ThemeIcon><Text fw={700}>Aucun événement</Text><Text size="sm" c="dimmed" ta="center">Les opérations sensibles seront journalisées ici.</Text></Stack> : visible.slice(0, 40).map((a) => {
          const actor = users.find((u) => u.id === a.actorId)
          return (
            <div className="activity-item" key={a.id}>
              <span className="activity-dot"><ActivityIcon size={14} /></span>
              <div className="grow"><div className="small">{a.label}</div><div className="tiny faint">{relativeTime(a.createdAt)} · {actor?.name ?? 'Système'}</div></div>
              <Badge variant="light" color={activityTone[a.type] === "accent" ? "teal" : activityTone[a.type] === "blue" ? "blue" : activityTone[a.type] === "warn" ? "yellow" : activityTone[a.type] === "danger" ? "red" : "gray"}>{a.type}</Badge>
            </div>
          )
        })}
      </div>

      <div className="grid two">
        <div className="card">
          <Text fw={700} mb="sm">Sauvegarde & restauration</Text>
          <div className="small muted" style={{ marginBottom: 14 }}>Exportez les métadonnées, utilisateurs et configuration au format JSON. Les fichiers binaires restent sur l’appareil hôte.</div>
          <div className="row" style={{ gap: 8 }}>
            <Button color="primary.8" onClick={exportData}><ArchiveRestore size={15} /> Créer une sauvegarde</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Restaurer</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => void onImport(e)} />
        </div>
        <div className="card">
          <Text fw={700} mb="sm">Zone de maintenance</Text>
          <div className="small muted" style={{ marginBottom: 14 }}>Réinitialisez l’environnement de démonstration ou purgez l’historique sans supprimer les fichiers partagés.</div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="light" color="blue" onClick={() => { if (confirm('Réinitialiser toutes les données de démonstration ?')) { void resetDemo(); toast.success('Données réinitialisées') } }}>Réinitialiser la démo</Button>
            <Button variant="light" color="red" onClick={() => { if (confirm('Effacer l’activité récente et l’historique des transferts ?')) { useAppStore.getState().clearHistory(); toast.success('Historique effacé') } }}><Trash2 size={14} /> Effacer l’historique</Button>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14 }}><Avatar name="Alex Martin" color="#01a275" size="xs" /><span className="tiny faint">Sauvegarde locale active</span></div>
        </div>
      </div>
    </div>
  )
}
