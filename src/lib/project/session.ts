import type { Framework } from '../frameworks/schema'
import { getFramework } from '../frameworks'
import type { SaveTarget } from '../storage/target'
import { isNewerThan, noBackup, type Backup, type BackupStore } from '../storage/backup'
import { checkAgainstFramework, parseProject, serializeProject, takeId, validateProject, type IdKind } from './project'
import type { Project } from './schema'

// Sessionen i det öppna projektet, sparstatusen och
// allt som ändrar dem (ARCHITECTURE B-23).
// store.svelte.ts gör den reaktiv för gränssnittet.
//
// Regler:
// - Projektet ändras aldrig direkt.
// - Ett ogiltigt projekt skrivs aldrig till fil.

export type SaveStatus =
  | { state: 'empty' }              
  | { state: 'saved'; at: string }       
  | { state: 'unsaved'; since: string }
  | { state: 'saving' }
  | { state: 'error'; message: string; details: string[]; since: string }

export type SaveResult = { ok: true } | { ok: false; message: string; details: string[] }

export type OpenResult =
  | { ok: true; warnings: string[]; newerBackup?: Pick<Backup, 'changedAt' | 'downloadedAt'> }
  | { ok: false; errors: string[] }

export type RestoreResult = { ok: true } | { ok: false; errors: string[] }

export const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000

export class ProjectSession {
  #project: Project | null = null
  #framework: Framework | null = null
  #target: SaveTarget | null = null
  #status: SaveStatus = { state: 'empty' }
  #revision = 0
  #savedRevision = 0
  #now: () => Date
  #onChange: () => void
  /** Reservkopian i localStorage (B-25). */
  #backup: BackupStore
  #backupFailed = false

  constructor(opts: { now?: () => Date; onChange?: () => void; backup?: BackupStore } = {}) {
    this.#now = opts.now ?? (() => new Date())
    this.#onChange = opts.onChange ?? (() => {})
    this.#backup = opts.backup ?? noBackup
  }

  get project(): Project | null {
    return this.#project
  }
  get framework(): Framework | null {
    return this.#framework
  }
  get target(): SaveTarget | null {
    return this.#target
  }
  get status(): SaveStatus {
    return this.#status
  }
  get hasUnsavedChanges(): boolean {
    return this.#project !== null && this.#revision !== this.#savedRevision
  }
  /** Sant om den senaste reservkopian inte gick att skriva, t.ex. för att localStorage är avstängd eller full. */
  get backupFailed(): boolean {
    return this.#backupFailed
  }

  // initierar projektet
  async start(project: Project, target: SaveTarget): Promise<SaveResult> {
    const framework = getFramework(project.framework.id, project.framework.version)
    if (!framework) return this.#fail('Ramverket finns inte i den här versionen av verktyget.', [])
    this.#project = project
    this.#framework = framework
    this.#target = target
    this.#revision += 1
    this.#writeBackup()
    this.#setStatus({ state: 'unsaved', since: this.#stamp() })
    return this.save()
  }

   // Öppnar en projektfil. Kontrollerar validitet och ramverk.
  open(text: string, target: SaveTarget): OpenResult {
    const parsed = parseProject(text)
    if (!parsed.ok) return { ok: false, errors: parsed.errors }
    const { project } = parsed
    const framework = getFramework(project.framework.id, project.framework.version)
    if (!framework)
      return {
        ok: false,
        errors: [`Projektet gäller ${project.framework.id} ${project.framework.version}, som inte finns i den här versionen av verktyget.`],
      }
    this.#project = project
    this.#framework = framework
    this.#target = target
    this.#savedRevision = this.#revision
    this.#setStatus({ state: 'saved', at: project.updatedAt })
    const warnings = checkAgainstFramework(project, framework)

    // Finns en reservkopia med nyare ändringar än filen frågar gränssnittet om
    // den ska återställas. Är filen minst lika ny har ändringarna nått filen,
    // och kopian behövs inte längre.
    const backup = this.#backup.read(project.id)
    if (backup && isNewerThan(backup, project.updatedAt))
      return { ok: true, warnings, newerBackup: { changedAt: backup.changedAt, downloadedAt: backup.downloadedAt } }
    if (backup) this.#backup.clear(project.id)
    return { ok: true, warnings }
  }

  close(): void {
    this.#project = null
    this.#framework = null
    this.#target = null
    this.#savedRevision = this.#revision
    this.#setStatus({ state: 'empty' })
  }

   //Ändrar projektet genom kopian 'draft'
  update(change: (draft: Project) => void): void {
    if (!this.#project) throw new Error('Inget projekt är öppet.')
    const draft = structuredClone(this.#project)
    change(draft)
    this.#project = draft
    this.#revision += 1
    this.#writeBackup()
    if (this.#status.state !== 'unsaved' && this.#status.state !== 'saving')
      this.#setStatus({ state: 'unsaved', since: this.#stamp() })
    else this.#onChange()
  }

  /**
   * Reserverar nästa ID (R-, ATG- eller EV-) och sparar det uppräknade
   * löpnumret i projektet. Det enda sättet att skapa ett nytt ID (B-17).
   */
  newId(kind: IdKind): string {
    if (!this.#project) throw new Error('Inget projekt är öppet.')
    const { id, nextNumber } = takeId(this.#project.nextNumber, kind)
    this.update((draft) => {
      draft.nextNumber = nextNumber
    })
    return id
  }

  /** Byter sparmål ("Spara som") och sparar. */
  async saveAs(target: SaveTarget): Promise<SaveResult> {
    this.#target = target
    return this.save()
  }

  /**
   * Sparar projektet till sparmålet.
   *
   * 1. Projektet kontrolleras. Är det ogiltigt skrivs ingenting, och felen visas.
   * 2. Texten skrivs. Misslyckas skrivningen visas felet och ändringarna räknas
   *    fortfarande som osparade.
   * 3. Om projektet ändrades medan filen skrevs räknas det fortfarande som osparat.
   */
  async save(): Promise<SaveResult> {
    const project = this.#project
    const target = this.#target
    if (!project || !target) return this.#fail('Inget projekt att spara.', [])

    const revision = this.#revision
    const toSave: Project = { ...project, updatedAt: this.#stamp() }

    const problems = validateProject(toSave)
    if (problems.length) return this.#fail('Projektet innehåller fel och sparades inte.', problems)

    let text: string
    try {
      text = serializeProject(toSave)
    } catch (e) {
      // Ska inte kunna hända efter validateProject, men en ofullständig fil får aldrig skrivas.
      return this.#fail('Projektet kunde inte göras om till text och sparades inte.', [errorText(e)])
    }

    this.#setStatus({ state: 'saving' })
    try {
      await target.write(text)
    } catch (e) {
      return this.#fail(`Kunde inte skriva till ${target.label}.`, [errorText(e)])
    }

    // Behåll ändringar som gjordes medan filen skrevs, men med den sparade tidsstämpeln.
    this.#project = this.#revision === revision ? toSave : { ...this.#project!, updatedAt: toSave.updatedAt }
    this.#savedRevision = revision

    // Reservkopian: i en mapp vet vi att filen är skriven, så kopian rensas. En
    // nedladdning kan ha avbrutits i webbläsarens dialog, så där får kopian ligga
    // kvar tills den nedladdade filen öppnas igen (B-25). Har projektet ändrats
    // under skrivningen innehåller kopian de nya ändringarna och ska vara kvar.
    if (this.#revision === revision) {
      if (target.kind === 'folder') this.#backup.clear(toSave.id)
      else this.#backup.markDownloaded(toSave.id, toSave.updatedAt)
    }

    this.#setStatus(
      this.#revision === revision ? { state: 'saved', at: toSave.updatedAt } : { state: 'unsaved', since: this.#stamp() },
    )
    return { ok: true }
  }

  /**
   * Ersätter det öppna projektet med reservkopians nyare ändringar. Anropas när
   * open() rapporterat newerBackup och konsulten valt att återställa. Projektet
   * räknas som osparat, så att ändringarna sparas till filen.
   */
  restoreBackup(): RestoreResult {
    if (!this.#project) return { ok: false, errors: ['Inget projekt är öppet.'] }
    const backup = this.#backup.read(this.#project.id)
    if (!backup) return { ok: false, errors: ['Reservkopian finns inte längre.'] }
    return this.#loadBackup(backup, this.#target!)
  }

  /** Tar bort reservkopian för det öppna projektet, när konsulten valt filens version. */
  discardBackup(): void {
    if (this.#project) this.#backup.clear(this.#project.id)
  }

  /**
   * Öppnar en reservkopia utan fil, från listan på startsidan. Används när filen
   * inte går att öppna eller aldrig sparades, till exempel om en nedladdning
   * avbröts. Projektet räknas som osparat och sparas till `target`.
   */
  openBackup(projectId: string, target: SaveTarget): RestoreResult {
    const backup = this.#backup.read(projectId)
    if (!backup) return { ok: false, errors: ['Reservkopian finns inte längre.'] }
    return this.#loadBackup(backup, target)
  }

  /** Alla reservkopior i webbläsaren, nyast först. */
  listBackups(): Backup[] {
    return this.#backup.list()
  }

  /** Tar bort en reservkopia. Anroparen ansvarar för att fråga först. */
  removeBackup(projectId: string): void {
    this.#backup.clear(projectId)
  }

  #loadBackup(backup: Backup, target: SaveTarget): RestoreResult {
    const parsed = parseProject(backup.project)
    if (!parsed.ok) return { ok: false, errors: parsed.errors }
    const framework = getFramework(parsed.project.framework.id, parsed.project.framework.version)
    if (!framework) return { ok: false, errors: ['Reservkopians ramverk finns inte i den här versionen av verktyget.'] }
    this.#project = parsed.project
    this.#framework = framework
    this.#target = target
    this.#revision += 1
    this.#setStatus({ state: 'unsaved', since: backup.changedAt })
    return { ok: true }
  }

  #writeBackup(): void {
    if (!this.#project) return
    const ok = this.#backup.write(this.#project, this.#target?.label ?? '', this.#stamp())
    this.#backupFailed = !ok && this.#backup !== noBackup
  }

  /**
   * Anropas av autosparningens timer. Sparar bara om något har ändrats, målet
   * tillåter autosparning och ingen sparning pågår.
   */
  async autosaveTick(): Promise<void> {
    if (!this.hasUnsavedChanges || !this.#target?.autosave || this.#status.state === 'saving') return
    await this.save()
  }

  #fail(message: string, details: string[]): SaveResult {
    this.#setStatus({ state: 'error', message, details, since: this.#stamp() })
    return { ok: false, message, details }
  }

  #setStatus(status: SaveStatus): void {
    this.#status = status
    this.#onChange()
  }

  #stamp(): string {
    return this.#now().toISOString()
  }
}

function errorText(e: unknown): string {
  if (e instanceof DOMException && e.name === 'NotAllowedError') return 'Webbläsaren saknar behörighet att skriva i mappen.'
  if (e instanceof DOMException && e.name === 'NotFoundError') return 'Mappen eller filen finns inte längre.'
  return e instanceof Error ? e.message : String(e)
}

/** Sparstatusen som text för sidhuvudet, t.ex. "Sparat till kund.grc.json 14:42". */
export function describeStatus(status: SaveStatus, target: SaveTarget | null): { text: string; tone: 'ok' | 'warn' | 'error' | 'muted' } {
  const time = (iso: string) => new Date(iso).toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
  switch (status.state) {
    case 'empty':
      return { text: 'Inget projekt öppet', tone: 'muted' }
    case 'saving':
      return { text: 'Sparar …', tone: 'muted' }
    case 'saved':
      return target?.kind === 'download'
        ? { text: `Nedladdad som ${target.label} ${time(status.at)}. Sparas inte automatiskt.`, tone: 'warn' }
        : { text: `Sparat till ${target?.label ?? 'fil'} ${time(status.at)}`, tone: 'ok' }
    case 'unsaved':
      return { text: `Osparade ändringar sedan ${time(status.since)}`, tone: 'warn' }
    case 'error':
      return { text: status.message, tone: 'error' }
  }
}
