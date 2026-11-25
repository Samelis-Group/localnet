import { useEffect, useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  ArrowLeftRight, FolderOpen, HardDrive, LayoutDashboard, LogOut, MessageCircle,
  Network, Settings, ShieldCheck, Users, Wifi,
} from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { useOnline } from '../../lib/hooks'
import { formatBytes } from '../../lib/format'
import { storageInfo } from '../../lib/db'
import { Avatar } from '../ui'
import type { Peer } from '../../lib/types'

const navigation = [
  { to: '/', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/reseaux', label: 'Réseaux', icon: Network },
  { to: '/transferts', label: 'Transferts', icon: ArrowLeftRight },
  { to: '/bibliotheque', label: 'Bibliothèque', icon: FolderOpen },
  { to: '/membres', label: 'Membres', icon: Users },
  { to: '/messages', label: 'Messagerie', icon: MessageCircle },
]

const adminNav = [
  { to: '/administration', label: 'Administration', icon: ShieldCheck },
  { to: '/parametres', label: 'Paramètres', icon: Settings },
]

function NavItems({ items, onNavigate }: { items: typeof navigation; onNavigate?: () => void }) {
  return items.map(({ to, label, icon: Icon, ...rest }) => (
    <NavLink key={to} to={to} end={'end' in rest ? Boolean(rest.end) : false} onClick={onNavigate} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
      <Icon size={17} /> <span>{label}</span>
    </NavLink>
  ))
}

export function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const files = useAppStore((s) => s.files)
  const transfers = useAppStore((s) => s.transfers)
  const users = useAppStore((s) => s.users)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const settings = useAppStore((s) => s.settings)
  const me = users.find((u) => u.id === currentUserId)
  const peers = usePeerStore((s) => s.peers)
  const online = useOnline()
  const [storage, setStorage] = useState({ usage: 0, quota: 0 })

  useEffect(() => { void storageInfo().then(setStorage) }, [files.length])

  const activeTransfers = transfers.filter((t) => t.status === 'active' || t.status === 'queued').length
  const percent = storage.quota ? Math.min(100, (storage.usage / storage.quota) * 100) : 4

  return (
    <>
      {open && <button className="modal-backdrop" style={{ border: 0, zIndex: 70 }} onClick={onClose} aria-label="Fermer le menu" />}
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <div className="brand">
          <div className="brand-mark">L</div>
          <div>
            <div className="brand-name">LocalNet</div>
            <div className="brand-sub">Réseau local</div>
          </div>
        </div>

        <div className="nav-label">Espace de travail</div>
        <nav><NavItems items={navigation} onNavigate={onClose} /></nav>
        <div className="nav-label">Système</div>
        <nav><NavItems items={adminNav} onNavigate={onClose} /></nav>

        <div className="sidebar-spacer" />

        <div className="side-card">
          <div className="side-card-title">
            <span className="row" style={{ gap: 7 }}><Wifi size={13} /> Réseau local</span>
            <span className={`dot ${online ? '' : 'offline'}`} />
          </div>
            <div className="small strong truncate">{settings.networkName}</div>
          <div className="tiny faint" style={{ marginTop: 3 }}>
            {peers.length + 1} appareil(s) · {activeTransfers} transfert(s)
          </div>
        </div>

        <div className="side-card">
          <div className="side-card-title"><span className="row" style={{ gap: 7 }}><HardDrive size={13} /> Stockage</span><span className="tiny">{percent.toFixed(0)}%</span></div>
          <div className="progress thin"><span style={{ width: `${percent}%` }} /></div>
          <div className="tiny faint" style={{ marginTop: 7 }}>{formatBytes(storage.usage)} utilisés</div>
        </div>

        <NavLink to="/parametres" className="side-user">
          {me && <Avatar name={me.name} color={me.color} />}
          <div className="grow">
            <div className="side-user-name truncate">{me?.name}</div>
            <div className="side-user-role">Administrateur</div>
          </div>
          <LogOut size={14} className="faint" />
        </NavLink>
      </aside>
    </>
  )
}

const bottomNav = [
  { to: '/', label: 'Accueil', icon: LayoutDashboard },
  { to: '/transferts', label: 'Transferts', icon: ArrowLeftRight },
  { to: '/bibliotheque', label: 'Fichiers', icon: FolderOpen },
  { to: '/messages', label: 'Chat', icon: MessageCircle },
  { to: '/administration', label: 'Admin', icon: ShieldCheck },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      {bottomNav.map(({ to, label, icon: Icon }) => (
        <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon size={19} /> {label}
        </NavLink>
      ))}
    </nav>
  )
}

export function PeerBadge({ peer }: { peer: Peer }) {
  return <span className="badge accent"><span className="dot" /> {peer.name}</span>
}
