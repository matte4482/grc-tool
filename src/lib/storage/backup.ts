import type { Project } from '../project/schema'

// Reservkopia i webbläsarens localStorage (ARCHITECTURE B-25).
// Viktigast i Safari och Firefox, där autosparning till fil inte finns.

const PREFIX = 'grc-verktyget:reservkopia:'

// En reservkopia som den ligger i localStorage.
export interface Backup {
  projectId: string
  client: string
  label: string
  changedAt: string
  downloadedAt?: string
  project: string
}

export type KeyValueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>

export interface BackupStore {
  write(project: Project, label: string, changedAt: string): boolean
  markDownloaded(projectId: string, at: string): void
  read(projectId: string): Backup | null
  list(): Backup[]
  clear(projectId: string): void
}

/**
 * Reservkopior i localStorage. Alla anrop är skyddade: localStorage kan saknas,
 * vara avstängd (privat fönster, IT-policy) eller full. Då fungerar verktyget
 * ändå, bara utan reservkopia.
 */
export function localBackupStore(storage: KeyValueStorage | null = defaultStorage()): BackupStore {
  const key = (id: string) => PREFIX + id

  const read = (projectId: string): Backup | null => {
    try {
      const raw = storage?.getItem(key(projectId))
      return raw ? parseBackup(raw) : null
    } catch {
      return null
    }
  }

  return {
    write(project, label, changedAt) {
      if (!storage) return false
      const backup: Backup = {
        projectId: project.id,
        client: project.client.name,
        label,
        changedAt,
        project: JSON.stringify(project),
      }
      try {
        storage.setItem(key(project.id), JSON.stringify(backup))
        return true
      } catch {
        return false
      }
    },

    markDownloaded(projectId, at) {
      const backup = read(projectId)
      if (!backup || !storage) return
      try {
        storage.setItem(key(projectId), JSON.stringify({ ...backup, downloadedAt: at }))
      } catch {
      }
    },

    read,

    list() {
      if (!storage) return []
      const backups: Backup[] = []
      try {
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i)
          if (!k?.startsWith(PREFIX)) continue
          const b = read(k.slice(PREFIX.length))
          if (b) backups.push(b)
        }
      } catch {
        return []
      }
      return backups.sort((a, b) => b.changedAt.localeCompare(a.changedAt))
    },

    clear(projectId) {
      try {
        storage?.removeItem(key(projectId))
      } catch {
        // Kan inte rensas; den skrivs över vid nästa ändring.
      }
    },
  }
}

// Används när localStorage saknas och i tester.
export const noBackup: BackupStore = {
  write: () => false,
  markDownloaded: () => {},
  read: () => null,
  list: () => [],
  clear: () => {},
}

function defaultStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    // Vissa webbläsare kastar redan när localStorage nämns, om den är avstängd.
    return null
  }
}

function parseBackup(raw: string): Backup | null {
  try {
    const b = JSON.parse(raw) as Partial<Backup>
    if (typeof b.projectId !== 'string' || typeof b.project !== 'string' || typeof b.changedAt !== 'string') return null
    return {
      projectId: b.projectId,
      client: typeof b.client === 'string' ? b.client : '',
      label: typeof b.label === 'string' ? b.label : '',
      changedAt: b.changedAt,
      downloadedAt: typeof b.downloadedAt === 'string' ? b.downloadedAt : undefined,
      project: b.project,
    }
  } catch {
    return null
  }
}

// Om kopian innehåller ändringar som är nyare än filen som öppnas. 
export function isNewerThan(backup: Backup, fileUpdatedAt: string): boolean {
  return new Date(backup.changedAt).getTime() > new Date(fileUpdatedAt).getTime()
}
