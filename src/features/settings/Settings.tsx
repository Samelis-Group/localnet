import { useEffect, useState } from 'react'
import { Moon, ShieldCheck, Sun } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { probeServer, setServerUrl, subscribeStatus, normalizeServerUrl, autoDetectServer } from '../../lib/transport'
import { syncRemoteLibrary } from '../../lib/lan'
import { Badge, Button, SectionTitle, Toggle } from '../../components/ui'
import { toast } from '../../components/ui/toast'

function Row({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="row between" style={{ gap: 16, padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <div><div className="small strong">{title}</div><div className="tiny faint">{description}</div></div>
      <div style={{ flex: 'none' }}>{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const settings = useAppStore((s) => s.settings)
  const setSettings = useAppStore((s) => s.setSettings)
  const users = useAppStore((s) => s.users)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const updateProfile = useAppStore((s) => s.updateProfile)
  const peers = usePeerStore((s) => s.peers)
  const me = users.find((u) => u.id === currentUserId)
  const [name, setName] = useState(settings.displayName || me?.name || '')
  const [serverUrlInput, setServerUrlInput] = useState(settings.serverUrl)
  const [status, setStatus] = useState({ connected: false, url: settings.serverUrl, status: 'disconnected' as string })
  const [checking, setChecking] = useState(false)
  useEffect(() => subscribeStatus(setStatus), [])

  const applyServer = async (value = serverUrlInput) => {
    const url = normalizeServerUrl(value)
    setServerUrlInput(url)
    setSettings({ serverUrl: url })
    setServerUrl(url)
    if (!url) { toast.success('Mode local activé'); return }
    setChecking(true)
    try {
      await probeServer(url)
      await syncRemoteLibrary().catch(() => {})
      toast.success('Connecté au partage local')
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Serveur LAN inaccessible') }
    finally { setChecking(false) }
  }

  const auto = async () => {
    setChecking(true)
    try {
      const found = await autoDetectServer(serverUrlInput || settings.serverUrl)
      if (!found) { toast.error('Aucun LocalNet détecté automatiquement'); return }
      await applyServer(found)
    } finally { setChecking(false) }
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Paramètres</h1>
          <p className="page-sub">Garde ça simple: connecte-toi au partage local et choisis ton nom.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Badge tone={status.connected ? 'accent' : 'warn'}>{status.connected ? 'Partage actif' : 'Partage non connecté'}</Badge>
          <Button size="sm" variant={settings.advancedMode ? 'blue' : 'ghost'} onClick={() => setSettings({ advancedMode: !settings.advancedMode })}>{settings.advancedMode ? 'Masquer avancé' : 'Mode avancé'}</Button>
        </div>
      </div>

      <div className="card">
        <SectionTitle>Connexion simple</SectionTitle>
        <div className="small muted" style={{ marginBottom: 12 }}>Ouvre le même lien LocalNet sur tous les PC du même Wi-Fi. Si tu es sur le PC hôte, la détection est automatique.</div>
        <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
          <input className="input" value={serverUrlInput} onChange={(e) => setServerUrlInput(e.target.value)} placeholder="http://192.168.1.10:4173" style={{ flex: 1, minWidth: 240 }} />
          <Button variant="blue" onClick={() => void auto()} disabled={checking}>Détecter</Button>
          <Button variant="primary" onClick={() => void applyServer()} disabled={checking}>{checking ? 'Connexion…' : 'Connecter'}</Button>
        </div>
        <div className="row" style={{ gap: 8, marginTop: 10 }}>
          <span className={`dot ${status.connected ? '' : 'warn'}`} />
          <span className="tiny muted">{status.connected ? `Connecté à ${status.url}` : 'Non connecté. Tu peux quand même utiliser l’app en local sur cet appareil.'}</span>
        </div>
      </div>

      <div className="grid two">
        <div className="card">
          <SectionTitle>Mon profil</SectionTitle>
          <div className="field"><label>Ton nom visible</label><input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: PC Salon, Nadia..." /></div>
          <Button variant="primary" onClick={() => { setSettings({ displayName: name.trim() }); updateProfile({ name: name.trim() || me?.name || 'Utilisateur' }); toast.success('Nom enregistré') }}>Enregistrer</Button>
          <div className="tiny muted" style={{ marginTop: 10 }}>Ce nom est affiché aux autres appareils connectés.</div>
        </div>

        <div className="card">
          <SectionTitle>Apparence</SectionTitle>
          <Row title="Thème" description="Clair ou sombre">
            <div className="segmented">
              <button className={settings.theme === 'dark' ? 'active' : ''} onClick={() => { setSettings({ theme: 'dark' }); document.documentElement.dataset.theme = 'dark' }}><Moon size={14} /></button>
              <button className={settings.theme === 'light' ? 'active' : ''} onClick={() => { setSettings({ theme: 'light' }); document.documentElement.dataset.theme = 'light' }}><Sun size={14} /></button>
            </div>
          </Row>
          <Row title="Appareils visibles" description="Présence détectée sur le partage local">
            <span className="tiny faint">{peers.length + 1} appareil(s)</span>
          </Row>
        </div>
      </div>

      {settings.advancedMode && (
        <div className="grid two">
          <div className="card">
            <SectionTitle>Avancé réseau</SectionTitle>
            <div className="field"><label>Nom du réseau</label><input className="input" value={settings.networkName} onChange={(e) => setSettings({ networkName: e.target.value })} /></div>
            <Row title="Découverte automatique" description="Garder la présence active"><Toggle checked={settings.autoDiscover} onChange={(v) => setSettings({ autoDiscover: v })} /></Row>
            <Row title="Notifications" description="Signaler les événements"><Toggle checked={settings.notifications} onChange={(v) => setSettings({ notifications: v })} /></Row>
          </div>
          <div className="card">
            <SectionTitle>Avancé transferts</SectionTitle>
            <div className="field"><label>Taille des blocs : {settings.chunkSize} Mo</label><input type="range" min="0.5" max="8" step="0.5" value={settings.chunkSize} onChange={(e) => setSettings({ chunkSize: Number(e.target.value) })} style={{ width: '100%' }} /></div>
            <div className="field"><label>Transferts simultanés : {settings.concurrency}</label><input type="range" min="1" max="6" step="1" value={settings.concurrency} onChange={(e) => setSettings({ concurrency: Number(e.target.value) })} style={{ width: '100%' }} /></div>
            <Row title="Mode compact" description="Réduire les espacements"><Toggle checked={settings.compactMode} onChange={(v) => setSettings({ compactMode: v })} /></Row>
            <Row title="Acceptation auto" description="Traiter sans confirmation"><Toggle checked={settings.autoAccept} onChange={(v) => setSettings({ autoAccept: v })} /></Row>
          </div>
        </div>
      )}

      <div className="card">
        <SectionTitle>Infos</SectionTitle>
        <div className="row" style={{ gap: 8 }}><ShieldCheck size={15} style={{ color: 'var(--accent)' }} /><span className="small">Partage local sur réseau de confiance. Les réglages avancés restent disponibles via le bouton Mode avancé.</span></div>
      </div>
    </div>
  )
}
