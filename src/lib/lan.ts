import { categoryFromMime } from './format'
import { getPeerId, getServerUrl, isConnected, normalizeServerUrl, probeServer, setServerUrl } from './transport'
import { useAppStore } from './store'
import type { LibraryFile } from './types'

export type RemoteFile = LibraryFile & { remote: true; ownerName?: string }

export function serverConfigured() { return Boolean(getServerUrl()) }
export function serverConnected() { return isConnected() }

export async function fetchRemoteFiles(): Promise<RemoteFile[]> {
  const base = getServerUrl()
  if (!base) return []
  const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : undefined
  const timer = ctrl ? setTimeout(() => ctrl.abort(), 8000) : undefined
  const res = await fetch(`${base}/api/files?peer=${encodeURIComponent(getPeerId())}`, { cache: 'no-store', signal: ctrl?.signal }).finally(() => { if (timer) clearTimeout(timer) })
  if (!res.ok) throw new Error(`Impossible de charger les fichiers (${res.status})`)
  const data = await res.json() as { files: RemoteFile[] }
  return Array.isArray(data.files) ? data.files.map((f) => ({ ...f, remote: true })) : []
}

export async function fetchRemoteFile(fileId: string): Promise<RemoteFile | undefined> {
  const base = getServerUrl()
  if (!base) return undefined
  const res = await fetch(`${base}/api/files/${encodeURIComponent(fileId)}?peer=${encodeURIComponent(getPeerId())}`, { cache: 'no-store' })
  if (!res.ok) return undefined
  const data = await res.json() as { file: RemoteFile }
  return data.file ? { ...data.file, remote: true } : undefined
}

export function remoteBlobUrl(fileId: string) {
  const base = getServerUrl()
  return base ? `${base}/api/files/${encodeURIComponent(fileId)}/blob?peer=${encodeURIComponent(getPeerId())}` : ''
}

export async function uploadFileToServer(file: File, folder: string, opts?: { visibility?: 'public' | 'restricted'; allowed?: { id: string; name: string }[]; onProgress?: (p: number) => void }) {
  const base = getServerUrl()
  if (!base) throw new Error('Aucun serveur LAN configuré')
  const state = useAppStore.getState()
  const me = state.users.find((u) => u.id === state.currentUserId)

  return new Promise<RemoteFile>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${base}/api/files`)
    xhr.responseType = 'json'
    xhr.timeout = 0
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name))
    xhr.setRequestHeader('X-File-Mime', encodeURIComponent(file.type || 'application/octet-stream'))
    xhr.setRequestHeader('X-File-Folder', encodeURIComponent(folder || 'Racine'))
    xhr.setRequestHeader('X-File-Category', encodeURIComponent(categoryFromMime(file.type, file.name)))
    xhr.setRequestHeader('X-Owner-Name', encodeURIComponent(state.settings.displayName || me?.name || 'Utilisateur'))
    xhr.setRequestHeader('X-Owner-Id', encodeURIComponent(me?.id || 'me'))
    xhr.setRequestHeader('X-Owner-Peer-Id', encodeURIComponent(getPeerId()))
    xhr.setRequestHeader('X-File-Visibility', encodeURIComponent(opts?.visibility || 'public'))
    xhr.setRequestHeader('X-File-Allowed', encodeURIComponent(JSON.stringify(opts?.allowed || [])))
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) opts?.onProgress?.(Math.max(0.05, e.loaded / e.total)) }
    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(typeof xhr.response === 'string' ? xhr.response : `Échec upload (${xhr.status})`))
        return
      }
      const data = (xhr.response || JSON.parse(xhr.responseText || '{}')) as { file: RemoteFile }
      const remoteFile = { ...data.file, remote: true } as RemoteFile
      useAppStore.getState().upsertRemoteFiles([remoteFile])
      resolve(remoteFile)
    }
    xhr.onerror = () => reject(new Error('Connexion au serveur interrompue'))
    xhr.send(file)
  })
}

export async function deleteRemoteFile(fileId: string) {
  const base = getServerUrl()
  if (!base) throw new Error('Aucun serveur LAN configuré')
  const res = await fetch(`${base}/api/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Suppression impossible (${res.status})`)
  useAppStore.getState().removeRemoteFile(fileId)
}

export async function syncRemoteLibrary() {
  if (!getServerUrl()) {
    useAppStore.getState().setRemoteFiles([])
    return []
  }
  const files = await fetchRemoteFiles()
  useAppStore.getState().setRemoteFiles(files)
  return files
}

export function serverOriginForShare() {
  const base = getServerUrl()
  if (base) return normalizeServerUrl(base)
  if (typeof location !== 'undefined') return location.origin
  return ''
}

export async function probeAndSync(url: string) {
  const base = normalizeServerUrl(url)
  if (!base) throw new Error('URL vide')
  await probeServer(base)
  setServerUrl(base)
  return syncRemoteLibrary()
}
