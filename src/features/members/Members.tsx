import { useMemo, useState } from 'react'
import { Ban, Mail, Search, ShieldCheck, Trash2, UserPlus, Users } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { useDebouncedValue } from '../../lib/hooks'
import { DEFAULT_PERMISSIONS, formatDate, PERMISSION_LABELS, ROLE_LABELS, relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, Modal, SectionTitle, Toggle } from '../../components/ui'
import { toast } from '../../components/ui/toast'
import type { Permission, Role } from '../../lib/types'

const roles: Role[] = ['admin', 'member', 'guest']
const permissions: Permission[] = ['upload', 'download', 'comment', 'invite', 'manage']

export default function Members() {
  const users = useAppStore((s) => s.users)
  const networks = useAppStore((s) => s.networks)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const updateMemberRole = useAppStore((s) => s.updateMemberRole)
  const toggleBlockMember = useAppStore((s) => s.toggleBlockMember)
  const removeMember = useAppStore((s) => s.removeMember)
  const inviteMember = useAppStore((s) => s.inviteMember)
  const peers = usePeerStore((s) => s.peers)
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('member')
  const deferred = useDebouncedValue(search, 120)

  const visible = useMemo(() => users.filter((u) => `${u.name} ${u.email}`.toLocaleLowerCase('fr').includes(deferred.toLocaleLowerCase('fr'))), [users, deferred])
  const detail = users.find((u) => u.id === detailId)

  const handleInvite = () => {
    if (!name.trim() || !email.trim()) return
    inviteMember(name.trim(), email.trim(), role)
    toast.success(`${name.trim()} a été invité`)
    setName('')
    setEmail('')
    setInviteOpen(false)
  }

  const onlineIds = new Set(peers.map((p) => p.name))

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Membres & appareils</h1>
          <p className="page-sub">{users.length} comptes · {peers.length + 1} connectés · rôles et permissions granulaires.</p>
        </div>
        <Button variant="primary" onClick={() => setInviteOpen(true)}><UserPlus size={15} /> Inviter un membre</Button>
      </div>

      <div className="grid stats">
        <div className="card stat-card"><div className="stat-top"><span className="stat-icon"><Users size={17} /></span></div><div className="stat-value">{users.length}</div><div className="stat-label">Membres du réseau</div></div>
        <div className="card stat-card"><div className="stat-top"><span className="stat-icon blue"><ShieldCheck size={17} /></span></div><div className="stat-value">{users.filter((u) => u.role === 'admin').length}</div><div className="stat-label">Administrateurs</div></div>
        <div className="card stat-card"><div className="stat-top"><span className="stat-icon violet"><UserPlus size={17} /></span></div><div className="stat-value">{users.filter((u) => u.role === 'guest').length}</div><div className="stat-label">Invités</div></div>
        <div className="card stat-card"><div className="stat-top"><span className="stat-icon warn"><Ban size={17} /></span></div><div className="stat-value">{users.filter((u) => u.blocked).length}</div><div className="stat-label">Comptes bloqués</div></div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 14 }}>
          <SectionTitle>Liste des membres <small>{visible.length}</small></SectionTitle>
          <div className="top-search" style={{ margin: 0, width: 240 }}><Search size={14} /><input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…" /></div>
        </div>
        <div className="file-row header" style={{ gridTemplateColumns: '40px minmax(0,1fr) 130px 120px 100px 110px' }}>
          <span /><span>Membre</span><span>Rôle</span><span>Dernière activité</span><span>Statut</span><span />
        </div>
        {visible.map((user) => {
          const isOnline = user.id === currentUserId || onlineIds.has(user.name)
          return (
            <div className="file-row" key={user.id} style={{ gridTemplateColumns: '40px minmax(0,1fr) 130px 120px 100px 110px' }}>
              <Avatar name={user.name} color={user.color} />
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => setDetailId(user.id)}>
                <div className="row" style={{ gap: 6 }}><span className="file-name truncate">{user.name}</span>{user.id === currentUserId && <Badge tone="accent">Vous</Badge>}</div>
                <div className="file-meta truncate">{user.email}</div>
              </div>
              <select className="select" style={{ padding: '5px 7px', fontSize: 11.5 }} value={user.role} disabled={user.id === currentUserId} onChange={(e) => updateMemberRole(user.id, e.target.value as Role)}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <span className="tiny faint">{relativeTime(user.lastSeen)}</span>
              <span className="row" style={{ gap: 6 }}><span className={`dot ${user.blocked ? 'offline' : isOnline ? '' : 'warn'}`} /> <span className="tiny">{user.blocked ? 'Bloqué' : isOnline ? 'En ligne' : 'Absent'}</span></span>
              <div className="row" style={{ gap: 3 }}>
                <button className="icon-btn" style={{ border: 0, background: 'transparent' }} onClick={() => setDetailId(user.id)} aria-label="Détails"><ShieldCheck size={14} /></button>
                {user.id !== currentUserId && <>
                  <button className="icon-btn" style={{ border: 0, background: 'transparent' }} onClick={() => { toggleBlockMember(user.id); toast.info(user.blocked ? 'Membre débloqué' : 'Membre bloqué') }} aria-label="Bloquer"><Ban size={14} /></button>
                  <button className="icon-btn" style={{ border: 0, background: 'transparent' }} onClick={() => { if (confirm(`Retirer ${user.name} du réseau ?`)) { removeMember(user.id); toast.success('Membre retiré') } }} aria-label="Supprimer"><Trash2 size={14} /></button>
                </>}
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid two">
        <div className="card">
          <SectionTitle>Répartition par rôle</SectionTitle>
          {roles.map((r) => {
            const count = users.filter((u) => u.role === r).length
            return (
              <div key={r} style={{ marginBottom: 12 }}>
                <div className="row between small"><span>{ROLE_LABELS[r]}</span><span className="faint">{count}</span></div>
                <div className="progress thin" style={{ marginTop: 5 }}><span style={{ width: `${(count / Math.max(1, users.length)) * 100}%` }} /></div>
              </div>
            )
          })}
        </div>
        <div className="card">
          <SectionTitle>Groupes</SectionTitle>
          {networks.flatMap((n) => n.groups).map((g) => (
            <div className="row between" key={g.id} style={{ padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
              <span className="small row" style={{ gap: 7 }}><span style={{ width: 8, height: 8, borderRadius: 8, background: g.color }} />{g.name}</span>
              <span className="tiny faint">{g.memberIds.length} membre(s)</span>
            </div>
          ))}
          <Button variant="ghost" className="block" style={{ marginTop: 12 }} onClick={() => toast.info('Gérez les groupes depuis l’onglet Réseaux')}>Gérer les groupes</Button>
        </div>
      </div>

      {inviteOpen && (
        <Modal title="Inviter un membre" onClose={() => setInviteOpen(false)}>
          <div className="field"><label>Nom complet</label><input className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Camille Durand" /></div>
          <div className="field"><label>Adresse e-mail locale</label><input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="camille@localnet.lan" /></div>
          <div className="field"><label>Rôle</label><select className="select" value={role} onChange={(e) => setRole(e.target.value as Role)}>{roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}</select></div>
          <div className="card pad-sm" style={{ marginBottom: 14 }}><div className="tiny muted">Les droits par défaut du rôle seront appliqués : {DEFAULT_PERMISSIONS[role].map((p) => PERMISSION_LABELS[p]).join(', ')}.</div></div>
          <div className="modal-foot"><Button variant="ghost" onClick={() => setInviteOpen(false)}>Annuler</Button><Button variant="primary" onClick={handleInvite}><Mail size={14} /> Envoyer l’invitation</Button></div>
        </Modal>
      )}

      {detail && (
        <Modal title={`Profil · ${detail.name}`} onClose={() => setDetailId(null)}>
          <div className="row" style={{ gap: 14, marginBottom: 18 }}>
            <Avatar name={detail.name} color={detail.color} size="lg" />
            <div className="grow"><div className="strong">{detail.name}</div><div className="small muted">{detail.email}</div><div className="tiny faint">Membre depuis le {formatDate(detail.joinedAt)} · {detail.device}</div></div>
            <Badge tone={detail.role === 'admin' ? 'accent' : detail.role === 'guest' ? 'warn' : 'blue'}>{ROLE_LABELS[detail.role]}</Badge>
          </div>
          <SectionTitle>Permissions individuelles</SectionTitle>
          <div className="card pad-sm" style={{ marginBottom: 14 }}>
            {permissions.map((p) => (
              <div className="row between" key={p} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="small">{PERMISSION_LABELS[p]}</span>
                <Toggle checked={detail.permissions.includes(p)} onChange={() => toast.info('Modifiez le rôle pour ajuster les droits')} />
              </div>
            ))}
          </div>
          <div className="modal-foot"><Button variant="ghost" onClick={() => setDetailId(null)}>Fermer</Button><Button variant="danger" onClick={() => { if (confirm('Retirer ce membre ?')) { removeMember(detail.id); setDetailId(null) } }}><Trash2 size={14} /> Retirer</Button></div>
        </Modal>
      )}
    </div>
  )
}
