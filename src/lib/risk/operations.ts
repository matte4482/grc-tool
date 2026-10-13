import { takeId } from '../project/project'
import { RiskSchema, type Project, type Risk, type RiskControlLink, type RiskMethod, type Treatment } from '../project/schema'
import { methodOf, residualRisk, riskValue, type Score } from './rules'

// Ändringar i riskregistret och riskmetoden. Ändrar ett utkast och anropas via store.update.

function find(draft: Project, riskId: string): Risk {
  const r = draft.risks.find((x) => x.id === riskId)
  if (!r) throw new Error(`Risken ${riskId} finns inte.`)
  return r
}

function log(risk: Risk, now: string, text: string): void {
  risk.history.push({ at: now, by: '', text })
}

/** Ny tom risk med nästa lediga ID. Returnerar ID:t. */
export function addRisk(draft: Project, title: string, now: string): string {
  const { id, nextNumber } = takeId(draft.nextNumber, 'risk')
  draft.nextNumber = nextNumber
  const risk = RiskSchema.parse({ id, title: title.trim() || 'Ny risk', identifiedAt: now.slice(0, 10) })
  log(risk, now, 'Risk skapad')
  draft.risks.push(risk)
  return id
}

/** Tar bort en risk. ID:t återanvänds aldrig (B-17). Kontroller som bara var låsta av risken låses upp. */
export function removeRisk(draft: Project, riskId: string): void {
  draft.risks = draft.risks.filter((r) => r.id !== riskId)
  for (const a of draft.actions) a.risks = a.risks.filter((id) => id !== riskId)
}

export type RiskText = 'title' | 'description' | 'threat' | 'vulnerability' | 'owner' | 'treatmentPlan'

export function setRiskText(draft: Project, riskId: string, field: RiskText, value: string): void {
  find(draft, riskId)[field] = value
}

export function setAssets(draft: Project, riskId: string, assets: string[]): void {
  find(draft, riskId).assets = assets.map((a) => a.trim()).filter(Boolean)
}

/** Bedömning före behandling. Räknas som en ny bedömning, med datum och historik. */
export function setBefore(draft: Project, riskId: string, score: Score | undefined, now: string): void {
  const r = find(draft, riskId)
  r.before = score ? { ...score } : undefined
  r.lastAssessedAt = now.slice(0, 10)
  log(r, now, score ? `Bedömd före behandling: K ${score.consequence} × S ${score.likelihood} = ${riskValue(score)}` : 'Bedömning borttagen')
}

const TREATMENT_LABELS: Record<Treatment, string> = {
  undecided: 'Ej beslutad',
  reduce: 'Reducera',
  share: 'Dela',
  accept: 'Acceptera',
  avoid: 'Undvik',
}
export { TREATMENT_LABELS }

export function setTreatment(draft: Project, riskId: string, treatment: Treatment, now: string): void {
  const r = find(draft, riskId)
  if (r.treatment === treatment) return
  r.treatment = treatment
  log(r, now, `Behandling: ${TREATMENT_LABELS[treatment]}`)
}

/**
 * Kopplar en kontroll till risken. Kontrollen låses som tillämplig i SoA. Var
 * den bortvald tas den tillbaka, och funktionen returnerar en notis om det.
 */
export function linkControl(draft: Project, riskId: string, link: RiskControlLink, now: string): string | undefined {
  const r = find(draft, riskId)
  if (r.controls.some((l) => l.control === link.control)) return undefined
  r.controls.push({ ...link })
  log(r, now, `${link.control} kopplad`)
  const answer = draft.controls[link.control]
  if (answer && answer.applicable === false) {
    answer.applicable = true
    return `${link.control} var bortvald i SoA och är nu tillämplig igen, eftersom den är kopplad till ${riskId}.`
  }
  return undefined
}

export function unlinkControl(draft: Project, riskId: string, controlId: string, now: string): void {
  const r = find(draft, riskId)
  r.controls = r.controls.filter((l) => l.control !== controlId)
  log(r, now, `${controlId} borttagen`)
}

export function setLink(draft: Project, riskId: string, controlId: string, change: Partial<Pick<RiskControlLink, 'effect' | 'type'>>): void {
  const link = find(draft, riskId).controls.find((l) => l.control === controlId)
  if (link) Object.assign(link, change)
}

export type ApproveResult = { ok: true } | { ok: false; message: string }

/**
 * Riskägaren godkänner den faktiska restrisken. Över acceptansnivån krävs ett
 * aktivt beslut med motivering. Restrisken sparas, så att ändringar syns.
 */
export function approve(draft: Project, riskId: string, by: string, justification: string, now: string): ApproveResult {
  const r = find(draft, riskId)
  const actual = residualRisk(draft, r, 'actual')
  if (!actual) return { ok: false, message: 'Risken måste bedömas innan restrisken kan godkännas.' }
  if (!by.trim()) return { ok: false, message: 'Ange vem som godkänner.' }
  const above = riskValue(actual) > methodOf(draft).acceptanceThreshold
  if (above && !justification.trim()) return { ok: false, message: 'Restrisken är över acceptansnivån. Ett godkännande kräver en motivering.' }
  r.approval = { by: by.trim(), at: now.slice(0, 10), aboveThreshold: above, justification: justification.trim(), residual: riskValue(actual) }
  log(r, now, `Restrisk ${riskValue(actual)} godkänd av ${by.trim()}`)
  return { ok: true }
}

export function revokeApproval(draft: Project, riskId: string, now: string): void {
  const r = find(draft, riskId)
  r.approval = null
  log(r, now, 'Godkännande borttaget')
}

/** Ändrar riskmetoden. Utgår från standardmetoden om ingen är fastställd. */
export function editMethod(draft: Project, change: (m: RiskMethod) => void): void {
  const m = structuredClone(methodOf(draft))
  change(m)
  draft.riskMethod = m
}

/** Lägger till en konsekvenstyp med tomma beskrivningar. */
export function addConsequenceType(m: RiskMethod, name: string): void {
  m.consequence.types.push(name)
  for (const l of m.consequence.levels) l.descriptions.push('')
}

/** Tar bort en konsekvenstyp. Minst en måste finnas kvar. */
export function removeConsequenceType(m: RiskMethod, index: number): void {
  if (m.consequence.types.length <= 1) return
  m.consequence.types.splice(index, 1)
  for (const l of m.consequence.levels) l.descriptions.splice(index, 1)
}

/**
 * Riskmetod och risker från ett annat projekt, utan bedömningar ("Kopiera från
 * kund", B-29). Riskerna får nya ID:n och saknar ägare, bedömning och godkännande.
 */
export function copyFromProject(draft: Project, source: Project, now: string): number {
  if (source.riskMethod) draft.riskMethod = structuredClone(source.riskMethod)
  for (const s of source.risks) {
    const { id, nextNumber } = takeId(draft.nextNumber, 'risk')
    draft.nextNumber = nextNumber
    const risk = RiskSchema.parse({
      id,
      title: s.title,
      description: s.description,
      threat: s.threat,
      vulnerability: s.vulnerability,
      assets: s.assets,
      controls: s.controls,
      template: s.template,
      identifiedAt: now.slice(0, 10),
    })
    log(risk, now, `Kopierad från ${source.client.name}`)
    draft.risks.push(risk)
  }
  return source.risks.length
}
