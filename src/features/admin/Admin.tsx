import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity as ActivityIcon, ArchiveRestore, Database, Download, HardDrive, History, Server,
  ShieldCheck, Trash2, Upload, Users, Wifi,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { storageInfo } from '../../lib/db'
import { formatBytes, relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, EmptyState, ProgressBar, SectionTitle, StatCard } from '../../components/ui'
import { toast } from '../../components/ui/toast'
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
          <Button variant="blue" onClick={exportData}><Download size={15} /> Exporter</Button>
          <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Restaurer</Button>
        </div>
      </div>

      <div className="grid stats">
        <StatCard icon={<Users size={17} />} label="Utilisateurs" value={String(users.length)} hint={`${networks.length} réseaux`} />
        <StatCard icon={<HardDrive size={17} />} label="Données partagées" value={formatBytes(totalSize)} hint={`${files.length} fichiers`} tone="blue" />
        <StatCard icon={<Server size={17} />} label="Appareils en ligne" value={String(peers.length + 1)} hint="détection locale" tone="violet" />
        <StatCard icon={<ActivityIcon size={17} />} label="Événements journalisés" value={String(activities.length)} hint="opérations sensibles" tone="warn" />
      </div>

      <div className="grid two">
        <div className="card">
          <SectionTitle>Stockage du serveur local</SectionTitle>
          <div className="row between" style={{ marginBottom: 8 }}><span className="small strong">{formatBytes(storage.usage)} utilisés</span><span className="tiny faint">{storage.quota ? `${formatBytes(storage.quota)} disponibles` : 'quota navigateur'}</span></div>
          <ProgressBar value={percent} />
          <div className="grid three" style={{ gap: 9, marginTop: 16 }}>
            <div className="card pad-sm"><div className="tiny faint">Fichiers</div><div className="small strong">{files.length}</div></div>
            <div className="card pad-sm"><div className="tiny faint">Transferts</div><div className="small strong">{transfers.length}</div></div>
            <div className="card pad-sm"><div className="tiny faint">Empreintes</div><div className="small strong">{files.filter((f) => f.hash).length}</div></div>
          </div>
        </div>

        <div className="card">
          <SectionTitle>Services du réseau</SectionTitle>
          {[
            { icon: Wifi, label: 'Interface web', detail: settings.serverUrl || 'serveur local', ok: true },
            { icon: ShieldCheck, label: 'Authentification & permissions', detail: 'contrôle par rôle', ok: true },
            { icon: Database, label: 'Persistance IndexedDB', detail: 'données hors ligne', ok: true },
            { icon: Server, label: 'Relais WebSocket LAN', detail: settings.serverUrl ? 'connecté' : 'non configuré', ok: Boolean(settings.serverUrl) },
          ].map((s) => (
            <div className="row" key={s.label} style={{ gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
              <s.icon size={16} color="var(--accent)" />
              <div className="grow"><div className="small strong">{s.label}</div><div className="tiny faint">{s.detail}</div></div>
              <Badge tone={s.ok ? 'accent' : 'warn'}>{s.ok ? 'Actif' : 'Local'}</Badge>
            </div>
          ))}
          <Button variant="ghost" className="block" style={{ marginTop: 12 }} onClick={() => navigate('/parametres')}>Configurer le serveur</Button>
        </div>
      </div>

      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 12, gap: 10 }}>
          <SectionTitle>Journal d’activité <small>{visible.length}</small></SectionTitle>
          <div className="chip-row">
            {(['all', 'upload', 'download', 'member', 'network', 'message', 'admin', 'security'] as const).map((f) => (
              <button key={f} className={`chip ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>{f === 'all' ? 'Tout' : f}</button>
            ))}
          </div>
        </div>
        {visible.length === 0 ? <EmptyState icon={<History />} title="Aucun événement" description="Les opérations sensibles seront journalisées ici." /> : visible.slice(0, 40).map((a) => {
          const actor = users.find((u) => u.id === a.actorId)
          return (
            <div className="activity-item" key={a.id}>
              <span className="activity-dot"><ActivityIcon size={14} /></span>
              <div className="grow"><div className="small">{a.label}</div><div className="tiny faint">{relativeTime(a.createdAt)} · {actor?.name ?? 'Système'}</div></div>
              <Badge tone={activityTone[a.type]}>{a.type}</Badge>
            </div>
          )
        })}
      </div>

      <div className="grid two">
        <div className="card">
          <SectionTitle>Sauvegarde & restauration</SectionTitle>
          <div className="small muted" style={{ marginBottom: 14 }}>Exportez les métadonnées, utilisateurs et configuration au format JSON. Les fichiers binaires restent sur l’appareil hôte.</div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="primary" onClick={exportData}><ArchiveRestore size={15} /> Créer une sauvegarde</Button>
            <Button onClick={() => fileRef.current?.click()}><Upload size={15} /> Restaurer</Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => void onImport(e)} />
        </div>
        <div className="card">
          <SectionTitle>Zone de maintenance</SectionTitle>
          <div className="small muted" style={{ marginBottom: 14 }}>Réinitialisez l’environnement de démonstration ou purgez l’historique sans supprimer les fichiers partagés.</div>
          <div className="row" style={{ gap: 8 }}>
            <Button variant="blue" onClick={() => { if (confirm('Réinitialiser toutes les données de démonstration ?')) { void resetDemo(); toast.success('Données réinitialisées') } }}>Réinitialiser la démo</Button>
            <Button variant="danger" onClick={() => { if (confirm('Effacer l’historique des transferts et activités ?')) { useAppStore.getState().clearHistory(); toast.success('Historique effacé') } }}><Trash2 size={14} /> Purger l’historique</Button>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14 }}><Avatar name="Alex Martin" color="#01a275" size="sm" /><span className="tiny faint">Dernière sauvegarde automatique : session courante</span></div>
        </div>
      </div>
    </div>
  )
}
