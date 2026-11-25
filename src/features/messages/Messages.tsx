import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { BellRing, Hash, Megaphone, Send, Users } from 'lucide-react'
import { useAppStore } from '../../lib/store'
import { usePeerStore } from '../../lib/presence'
import { publish } from '../../lib/transport'
import { formatTime, relativeTime } from '../../lib/format'
import { Avatar, Badge, Button, EmptyState, Modal, SectionTitle } from '../../components/ui'
import { toast } from '../../components/ui/toast'

const rooms = [
  { id: 'general', label: 'général', description: 'Discussions de la communauté' },
  { id: 'design', label: 'design', description: 'Assets et maquettes' },
  { id: 'cours', label: 'cours', description: 'Supports et TP' },
]

export default function Messages() {
  const messages = useAppStore((s) => s.messages)
  const announcements = useAppStore((s) => s.announcements)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const addAnnouncement = useAppStore((s) => s.addAnnouncement)
  const peers = usePeerStore((s) => s.peers)
  const currentUserId = useAppStore((s) => s.currentUserId)
  const [room, setRoom] = useState('general')
  const [text, setText] = useState('')
  const [announceOpen, setAnnounceOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const bodyRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => messages.filter((m) => m.room === room).sort((a, b) => a.createdAt - b.createdAt), [messages, room])

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' }) }, [visible.length])

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    const message = sendMessage(text.trim(), room)
    if (message) publish({ type: 'message', message })
    setText('')
  }

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1 className="page-title">Messagerie locale</h1>
          <p className="page-sub">Échangez sur le réseau local, sans passer par un service externe.</p>
        </div>
        <Button variant="primary" onClick={() => setAnnounceOpen(true)}><Megaphone size={15} /> Publier une annonce</Button>
      </div>

      <div className="chat-wrap">
        <div className="card" style={{ padding: 0, display: 'flex', flexDirection: 'column' }}>
          <div className="row between" style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
            <div className="row" style={{ gap: 8 }}>
              <Hash size={17} style={{ color: 'var(--accent)' }} />
              <div><div className="small strong">#{rooms.find((r) => r.id === room)?.label}</div><div className="tiny faint">{rooms.find((r) => r.id === room)?.description}</div></div>
            </div>
            <Badge tone="accent"><span className="dot" /> {peers.length + 1} en ligne</Badge>
          </div>

          <div className="card pad-sm" style={{ margin: 12, marginBottom: 0, padding: 8, display: 'flex', gap: 6 }}>
            {rooms.map((r) => <button key={r.id} className={`chip ${room === r.id ? 'active' : ''}`} onClick={() => setRoom(r.id)}>#{r.label}</button>)}
          </div>

          <div className="chat-body" ref={bodyRef}>
            {visible.length === 0 ? <EmptyState icon={<Hash />} title="Aucun message" description="Lancez la discussion dans ce canal." /> : visible.map((m) => {
              const mine = m.authorId === currentUserId
              return (
                <div key={m.id} className={`bubble ${mine ? 'mine' : ''}`}>
                  <div className="bubble-meta">{m.authorName} · {formatTime(m.createdAt)}</div>
                  <div>{m.text}</div>
                </div>
              )
            })}
          </div>

          <form className="chat-input" onSubmit={submit}>
            <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message dans #${rooms.find((r) => r.id === room)?.label}…`} />
            <Button variant="primary" type="submit" disabled={!text.trim()}><Send size={15} /></Button>
          </form>
        </div>

        <div className="stack">
          <div className="card">
            <SectionTitle>En ligne <small>{peers.length + 1}</small></SectionTitle>
            <div className="row" style={{ gap: 8, padding: '6px 0' }}><Avatar name="Alex Martin" color="#01a275" size="sm" /><span className="small">Vous</span><span className="dot" style={{ marginLeft: 'auto' }} /></div>
            {peers.map((peer) => (
              <div className="row" key={peer.id} style={{ gap: 8, padding: '6px 0' }}><Avatar name={peer.name} color={peer.color} size="sm" /><span className="small truncate grow">{peer.name}</span><span className="dot" /></div>
            ))}
            {peers.length === 0 && <div className="tiny faint" style={{ marginTop: 8 }}>Ouvrez un autre onglet pour simuler un second appareil.</div>}
          </div>

          <div className="card">
            <SectionTitle>Annonces <small>{announcements.length}</small></SectionTitle>
            {announcements.map((a) => (
              <div key={a.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="row" style={{ gap: 6 }}><span className="small strong">{a.title}</span>{a.pinned && <Badge tone="warn">Épinglé</Badge>}</div>
                <div className="tiny muted">{a.body}</div>
                <div className="tiny faint" style={{ marginTop: 4 }}>{relativeTime(a.createdAt)}</div>
              </div>
            ))}
          </div>

          <div className="card glow">
            <div className="row" style={{ gap: 9 }}><BellRing size={17} style={{ color: 'var(--accent)' }} /><span className="small strong">Notifications locales</span></div>
            <div className="tiny muted" style={{ marginTop: 8 }}>Nouveaux fichiers, transferts terminés et annonces sont signalés ici instantanément.</div>
          </div>
        </div>
      </div>

      {announceOpen && (
        <Modal title="Publier une annonce" onClose={() => setAnnounceOpen(false)}>
          <div className="field"><label>Titre</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Nouvelle ressource disponible" /></div>
          <div className="field"><label>Message</label><textarea className="textarea" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Votre annonce…" /></div>
          <div className="modal-foot">
            <Button variant="ghost" onClick={() => setAnnounceOpen(false)}>Annuler</Button>
            <Button variant="primary" disabled={!title.trim() || !body.trim()} onClick={() => {
              addAnnouncement(title.trim(), body.trim())
              toast.success('Annonce publiée à tout le réseau')
              setTitle('')
              setBody('')
              setAnnounceOpen(false)
            }}><Users size={14} /> Publier</Button>
          </div>
        </Modal>
      )}
    </div>
  )
}
