import { create } from 'zustand'
import { subscribe, publish, isConnected } from './transport'
import { useAppStore } from './store'
import { syncRemoteLibrary } from './lan'
import type { ChatMessage, LibraryFile, Peer } from './types'

interface PeerStore {
  peers: Peer[]
  upsert: (peer: Peer) => void
  remove: (id: string) => void
  prune: () => void
}

const STALE = 14_000

export const usePeerStore = create<PeerStore>((set) => ({
  peers: [],
  upsert(peer) {
    set((s) => ({
      peers: s.peers.some((p) => p.id === peer.id)
        ? s.peers.map((p) => (p.id === peer.id ? { ...p, ...peer } : p))
        : [...s.peers, peer],
    }))
  },
  remove(id) { set((s) => ({ peers: s.peers.filter((p) => p.id !== id) })) },
  prune() { set((s) => ({ peers: s.peers.filter((p) => Date.now() - p.lastSeen < STALE) })) },
}))

let configured = false

export function configurePresence() {
  if (configured) return
  configured = true
  subscribe((message) => {
    if (message.type === 'presence') {
      if (message.peer.id !== sessionStorage.getItem('localnet:peer')) usePeerStore.getState().upsert(message.peer)
    } else if (message.type === 'bye') {
      usePeerStore.getState().remove(message.peerId)
    } else if (message.type === 'message') {
      const messageData: ChatMessage = message.message
      const exists = useAppStore.getState().messages.some((m) => m.id === messageData.id)
      if (!exists) {
        useAppStore.setState((s) => ({ messages: [...s.messages, messageData] }))
        useAppStore.getState().log('message', `Nouveau message de ${messageData.authorName}`, messageData.authorId)
      }
    } else if (message.type === 'library:snapshot') {
      useAppStore.getState().setRemoteFiles((message.files || []).map((f: LibraryFile) => ({ ...f, remote: true })))
    } else if (message.type === 'library:add' || message.type === 'library:update') {
      useAppStore.getState().upsertRemoteFiles([{ ...message.file, remote: true }])
    } else if (message.type === 'library:remove') {
      useAppStore.getState().removeRemoteFile(message.fileId)
    }
  })
  publish({ type: 'sync', at: Date.now() })
  setInterval(() => usePeerStore.getState().prune(), 5000)
  setInterval(() => { if (isConnected()) void syncRemoteLibrary().catch(() => {}) }, 15000)
}
