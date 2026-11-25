import { AVATAR_COLORS, DEFAULT_PERMISSIONS } from './format'
import type { AppSnapshot, User } from './types'

const now = Date.now()

const makeUser = (id: string, name: string, email: string, role: User['role'], device: string, colorIndex: number): User => ({
  id, name, email, role, color: AVATAR_COLORS[colorIndex], joinedAt: now, lastSeen: now,
  blocked: false, permissions: DEFAULT_PERMISSIONS[role], device,
})

export function createSeedSnapshot(): AppSnapshot {
  return {
    users: [makeUser('me', 'Mon appareil', '', 'admin', 'Cet appareil', 0)],
    networks: [],
    files: [],
    transfers: [],
    messages: [],
    announcements: [],
    activities: [],
    settings: {
      theme: 'dark',
      networkName: 'LocalNet',
      autoDiscover: true,
      autoAccept: true,
      chunkSize: 2,
      concurrency: 2,
      serverUrl: '',
      notifications: true,
      compactMode: false,
      advancedMode: false,
      displayName: '',
    },
  }
}
