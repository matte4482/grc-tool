// Jämförelse mellan två bedömningar av samma kund (fas 7, B-38). Allt matchas på fasta ID:n.

import { allControls, type Framework } from './frameworks/schema'
import type { Action, Project, Status } from './project/schema'
import { isOverdue } from './actions'
import { answerFor, isExcluded } from './assessment'
import { percent, sectionProgress, assessmentProgress } from './compliance'
import { allEvidence } from './evidence/evidence'
import { residualRisk, riskValue } from './risk/rules'

export type ControlChange = 'improved' | 'worsened' | 'unchanged' | 'new' | 'unassessed'

export const CHANGE_LABELS: Record<ControlChange, string> = {
  improved: 'Förbättrade',
  worsened: 'Försämrade',
  unchanged: 'Oförändrade',
  new: 'Nybedömda',
  unassessed: 'Inte längre bedömda',
}

export interface ControlDiff {
  id: string
  title: string
  section: string
  before: Status
  after: Status
  change: ControlChange
}

export interface RiskDiff {
  id: string
  title: string
  /** Faktisk restrisk (eller risken före behandling om inga kontroller finns). */
  before?: number
  after?: number
}

export interface Comparison {
  before: { date: string; pct: number }
  after: { date: string; pct: number }
  sections: { id: string; title: string; before: number; after: number }[]
  controls: ControlDiff[]
  counts: Record<ControlChange, number>
  soa: { included: string[]; excluded: string[] }
  risks: { added: RiskDiff[]; removed: RiskDiff[]; changed: RiskDiff[] }
  actions: { completed: Action[]; added: Action[]; overdue: Action[] }
  evidenceAdded: number
}

export type CompareResult = { ok: true; comparison: Comparison; warnings: string[] } | { ok: false; message: string }

const RANK: Record<Status, number> = { not_assessed: -1, not_fulfilled: 0, partial: 1, fulfilled: 2 }

function changeOf(before: Status, after: Status): ControlChange {
  if (before === after) return 'unchanged'
  if (before === 'not_assessed') return 'new'
  if (after === 'not_assessed') return 'unassessed'
  return RANK[after] > RANK[before] ? 'improved' : 'worsened'
}

function riskValueOf(project: Project, id: string): number | undefined {
  const r = project.risks.find((x) => x.id === id)
  const s = r && residualRisk(project, r, 'actual')
  return s ? riskValue(s) : undefined
}

/** Jämför den tidigare bedömningen med den aktuella. Båda måste gälla samma ramverk. */
export function compareProjects(previous: Project, current: Project, framework: Framework, today: string): CompareResult {
  const same = (p: Project) => p.framework.id === framework.id && p.framework.version === framework.version
  if (!same(previous) || !same(current)) return { ok: false, message: 'Bedömningarna gäller olika ramverk eller versioner och kan inte jämföras.' }
  if (previous.id === current.id) return { ok: false, message: 'Det är samma projektfil. Välj den tidigare bedömningen.' }
  const warnings: string[] = []
  if (previous.client.name.trim().toLowerCase() !== current.client.name.trim().toLowerCase())
    warnings.push(`Kundnamnen skiljer sig: ${previous.client.name} och ${current.client.name}.`)
  if (current.previousId && current.previousId !== previous.id) warnings.push('Filen är inte den bedömning som den aktuella startades från.')
  if (previous.createdAt > current.createdAt) warnings.push('Den valda filen skapades efter den aktuella. Kontrollera att ordningen är rätt.')

  const controls: ControlDiff[] = []
  const soa = { included: [] as string[], excluded: [] as string[] }
  for (const { section: s, control: c } of allControls(framework)) {
    const exBefore = isExcluded(previous, s, c.id)
    const exAfter = isExcluded(current, s, c.id)
    if (exBefore && !exAfter) soa.included.push(c.id)
    if (!exBefore && exAfter) soa.excluded.push(c.id)
    if (exBefore || exAfter) continue
    const before = answerFor(previous, c.id).status
    const after = answerFor(current, c.id).status
    controls.push({ id: c.id, title: c.title, section: s.title, before, after, change: changeOf(before, after) })
  }
  const counts = { improved: 0, worsened: 0, unchanged: 0, new: 0, unassessed: 0 }
  for (const d of controls) counts[d.change] += 1

  const prevRisks = new Set(previous.risks.map((r) => r.id))
  const currRisks = new Set(current.risks.map((r) => r.id))
  const diff = (id: string, title: string): RiskDiff => ({ id, title, before: riskValueOf(previous, id), after: riskValueOf(current, id) })
  const risks = {
    added: current.risks.filter((r) => !prevRisks.has(r.id)).map((r) => diff(r.id, r.title)),
    removed: previous.risks.filter((r) => !currRisks.has(r.id)).map((r) => diff(r.id, r.title)),
    changed: current.risks
      .filter((r) => prevRisks.has(r.id))
      .map((r) => diff(r.id, r.title))
      .filter((d) => d.before !== d.after),
  }

  const prevActions = new Map(previous.actions.map((a) => [a.id, a]))
  const actions = {
    completed: current.actions.filter((a) => a.status === 'done' && prevActions.get(a.id)?.status !== 'done'),
    added: current.actions.filter((a) => !prevActions.has(a.id)),
    overdue: current.actions.filter((a) => isOverdue(a, today)),
  }

  const prevEvidence = new Set(allEvidence(previous).map((e) => e.evidence.sha256))
  const evidenceAdded = allEvidence(current).filter((e) => !prevEvidence.has(e.evidence.sha256)).length

  const pct = (p: Project) => {
    const t = assessmentProgress(p, framework)
    return percent(t.fulfilled, t.applicable)
  }
  const prevSections = sectionProgress(previous, framework)
  const sections = sectionProgress(current, framework).map((s, i) => ({
    id: s.id,
    title: s.title,
    before: percent(prevSections[i].fulfilled, prevSections[i].applicable),
    after: percent(s.fulfilled, s.applicable),
  }))

  return {
    ok: true,
    warnings,
    comparison: {
      before: { date: previous.updatedAt.slice(0, 10), pct: pct(previous) },
      after: { date: current.updatedAt.slice(0, 10), pct: pct(current) },
      sections,
      controls,
      counts,
      soa,
      risks,
      actions,
      evidenceAdded,
    },
  }
}

const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`

/** Sammanfattning i en mening eller två, t.ex. "Uppfyllnaden har ökat från 58 % till 71 % …". */
export function summaryText(c: Comparison): string {
  const { before, after } = c
  const trend =
    after.pct > before.pct
      ? `Uppfyllnaden har ökat från ${before.pct} % till ${after.pct} %`
      : after.pct < before.pct
        ? `Uppfyllnaden har minskat från ${before.pct} % till ${after.pct} %`
        : `Uppfyllnaden är oförändrad, ${after.pct} %`
  const parts = [`${trend}. ${n(c.counts.improved, 'kontroll har', 'kontroller har')} förbättrats och ${c.counts.worsened} har försämrats.`]
  if (c.risks.added.length || c.risks.removed.length) parts.push(`${n(c.risks.added.length, 'risk är ny', 'risker är nya')} och ${c.risks.removed.length} har tagits bort.`)
  if (c.actions.completed.length || c.actions.overdue.length)
    parts.push(`${n(c.actions.completed.length, 'åtgärd har', 'åtgärder har')} avslutats och ${c.actions.overdue.length} är försenade.`)
  return parts.join(' ')
}
