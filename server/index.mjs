import { createServer } from 'node:http'
import { createReadStream, createWriteStream, existsSync, mkdirSync, readFileSync, statSync, writeFileSync, rmSync } from 'node:fs'
import { join, extname, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { networkInterfaces } from 'node:os'
import { randomBytes } from 'node:crypto'
import { WebSocketServer, WebSocket } from 'ws'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const dist = join(root, 'dist')
const dataDir = join(root, 'server', 'data')
const filesDir = join(dataDir, 'files')
const dbFile = join(dataDir, 'db.json')
const port = Number(process.env.PORT ?? 4173)
const host = process.env.HOST ?? '0.0.0.0'
const MAX_FILE = Number(process.env.LOCALNET_MAX_FILE ?? 512 * 1024 * 1024) // 512MB

for (const dir of [dataDir, filesDir]) mkdirSync(dir, { recursive: true })

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webmanifest': 'application/manifest+json',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
}

function loadDb() {
  try {
    if (existsSync(dbFile)) return JSON.parse(readFileSync(dbFile, 'utf8'))
  } catch {}
  return { files: [], activities: [] }
}
let db = loadDb()
function saveDb() {
  try { writeFileSync(dbFile, JSON.stringify(db)) } catch (e) { console.error('[LocalNet] save db', e) }
}
const uid = () => randomBytes(8).toString('hex')

function send(res, status, body, headers = {}) {
  const isJson = typeof body === 'object' && !(body instanceof Buffer)
  const payload = isJson ? JSON.stringify(body) : body
  res.writeHead(status, {
    'content-type': isJson ? 'application/json; charset=utf-8' : (headers['content-type'] || 'application/octet-stream'),
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
    'access-control-allow-headers': 'Content-Type, X-LocalNet-Name, X-File-Name, X-File-Mime, X-File-Folder, X-File-Category, X-Owner-Name, X-Owner-Id, X-Owner-Peer-Id, X-File-Description, X-File-Visibility, X-File-Allowed',
    ...headers,
  })
  res.end(payload)
}

async function readBody(req, limit = MAX_FILE) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw Object.assign(new Error('Fichier trop volumineux'), { status: 413 })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

function readBodyToFile(req, filePath, limit = MAX_FILE) {
  return new Promise((resolve, reject) => {
    let size = 0
    let done = false
    const out = createWriteStream(filePath)
    const fail = (err) => { if (done) return; done = true; try { req.destroy() } catch {}; try { out.destroy() } catch {}; try { rmSync(filePath, { force: true }) } catch {}; reject(err) }
    const ok = () => { if (done) return; done = true; resolve(size) }
    req.on('data', (chunk) => {
      if (done) return
      size += chunk.length
      if (size > limit) { fail(Object.assign(new Error('Fichier trop volumineux'), { status: 413 })); return }
      if (!out.write(chunk)) req.pause()
    })
    out.on('drain', () => { if (!done) try { req.resume() } catch {} })
    req.on('end', () => { if (!done) out.end(ok) })
    req.on('error', fail)
    out.on('error', fail)
  })
}

function safeJoin(base, target) {
  const p = normalize(join(base, target))
  if (!p.startsWith(base)) return null
  return p
}

function fileMeta(f) {
  return {
    id: f.id, name: f.name, size: f.size, mime: f.mime, category: f.category, folder: f.folder,
    tags: f.tags || [], ownerId: f.ownerId || 'remote', ownerName: f.ownerName || 'Réseau', ownerPeerId: f.ownerPeerId || '',
    createdAt: f.createdAt, downloads: f.downloads || 0, description: f.description || '',
    hash: f.hash, starred: !!f.starred, canDownload: f.canDownload !== false, canView: f.canView !== false,
    visibility: f.visibility === 'restricted' ? 'restricted' : 'public',
    allowedPeerIds: Array.isArray(f.allowedPeerIds) ? f.allowedPeerIds : [],
    allowedNames: Array.isArray(f.allowedNames) ? f.allowedNames : [],
    remote: true,
  }
}

function canAccessFile(file, peerId) {
  if (!file) return false
  if ((file.visibility || 'public') !== 'restricted') return true
  if (!peerId) return false
  if (file.ownerPeerId && file.ownerPeerId === peerId) return true
  return Array.isArray(file.allowedPeerIds) && file.allowedPeerIds.includes(peerId)
}

const wsPeerIds = new WeakMap()

function broadcast(msg) {
  const payload = JSON.stringify(msg)
  for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(payload)
}

function broadcastToPeers(peerIds, msg) {
  const payload = JSON.stringify(msg)
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue
    const id = wsPeerIds.get(client)
    if (id && peerIds.has(id)) client.send(payload)
  }
}

if (!existsSync(dist)) {
  console.error('[LocalNet] Dossier dist introuvable. Lancez d’abord : npm run build')
  process.exit(1)
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`)
    if (req.method === 'OPTIONS') return send(res, 204, '')

    if (url.pathname === '/api/health') {
      return send(res, 200, { ok: true, service: 'LocalNet', clients: wss.clients.size, files: db.files.length, time: Date.now() })
    }

    if (url.pathname === '/api/files' && req.method === 'GET') {
      const peer = url.searchParams.get('peer') || ''
      return send(res, 200, { files: db.files.filter((f) => canAccessFile(f, peer)).map(fileMeta) })
    }

    if (url.pathname === '/api/files' && req.method === 'POST') {
      const name = decodeURIComponent(String(req.headers['x-file-name'] || 'fichier'))
      const mimeType = String(req.headers['x-file-mime'] || 'application/octet-stream')
      const folder = decodeURIComponent(String(req.headers['x-file-folder'] || 'Racine'))
      const ownerName = decodeURIComponent(String(req.headers['x-owner-name'] || 'Réseau'))
      const ownerId = decodeURIComponent(String(req.headers['x-owner-id'] || 'remote'))
      const ownerPeerId = decodeURIComponent(String(req.headers['x-owner-peer-id'] || ''))
      const description = decodeURIComponent(String(req.headers['x-file-description'] || ''))
      const category = decodeURIComponent(String(req.headers['x-file-category'] || 'other'))
      const visibility = decodeURIComponent(String(req.headers['x-file-visibility'] || 'public')) === 'restricted' ? 'restricted' : 'public'
      let allowedPeerIds = []
      let allowedNames = []
      try {
        const raw = JSON.parse(decodeURIComponent(String(req.headers['x-file-allowed'] || '[]')))
        if (Array.isArray(raw)) {
          allowedPeerIds = raw.map((v) => String(v?.id || v?.peerId || '').trim()).filter(Boolean)
          allowedNames = raw.map((v) => String(v?.name || '').trim()).filter(Boolean)
        }
      } catch {}
      const id = uid()
      const diskName = `${id}.bin`
      const filePath = join(filesDir, diskName)
      const size = await readBodyToFile(req, filePath)
      const entry = {
        id, name, size, mime: mimeType, category, folder,
        tags: [], ownerId, ownerName, ownerPeerId, createdAt: Date.now(), downloads: 0,
        description, hash: undefined, starred: false, canDownload: true, canView: true,
        visibility, allowedPeerIds, allowedNames, diskName,
      }
      db.files.unshift(entry)
      db.activities.unshift({ id: uid(), type: 'upload', label: `${name} partagé sur le réseau`, createdAt: Date.now(), actorName: ownerName })
      db.activities = db.activities.slice(0, 200)
      saveDb()
      if (entry.visibility === 'restricted') {
        const targets = new Set([entry.ownerPeerId, ...entry.allowedPeerIds].filter(Boolean))
        broadcastToPeers(targets, { type: 'library:add', file: fileMeta(entry) })
      } else {
        broadcast({ type: 'library:add', file: fileMeta(entry) })
      }
      return send(res, 201, { file: fileMeta(entry) })
    }

    const fileMatch = url.pathname.match(/^\/api\/files\/([^/]+)$/)
    if (fileMatch && req.method === 'GET') {
      const peer = url.searchParams.get('peer') || ''
      const entry = db.files.find((f) => f.id === fileMatch[1])
      if (!entry || !canAccessFile(entry, peer)) return send(res, 404, { error: 'Not found' })
      return send(res, 200, { file: fileMeta(entry) })
    }
    if (fileMatch && req.method === 'DELETE') {
      const id = fileMatch[1]
      const entry = db.files.find((f) => f.id === id)
      if (!entry) return send(res, 404, { error: 'Not found' })
      db.files = db.files.filter((f) => f.id !== id)
      try { rmSync(join(filesDir, entry.diskName), { force: true }) } catch {}
      saveDb()
      if (entry.visibility === 'restricted') broadcastToPeers(new Set([entry.ownerPeerId, ...(entry.allowedPeerIds || [])].filter(Boolean)), { type: 'library:remove', fileId: id })
      else broadcast({ type: 'library:remove', fileId: id })
      return send(res, 200, { ok: true })
    }

    const blobMatch = url.pathname.match(/^\/api\/files\/([^/]+)\/blob$/)
    if (blobMatch && (req.method === 'GET' || req.method === 'HEAD')) {
      const id = blobMatch[1]
      const peer = url.searchParams.get('peer') || ''
      const entry = db.files.find((f) => f.id === id)
      if (!entry || !canAccessFile(entry, peer)) return send(res, 404, { error: 'Not found' })
      if (entry.canDownload === false && req.method === 'GET') return send(res, 403, { error: 'Forbidden' })
      const filePath = join(filesDir, entry.diskName)
      if (!existsSync(filePath)) return send(res, 404, { error: 'Missing blob' })
      if (req.method === 'GET') {
        entry.downloads = (entry.downloads || 0) + 1
        saveDb()
        const msg = { type: 'library:update', file: fileMeta(entry) }
        if (entry.visibility === 'restricted') broadcastToPeers(new Set([entry.ownerPeerId, ...(entry.allowedPeerIds || [])].filter(Boolean)), msg)
        else broadcast(msg)
      }
      const stat = statSync(filePath)
      res.writeHead(200, {
        'content-type': entry.mime || 'application/octet-stream',
        'content-length': stat.size,
        'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(entry.name)}`,
        'cache-control': 'no-store',
        'access-control-allow-origin': '*',
      })
      if (req.method === 'HEAD') return res.end()
      return createReadStream(filePath).pipe(res)
    }

    // Static app
    const pathname = decodeURIComponent(url.pathname)
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
    let file = safeJoin(dist, safe)
    if (!file) return send(res, 403, 'Forbidden')
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(dist, 'index.html')
    if (!file.startsWith(dist)) return send(res, 403, 'Forbidden')

    const type = mime[extname(file)] ?? 'application/octet-stream'
    res.writeHead(200, {
      'content-type': type,
      'cache-control': file.endsWith('index.html') ? 'no-cache' : 'public, max-age=3600',
      'x-content-type-options': 'nosniff',
      'referrer-policy': 'no-referrer',
    })
    return createReadStream(file).pipe(res)
  } catch (err) {
    const status = err?.status || 500
    return send(res, status, { error: err?.message || 'Server error' })
  }
})

const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 256 * 1024 })
const buckets = new WeakMap()
const lastPresence = new Map() // peerId -> presence message

wss.on('connection', (socket, request) => {
  const url = new URL(request.url ?? '/', 'http://localhost')
  const peerId = url.searchParams.get('peer') ?? Math.random().toString(36).slice(2)
  wsPeerIds.set(socket, peerId)
  buckets.set(socket, { count: 0, at: Date.now() })

  try { socket.send(JSON.stringify({ type: 'library:snapshot', files: db.files.filter((f) => canAccessFile(f, peerId)).map(fileMeta) })) } catch {}
  // send known peers to newcomer and newcomer to others happens via presence messages
  for (const [id, msg] of lastPresence) {
    if (id === peerId) continue
    try { socket.send(JSON.stringify(msg)) } catch {}
  }

  socket.on('message', (raw) => {
    const bucket = buckets.get(socket)
    if (!bucket) return
    const now = Date.now()
    if (now - bucket.at > 1000) { bucket.at = now; bucket.count = 0 }
    bucket.count += 1
    if (bucket.count > 60) return

    let message
    try { message = JSON.parse(raw.toString()) } catch { return }
    if (!message || typeof message.type !== 'string') return
    if (message.type === 'presence' && message.peer) {
      message.peer.id = peerId
      lastPresence.set(peerId, { ...message, from: peerId })
    }

    if (message.type === 'library:add' || message.type === 'library:update' || message.type === 'library:remove' || message.type === 'library:snapshot') return

    const payload = JSON.stringify({ ...message, from: peerId })
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === WebSocket.OPEN) client.send(payload)
    }
  })

  socket.on('close', () => {
    lastPresence.delete(peerId)
    const payload = JSON.stringify({ type: 'bye', peerId, from: peerId })
    for (const client of wss.clients) {
      if (client !== socket && client.readyState === WebSocket.OPEN) client.send(payload)
    }
  })
})

setInterval(() => {
  const now = Date.now()
  for (const [id, msg] of lastPresence) {
    if (msg?.peer) msg.peer.lastSeen = now
    const payload = JSON.stringify(msg)
    for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) try { client.send(payload) } catch {}
  }
}, 10000)

const addresses = Object.values(networkInterfaces())
  .flat()
  .filter((iface) => iface && iface.family === 'IPv4' && !iface.internal)
  .map((iface) => iface.address)

server.listen(port, host, () => {
  console.log(`[LocalNet] Interface : http://localhost:${port}`)
  for (const address of addresses) console.log(`[LocalNet] Réseau local : http://${address}:${port}`)
  console.log('[LocalNet] Relais temps réel : ws://<hote>:' + port + '/ws')
  console.log(`[LocalNet] Stockage fichiers : ${filesDir}`)
})
