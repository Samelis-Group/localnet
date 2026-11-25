import type { ChatMessage, LibraryFile, Peer } from './types'

export type WireMessage =
  | { type: 'presence'; peer: Peer }
  | { type: 'bye'; peerId: string }
  | { type: 'message'; message: ChatMessage }
  | { type: 'sync'; at: number }
  | { type: 'library:snapshot'; files: LibraryFile[] }
  | { type: 'library:add'; file: LibraryFile }
  | { type: 'library:update'; file: LibraryFile }
  | { type: 'library:remove'; fileId: string }

const CHANNEL_NAME = 'localnet:v1'
export const peerId = sessionStorage.getItem('localnet:peer') ?? Math.random().toString(36).slice(2)
sessionStorage.setItem('localnet:peer', peerId)
export function getPeerId() { return peerId }

const listeners = new Set<(message: WireMessage) => void>()
const statusListeners = new Set<(status: { connected: boolean; url: string; status: ServerStatus }) => void>()
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(CHANNEL_NAME) : null
let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | undefined
let heartbeatTimer: ReturnType<typeof setInterval> | undefined
let identity: Pick<Peer, 'name' | 'color' | 'device'> = { name: 'Utilisateur', color: '#01a275', device: 'Navigateur' }
let serverUrl = ''
let attempts = 0
let connected = false

function emit(message: WireMessage) { listeners.forEach((l) => l(message)) }
function emitStatus() { statusListeners.forEach((l) => l({ connected, url: serverUrl, status: serverStatus })) }

export type ServerStatus = 'disconnected' | 'probing' | 'connected' | 'error'
let serverStatus: ServerStatus = 'disconnected'

export function getServerUrl() { return serverUrl }
export function isConnected() { return connected }
export function getServerStatus() { return serverStatus }

export function normalizeServerUrl(input: string) {
  const raw = input.trim().replace(/\/$/, '')
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  if (/^ws:\/\//i.test(raw)) return raw.replace(/^ws/i, 'http')
  if (/^wss:\/\//i.test(raw)) return raw.replace(/^wss/i, 'https')
  return `http://${raw}`
}

export function wsUrlFromServer(url: string) {
  const base = normalizeServerUrl(url)
  if (!base) return ''
  return `${base.replace(/^http/i, 'ws')}/ws?peer=${encodeURIComponent(peerId)}`
}

function selfPeer(): Peer {
  return { id: peerId, ...identity, lastSeen: Date.now(), via: connected ? 'websocket' : 'lan' }
}

export function publish(message: WireMessage) {
  channel?.postMessage(message)
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message))
}

export function subscribe(listener: (message: WireMessage) => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}

export function subscribeStatus(listener: (status: { connected: boolean; url: string; status: ServerStatus }) => void) {
  statusListeners.add(listener)
  listener({ connected, url: serverUrl, status: serverStatus })
  return () => { statusListeners.delete(listener) }
}

function setConnected(value: boolean) {
  if (connected === value && serverStatus === (value ? 'connected' : serverUrl ? 'error' : 'disconnected')) return
  connected = value
  serverStatus = value ? 'connected' : (serverUrl ? 'error' : 'disconnected')
  emitStatus()
}

function connectWebSocket() {
  if (!serverUrl || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return
  const url = wsUrlFromServer(serverUrl)
  try { socket = new WebSocket(url) } catch { setConnected(false); return }
  socket.onopen = () => {
    attempts = 0
    setConnected(true)
    publish({ type: 'presence', peer: selfPeer() })
    publish({ type: 'sync', at: Date.now() })
  }
  socket.onmessage = (event) => {
    try { emit(JSON.parse(event.data) as WireMessage) } catch { /* ignore */ }
  }
  socket.onclose = () => {
    socket = null
    connected = false
    serverStatus = serverUrl ? 'probing' : 'disconnected'
    emitStatus()
    if (!serverUrl) return
    attempts += 1
    reconnectTimer = setTimeout(connectWebSocket, Math.min(1000 * 2 ** attempts, 10_000))
  }
  socket.onerror = () => socket?.close()
}

export function startTransport(config: { serverUrl?: string; identity: Pick<Peer, 'name' | 'color' | 'device'> }) {
  identity = config.identity
  serverUrl = normalizeServerUrl(config.serverUrl ?? '')
  serverStatus = serverUrl ? 'probing' : 'disconnected'
  channel?.addEventListener('message', (event: MessageEvent<WireMessage>) => emit(event.data))
  publish({ type: 'presence', peer: selfPeer() })
  clearInterval(heartbeatTimer)
  heartbeatTimer = setInterval(() => publish({ type: 'presence', peer: selfPeer() }), 4000)
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => { if (!document.hidden) publish({ type: 'presence', peer: selfPeer() }) })
    window.addEventListener('focus', () => publish({ type: 'presence', peer: selfPeer() }))
  }
  if (serverUrl) connectWebSocket()
  emitStatus()
}

export function updateIdentity(next: Pick<Peer, 'name' | 'color' | 'device'>) {
  identity = next
  publish({ type: 'presence', peer: selfPeer() })
}

export function setServerUrl(url: string) {
  serverUrl = normalizeServerUrl(url)
  clearTimeout(reconnectTimer)
  socket?.close()
  socket = null
  attempts = 0
  connected = false
  serverStatus = serverUrl ? 'probing' : 'disconnected'
  emitStatus()
  if (serverUrl) connectWebSocket()
}

function timeoutSignal(ms: number) {
  try { return AbortSignal.timeout(ms) } catch {
    const c = new AbortController(); setTimeout(() => c.abort(), ms); return c.signal
  }
}

export async function probeServer(url: string) {
  const base = normalizeServerUrl(url)
  if (!base) throw new Error('URL vide')
  const res = await fetch(`${base}/api/health`, { cache: 'no-store', signal: timeoutSignal(2500) })
  if (!res.ok) throw new Error(`Serveur indisponible (${res.status})`)
  return res.json() as Promise<{ ok: boolean; service: string; clients: number; files?: number }>
}

export async function autoDetectServer(configured = ''): Promise<string> {
  const candidates = [configured, typeof location !== 'undefined' ? location.origin : '', import.meta.env.VITE_LOCALNET_SERVER || '']
    .map(normalizeServerUrl)
    .filter((v, i, a) => v && a.indexOf(v) === i)
  const checks = await Promise.all(candidates.map(async (candidate) => {
    try { const info = await probeServer(candidate); return info?.ok ? candidate : '' } catch { return '' }
  }))
  return checks.find(Boolean) || ''
}

export function stopTransport() {
  publish({ type: 'bye', peerId })
  clearInterval(heartbeatTimer)
  clearTimeout(reconnectTimer)
  socket?.close()
  socket = null
  connected = false
  emitStatus()
}
