export type Role = 'admin' | 'member' | 'guest'

export type Permission = 'upload' | 'download' | 'comment' | 'invite' | 'manage'

export interface User {
  id: string
  name: string
  email: string
  role: Role
  color: string
  joinedAt: number
  lastSeen: number
  blocked: boolean
  permissions: Permission[]
  device: string
}

export interface Group {
  id: string
  name: string
  color: string
  memberIds: string[]
}

export interface Network {
  id: string
  name: string
  code: string
  description: string
  createdAt: number
  groups: Group[]
  membersCount: number
  encryption: boolean
  discovery: boolean
}

export type FileCategory = 'documents' | 'images' | 'videos' | 'audio' | 'archives' | 'code' | 'other'

export type FileVisibility = 'public' | 'restricted'

export interface LibraryFile {
  id: string
  name: string
  size: number
  mime: string
  category: FileCategory
  folder: string
  tags: string[]
  ownerId: string
  ownerName?: string
  ownerPeerId?: string
  createdAt: number
  downloads: number
  description: string
  hash?: string
  starred: boolean
  demoContent?: string
  canDownload: boolean
  canView: boolean
  remote?: boolean
  visibility?: FileVisibility
  allowedPeerIds?: string[]
  allowedNames?: string[]
  receivedAt?: number
  cloneExpiresAt?: number
}

export type TransferStatus = 'queued' | 'active' | 'paused' | 'done' | 'error' | 'cancelled'

export interface Transfer {
  id: string
  fileId: string
  fileName: string
  size: number
  direction: 'upload' | 'download'
  peerId: string
  peerName: string
  status: TransferStatus
  offset: number
  speed: number
  startedAt: number
  endedAt?: number
  error?: string
}

export interface ChatMessage {
  id: string
  authorId: string
  authorName: string
  color: string
  text: string
  createdAt: number
  room: string
}

export interface Announcement {
  id: string
  title: string
  body: string
  authorId: string
  createdAt: number
  pinned: boolean
}

export type ActivityType = 'upload' | 'download' | 'member' | 'network' | 'message' | 'admin' | 'security'

export interface Activity {
  id: string
  type: ActivityType
  label: string
  createdAt: number
  actorId: string
}

export interface Settings {
  theme: 'dark' | 'light'
  networkName: string
  autoDiscover: boolean
  autoAccept: boolean
  chunkSize: number
  concurrency: number
  serverUrl: string
  notifications: boolean
  compactMode: boolean
  advancedMode: boolean
  displayName: string
}

export interface Peer {
  id: string
  name: string
  color: string
  device: string
  lastSeen: number
  via: 'lan' | 'websocket'
}

export interface AppSnapshot {
  users: User[]
  networks: Network[]
  files: LibraryFile[]
  transfers: Transfer[]
  messages: ChatMessage[]
  announcements: Announcement[]
  activities: Activity[]
  settings: Settings
}
