import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowDownToLine, ArrowLeft, FileQuestion, Lock, ShieldCheck } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { downloadFile, previewUrl } from '../../lib/transfer'
import { fetchRemoteFile, serverOriginForShare } from '../../lib/lan'
import { categoryColor, formatBytes, formatDate } from '../../lib/format'
import { Badge, Button, EmptyState } from '../../components/ui'
import { QRCode } from '../../components/ui/QRCode'
import { toast } from '../../components/ui/toast'
import type { LibraryFile } from '../../lib/types'

export default function SharePage() {
  const { id } = useParams()
  const files = useAppStore((s) => s.files)
  const remoteFiles = useAppStore((s) => s.remoteFiles)
  const users = useAppStore((s) => s.users)
  const local = files.find((f) => f.id === id) || remoteFiles.find((f) => f.id === id)
  const [remote, setRemote] = useState<LibraryFile | undefined>()
  const [loading, setLoading] = useState(!local)
  useEffect(() => {
    if (local || !id) return
    let alive = true
    setLoading(true)
    fetchRemoteFile(id).then((f) => { if (alive) setRemote(f) }).finally(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [id, local])
  const file = local || remote
  const owner = users.find((u) => u.id === file?.ownerId)

  if (!file) {
    return (
      <div className="login-wrap">
        <div className="card login-card">
          <EmptyState icon={<FileQuestion />} title={loading ? 'Chargement…' : 'Ressource introuvable'} description={loading ? 'Recherche du fichier sur le réseau local.' : 'Ce lien ne correspond pas à un fichier partagé accessible.'} action={<Link to="/bibliotheque" className="btn primary">Retour aux fichiers</Link>} />
        </div>
      </div>
    )
  }

  const shareUrl = `${serverOriginForShare()}/partage/${file.id}`

  return (
    <div className="login-wrap">
      <div className="card login-card" style={{ width: 'min(640px, 100%)' }}>
        <Link to="/bibliotheque" className="btn ghost sm" style={{ marginBottom: 18 }}><ArrowLeft size={14} /> Retour</Link>
        <div className="row" style={{ gap: 14, marginBottom: 20 }}>
          <span className="file-icon" style={{ width: 52, height: 52, background: `${categoryColor(file.category)}22`, color: categoryColor(file.category) }}>
            <span className="mono" style={{ fontSize: 10 }}>{file.name.split('.').pop()?.slice(0, 4).toUpperCase()}</span>
          </span>
          <div className="grow">
            <h1 className="page-title" style={{ fontSize: 20, marginBottom: 2 }}>{file.name}</h1>
            <div className="tiny faint">{file.ownerName || owner?.name || 'Membre du réseau'} · {formatDate(file.createdAt)} · {formatBytes(file.size)}</div>
          </div>
        </div>

        <div className="grid two" style={{ gap: 10, marginBottom: 18 }}>
          <div className="card pad-sm"><div className="tiny faint">Catégorie</div><div className="small strong">{file.category}</div></div>
          <div className="card pad-sm"><div className="tiny faint">Dossier</div><div className="small strong">{file.folder}</div></div>
          <div className="card pad-sm"><div className="tiny faint">Téléchargements</div><div className="small strong">{file.downloads}</div></div>
          <div className="card pad-sm"><div className="tiny faint">Intégrité</div><div className="small mono" style={{ fontSize: 11 }}>{file.hash ?? 'À la réception'}</div></div>
        </div>

        {file.description && <p className="small muted">{file.description}</p>}
        {file.tags.length > 0 && <div className="row wrap" style={{ gap: 6, marginBottom: 16 }}>{file.tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}</div>}

        <div className="row" style={{ gap: 16, alignItems: 'flex-start', marginBottom: 18 }}>
          <QRCode value={shareUrl} size={120} />
          <div className="grow">
            <div className="small strong">Partage local</div>
            <div className="tiny muted" style={{ marginBottom: 8 }}>Scannez ce QR avec un appareil du même Wi-Fi pour ouvrir le fichier.</div>
            <div className="input mono tiny" style={{ wordBreak: 'break-all', minHeight: 38 }}>{shareUrl}</div>
          </div>
        </div>

        {file.canDownload ? (
          <Button variant="primary" className="block" onClick={async () => {
            const ok = await downloadFile(file)
            toast[ok ? 'success' : 'error'](ok ? 'Téléchargement lancé' : 'Fichier indisponible')
            if (!ok) {
              const url = await previewUrl(file)
              if (url) window.open(url, '_blank')
            }
          }}><ArrowDownToLine size={16} /> Télécharger la ressource</Button>
        ) : (
          <div className="card pad-sm row" style={{ gap: 8 }}><Lock size={16} style={{ color: 'var(--warn)' }} /><span className="small">Le téléchargement de cette ressource est restreint.</span></div>
        )}
        <div className="row" style={{ gap: 7, marginTop: 14, justifyContent: 'center' }}><ShieldCheck size={14} style={{ color: 'var(--accent)' }} /><span className="tiny faint">Échange local · aucune donnée envoyée sur Internet</span></div>
      </div>
    </div>
  )
}
