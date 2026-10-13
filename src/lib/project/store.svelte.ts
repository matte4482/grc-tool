import type { SaveTarget } from '../storage/target'
import { localBackupStore, type Backup } from '../storage/backup'
import { idbRecentStore, mergeRecent, recentEntry, type RecentEntry, type RecentStore } from '../storage/recent'
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
  /** "Senaste arbeten" i IndexedDB (B-26). */
  #recentStore: RecentStore

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

  /** Senaste arbeten på startsidan, senast använda först (B-26). */
  recent = $state.raw<RecentEntry[]>([])

  /** Sparstatusen som text och färg för sidhuvudet. */
  statusText = $derived(describeStatus(this.status, this.target))

  constructor(recentStore: RecentStore = idbRecentStore()) {
    this.#recentStore = recentStore
    void this.refreshRecent()
  }

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

  async start(project: Project, target: SaveTarget): Promise<SaveResult> {
    const r = await this.#session.start(project, target)
    // Även om första sparningen misslyckades är projektet öppet och syns i listan.
    if (this.#session.project) this.#remember()
    return r
  }
  open(text: string, target: SaveTarget): OpenResult {
    const r = this.#session.open(text, target)
    if (r.ok) this.#remember()
    return r
  }
  /** Stänger projektet. Vägrar med osparade ändringar om inte `discard` anges, se session.close(). */
  close(opts: { discard?: boolean } = {}): boolean {
    const closed = this.#session.close(opts)
    if (closed) void this.refreshRecent()
    return closed
  }
  update(change: (draft: Project) => void): void {
    this.#session.update(change)
  }
  newId(kind: IdKind): string {
    return this.#session.newId(kind)
  }
  async save(): Promise<SaveResult> {
    return this.#afterSave(await this.#session.save())
  }
  async saveAs(target: SaveTarget): Promise<SaveResult> {
    return this.#afterSave(await this.#session.saveAs(target))
  }
  restoreBackup(): RestoreResult {
    const r = this.#session.restoreBackup()
    if (r.ok) this.#remember()
    return r
  }
  discardBackup(): void {
    this.#session.discardBackup()
  }
  openBackup(projectId: string, target: SaveTarget): RestoreResult {
    const r = this.#session.openBackup(projectId, target)
    if (r.ok) this.#remember()
    return r
  }
  removeBackup(projectId: string): void {
    this.#session.removeBackup(projectId)
    this.backups = this.#session.listBackups()
  }

  /** Läser om Senaste arbeten från IndexedDB. */
  async refreshRecent(): Promise<void> {
    this.recent = await this.#recentStore.list()
  }
  /** Tar bort ett projekt ur Senaste arbeten. Projektfilen påverkas inte. */
  async removeRecent(projectId: string): Promise<void> {
    await this.#recentStore.remove(projectId)
    await this.refreshRecent()
  }

  #afterSave(r: SaveResult): SaveResult {
    if (r.ok) this.#remember()
    return r
  }

  /** Sparar det öppna projektet först i Senaste arbeten, med aktuellt förlopp. */
  #remember(): void {
    const { project, framework, target } = this.#session
    if (!project || !framework || !target) return
    const entry = recentEntry(project, framework, target, new Date().toISOString())
    const existing = this.recent.find((e) => e.projectId === entry.projectId)
    void this.#recentStore.put(mergeRecent(existing, entry)).then(() => this.refreshRecent())
  }

  /**
   * Startar autosparning och varning vid stängning. Anropas en gång när appen
   * startar. Returnerar en funktion som stänger av båda.
   */
  startAutosave(intervalMs = AUTOSAVE_INTERVAL_MS): () => void {
    const timer = setInterval(async () => {
      const before = this.#session.status
      await this.#session.autosaveTick()
      // Uppdatera förloppet i Senaste arbeten när autosparningen sparade.
      if (this.#session.status !== before && this.#session.status.state === 'saved') this.#remember()
    }, intervalMs)
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
