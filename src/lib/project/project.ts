import { z } from 'zod'
import type { Framework } from '../frameworks/schema'
import { PROJECT_SCHEMA_VERSION, ProjectSchema, type NextNumber, type Project } from './schema'

// Skapa, läsa in och skriva ut projektfiler. Ren TypeScript utan Svelte,
// så att allt kan testas utan UI (README avsnitt 2).

// Zods inbyggda felmeddelanden på svenska. Egna meddelanden i schemat går före.
const swedish = z.locales.sv()

export type ParseResult = { ok: true; project: Project } | { ok: false; errors: string[] }

// Ett nytt, tomt projekt. `now` och `id` kan anges för tester, ananrs genereras de automatiskt.
export function createProject(opts: {
  client: string
  framework: Pick<Framework, 'id' | 'version'>
  now?: Date
  id?: string
}): Project {
  const now = (opts.now ?? new Date()).toISOString()
  return ProjectSchema.parse({
    schemaVersion: PROJECT_SCHEMA_VERSION,
    tool: 'method-grc',
    id: opts.id ?? crypto.randomUUID(),
    client: { name: opts.client.trim() },
    framework: { id: opts.framework.id, version: opts.framework.version },
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Läser in en projektfil. Kastar inte obegripliga exceptions: vid fel returneras en lista med
 * begripliga felmeddelanden, och inget halvt laddat projekt.
 */
export function parseProject(json: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch {
    return { ok: false, errors: ['Filen är inte giltig JSON.'] }
  }

  if (typeof raw !== 'object' || raw === null || (raw as { tool?: unknown }).tool !== 'method-grc')
    return { ok: false, errors: ['Filen är inte en giltig projektfil.'] }

  const version = (raw as { schemaVersion?: unknown }).schemaVersion
  if (typeof version === 'number' && version > PROJECT_SCHEMA_VERSION)
    return {
      ok: false,
      errors: [`Filen är skapad i en nyare version av verktyget (format ${version}). Uppdatera verktyget.`],
    }

  const result = ProjectSchema.safeParse(raw, { error: swedish.localeError })
  if (result.success) return { ok: true, project: result.data }
  return { ok: false, errors: formatIssues(result.error.issues) }
}

/**
 * Felen i ett projekt som ligger i minnet, som text med sökväg. Tom lista = giltigt.
 * Används av store innan sparande, så att felet kan visas i stället för att
 * serializeProject kastar (B-23).
 */
export function validateProject(project: Project): string[] {
  const result = ProjectSchema.safeParse(project, { error: swedish.localeError })
  return result.success ? [] : formatIssues(result.error.issues)
}

function formatIssues(issues: z.ZodError['issues']): string[] {
  return issues.map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
}

/** Projektet som text, redo att skrivas till fil. Stabil ordning och indrag ger läsbara diffar. */
export function serializeProject(project: Project): string {
  return JSON.stringify(ProjectSchema.parse(project), null, 2) + '\n'
}

//Formaterar ett löpnummer som ID, t.ex. formatId('R', 4) → "R-004". */
export function formatId(prefix: 'R' | 'ATG' | 'EV', n: number): string {
  return `${prefix}-${String(n).padStart(3, '0')}`
}

export type IdKind = keyof NextNumber

/**
 * Nästa lediga ID och de uppräknade löpnumren. Ren funktion: ändrar varken
 * projektet eller `nextNumber`, utan returnerar nya värden som store sparar
 * (ARCHITECTURE B-17, B-23). ID:n återanvänds aldrig.
 */
export function takeId(nextNumber: NextNumber, kind: IdKind): { id: string; nextNumber: NextNumber } {
  const prefix = { risk: 'R', action: 'ATG', evidence: 'EV' } as const
  return {
    id: formatId(prefix[kind], nextNumber[kind]),
    nextNumber: { ...nextNumber, [kind]: nextNumber[kind] + 1 },
  }
}

/**
 * Kontrollerar projektet mot sitt ramverk. Returnerar en lista med problem;
 * tom lista betyder att allt stämmer.
 *
 * - Alla kontroll-ID:n i projektet ska finnas i ramverket.
 * - Bara kontroller i SoA-avsnitt får väljas bort.
 * - En kontroll som är kopplad till en risk får inte vara bortvald (låst som tillämplig).
 * - Risker och åtgärder får bara peka på risker som finns.
 */
export function checkAgainstFramework(project: Project, framework: Framework): string[] {
  const problems: string[] = []

  if (project.framework.id !== framework.id || project.framework.version !== framework.version)
    problems.push(
      `Projektet gäller ${project.framework.id} ${project.framework.version}, men ramverket är ${framework.id} ${framework.version}.`,
    )

  const soaById = new Map<string, boolean>()
  for (const s of framework.sections) for (const g of s.groups) for (const c of g.controls) soaById.set(c.id, s.soa)

  const known = (id: string, where: string) => {
    if (!soaById.has(id)) problems.push(`${where}: okänd kontroll ${id}`)
  }

  for (const [id, a] of Object.entries(project.controls)) {
    known(id, 'Bedömning')
    if (!a.applicable && soaById.get(id) === false) problems.push(`${id} kan inte väljas bort, den ingår inte i SoA.`)
  }

  const riskIds = new Set(project.risks.map((r) => r.id))
  for (const r of project.risks)
    for (const link of r.controls) {
      known(link.control, r.id)
      if (project.controls[link.control]?.applicable === false)
        problems.push(`${link.control} är bortvald i SoA men kopplad till ${r.id}.`)
    }

  for (const a of project.actions) {
    for (const c of a.controls) known(c, a.id)
    if (a.source.type === 'control') known(a.source.id, a.id)
    const risks = a.source.type === 'risk' ? [...a.risks, a.source.id] : a.risks
    for (const r of risks) if (!riskIds.has(r)) problems.push(`${a.id}: okänd risk ${r}`)
  }

  return problems
}
