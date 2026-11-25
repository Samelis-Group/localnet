import type { FileCategory, Permission, Role } from './types'

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'Ko', 'Mo', 'Go', 'To']
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1)
  return `${(bytes / 1024 ** index).toFixed(index === 0 ? 0 : digits)} ${units[index]}`
}

export function formatSpeed(bytesPerSecond: number): string {
  return bytesPerSecond > 0 ? `${formatBytes(bytesPerSecond)}/s` : '—'
}

export function formatDate(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(timestamp)
}

export function formatTime(timestamp: number): string {
  return new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' }).format(timestamp)
}

export function relativeTime(timestamp: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))
  if (seconds < 10) return "à l'instant"
  if (seconds < 60) return `il y a ${seconds} s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `il y a ${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `il y a ${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 30) return `il y a ${days} j`
  return formatDate(timestamp)
}

const CATEGORY_COLORS: Record<FileCategory, string> = {
  documents: '#3b82f6',
  images: '#a97bff',
  videos: '#ff7b9c',
  audio: '#ffb24d',
  archives: '#ffd166',
  code: '#01a275',
  other: '#8b95a7',
}

export function categoryColor(category: FileCategory): string {
  return CATEGORY_COLORS[category]
}

export function categoryFromMime(mime: string, name: string): FileCategory {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (mime.startsWith('image/')) return 'images'
  if (mime.startsWith('video/')) return 'videos'
  if (mime.startsWith('audio/')) return 'audio'
  if (mime.includes('pdf') || ['doc', 'docx', 'odt', 'txt', 'md', 'xls', 'xlsx', 'csv', 'ppt', 'pptx'].includes(ext)) return 'documents'
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archives'
  if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'go', 'html', 'css', 'sh', 'sql', 'rs'].includes(ext)) return 'code'
  return 'other'
}

export function fileExtension(name: string): string {
  return name.includes('.') ? name.split('.').pop()!.toUpperCase().slice(0, 4) : 'FICHIER'
}

export const AVATAR_COLORS = ['#01a275', '#3b82f6', '#a97bff', '#ff7b9c', '#ffb24d', '#ffd166', '#38c6e8']

export const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrateur',
  member: 'Membre',
  guest: 'Invité',
}

export const PERMISSION_LABELS: Record<Permission, string> = {
  upload: 'Publier des fichiers',
  download: 'Télécharger',
  comment: 'Commenter / discuter',
  invite: 'Inviter des membres',
  manage: 'Gérer la bibliothèque',
}

export const DEFAULT_PERMISSIONS: Record<Role, Permission[]> = {
  admin: ['upload', 'download', 'comment', 'invite', 'manage'],
  member: ['upload', 'download', 'comment'],
  guest: ['download', 'comment'],
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function downloadUrl(url: string, name: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}

export function debounce<T extends (...args: never[]) => void>(fn: T, delay: number) {
  let timer: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
