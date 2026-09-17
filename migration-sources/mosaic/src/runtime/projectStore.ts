import type { DatasetInfo } from '../types'

const PROJECT_FILE = 'project-state.json'
const IMPORTS_DIRECTORY = 'imports'
const IMPORTS_MANIFEST_FILE = 'manifest.json'

export interface ProjectStoreState {
  version: string
  activeView: string
  activeCaseStudy?: string
  datasets: unknown[]
  result: unknown
  savedAt: string
}

export interface StoredImportEntry {
  id: string
  storageName: string
  originalName: string
  dataset: DatasetInfo
  savedAt: string
}

export interface StoredImportPayload {
  entry: StoredImportEntry
  bytes: Uint8Array
}

export interface PersistedImportResult {
  backend: 'opfs' | 'unavailable'
  fingerprint: string
}


async function fingerprintBuffer(buffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(buffer)
  try {
    if (globalThis.crypto?.subtle) {
      const digest = await globalThis.crypto.subtle.digest('SHA-256', buffer)
      return `sha256:${Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, '0')).join('')}`
    }
  } catch {
    // Fall through to a deterministic non-cryptographic fingerprint for older runtimes.
  }
  let hash = 2166136261
  for (const value of bytes) {
    hash ^= value
    hash = Math.imul(hash, 16777619)
  }
  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}:${bytes.length}`
}

export function selectStoredImportsForProject(state: ProjectStoreState | null, payloads: StoredImportPayload[]): StoredImportPayload[] {
  if (!state) return payloads
  const expected = (Array.isArray(state.datasets) ? state.datasets : [])
    .filter((value): value is DatasetInfo => Boolean(value && typeof value === 'object'))
    .filter((dataset) => dataset.producedBy === 'Import' && Boolean(dataset.tableName))

  if (!expected.length) return []
  return payloads.filter((payload) => expected.some((dataset) => {
    const sameRelation = dataset.tableName === payload.entry.dataset.tableName && dataset.name === payload.entry.dataset.name
    if (!sameRelation) return false
    const expectedFingerprint = dataset.assetFingerprint
    const storedFingerprint = payload.entry.dataset.assetFingerprint
    if (expectedFingerprint || storedFingerprint) return Boolean(expectedFingerprint && storedFingerprint && expectedFingerprint === storedFingerprint)
    return dataset.id === payload.entry.dataset.id
  }))
}

async function projectDirectory() {
  if (!navigator.storage?.getDirectory) return null
  const root = await navigator.storage.getDirectory()
  return root.getDirectoryHandle('mosaic', { create: true })
}

async function importsDirectory() {
  const project = await projectDirectory()
  if (!project) return null
  return project.getDirectoryHandle(IMPORTS_DIRECTORY, { create: true })
}

async function readManifest(dir: FileSystemDirectoryHandle): Promise<StoredImportEntry[]> {
  try {
    const handle = await dir.getFileHandle(IMPORTS_MANIFEST_FILE)
    const file = await handle.getFile()
    const parsed = JSON.parse(await file.text()) as unknown
    return Array.isArray(parsed) ? parsed as StoredImportEntry[] : []
  } catch {
    return []
  }
}

async function writeManifest(dir: FileSystemDirectoryHandle, entries: StoredImportEntry[]) {
  const handle = await dir.getFileHandle(IMPORTS_MANIFEST_FILE, { create: true })
  const writer = await handle.createWritable()
  await writer.write(JSON.stringify(entries, null, 2))
  await writer.close()
}

function safeStorageName(fileName: string) {
  const clean = fileName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'dataset.bin'
  const nonce = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}_${Math.random().toString(36).slice(2)}`
  return `${nonce}_${clean}`
}

let saveQueue: Promise<void> = Promise.resolve()
let importQueue: Promise<void> = Promise.resolve()

async function writeProjectState(payload: string): Promise<'opfs' | 'unavailable'> {
  try {
    const dir = await projectDirectory()
    if (!dir) return 'unavailable'
    const file = await dir.getFileHandle(PROJECT_FILE, { create: true })
    const writer = await file.createWritable()
    await writer.write(payload)
    await writer.close()
    return 'opfs'
  } catch {
    return 'unavailable'
  }
}

export function saveProjectState(state: ProjectStoreState): Promise<'opfs' | 'unavailable'> {
  const payload = JSON.stringify(state)
  let resolveResult!: (value: 'opfs' | 'unavailable') => void
  const result = new Promise<'opfs' | 'unavailable'>((resolve) => { resolveResult = resolve })
  saveQueue = saveQueue
    .catch(() => undefined)
    .then(async () => { resolveResult(await writeProjectState(payload)) })
  return result
}

export async function loadProjectState<T = ProjectStoreState>(): Promise<T | null> {
  try {
    const dir = await projectDirectory()
    if (!dir) return null
    const handle = await dir.getFileHandle(PROJECT_FILE)
    const file = await handle.getFile()
    return JSON.parse(await file.text()) as T
  } catch {
    return null
  }
}

export function persistImportedFile(file: File, dataset: DatasetInfo): Promise<PersistedImportResult> {
  let resolveResult!: (value: PersistedImportResult) => void
  const result = new Promise<PersistedImportResult>((resolve) => { resolveResult = resolve })

  importQueue = importQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        const buffer = await file.arrayBuffer()
        const fingerprint = await fingerprintBuffer(buffer)
        const persistedDataset: DatasetInfo = { ...dataset, assetFingerprint: fingerprint }
        const dir = await importsDirectory()
        if (!dir) {
          resolveResult({ backend: 'unavailable', fingerprint })
          return
        }

        const existing = await readManifest(dir)
        const previous = existing.find((entry) => entry.dataset.id === dataset.id || (entry.dataset.tableName && entry.dataset.tableName === dataset.tableName))
        const storageName = previous?.storageName ?? safeStorageName(file.name)
        const fileHandle = await dir.getFileHandle(storageName, { create: true })
        const writer = await fileHandle.createWritable()
        await writer.write(buffer)
        await writer.close()

        const entry: StoredImportEntry = {
          id: dataset.id,
          storageName,
          originalName: file.name,
          dataset: persistedDataset,
          savedAt: new Date().toISOString()
        }
        const next = [entry, ...existing.filter((item) => item.dataset.id !== dataset.id && item.dataset.tableName !== dataset.tableName)]
        await writeManifest(dir, next)
        resolveResult({ backend: 'opfs', fingerprint })
      } catch {
        resolveResult({ backend: 'unavailable', fingerprint: 'unavailable' })
      }
    })

  return result
}

export async function loadStoredImports(): Promise<StoredImportPayload[]> {
  try {
    const dir = await importsDirectory()
    if (!dir) return []
    const entries = await readManifest(dir)
    const payloads: StoredImportPayload[] = []
    for (const entry of entries) {
      try {
        const handle = await dir.getFileHandle(entry.storageName)
        const file = await handle.getFile()
        payloads.push({ entry, bytes: new Uint8Array(await file.arrayBuffer()) })
      } catch {
        // Ignore a manifest entry if its backing file was removed independently.
      }
    }
    return payloads
  } catch {
    return []
  }
}

export function replaceProjectState(state: ProjectStoreState): Promise<'opfs' | 'unavailable'> {
  return saveProjectState(state)
}
