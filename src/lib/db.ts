import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AppSnapshot } from './types'

interface LocalNetDB extends DBSchema {
  kv: { key: string; value: unknown }
  blobs: { key: string; value: Blob }
}

let dbPromise: Promise<IDBPDatabase<LocalNetDB>> | undefined

function db() {
  dbPromise ??= openDB<LocalNetDB>('localnet', 1, {
    upgrade(database) {
      database.createObjectStore('kv')
      database.createObjectStore('blobs')
    },
  })
  return dbPromise
}

export async function loadSnapshot(): Promise<AppSnapshot | undefined> {
  return (await (await db()).get('kv', 'snapshot')) as AppSnapshot | undefined
}

export async function saveSnapshot(snapshot: AppSnapshot): Promise<void> {
  await (await db()).put('kv', snapshot, 'snapshot')
}

export async function saveBlob(id: string, blob: Blob): Promise<void> {
  await (await db()).put('blobs', blob, id)
}

export async function readBlob(id: string): Promise<Blob | undefined> {
  return (await db()).get('blobs', id)
}

export async function deleteBlob(id: string): Promise<void> {
  await (await db()).delete('blobs', id)
}

export async function getFlag(key: string): Promise<boolean> {
  return Boolean(await (await db()).get('kv', `flag:${key}`))
}

export async function setFlag(key: string, value: boolean): Promise<void> {
  await (await db()).put('kv', value, `flag:${key}`)
}

export async function storageInfo() {
  if (!navigator.storage?.estimate) return { usage: 0, quota: 0 }
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { usage, quota }
}
