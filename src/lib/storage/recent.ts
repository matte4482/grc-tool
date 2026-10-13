import type { Framework } from '../frameworks/schema'
import type { Project } from '../project/schema'
import { assessmentProgress } from '../compliance'
import type { SaveTarget } from './target'

// "Senaste arbeten" på startsidan (ARCHITECTURE B-26).
//
// Listan sparas i webbläsarens IndexedDB, och kan
// öppnas igen med ett klick.
//
// Listan innehåller bara det som syns på startsidan: kund, ramverk, filnamn,
// när det sparades och hur långt bedömningen kommit. Själva bedömningen finns
// bara i projektfilen.

export interface RecentEntry {
  projectId: string
  client: string
  framework: { id: string; version: string; name: string }
  fileName: string
  kind: 'folder' | 'download'
  dir?: FileSystemDirectoryHandle
  updatedAt: string
  usedAt: string
  progress: RecentProgress
}

/** Förloppet som visas i listan. Statusfälten saknas i poster sparade före 7 okt 2026. */
export type RecentProgress = { assessed: number; applicable: number; fulfilled?: number; partial?: number; notFulfilled?: number }

export interface RecentStore {
  list(): Promise<RecentEntry[]>
  put(entry: RecentEntry): Promise<void>
  remove(projectId: string): Promise<void>
}

export const MAX_RECENT = 8

/** Bygger en post för listan av det öppna projektet. */
export function recentEntry(project: Project, framework: Framework, target: SaveTarget, usedAt: string): RecentEntry {
  const { assessed, applicable, fulfilled, partial, notFulfilled } = assessmentProgress(project, framework)
  return {
    projectId: project.id,
    client: project.client.name,
    framework: { id: framework.id, version: framework.version, name: framework.name },
    fileName: target.label,
    kind: target.kind,
    ...(target.kind === 'folder' && target.dir ? { dir: target.dir } : {}),
    updatedAt: project.updatedAt,
    usedAt,
    progress: { assessed, applicable, fulfilled, partial, notFulfilled },
  }
}

/**
 * En nedladdad eller indragen fil ska inte ersätta en post som har mappen,
 * så att "Fortsätt" fortsätter att fungera med ett klick.
 */
export function mergeRecent(existing: RecentEntry | undefined, entry: RecentEntry): RecentEntry {
  if (existing?.kind !== 'folder' || entry.kind !== 'download') return entry
  return { ...entry, kind: 'folder', dir: existing.dir, fileName: existing.fileName }
}

/** Sorterar och kortar listan. Delas av båda lagringarna. */
export function trimRecent(entries: RecentEntry[]): RecentEntry[] {
  return [...entries].sort((a, b) => b.usedAt.localeCompare(a.usedAt)).slice(0, MAX_RECENT)
}

/** Lista i minnet. Används i tester och när IndexedDB inte går att använda. */
export function memoryRecentStore(): RecentStore {
  let entries: RecentEntry[] = []
  return {
    async list() {
      return trimRecent(entries)
    },
    async put(entry) {
      entries = trimRecent([entry, ...entries.filter((e) => e.projectId !== entry.projectId)])
    },
    async remove(projectId) {
      entries = entries.filter((e) => e.projectId !== projectId)
    },
  }
}

const DB_NAME = 'grc-verktyget'
const DB_STORE = 'senaste-arbeten'

/**
 * Lista i IndexedDB. Alla fel fångas: IndexedDB kan saknas eller vara avstängd
 * (privat fönster, vissa webbläsare för filer som öppnas från disk). Då blir
 * listan tom, och resten av verktyget fungerar som vanligt.
 */
export function idbRecentStore(factory: IDBFactory | null = defaultFactory()): RecentStore {
  let db: Promise<IDBDatabase | null> | null = null

  const open = (): Promise<IDBDatabase | null> =>
    (db ??= new Promise((resolve) => {
      if (!factory) return resolve(null)
      try {
        const req = factory.open(DB_NAME, 1)
        req.onupgradeneeded = () => req.result.createObjectStore(DB_STORE, { keyPath: 'projectId' })
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => resolve(null)
        req.onblocked = () => resolve(null)
      } catch {
        resolve(null)
      }
    }))

  /** Kör en förfrågan mot listan. Ger `fallback` vid alla fel. */
  const run = async <T>(mode: IDBTransactionMode, fallback: T, work: (store: IDBObjectStore) => IDBRequest | void): Promise<T> => {
    const database = await open()
    if (!database) return fallback
    return new Promise<T>((resolve) => {
      try {
        const tx = database.transaction(DB_STORE, mode)
        const req = work(tx.objectStore(DB_STORE))
        tx.oncomplete = () => resolve(req ? (req.result as T) : fallback)
        tx.onerror = () => resolve(fallback)
        tx.onabort = () => resolve(fallback)
      } catch {
        resolve(fallback)
      }
    })
  }

  return {
    async list() {
      const all = await run<RecentEntry[]>('readonly', [], (store) => store.getAll())
      return trimRecent(Array.isArray(all) ? all : [])
    },
    async put(entry) {
      await run('readwrite', undefined, (store) => {
        store.put(entry)
      })
      // Ta bort de äldsta när listan blivit för lång.
      const all = await run<RecentEntry[]>('readonly', [], (store) => store.getAll())
      const keep = new Set(trimRecent(all).map((e) => e.projectId))
      const drop = all.filter((e) => !keep.has(e.projectId))
      if (drop.length)
        await run('readwrite', undefined, (store) => {
          for (const e of drop) store.delete(e.projectId)
        })
    },
    async remove(projectId) {
      await run('readwrite', undefined, (store) => {
        store.delete(projectId)
      })
    },
  }
}

function defaultFactory(): IDBFactory | null {
  try {
    return typeof indexedDB === 'undefined' ? null : indexedDB
  } catch {
    return null
  }
}
