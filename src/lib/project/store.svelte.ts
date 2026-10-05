import type { SaveTarget } from '../storage/target'
import { localBackupStore, type Backup } from '../storage/backup'
import type { Framework } from '../frameworks/schema'
import type { Project } from './schema'
import type { IdKind } from './project'
import {
  AUTOSAVE_INTERVAL_MS,
  ProjectSession,
  describeStatus,
  type OpenResult,
  type RestoreResult,
  type SaveResult,
  type SaveStatus,
} from './session'

// Store: appens enda källa för det öppna projektet (ARCHITECTURE B-23).
//
// All logik ligger i ProjectSession (session.ts) och testas där. Den här filen
// gör bara värdena reaktiva: varje gång sessionen ändras kopieras projekt och
// status till $state, och vyerna ritas om. Vyerna läser härifrån och ändrar
// bara via metoderna nedan, aldrig direkt i projektet.

class ProjectStore {
  #session = new ProjectSession({ onChange: () => this.#sync(), backup: localBackupStore() })

  // $state.raw: objekten byts ut vid varje ändring i stället för att ändras på
  // plats, så Svelte behöver inte bevaka varje fält för sig.
  project = $state.raw<Project | null>(null)
  framework = $state.raw<Framework | null>(null)
  target = $state.raw<SaveTarget | null>(null)
  status = $state.raw<SaveStatus>({ state: 'empty' })
  hasUnsavedChanges = $state(false)
  /** Sant om reservkopian i localStorage inte kunde skrivas (B-25). */
  backupFailed = $state(false)
  /** Reservkopior i webbläsaren. Uppdateras bara när inget projekt är öppet (startsidan). */
  backups = $state.raw<Backup[]>(this.#session.listBackups())

  /** Sparstatusen som text och färg för sidhuvudet. */
  statusText = $derived(describeStatus(this.status, this.target))

  #sync(): void {
    this.project = this.#session.project
    this.framework = this.#session.framework
    this.target = this.#session.target
    this.status = this.#session.status
    this.hasUnsavedChanges = this.#session.hasUnsavedChanges
    this.backupFailed = this.#session.backupFailed
    // Listan läses bara när startsidan visas, inte vid varje ändring i ett projekt.
    if (!this.project) this.backups = this.#session.listBackups()
  }

  start(project: Project, target: SaveTarget): Promise<SaveResult> {
    return this.#session.start(project, target)
  }
  open(text: string, target: SaveTarget): OpenResult {
    return this.#session.open(text, target)
  }
  close(): void {
    this.#session.close()
  }
  update(change: (draft: Project) => void): void {
    this.#session.update(change)
  }
  newId(kind: IdKind): string {
    return this.#session.newId(kind)
  }
  save(): Promise<SaveResult> {
    return this.#session.save()
  }
  saveAs(target: SaveTarget): Promise<SaveResult> {
    return this.#session.saveAs(target)
  }
  restoreBackup(): RestoreResult {
    return this.#session.restoreBackup()
  }
  discardBackup(): void {
    this.#session.discardBackup()
  }
  openBackup(projectId: string, target: SaveTarget): RestoreResult {
    return this.#session.openBackup(projectId, target)
  }
  removeBackup(projectId: string): void {
    this.#session.removeBackup(projectId)
    this.backups = this.#session.listBackups()
  }

  /**
   * Startar autosparning och varning vid stängning. Anropas en gång när appen
   * startar. Returnerar en funktion som stänger av båda.
   */
  startAutosave(intervalMs = AUTOSAVE_INTERVAL_MS): () => void {
    const timer = setInterval(() => void this.#session.autosaveTick(), intervalMs)
    const warn = (e: BeforeUnloadEvent) => {
      if (!this.#session.hasUnsavedChanges) return
      e.preventDefault()
      e.returnValue = '' // krävs av äldre versioner av Chrome och Edge
    }
    window.addEventListener('beforeunload', warn)
    return () => {
      clearInterval(timer)
      window.removeEventListener('beforeunload', warn)
    }
  }
}

export const store = new ProjectStore()
