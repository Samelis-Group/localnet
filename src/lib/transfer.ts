import { getFileBlob, useAppStore } from './store'
import { downloadUrl, uid } from './format'
import { deleteRemoteFile, remoteBlobUrl, serverConfigured, uploadFileToServer } from './lan'
import { isConnected } from './transport'
import { toast } from '../lib/toast'
import type { FileVisibility, LibraryFile, Transfer } from './types'

const previewCache = new Map<string, string>()
const completionCallbacks = new Map<string, () => void>()
const queue: string[] = []
let running = 0

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

async function integrity(blob: Blob, size: number): Promise<string> {
  const head = await blob.slice(0, 256 * 1024).arrayBuffer()
  const tail = size > 256 * 1024 ? await blob.slice(Math.max(0, size - 256 * 1024)).arrayBuffer() : new ArrayBuffer(0)
  const merged = new Uint8Array(head.byteLength + tail.byteLength)
  merged.set(new Uint8Array(head), 0)
  merged.set(new Uint8Array(tail), head.byteLength)
  if (!crypto.subtle) {
    let hash = 2166136261
    for (const byte of merged) hash = Math.imul(hash ^ byte, 16777619)
    return `fnv-${(hash >>> 0).toString(16)}`
  }
  const digest = await crypto.subtle.digest('SHA-256', merged)
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 16)
}

function pump() {
  const store = useAppStore.getState()
  while (running < Math.max(1, store.settings.concurrency) && queue.length) {
    const id = queue.shift()!
    running += 1
    void run(id).finally(() => { running -= 1; pump() })
  }
}

async function run(id: string) {
  const store = useAppStore.getState()
  const transfer = store.transfers.find((t) => t.id === id)
  const file = store.files.find((f) => f.id === transfer?.fileId) || store.remoteFiles.find((f) => f.id === transfer?.fileId)
  if (!transfer || !file) return
  if (transfer.status === 'cancelled' || transfer.status === 'done') return

  store.updateTransfer(id, { status: 'active', error: undefined })
  let blob: Blob | undefined
  try { blob = await getFileBlob(file) } catch {
    useAppStore.getState().updateTransfer(id, { status: 'error', error: 'Fichier introuvable sur cet appareil' })
    return
  }
  if (!blob) {
    useAppStore.getState().updateTransfer(id, { status: 'error', error: 'Données indisponibles hors ligne' })
    return
  }

  const chunkSize = Math.max(256 * 1024, useAppStore.getState().settings.chunkSize * 1024 * 1024)
  const size = blob.size
  let offset = Math.min(transfer.offset, size)
  let lastPaint = 0
  let windowStart = performance.now()
  let windowBytes = 0

  while (offset < size) {
    const current = useAppStore.getState().transfers.find((t) => t.id === id)
    if (!current || current.status === 'cancelled') return
    if (current.status === 'paused') return
    const end = Math.min(offset + chunkSize, size)
    const buffer = await blob.slice(offset, end).arrayBuffer()
    offset = end
    windowBytes += buffer.byteLength
    const time = performance.now()
    if (time - lastPaint > 90 || offset === size) {
      const elapsed = Math.max(1, time - windowStart) / 1000
      useAppStore.getState().updateTransfer(id, { offset, speed: windowBytes / elapsed })
      lastPaint = time; windowStart = time; windowBytes = 0
    }
    await wait(Math.min(18, (buffer.byteLength / (14 * 1024 * 1024)) * 1000))
  }

  const hash = await integrity(blob, size).catch(() => undefined)
  useAppStore.getState().updateTransfer(id, { status: 'done', offset: size, speed: 0, endedAt: Date.now() })
  const s = useAppStore.getState()
  s.updateFile(file.id, { hash })
  s.log('upload', `Transfert terminé : ${file.name}`, file.ownerId)
  completionCallbacks.get(id)?.()
  completionCallbacks.delete(id)
}

function enqueue(id: string) { if (!queue.includes(id)) queue.push(id); pump() }

export async function ingestFiles(files: File[], folder: string, opts?: { visibility?: FileVisibility; allowed?: { id: string; name: string }[] }) {
  const configured = serverConfigured()
  const connected = isConnected()
  if (configured) {
    const results: LibraryFile[] = []
    for (const file of files) {
      const t: Transfer = {
        id: uid(), fileId: `remote-${file.name}-${Date.now()}`, fileName: file.name, size: file.size,
        direction: 'upload', peerId: 'lan', peerName: 'Réseau local', status: 'active', offset: 0, speed: 0, startedAt: Date.now(),
      }
      useAppStore.setState((s) => ({ transfers: [t, ...s.transfers] }))
      try {
        const remote = await uploadFileToServer(file, folder, { ...opts, onProgress: (p) => {
          useAppStore.getState().updateTransfer(t.id, { offset: Math.floor(file.size * p), speed: 0 })
        } })
        useAppStore.getState().updateTransfer(t.id, { fileId: remote.id, status: 'done', offset: file.size, speed: 0, endedAt: Date.now() })
        results.push(remote)
      } catch (err) {
        useAppStore.getState().updateTransfer(t.id, { status: 'error', speed: 0, error: err instanceof Error ? err.message : 'Échec upload' })
        throw err
      }
    }
    toast.success(connected ? 'Fichier partagé sur le réseau LAN' : 'Fichier envoyé au serveur')
    return results
  }

  const entries = await useAppStore.getState().addFiles(files, folder)
  for (const file of entries) {
    useAppStore.getState().updateFile(file.id, { visibility: opts?.visibility || 'public', allowedPeerIds: opts?.allowed?.map((a) => a.id) || [], allowedNames: opts?.allowed?.map((a) => a.name) || [] })
    const transfer: Transfer = {
      id: uid(), fileId: file.id, fileName: file.name, size: file.size,
      direction: 'upload', peerId: 'me', peerName: 'Cet appareil', status: 'queued', offset: 0, speed: 0, startedAt: Date.now(),
    }
    useAppStore.setState((s) => ({ transfers: [transfer, ...s.transfers] }))
    enqueue(transfer.id)
  }
  return entries
}

export function pauseTransfer(id: string) { useAppStore.getState().pauseTransfer(id) }
export function resumeTransfer(id: string) { useAppStore.getState().resumeTransfer(id); enqueue(id) }
export function cancelTransfer(id: string) { useAppStore.getState().cancelTransfer(id) }

export async function downloadFile(file: LibraryFile) {
  if (!file.canDownload) {
    useAppStore.getState().log('security', `Téléchargement refusé : ${file.name}`)
    return false
  }
  if (file.remote) {
    const url = remoteBlobUrl(file.id)
    if (!url) { toast.error('Serveur LAN non configuré'); return false }
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.rel = 'noopener'
    document.body.appendChild(a)
    a.click()
    a.remove()
    useAppStore.getState().log('download', `${file.name} téléchargé depuis le réseau`)
    return true
  }
  const blob = await getFileBlob(file)
  if (!blob) return false
  const transfer: Transfer = {
    id: uid(), fileId: file.id, fileName: file.name, size: blob.size,
    direction: 'download', peerId: 'me', peerName: 'Cet appareil', status: 'queued', offset: 0, speed: 0, startedAt: Date.now(),
  }
  useAppStore.setState((s) => ({ transfers: [transfer, ...s.transfers] }))
  completionCallbacks.set(transfer.id, () => {
    const url = URL.createObjectURL(blob)
    downloadUrl(url, file.name)
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
    void useAppStore.getState().markDownloaded(file.id)
  })
  enqueue(transfer.id)
  return true
}

export async function previewUrl(file: LibraryFile): Promise<string | undefined> {
  const cached = previewCache.get(file.id)
  if (cached) return cached
  if (file.remote) {
    const url = remoteBlobUrl(file.id)
    if (url) { previewCache.set(file.id, url); return url }
  }
  const supported = file.mime.startsWith('image/') || file.mime.startsWith('text/') || file.mime === 'application/pdf'
  if (!supported && !file.demoContent) return undefined
  const blob = file.demoContent ? new Blob([file.demoContent], { type: file.mime }) : await getFileBlob(file)
  if (!blob) return undefined
  const url = URL.createObjectURL(blob)
  previewCache.set(file.id, url)
  return url
}

export async function removeFile(file: LibraryFile) {
  if (file.remote) { await deleteRemoteFile(file.id); return }
  await useAppStore.getState().deleteFile(file.id)
}

export function resumePendingTransfers() {
  const s = useAppStore.getState()
  const pending = s.transfers.filter((t) => (t.status === 'active' || t.status === 'queued') && t.peerId === 'me')
  for (const t of pending) { s.updateTransfer(t.id, { status: 'queued' }); enqueue(t.id) }
}
