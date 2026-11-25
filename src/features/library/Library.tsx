import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { ActionIcon, Badge, Button, Group, Modal, Stack, Text, ThemeIcon } from '@mantine/core'
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
import { QRCode as QR } from '../../components/ui/QRCode'
import { toast } from '../../lib/toast'
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

  const myPeerId = sessionStorage.getItem('localnet:peer') || ''
  const ownerName = (f: LibraryFile) => {
    if (f.ownerId === currentUserId || (f.ownerPeerId && f.ownerPeerId === myPeerId)) return 'Toi'
    return f.ownerName || users.find((u) => u.id === f.ownerId)?.name || 'Appareil du réseau'
  }
  const canDelete = (f: LibraryFile) => settings.advancedMode || f.ownerId === currentUserId || !f.remote

  return (
    <div className="stack">
      <div className="card library-hero">
        <div className="library-hero-head">
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Partager un fichier</h1>
            <p className="page-sub" style={{ margin: 0 }}>{lan.connected ? `${peers.length + 1} appareil(s) connecté(s) sur le même Wi-Fi` : 'Connecte-toi au même Wi-Fi pour voir les autres appareils'}</p>
          </div>
          <Group gap="sm" wrap="wrap" className="library-hero-actions">
            {!settings.advancedMode && <Button variant="subtle" color="gray" onClick={() => useAppStore.getState().setSettings({ advancedMode: true })}>Mode avancé</Button>}
            <Button color="primary.8" leftSection={<Upload size={15} />} onClick={() => setAddOpen(true)}>Ajouter un fichier</Button>
          </Group>
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
            <Button size="xs" variant="light" color="blue" onClick={() => navigate('/parametres')}>Connecter</Button>
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
        <div className="row between" style={{ padding: '14px 16px', gap: 8 }}>
          <div className="small strong">Fichiers {settings.advancedMode ? '' : 'récents'}</div>
          <Badge variant="light" color="blue">{visible.length}</Badge>
        </div>
        {visible.length === 0 ? (
          <Stack align="center" py="xl" gap="xs">
            <ThemeIcon size={52} radius="xl" variant="light" color="gray"><Upload size={22} /></ThemeIcon>
            <Text fw={700}>Aucun fichier</Text>
            <Text size="xs" c="dimmed" ta="center">Ajoute un fichier, puis clique sur la personne qui doit le recevoir.</Text>
            <Button color="primary.8" leftSection={<Upload size={14} />} onClick={() => setAddOpen(true)}>Ajouter</Button>
          </Stack>
        ) : (
          <div style={{ display: 'grid' }}>
            {visible.map((file) => {
              const isPublic = file.visibility !== 'restricted'
              return (
                <div key={file.id} className="file-row library-row">
                  <FileIcon file={file} size={42} />
                  <div style={{ minWidth: 0 }}>
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <span className="strong small truncate">{file.name}</span>
                      <Badge variant="light" color={isPublic ? "teal" : "yellow"} leftSection={isPublic ? <Globe size={11} /> : <Lock size={11} />}>{isPublic ? "Public" : "Privé"}</Badge>
                      {file.remote ? <Badge variant="light" color="blue">Stocké</Badge> : <Badge variant="light" color="gray">Local</Badge>}
                      {(file.ownerId === currentUserId || (file.ownerPeerId && file.ownerPeerId === myPeerId)) && <Badge variant="light" color="grape">Envoyé par toi</Badge>}
                    </div>
                    <div className="tiny muted" style={{ marginTop: 3 }}>
                      {formatBytes(file.size)} · {ownerName(file)} · {relativeTime(file.createdAt)}
                      {!isPublic && file.allowedNames?.length ? ` · pour ${file.allowedNames.join(', ')}` : ''}
                    </div>
                  </div>
                  <div className="row library-actions">
                    <Button size="xs" variant="default" leftSection={<ArrowDownToLine size={13} />} onClick={() => void downloadFile(file).then((ok) => toast[ok ? 'success' : 'error'](ok ? 'Téléchargement lancé' : 'Impossible'))}>Télécharger</Button>
                    <Button size="xs" variant="light" color="blue" leftSection={<Share2 size={13} />} onClick={() => setShare(file)}>Partager</Button>
                    {canDelete(file) && <ActionIcon variant="light" color="red" size="lg" radius="md" className="library-delete-btn" onClick={() => { if (confirm('Supprimer ce fichier ?')) void removeFile(file).then(() => toast.success('Supprimé')) }} aria-label="Supprimer"><Trash2 size={16} /></ActionIcon>}
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
    <Modal opened onClose={onClose} title="Envoyer un fichier" centered radius="lg">
      <div className={`dropzone ${dragOver ? 'over' : ''}`} onClick={() => inputRef.current?.click()} onDragOver={(e) => { e.preventDefault(); setDragOver(true) }} onDragLeave={() => setDragOver(false)} onDrop={onDrop} style={{ marginBottom: 14 }}>
        <div className="dropzone-icon"><Upload size={24} /></div>
        <Text fw={700}>{files.length ? `${files.length} fichier(s) prêt(s)` : '1. Choisis un fichier'}</Text>
        <Text size="xs" c="dimmed" mt={4}>{files.length ? files.map((f) => f.name).join(', ') : 'Clique ou glisse-dépose ici'}</Text>
      </div>
      <input ref={inputRef} type="file" multiple hidden onChange={onInput} />

      <Text size="xs" fw={700} mb={8}>2. Clique sur la personne qui doit recevoir</Text>
      <Stack gap={8} mb={10}>
        <Button variant="default" justify="space-between" fullWidth h="auto" py="sm" disabled={!files.length || busy} onClick={() => void send({ kind: 'public' })} rightSection={sentTo === 'tout le monde' ? <Check size={16} color="var(--accent)" /> : <Send size={15} />}>
          <Group gap={10}><Globe size={16} color="var(--accent)" /><div style={{ textAlign: 'left' }}><Text size="xs" fw={700}>Tout le monde</Text><Text size="xs" c="dimmed">Tous les appareils du réseau</Text></div></Group>
        </Button>
        {peers.map((p) => (
          <Button key={p.id} variant="default" justify="space-between" fullWidth h="auto" py="sm" disabled={!files.length || busy} onClick={() => void send({ kind: 'peer', id: p.id, name: p.name })} rightSection={sentTo === p.name ? <Check size={16} color="var(--accent)" /> : <Send size={15} />}>
            <Group gap={10}><Users size={16} color="var(--accent-2)" /><div style={{ textAlign: 'left' }}><Text size="xs" fw={700}>{p.name}</Text><Text size="xs" c="dimmed">{p.device || 'Appareil connecté'}</Text></div></Group>
          </Button>
        ))}
        {peers.length === 0 && <Text size="xs" c="dimmed">{lanConnected ? 'Aucun autre appareil connecté pour le moment.' : 'Connecte le partage LAN pour voir les autres appareils.'}</Text>}
      </Stack>
      {busy && <Text size="xs" c="dimmed">Envoi en cours…</Text>}
    </Modal>
  )
}

function ShareModal({ file, onClose }: { file: LibraryFile; onClose: () => void }) {
  const link = `${serverOriginForShare()}/partage/${file.id}`
  const copy = async () => { try { await navigator.clipboard.writeText(link); toast.success('Lien copié') } catch { toast.info(link) } }
  return (
    <Modal opened onClose={onClose} title="Partager" centered radius="lg">
      <div className="row share-modal-grid" style={{ gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="share-modal-qr"><QR value={link} /></div>
        <div className="grow">
          <Text size="xs" fw={700}>{file.name}</Text>
          <Text size="xs" c="dimmed" mb={8}><QrCode size={12} style={{ verticalAlign: -2 }} /> Scanne ou copie le lien.</Text>
          <Text className="input mono tiny" style={{ wordBreak: 'break-all', minHeight: 42 }}>{link}</Text>
          <Button color="primary.8" fullWidth mt={10} leftSection={<Copy size={14} />} onClick={() => void copy()}>Copier</Button>
        </div>
      </div>
    </Modal>
  )
}
