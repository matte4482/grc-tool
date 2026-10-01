import type { Framework } from '../frameworks/schema'
import { getFramework } from '../frameworks'
import type { SaveTarget } from '../storage/target'
import { checkAgainstFramework, parseProject, serializeProject, takeId, validateProject, type IdKind } from './project'
import type { Project } from './schema'

// Kärnan i store (ARCHITECTURE B-23): det öppna projektet, sparstatusen och
// allt som ändrar dem. Ren TypeScript utan Svelte, så att logiken kan testas.
// store.svelte.ts gör den reaktiv för gränssnittet.
//
// Regler:
// - Projektet ändras aldrig på plats. Varje ändring ger ett nytt projektobjekt
//   (update), så att store alltid märker ändringen och markerar filen som osparad.
// - Ett ogiltigt projekt skrivs aldrig till fil. Felet visas i sparstatusen.
// - Skrivfel (t.ex. borttagen mapp, nekad behörighet) visas också i sparstatusen.

export type SaveStatus =
  | { state: 'empty' } //                      inget projekt öppet
  | { state: 'saved'; at: string } //          allt sparat
  | { state: 'unsaved'; since: string } //     ändringar som inte är sparade
  | { state: 'saving' }
  | { state: 'error'; message: string; details: string[]; since: string }

export type SaveResult = { ok: true } | { ok: false; message: string; details: string[] }

export type OpenResult =
  | { ok: true; warnings: string[] }
  | { ok: false; errors: string[] }

/** Autosparning var tionde minut, men bara när något har ändrats (Plan 2.0, fas 1). */
export const AUTOSAVE_INTERVAL_MS = 10 * 60 * 1000

export class ProjectSession {
  #project: Project | null = null
  #framework: Framework | null = null
  #target: SaveTarget | null = null
  #status: SaveStatus = { state: 'empty' }
  /** Räknas upp vid varje ändring. Avgör om en sparning hann bli inaktuell. */
  #revision = 0
  #savedRevision = 0
  #now: () => Date
  #onChange: () => void

  constructor(opts: { now?: () => Date; onChange?: () => void } = {}) {
    this.#now = opts.now ?? (() => new Date())
    this.#onChange = opts.onChange ?? (() => {})
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
  /** Sant om det finns ändringar som inte är skrivna till fil. Används för varning vid stängning. */
  get hasUnsavedChanges(): boolean {
    return this.#project !== null && this.#revision !== this.#savedRevision
  }

  /**
   * Börjar arbeta med ett nytt projekt och sparar det direkt, så att filen
   * finns i mappen från start.
   */
  async start(project: Project, target: SaveTarget): Promise<SaveResult> {
    const framework = getFramework(project.framework.id, project.framework.version)
    if (!framework) return this.#fail('Ramverket finns inte i den här versionen av verktyget.', [])
    this.#project = project
    this.#framework = framework
    this.#target = target
    this.#revision += 1
    this.#setStatus({ state: 'unsaved', since: this.#stamp() })
    return this.save()
  }

  /**
   * Öppnar en projektfil. Filen kontrolleras först; en ogiltig fil öppnas inte
   * och det öppna projektet lämnas orört. Avvikelser mot ramverket (t.ex. en
   * okänd kontroll) hindrar inte öppning men returneras som varningar.
   */
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
    return { ok: true, warnings: checkAgainstFramework(project, framework) }
  }

  /** Stänger projektet. Anroparen ansvarar för att fråga om osparade ändringar. */
  close(): void {
    this.#project = null
    this.#framework = null
    this.#target = null
    this.#savedRevision = this.#revision
    this.#setStatus({ state: 'empty' })
  }

  /**
   * Ändrar projektet. `change` får en kopia att ändra i; originalet rörs inte.
   * Kopian blir det nya projektet och filen markeras som osparad.
   */
  update(change: (draft: Project) => void): void {
    if (!this.#project) throw new Error('Inget projekt är öppet.')
    const draft = structuredClone(this.#project)
    change(draft)
    this.#project = draft
    this.#revision += 1
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
    this.#setStatus(
      this.#revision === revision ? { state: 'saved', at: toSave.updatedAt } : { state: 'unsaved', since: this.#stamp() },
    )
    return { ok: true }
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
