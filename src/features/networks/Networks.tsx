import { useState } from 'react'
import { Copy, Laptop, QrCode, RefreshCw, Wifi } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, Modal, SectionTitle } from '../../components/ui'
import { QRCode as QR } from '../../components/ui/QRCode'
import { toast } from '../../components/ui/toast'
import { getServerUrl, isConnected, probeServer, setServerUrl } from '../../lib/transport'
import { syncRemoteLibrary } from '../../lib/lan'

export default function Networks() {
  const navigate = useNavigate()
  const peers = usePeerStore((s) => s.peers)
  const settings = useAppStore((s) => s.settings)
  const me = useAppStore((s) => s.users.find((u) => u.id === s.currentUserId))
  const serverUrl = getServerUrl() || settings.serverUrl
  const connected = isConnected()
  const [joinOpen, setJoinOpen] = useState(false)
  const [url, setUrl] = useState(serverUrl)
  const [busy, setBusy] = useState(false)
  const shareUrl = serverUrl || (typeof location !== 'undefined' ? location.origin : '')

  const connect = async () => {
    if (!url.trim()) return
    setBusy(true)
    try {
      await probeServer(url)
      useAppStore.getState().setSettings({ serverUrl: url.trim().replace(/\/$/, '') })
      setServerUrl(url)
      await syncRemoteLibrary().catch(() => {})
      toast.success('Connecté au partage local')
      setJoinOpen(false)
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Connexion impossible') }
    finally { setBusy(false) }
  }

  const copy = async (value: string) => {
    try { await navigator.clipboard.writeText(value); toast.success('Lien copié') } catch { toast.info(value) }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Appareils</h1>
          <p className="page-sub">Les appareils connectés au même LocalNet se voient automatiquement.</p>
        </div>
        <div className="page-actions">
          <Button variant="ghost" onClick={() => setJoinOpen(true)}><QrCode size={15} /> Rejoindre / connecter</Button>
          <Button variant="primary" onClick={() => navigate('/parametres')}><Wifi size={15} /> Paramètres</Button>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <SectionTitle>Ce partage</SectionTitle>
          <div className="row" style={{ gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <QR value={shareUrl || 'http://localhost:4173'} size={132} />
            <div className="grow">
              <div className="row" style={{ gap: 8, marginBottom: 8 }}>
                <Badge tone={connected ? 'accent' : 'warn'}>{connected ? 'Actif' : 'Non connecté'}</Badge>
                <Badge tone="blue">{peers.length + 1} appareil(s)</Badge>
              </div>
              <div className="small strong">Lien à ouvrir sur les autres PC</div>
              <div className="input mono tiny" style={{ margin: '8px 0', wordBreak: 'break-all' }}>{shareUrl || 'Lance le serveur LocalNet pour obtenir un lien'}</div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                <Button size="sm" variant="blue" onClick={() => void copy(shareUrl)} disabled={!shareUrl}><Copy size={13} /> Copier le lien</Button>
                <Button size="sm" variant="ghost" onClick={() => { setUrl(shareUrl); setJoinOpen(true) }}><RefreshCw size={13} /> Reconnecter</Button>
              </div>
              <div className="tiny muted" style={{ marginTop: 10 }}>Simple: tout le monde sur le même Wi-Fi ouvre ce lien, puis ajoute ses fichiers.</div>
            </div>
          </div>
        </div>

        <div className="card">
          <SectionTitle>Mon appareil</SectionTitle>
          <div className="row" style={{ gap: 12 }}>
            <Avatar name={settings.displayName || me?.name || 'Moi'} color={me?.color || '#01a275'} />
            <div>
              <div className="strong">{settings.displayName || me?.name || 'Moi'}</div>
              <div className="tiny muted">{me?.device || 'Navigateur'} · {connected ? 'connecté au partage' : 'non connecté'}</div>
            </div>
          </div>
          <div className="card pad-sm" style={{ marginTop: 14, background: 'var(--panel-2)' }}>
            <div className="small strong">Comment partager</div>
            <div className="tiny muted" style={{ marginTop: 6 }}>1. Le PC hôte lance LocalNet. 2. Les autres ouvrent le lien/QR. 3. Ils ajoutent un fichier: tout le monde le voit.</div>
          </div>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Appareils connectés <small>{peers.length + 1}</small></SectionTitle>
        <div className="device-grid" style={{ marginTop: 10 }}>
          <div className="device-card">
            <div className="device-icon" style={{ color: 'var(--accent)' }}><Laptop size={18} /></div>
            <div className="strong small">{settings.displayName || me?.name || 'Cet appareil'}</div>
            <div className="tiny faint">Vous · maintenant</div>
          </div>
          {peers.map((p) => (
            <div key={p.id} className="device-card">
              <div className="device-icon"><Laptop size={18} /></div>
              <div className="strong small truncate" style={{ width: '100%' }}>{p.name}</div>
              <div className="tiny faint">{p.device || 'Appareil'} · {relativeTime(p.lastSeen)}</div>
            </div>
          ))}
        </div>
        {peers.length === 0 && <div className="tiny muted" style={{ marginTop: 12 }}>Aucun autre appareil pour l’instant. Partage le lien/QR ci-dessus.</div>}
      </div>

      {joinOpen && (
        <Modal title="Rejoindre un partage" onClose={() => setJoinOpen(false)}>
          <div className="field"><label>Lien du LocalNet</label><input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="http://192.168.1.10:4173" /></div>
          <div className="tiny muted">Ouvre le même lien que le PC hôte. La connexion se fait automatiquement.</div>
          <div className="modal-foot">
            <Button variant="ghost" onClick={() => setJoinOpen(false)}>Annuler</Button>
            <Button variant="primary" onClick={() => void connect()} disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
