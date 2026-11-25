import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ArrowDownToLine, Check, Copy, Globe, Lock, QrCode, Search, Send, Share2, Trash2, Upload, Users, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { useDebouncedValue } from '../../lib/hooks'
import { formatBytes, relativeTime } from '../../lib/format'
import { downloadFile, ingestFiles, removeFile } from '../../lib/transfer'
import { serverOriginForShare } from '../../lib/lan'
import { getServerUrl, isConnected, subscribeStatus } from '../../lib/transport'
import { FileIcon } from '../../components/files/FileRow'
import { Badge, Button, EmptyState, Modal } from '../../components/ui'
import { QRCode as QR } from '../../components/ui/QRCode'
import { toast } from '../../components/ui/toast'
import type { LibraryFile } from '../../lib/types'

type Target = { kind: 'public' } | { kind: 'peer'; id: string; name: string }

export default function Library() {
  const navigate = useNavigate()
  const localFiles = useAppStore((s) => s.files)
  const remoteFiles = useAppStore((s) => s.remoteFiles)
  const users = useAppStore((s) => s.users)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const settings = useAppStore((s) => s.settings)
  const peers = usePeerStore((s) => s.peers)
  const [lan, setLan] = useState({ connected: isConnected(), url: getServerUrl() })
  const [search, setSearch] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [share, setShare] = useState<LibraryFile | null>(null)
  useEffect(() => subscribeStatus(setLan), [])
  useEffect(() => { if (new URLSearchParams(location.search).get('add') === '1') setAddOpen(true) }, [])
  const deferred = useDebouncedValue(search, 120)

  const files = useMemo(() => {
    const peerId = sessionStorage.getItem('localnet:peer') || ''
    const map = new Map<string, LibraryFile>()
    for (const f of remoteFiles) map.set(f.id, { ...f, remote: true })
    for (const f of localFiles) if (!map.has(f.id)) map.set(f.id, f)
    return Array.from(map.values())
      .filter((f) => {
        if (f.visibility !== 'restricted') return true
        if (f.ownerId === currentUserId) return true
        if (f.ownerPeerId && f.ownerPeerId === peerId) return true
        return Array.isArray(f.allowedPeerIds) && !!peerId && f.allowedPeerIds.includes(peerId)
      })
      .sort((a, b) => b.createdAt - a.createdAt)
  }, [localFiles, remoteFiles, currentUserId])

  const visible = useMemo(() => {
    const q = deferred.trim().toLocaleLowerCase('fr')
    if (!q) return files
    return files.filter((f) => `${f.name} ${f.ownerName || ''}`.toLocaleLowerCase('fr').includes(q))
  }, [files, deferred])

  const ownerName = (f: LibraryFile) => f.ownerName || users.find((u) => u.id === f.ownerId)?.name || (f.remote ? 'Réseau' : 'Moi')
  const canDelete = (f: LibraryFile) => settings.advancedMode || f.ownerId === currentUserId || !f.remote

  return (
    <div className="stack">
      <div className="card" style={{ padding: 20 }}>
        <div className="row between" style={{ gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Partager un fichier</h1>
            <p className="page-sub" style={{ margin: 0 }}>{lan.connected ? `${peers.length + 1} appareil(s) connecté(s) sur le même Wi-Fi` : 'Connecte-toi au même Wi-Fi pour voir les autres appareils'}</p>
          </div>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {!settings.advancedMode && <Button variant="ghost" onClick={() => useAppStore.getState().setSettings({ advancedMode: true })}>Mode avancé</Button>}
            <Button variant="primary" onClick={() => setAddOpen(true)}><Upload size={15} /> Ajouter un fichier</Button>
          </div>
        </div>
      </div>

      {!lan.connected && (
        <div className="card" style={{ borderColor: 'rgba(255,178,77,.35)' }}>
          <div className="row between" style={{ gap: 12, flexWrap: 'wrap' }}>
            <div className="row" style={{ gap: 10 }}>
              <Wifi size={18} style={{ color: 'var(--warn)' }} />
              <div>
                <div className="small strong">Connexion nécessaire pour partager entre PC</div>
                <div className="tiny muted">Ouvre le même lien LocalNet sur l’autre appareil.</div>
              </div>
            </div>
            <Button size="sm" variant="blue" onClick={() => navigate('/parametres')}>Connecter</Button>
          </div>
        </div>
      )}

      {settings.advancedMode && (
        <div className="card">
          <div className="top-search" style={{ marginLeft: 0, width: '100%' }}>
            <Search size={15} />
            <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un fichier..." />
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="row between" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
          <div className="small strong">Fichiers {settings.advancedMode ? '' : 'récents'}</div>
          <Badge tone="blue">{visible.length}</Badge>
        </div>
        {visible.length === 0 ? (
          <EmptyState icon={<Upload />} title="Aucun fichier" description="Ajoute un fichier, puis clique sur la personne qui doit le recevoir." action={<Button variant="primary" onClick={() => setAddOpen(true)}><Upload size={14} /> Ajouter</Button>} />
        ) : (
          <div style={{ display: 'grid' }}>
            {visible.map((file) => {
              const isPublic = file.visibility !== 'restricted'
              return (
                <div key={file.id} className="file-row" style={{ gridTemplateColumns: 'auto 1fr auto', gap: 12, alignItems: 'center' }}>
                  <FileIcon file={file} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="strong small truncate">{file.name}</span>
                      <Badge tone={isPublic ? 'accent' : 'warn'}>{isPublic ? <><Globe size={11} /> Public</> : <><Lock size={11} /> Privé</>}</Badge>
                      {file.remote ? <Badge tone="blue">Stocké</Badge> : <Badge>Local</Badge>}
                      {!isPublic && file.ownerId === currentUserId && <Badge tone="violet">À toi</Badge>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>
                      {formatBytes(file.size)} · {ownerName(file)} · {relativeTime(file.createdAt)}
                      {!isPublic && file.allowedNames?.length ? ` · pour ${file.allowedNames.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="row" style={{ gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <Button size="sm" onClick={() => void downloadFile(file).then((ok) => toast[ok ? 'success' : 'error'](ok ? 'Téléchargement lancé' : 'Impossible'))}><ArrowDownToLine size={13} /></Button>
                    <Button size="sm" variant="blue" onClick={() => setShare(file)}><Share2 size={13} /></Button>
                    {canDelete(file) && <button className="icon-btn" style={{ border: 0, color: 'var(--danger)' }} onClick={() => { if (confirm('Supprimer ce fichier ?')) void removeFile(file).then(() => toast.success('Supprimé')) }}><Trash2 size={14} /></button>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {addOpen && <SendFlowModal peers={peers} onClose={() => setAddOpen(false)} lanConnected={lan.connected} />}
      {share && <ShareModal file={share} onClose={() => setShare(null)} />}
    </div>
  )
}

function SendFlowModal({ peers, onClose, lanConnected }: { peers: { id: string; name: string; device?: string }[]; onClose: () => void; lanConnected: boolean }) {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [sentTo, setSentTo] = useState<string>('')

  const pick = (next: File[]) => { if (next.length) { setFiles(next); setSentTo('') } }
  const onInput = (e: ChangeEvent<HTMLInputElement>) => { pick(Array.from(e.target.files ?? [])); e.target.value = '' }
  const onDrop = (e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); pick(Array.from(e.dataTransfer.files ?? [])) }

  const send = async (target: Target) => {
    if (!files.length || busy) {
      if (!files.length) toast.info('Choisis d’abord un fichier')
      return
    }
    setBusy(true)
    try {
      const visibility = target.kind === 'public' ? 'public' : 'restricted'
      const allowed = target.kind === 'peer' ? [{ id: target.id, name: target.name }] : []
      const label = target.kind === 'public' ? 'tout le monde' : target.name
      const sending = ingestFiles(files, 'Partages', { visibility, allowed })
      toast.info(`Envoi vers ${label}…`)
      await sending
      setSentTo(label)
      toast.success(`Envoyé à ${label}`)
      setTimeout(onClose, 350)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Envoi impossible') }
    finally { setBusy(false) }
  }

  return (
    <Modal title="Envoyer un fichier" onClose={onClose}>
      <div className={`dropzone ${dragOver ? 'over' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} style={{ marginBottom: 14 }}>
        <div className="dropzone-icon"><Upload size={24} /></div>
        <div className="strong">{files.length ? `${files.length} fichier(s) prêt(s)` : '1. Choisis un fichier'}</div>
        <div className="tiny muted" style={{ marginTop: 4 }}>{files.length ? files.map((f) => f.name).join(', ') : 'Clique ou glisse-dépose ici'}</div>
      </div>
      <input ref={inputRef} type="file" multiple hidden onChange={onInput} />

      <div className="small strong" style={{ marginBottom: 8 }}>2. Clique sur la personne qui doit recevoir</div>
      <div className="stack" style={{ gap: 8, marginBottom: 10 }}>
        <button className="card pad-sm row between" style={{ cursor: 'pointer', opacity: !files.length || busy ? 0.7 : 1 }} onClick={() => void send({ kind: 'public' })} disabled={busy}>
          <span className="row" style={{ gap: 10 }}><Globe size={16} style={{ color: 'var(--accent)' }} /><span><div className="small strong">Tout le monde</div><div className="tiny muted">Tous les appareils du réseau</div></span></span>
          {sentTo === 'tout le monde' ? <Check size={16} style={{ color: 'var(--accent)' }} /> : <Send size={15} style={{ color: 'var(--muted)' }} />}
        </button>
        {peers.map((p) => (
          <button key={p.id} className="card pad-sm row between" style={{ cursor: 'pointer', opacity: !files.length || busy ? 0.7 : 1 }} onClick={() => void send({ kind: 'peer', id: p.id, name: p.name })} disabled={busy}>
            <span className="row" style={{ gap: 10 }}><Users size={16} style={{ color: 'var(--accent-2)' }} /><span><div className="small strong">{p.name}</div><div className="tiny muted">{p.device || 'Appareil connecté'}</div></span></span>
            {sentTo === p.name ? <Check size={16} style={{ color: 'var(--accent)' }} /> : <Send size={15} style={{ color: 'var(--muted)' }} />}
          </button>
        ))}
        {peers.length === 0 && <div className="tiny muted">{lanConnected ? 'Aucun autre appareil connecté pour le moment.' : 'Connecte le partage LAN pour voir les autres appareils.'}</div>}
      </div>
      {busy && <div className="tiny muted">Envoi en cours…</div>}
    </Modal>
  )
}

function ShareModal({ file, onClose }: { file: LibraryFile; onClose: () => void }) {
  const link = `${serverOriginForShare()}/partage/${file.id}`
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success('Lien copié') } catch { toast.info(link) } }
  return (
    <Modal title="Partager" onClose={onClose}>
      <div className="row" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <QR value={link} />
        <div className="grow">
          <div className="small strong">{file.name}</div>
          <div className="tiny muted" style={{ marginBottom: 8 }}><QrCode size={12} style={{ verticalAlign: -2 }} /> Scanne ou copie le lien.</div>
          <div className="input mono tiny" style={{ wordBreak: 'break-all', minHeight: 42 }}>{link}</div>
          <Button variant="primary" className="block" style={{ marginTop: 10 }} onClick={() => void copy()}><Copy size={14} /> Copier</Button>
        </div>
      </div>
    </Modal>
  )
}
