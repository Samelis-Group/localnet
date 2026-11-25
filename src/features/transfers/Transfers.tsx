import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ActionIcon, Badge, Button, Card, Group, Modal, Progress, Stack, Text, ThemeIcon } from '@mantine/core'
import {
  ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Clock, FileArchive, FolderUp,
  Pause, Play, Plus, RefreshCw, Trash2, UploadCloud, X,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { cancelTransfer, downloadFile, ingestFiles, pauseTransfer, resumeTransfer } from '../../lib/transfer'
import { getServerUrl, isConnected, subscribeStatus } from '../../lib/transport'
import { formatBytes, formatSpeed, formatTime, relativeTime } from '../../lib/format'
import { toast } from '../../lib/toast'
import type { Transfer, TransferStatus } from '../../lib/types'

const filters: { id: TransferStatus | 'all'; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'active', label: 'En cours' },
  { id: 'queued', label: 'En attente' },
  { id: 'paused', label: 'En pause' },
  { id: 'done', label: 'Terminés' },
]

const statusTone: Record<TransferStatus, string> = {
  queued: '', active: 'accent', paused: 'warn', done: 'blue', error: 'danger', cancelled: '',
}
const statusLabel: Record<TransferStatus, string> = {
  queued: 'En attente', active: 'En cours', paused: 'En pause', done: 'Terminé', error: 'Erreur', cancelled: 'Annulé',
}

export default function Transfers() {
  const [params, setParams] = useSearchParams()
  const transfers = useAppStore((s) => s.transfers)
  const files = useAppStore((s) => s.files)
  const clearHistory = useAppStore((s) => s.clearHistory)
  const chunkSize = useAppStore((s) => s.settings.chunkSize)
  const peers = usePeerStore((s) => s.peers)
  const [filter, setFilter] = useState<TransferStatus | 'all'>('all')
  const [dragOver, setDragOver] = useState(false)
  const [folder, setFolder] = useState('Racine')
  const [busy, setBusy] = useState(false)
  const [lan, setLan] = useState({ connected: isConnected(), url: getServerUrl() })
  useEffect(() => subscribeStatus(setLan), [])
  const serverUrl = lan.url
  const connected = lan.connected
  const inputRef = useRef<HTMLInputElement>(null)
  const folderRef = useRef<HTMLInputElement>(null)

  const addOpen = params.get('add') === '1'
  const closeAdd = () => { params.delete('add'); setParams(params, { replace: true }) }

  const visible = useMemo(() => {
    const list = filter === 'all' ? transfers : transfers.filter((t) => t.status === filter)
    return [...list].sort((a, b) => b.startedAt - a.startedAt)
  }, [transfers, filter])

  const stats = useMemo(() => ({
    active: transfers.filter((t) => t.status === 'active' || t.status === 'queued').length,
    done: transfers.filter((t) => t.status === 'done').length,
    volume: transfers.filter((t) => t.status === 'done').reduce((sum, t) => sum + t.size, 0),
    speed: transfers.filter((t) => t.status === 'active').reduce((sum, t) => sum + t.speed, 0),
  }), [transfers])

  const handleFiles = async (list: FileList | File[]) => {
    const selected = Array.from(list)
    if (!selected.length) return
    setBusy(true)
    try {
      await ingestFiles(selected, folder)
      toast.success(`${selected.length} fichier(s) ajouté(s) à la file d’attente`)
      closeAdd()
    } catch {
      toast.error('Impossible d’ajouter ces fichiers')
    } finally {
      setBusy(false)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    void handleFiles(event.dataTransfer.files)
  }

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void handleFiles(event.target.files)
    event.target.value = ''
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Transferts de fichiers</h1>
          <p className="page-sub">Envoi par blocs, reprise automatique et vérification d’intégrité — même hors ligne.</p>
        </div>
        <div className="page-actions">
          <Button variant="light" color="blue" onClick={() => folderRef.current?.click()}><FolderUp size={15} /> Partager un dossier</Button>
          <Button color="primary.8" onClick={() => setParams({ add: '1' })}><Plus size={15} /> Ajouter des fichiers</Button>
        </div>
      </div>

      <div className="grid stats">
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">En cours</Text><ThemeIcon variant="light"><ArrowUpFromLine size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{String(stats.active)}</Text><Text size="xs" c="dimmed">file active</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Terminés</Text><ThemeIcon variant="light" color="grape"><CheckCircle2 size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{String(stats.done)}</Text><Text size="xs" c="dimmed">cette session</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Volume échangé</Text><ThemeIcon variant="light" color="blue"><FileArchive size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{formatBytes(stats.volume)}</Text><Text size="xs" c="dimmed">données locales</Text></Card>
        <Card withBorder={false} className="glass-panel"><Group justify="space-between"><Text size="sm" c="dimmed">Débit instantané</Text><ThemeIcon variant="light" color="yellow"><RefreshCw size={17}/></ThemeIcon></Group><Text fw={800} size="xl">{formatSpeed(stats.speed)}</Text><Text size="xs" c="dimmed">tous appareils</Text></Card>
      </div>

      <div className="card">
        <Group gap="xs" mb="sm"><Text fw={700}>Zone de dépôt</Text><Text size="xs" c="dimmed">Glissez-déposez ou sélectionnez</Text></Group>
        <div className={`dropzone ${dragOver ? 'over' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
          <div className="dropzone-icon"><UploadCloud size={25} /></div>
          <div className="strong">Déposez vos fichiers ici</div>
          <div className="small muted" style={{ marginTop: 4 }}>{serverUrl ? (connected ? "Ils seront partagés avec les appareils connectés au serveur LAN." : "Serveur LAN configuré, en attente de connexion...") : "Mode local: configurez un serveur LAN dans Paramètres pour partager entre PC."}</div>
          <div className="row" style={{ justifyContent: 'center', gap: 8, marginTop: 14 }}>
            <Badge variant="light" color="teal">Blocs de {chunkSize} Mo</Badge>
            <Badge variant="light" color="blue">{serverUrl ? "Partage LAN" : "Local uniquement"}</Badge>
            <Badge variant="light" color="grape">SHA-256</Badge>
          </div>
        </div>
        <div className="row" style={{ marginTop: 12, gap: 10 }}>
          <span className="tiny faint">Dossier de destination :</span>
          <select className="select" style={{ width: 180 }} value={folder} onChange={(e) => setFolder(e.target.value)}>
            {['Racine', 'Documentation', 'Cours', 'Design', 'Médias', 'Outils', 'Réunions'].map((f) => <option key={f}>{f}</option>)}
          </select>
          <span className="tiny faint grow">{peers.length + 1} appareil(s) susceptible(s) de recevoir ces fichiers</span>
        </div>
      </div>

      <div className="card">
        <div className="row between wrap" style={{ marginBottom: 14, gap: 10 }}>
          <Group gap="xs"><Text fw={700}>Historique des échanges</Text><Text size="xs" c="dimmed">{visible.length}</Text></Group>
          <div className="row" style={{ gap: 8 }}>
            <div className="chip-row">{filters.map((f) => <button key={f.id} className={`chip ${filter === f.id ? 'active' : ''}`} onClick={() => setFilter(f.id)}>{f.label}</button>)}</div>
            <Button size="xs" variant="subtle" color="gray" onClick={() => { if (confirm('Effacer tout l’historique des transferts ?')) clearHistory() }}><Trash2 size={13} /> Effacer</Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <Stack align="center" py="xl" gap="xs"><ThemeIcon size={52} radius="xl" variant="light" color="gray"><Clock size={22}/></ThemeIcon><Text fw={700}>Aucun transfert</Text><Text size="sm" c="dimmed" ta="center">Les fichiers envoyés ou reçus apparaîtront ici avec leur progression.</Text></Stack>
        ) : visible.map((t) => <TransferItem key={t.id} transfer={t} fileExists={files.some((f) => f.id === t.fileId)} />)}
      </div>

      <input ref={inputRef} type="file" multiple hidden onChange={onInput} />
      <input
        ref={folderRef} type="file" multiple hidden onChange={onInput}
        {...({ webkitdirectory: '' } as Record<string, string>)}
      />

      {addOpen && (
        <Modal opened centered radius="lg" title="Ajouter des fichiers" onClose={closeAdd}>
          <div className={`dropzone ${dragOver ? 'over' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
            <div className="dropzone-icon"><UploadCloud size={25} /></div>
            <div className="strong">{busy ? 'Préparation en cours…' : 'Cliquez ou déposez vos fichiers'}</div>
            <div className="small muted">Plusieurs fichiers acceptés · taille illimitée</div>
          </div>
          <div className="modal-foot"><Button variant="subtle" color="gray" onClick={closeAdd}>Fermer</Button></div>
        </Modal>
      )}
    </div>
  )
}

function TransferItem({ transfer, fileExists }: { transfer: Transfer; fileExists: boolean }) {
  const file = useAppStore((s) => s.files.find((f) => f.id === transfer.fileId))
  const percent = Math.round((transfer.offset / Math.max(1, transfer.size)) * 100)
  const remaining = transfer.status === 'active' && transfer.speed > 0 ? (transfer.size - transfer.offset) / transfer.speed : 0
  const active = transfer.status === 'active' || transfer.status === 'queued'

  return (
    <div className="transfer-item">
      <div className="transfer-icon">{transfer.direction === 'upload' ? <ArrowUpFromLine size={17} /> : <ArrowDownToLine size={17} />}</div>
      <div className="grow">
        <div className="row between" style={{ gap: 8 }}>
          <div className="row" style={{ gap: 7, minWidth: 0 }}>
            <span className="small strong truncate">{transfer.fileName}</span>
            <Badge variant="light" color={statusTone[transfer.status] === "accent" ? "teal" : statusTone[transfer.status] === "blue" ? "blue" : statusTone[transfer.status] === "warn" ? "yellow" : statusTone[transfer.status] === "danger" ? "red" : statusTone[transfer.status] === "violet" ? "grape" : "gray"}>{statusLabel[transfer.status]}</Badge>
          </div>
          <span className="tiny faint" style={{ flex: 'none' }}>{percent}%</span>
        </div>
        <div style={{ margin: '7px 0 5px' }}><Progress radius="xl" color="primary.8" size="sm" value={percent} /></div>
        <div className="row between tiny faint">
          <span>{formatBytes(transfer.offset)} / {formatBytes(transfer.size)} · {transfer.peerName}</span>
          <span className="hidden-mobile">{active ? `${formatSpeed(transfer.speed)} · ${Math.ceil(remaining)} s restantes` : transfer.endedAt ? `Terminé à ${formatTime(transfer.endedAt)}` : relativeTime(transfer.startedAt)}</span>
        </div>
        {transfer.error && <div className="tiny" style={{ color: 'var(--danger)' }}>{transfer.error}</div>}
      </div>
      <div className="row" style={{ gap: 4 }}>
        {transfer.status === 'paused' && <Button size="xs" variant="light" color="blue" onClick={() => resumeTransfer(transfer.id)}><Play size={13} /> Reprendre</Button>}
        {active && <Button size="xs" onClick={() => pauseTransfer(transfer.id)}><Pause size={13} /> Suspendre</Button>}
        {transfer.status === 'done' && fileExists && <Button size="xs" onClick={() => void downloadFile(file!)}><ArrowDownToLine size={13} /> Télécharger</Button>}
        {(active || transfer.status === 'paused' || transfer.status === 'error') && (
          <ActionIcon variant="subtle" color="gray" size={36} radius="md" onClick={() => cancelTransfer(transfer.id)} aria-label="Annuler"><X size={15} /></ActionIcon>
        )}
      </div>
    </div>
  )
}
