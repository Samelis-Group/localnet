import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { loadSnapshot, saveSnapshot, saveBlob, readBlob, deleteBlob } from './db'
import { createSeedSnapshot } from './seed'
import { categoryFromMime, DEFAULT_PERMISSIONS, generateDeviceName, uid } from './format'
import type { Activity, ActivityType, Announcement, AppSnapshot, ChatMessage, Group, LibraryFile, Network, Role, Settings, Transfer, User } from './types'

interface AppStore extends AppSnapshot {
  ready: boolean
  currentUserId: string
  activeNetworkId: string
  remoteFiles: LibraryFile[]
  boot: () => Promise<void>
  setSettings: (patch: Partial<Settings>) => void
  updateProfile: (patch: Partial<Pick<User, 'name' | 'email' | 'device'>>) => void
  createNetwork: (input: { name: string; description: string }) => void
  selectNetwork: (id: string) => void
  addGroup: (networkId: string, name: string, color: string) => void
  toggleGroupMember: (networkId: string, groupId: string, userId: string) => void
  removeMember: (userId: string) => void
  toggleBlockMember: (userId: string) => void
  updateMemberRole: (userId: string, role: Role) => void
  inviteMember: (name: string, email: string, role: Role) => void
  addFiles: (files: File[], folder: string) => Promise<LibraryFile[]>
  toggleStar: (fileId: string) => void
  deleteFile: (fileId: string) => Promise<void>
  updateFile: (fileId: string, patch: Partial<Pick<LibraryFile, 'name' | 'folder' | 'tags' | 'description' | 'canDownload' | 'canView' | 'hash' | 'visibility' | 'allowedPeerIds' | 'allowedNames'>>) => void
  markDownloaded: (fileId: string) => Promise<void>
  createLocalTransfer: (file: LibraryFile, direction: 'upload' | 'download') => void
  updateTransfer: (id: string, patch: Partial<Transfer>) => void
  pauseTransfer: (id: string) => void
  resumeTransfer: (id: string) => void
  cancelTransfer: (id: string) => void
  sendMessage: (text: string, room: string) => ChatMessage | undefined
  addAnnouncement: (title: string, body: string) => void
  log: (type: ActivityType, label: string, actorId?: string) => void
  clearHistory: () => void
  resetDemo: () => Promise<void>
  exportData: () => void
  importData: (snapshot: AppSnapshot) => void
  setRemoteFiles: (files: LibraryFile[]) => void
  upsertRemoteFiles: (files: LibraryFile[]) => void
  removeRemoteFile: (fileId: string) => void
}

const idbStorage = createJSONStorage<AppSnapshot>(() => ({
  getItem: async (name) => {
    const snapshot = await loadSnapshot()
    return snapshot ? JSON.stringify({ state: snapshot, version: 1 }) : localStorage.getItem(name)
  },
  setItem: async (_name, value) => {
    const parsed = JSON.parse(value) as { state: AppSnapshot }
    await saveSnapshot(parsed.state)
  },
  removeItem: async () => {
    localStorage.removeItem('localnet-ui')
  },
}))

const snapshot = (state: AppStore): AppSnapshot => ({
  users: state.users,
  networks: state.networks,
  files: state.files,
  transfers: state.transfers,
  messages: state.messages,
  announcements: state.announcements,
  activities: state.activities,
  settings: { ...state.settings, advancedMode: state.settings.advancedMode ?? false, displayName: state.settings.displayName ?? '' },
})

function now() { return Date.now() }

function withActivity(state: AppStore, type: ActivityType, label: string, actorId = state.currentUserId): Activity {
  return { id: uid(), type, label, createdAt: now(), actorId }
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...createSeedSnapshot(),
      ready: false,
      currentUserId: 'me',
      activeNetworkId: 'n-campus',
      remoteFiles: [],
      async boot() {
        if (get().ready) return
        const loaded = await loadSnapshot()
        if (loaded) {
          const name = (loaded.settings.displayName || '').trim()
          const clean = !name || name === 'Alex Martin' || name === 'Utilisateur' ? generateDeviceName() : name
          const settings = { ...loaded.settings, advancedMode: loaded.settings.advancedMode ?? false, displayName: clean }
          const users = loaded.users.map((u) => u.id === 'me' ? { ...u, name: clean, email: '' } : u)
          set({ ...loaded, users, settings, ready: true })
        } else {
          const seed = createSeedSnapshot()
          const name = generateDeviceName()
          seed.settings.displayName = name
          seed.users = seed.users.map((u) => u.id === 'me' ? { ...u, name, email: '' } : u)
          await saveSnapshot(seed)
          set({ ...seed, ready: true })
        }
      },
      setSettings(patch) {
        set((s) => ({ settings: { ...s.settings, ...patch } }))
      },
      updateProfile(patch) {
        set((s) => ({
          users: s.users.map((u) => (u.id === s.currentUserId ? { ...u, ...patch } : u)),
        }))
      },
      createNetwork({ name, description }) {
        const network: Network = {
          id: uid(),
          name,
          code: `${name.slice(0, 4).toUpperCase().replace(/[^A-Z]/g, 'N')}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`,
          description,
          createdAt: now(),
          groups: [],
          membersCount: 1,
          encryption: true,
          discovery: true,
        }
        set((s) => ({
          networks: [network, ...s.networks],
          activities: [withActivity(s, 'network', `Réseau « ${name} » créé`), ...s.activities],
        }))
      },
      selectNetwork(id) { set({ activeNetworkId: id }) },
      addGroup(networkId, name, color) {
        const group: Group = { id: uid(), name, color, memberIds: [] }
        set((s) => ({
          networks: s.networks.map((n) => (n.id === networkId ? { ...n, groups: [...n.groups, group] } : n)),
        }))
      },
      toggleGroupMember(networkId, groupId, userId) {
        set((s) => ({
          networks: s.networks.map((n) => n.id !== networkId ? n : {
            ...n,
            groups: n.groups.map((g) => g.id !== groupId ? g : {
              ...g,
              memberIds: g.memberIds.includes(userId) ? g.memberIds.filter((id) => id !== userId) : [...g.memberIds, userId],
            }),
          }),
        }))
      },
      removeMember(userId) {
        const user = get().users.find((u) => u.id === userId)
        set((s) => ({
          users: s.users.filter((u) => u.id !== userId),
          networks: s.networks.map((n) => ({
            ...n,
            groups: n.groups.map((g) => ({ ...g, memberIds: g.memberIds.filter((id) => id !== userId) })),
          })),
          activities: [withActivity(s, 'member', `${user?.name ?? 'Membre'} a été retiré`), ...s.activities],
        }))
      },
      toggleBlockMember(userId) {
        set((s) => ({
          users: s.users.map((u) => (u.id === userId ? { ...u, blocked: !u.blocked } : u)),
        }))
      },
      updateMemberRole(userId, role) {
        set((s) => ({
          users: s.users.map((u) => u.id === userId ? { ...u, role, permissions: DEFAULT_PERMISSIONS[role] } : u),
          activities: [withActivity(s, 'admin', `Rôle mis à jour : ${s.users.find((u) => u.id === userId)?.name ?? userId} → ${role}`), ...s.activities],
        }))
      },
      inviteMember(name, email, role) {
        const user: User = {
          id: uid(), name, email, role, color: ['#01a275', '#3b82f6', '#a97bff', '#ff7b9c', '#ffb24d'][get().users.length % 5],
          joinedAt: now(), lastSeen: now(), blocked: false, permissions: DEFAULT_PERMISSIONS[role], device: 'Invité',
        }
        set((s) => ({
          users: [...s.users, user],
          activities: [withActivity(s, 'member', `${name} a été invité`), ...s.activities],
        }))
      },
      async addFiles(files, folder) {
        const ownerId = get().currentUserId
        const entries: LibraryFile[] = []
        for (const file of files) {
          const id = uid()
          await saveBlob(id, file)
          entries.push({
            id,
            name: file.name,
            size: file.size,
            mime: file.type || 'application/octet-stream',
            category: categoryFromMime(file.type, file.name),
            folder: folder || 'Racine',
            tags: [],
            ownerId,
            createdAt: now(),
            downloads: 0,
            description: '',
            starred: false,
            canDownload: true,
            canView: true,
            visibility: 'public',
            allowedPeerIds: [],
            allowedNames: [],
          })
        }
        set((s) => ({
          files: [...entries, ...s.files],
          activities: [withActivity(s, 'upload', `${entries.length} fichier(s) ajouté(s) à ${folder || 'Racine'}`), ...s.activities],
        }))
        return entries
      },
      toggleStar(fileId) {
        set((s) => ({ files: s.files.map((f) => f.id === fileId ? { ...f, starred: !f.starred } : f) }))
      },
      async deleteFile(fileId) {
        await deleteBlob(fileId)
        const file = get().files.find((f) => f.id === fileId)
        set((s) => ({
          files: s.files.filter((f) => f.id !== fileId),
          activities: [withActivity(s, 'admin', `Fichier supprimé : ${file?.name ?? fileId}`), ...s.activities],
        }))
      },
      updateFile(fileId, patch) {
        set((s) => ({ files: s.files.map((f) => f.id === fileId ? { ...f, ...patch } : f) }))
      },
      async markDownloaded(fileId) {
        set((s) => ({
          files: s.files.map((f) => f.id === fileId ? { ...f, downloads: f.downloads + 1 } : f),
          activities: [withActivity(s, 'download', `Téléchargement : ${s.files.find((f) => f.id === fileId)?.name ?? fileId}`), ...s.activities],
        }))
      },
      createLocalTransfer(file, direction) {
        const t: Transfer = {
          id: uid(), fileId: file.id, fileName: file.name, size: file.size, direction,
          peerId: get().currentUserId, peerName: get().settings.displayName || 'Cet appareil', status: 'active', offset: 0, speed: 0, startedAt: now(),
        }
        set((s) => ({ transfers: [t, ...s.transfers] }))
      },
      updateTransfer(id, patch) { set((s) => ({ transfers: s.transfers.map((t) => t.id === id ? { ...t, ...patch } : t) })) },
      pauseTransfer(id) { set((s) => ({ transfers: s.transfers.map((t) => t.id === id ? { ...t, status: 'paused', speed: 0 } : t) })) },
      resumeTransfer(id) { set((s) => ({ transfers: s.transfers.map((t) => t.id === id ? { ...t, status: 'active' } : t) })) },
      cancelTransfer(id) { set((s) => ({ transfers: s.transfers.map((t) => t.id === id ? { ...t, status: 'cancelled', speed: 0 } : t) })) },
      sendMessage(text, room) {
        const me = get().users.find((u) => u.id === get().currentUserId)
        if (!me) return
        const msg: ChatMessage = { id: uid(), authorId: me.id, authorName: me.name, color: me.color, text, createdAt: now(), room }
        set((s) => ({ messages: [...s.messages, msg] }))
        return msg
      },
      addAnnouncement(title, body) {
        const a: Announcement = { id: uid(), title, body, authorId: get().currentUserId, createdAt: now(), pinned: false }
        set((s) => ({ announcements: [a, ...s.announcements], activities: [withActivity(s, 'admin', `Annonce publiée : ${title}`), ...s.activities] }))
      },
      log(type, label, actorId) { set((s) => ({ activities: [withActivity(s, type, label, actorId), ...s.activities].slice(0, 200) })) },
      clearHistory() { set({ transfers: [], activities: [] }) },
      async resetDemo() {
        const seed = createSeedSnapshot()
        await saveSnapshot(seed)
        set({ ...seed, ready: true })
      },
      exportData() {
        const s = get()
        const blob = new Blob([JSON.stringify(snapshot(s), null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `localnet-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
      },
      importData(data) {
        set({
          users: data.users ?? get().users,
          networks: data.networks ?? get().networks,
          files: data.files ?? get().files,
          transfers: data.transfers ?? get().transfers,
          messages: data.messages ?? get().messages,
          announcements: data.announcements ?? get().announcements,
          activities: data.activities ?? get().activities,
          settings: data.settings ?? get().settings,
        })
      },
      setRemoteFiles(files) { set({ remoteFiles: files }) },
      upsertRemoteFiles(files) {
        set((s) => {
          const map = new Map(s.remoteFiles.map((f) => [f.id, f]))
          for (const f of files) map.set(f.id, { ...map.get(f.id), ...f, remote: true } as LibraryFile)
          return { remoteFiles: Array.from(map.values()).sort((a, b) => b.createdAt - a.createdAt) }
        })
      },
      removeRemoteFile(fileId) { set((s) => ({ remoteFiles: s.remoteFiles.filter((f) => f.id !== fileId) })) },
    }),
    {
      name: 'localnet-ui',
      storage: idbStorage,
      partialize: (s) => snapshot(s) as unknown as AppStore,
      merge: (persisted, current) => ({ ...current, ...(persisted as Partial<AppStore>) }),
    },
  ),
)

export async function getFileBlob(file: LibraryFile): Promise<Blob | undefined> {
  const stored = await readBlob(file.id)
  if (stored) return stored
  if (file.demoContent) return new Blob([file.demoContent], { type: file.mime })
  return undefined
}

export function createDemoBlob(file: LibraryFile): Blob {
  return new Blob([file.demoContent ?? `Fichier de démonstration : ${file.name}\n`], { type: file.mime || 'text/plain' })
}
