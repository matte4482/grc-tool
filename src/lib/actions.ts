// Åtgärdsplan (B-34). Förslag räknas fram och sparas aldrig; bara godkända åtgärder sparas.
// Ändringsfunktionerna ändrar ett utkast och anropas via store.update.

import { consultantName } from './storage/settings'
import { allControls, type Framework, type Section } from './frameworks/schema'
import { nextId } from './project/project'
import { ActionSchema, type Action, type ActionStatus, type Priority, type Project, type Risk } from './project/schema'
import { answerFor, isDeficient } from './assessment'
import { methodOf, residualRisk, riskValue } from './risk/rules'

export const ACTION_STATUS_LABELS: Record<ActionStatus, string> = {
  not_started: 'Ej påbörjad',
  in_progress: 'Pågår',
  done: 'Klar',
  cancelled: 'Avbruten',
}
export const ACTION_STATUSES: ActionStatus[] = ['not_started', 'in_progress', 'done', 'cancelled']
export const PRIORITY_LABELS: Record<Priority, string> = { high: 'Hög', medium: 'Medel', low: 'Låg' }
const PRIORITY_ORDER: Record<Priority, number> = { high: 0, medium: 1, low: 2 }

/** Ej påbörjad eller pågår. */
export const isOpen = (a: Action): boolean => a.status === 'not_started' || a.status === 'in_progress'
/** Öppen åtgärd vars deadline har passerat. `today` är ÅÅÅÅ-MM-DD. */
export const isOverdue = (a: Action, today: string): boolean => isOpen(a) && !!a.due && a.due < today

// Förslag

/** Ett åtgärdsförslag för en brist som ännu inte har någon åtgärd. */
export interface Suggestion {
  key: string
  source: { type: 'control'; id: string } | { type: 'risk'; id: string }
  title: string
  reason: string
  priority: Priority
  controls: string[]
  risks: string[]
}

/** Kontroller och risker som redan har en åtgärd, oavsett status. */
function covered(project: Project): { controls: Set<string>; risks: Set<string> } {
  const controls = new Set<string>()
  const risks = new Set<string>()
  for (const a of project.actions) {
    a.controls.forEach((c) => controls.add(c))
    a.risks.forEach((r) => risks.add(r))
    if (a.source.type === 'control') controls.add(a.source.id)
    if (a.source.type === 'risk') risks.add(a.source.id)
  }
  return { controls, risks }
}

/** Restrisk över acceptansnivån för en risk som inte är accepterad. */
function riskNeedsAction(project: Project, risk: Risk): boolean {
  if (risk.treatment === 'accept') return false
  const actual = residualRisk(project, risk, 'actual')
  return !!actual && riskValue(actual) > methodOf(project).acceptanceThreshold
}

type Context = { project: Project; done: ReturnType<typeof covered>; sections: Map<string, Section> }

const context = (project: Project, framework: Framework): Context => ({
  project,
  done: covered(project),
  sections: new Map(allControls(framework).map(({ section, control }) => [control.id, section])),
})

const deficient = (ctx: Context, controlId: string): boolean => {
  const section = ctx.sections.get(controlId)
  return !!section && !ctx.done.controls.has(controlId) && isDeficient(ctx.project, section, controlId)
}

/** Förslag för en risk som behöver åtgärd. Tar med riskens bristande kontroller utan åtgärd. */
function riskSuggestion(ctx: Context, r: Risk): Suggestion | undefined {
  if (ctx.done.risks.has(r.id) || !riskNeedsAction(ctx.project, r)) return undefined
  return {
    key: `risk:${r.id}`,
    source: { type: 'risk', id: r.id },
    title: `Behandla ${r.id} ${r.title}`,
    reason: `Restrisken ${riskValue(residualRisk(ctx.project, r, 'actual')!)} är över acceptansnivån ${methodOf(ctx.project).acceptanceThreshold}.`,
    priority: 'high',
    controls: [...new Set(r.controls.map((l) => l.control))].filter((c) => deficient(ctx, c)),
    risks: [r.id],
  }
}

function controlSuggestion(ctx: Context, controlId: string, title: string): Suggestion {
  const notFulfilled = answerFor(ctx.project, controlId).status === 'not_fulfilled'
  return {
    key: `control:${controlId}`,
    source: { type: 'control', id: controlId },
    title: `Åtgärda ${controlId} ${title}`,
    reason: notFulfilled ? 'Ej uppfylld.' : 'Delvis uppfylld.',
    priority: notFulfilled ? 'high' : 'medium',
    controls: [controlId],
    risks: [],
  }
}

/**
 * Förslag för risker över acceptansnivån och för tillämpliga kontroller som är
 * delvis eller ej uppfyllda. En kontroll som ingår i ett riskförslag föreslås inte
 * en gång till. Viktigast först.
 */
export function suggestions(project: Project, framework: Framework): Suggestion[] {
  const ctx = context(project, framework)
  const result = project.risks.map((r) => riskSuggestion(ctx, r)).filter((x) => x !== undefined)
  const inRisk = new Set(result.flatMap((x) => x.controls))
  for (const { control } of allControls(framework))
    if (!inRisk.has(control.id) && deficient(ctx, control.id)) result.push(controlSuggestion(ctx, control.id, control.title))
  return result.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority])
}

/** Förslaget för en viss kontroll eller risk, om det finns. Samma resultat som i suggestions(). */
export function suggestionFor(project: Project, framework: Framework, kind: 'control' | 'risk', id: string): Suggestion | undefined {
  const ctx = context(project, framework)
  if (kind === 'risk') {
    const risk = project.risks.find((r) => r.id === id)
    return risk && riskSuggestion(ctx, risk)
  }
  if (!deficient(ctx, id)) return undefined
  for (const r of project.risks) {
    const s = r.controls.some((l) => l.control === id) ? riskSuggestion(ctx, r) : undefined
    if (s?.controls.includes(id)) return s
  }
  return controlSuggestion(ctx, id, allControls(framework).find((x) => x.control.id === id)!.control.title)
}

// Ändringar

function find(draft: Project, actionId: string): Action {
  const a = draft.actions.find((x) => x.id === actionId)
  if (!a) throw new Error(`Åtgärden ${actionId} finns inte.`)
  return a
}

function logOnRisks(draft: Project, riskIds: string[], now: string, text: string): void {
  for (const r of draft.risks) if (riskIds.includes(r.id)) r.history.push({ at: now, by: consultantName(), text })
}

/** Gör ett förslag till en åtgärd med nytt ATG-ID. Returnerar ID:t. */
export function acceptSuggestion(draft: Project, s: Suggestion, now: string): string {
  const id = nextId(draft, 'action')
  draft.actions.push(
    ActionSchema.parse({ id, title: s.title, source: s.source, controls: s.controls, risks: s.risks, priority: s.priority, createdAt: now.slice(0, 10) }),
  )
  logOnRisks(draft, s.risks, now, `Åtgärd ${id} skapad`)
  return id
}

/** Lägger förslagets kontroller och risker till en befintlig åtgärd. */
export function addToAction(draft: Project, actionId: string, s: Suggestion, now: string): void {
  const a = find(draft, actionId)
  a.controls = [...new Set([...a.controls, ...s.controls])]
  a.risks = [...new Set([...a.risks, ...s.risks])]
  logOnRisks(draft, s.risks, now, `Kopplad till åtgärd ${actionId}`)
}

/** Ny åtgärd utan koppling till en brist. */
export function addManualAction(draft: Project, title: string, now: string): string {
  const id = nextId(draft, 'action')
  draft.actions.push(ActionSchema.parse({ id, title: title.trim() || 'Ny åtgärd', source: { type: 'manual' }, createdAt: now.slice(0, 10) }))
  return id
}

export type ActionText = 'title' | 'description' | 'owner'

export function setActionText(draft: Project, actionId: string, field: ActionText, value: string): void {
  find(draft, actionId)[field] = value
}

/** Deadline som ÅÅÅÅ-MM-DD. Tom sträng tar bort den. */
export function setDue(draft: Project, actionId: string, due: string): void {
  const a = find(draft, actionId)
  if (due) a.due = due
  else delete a.due
}

export function setPriority(draft: Project, actionId: string, priority: Priority | undefined): void {
  const a = find(draft, actionId)
  if (priority) a.priority = priority
  else delete a.priority
}

/** Ny status. Klar sätter slutdatum; annan status tar bort det. */
export function setActionStatus(draft: Project, actionId: string, status: ActionStatus, now: string): void {
  const a = find(draft, actionId)
  if (a.status === status) return
  a.status = status
  if (status === 'done') a.completedAt = now.slice(0, 10)
  else delete a.completedAt
  logOnRisks(draft, a.risks, now, `Åtgärd ${actionId}: ${ACTION_STATUS_LABELS[status].toLowerCase()}`)
}

/** Tar bort en kontroll eller risk från åtgärden. Källan ändras inte. */
export function unlink(draft: Project, actionId: string, kind: 'control' | 'risk', id: string): void {
  const a = find(draft, actionId)
  if (kind === 'control') a.controls = a.controls.filter((c) => c !== id)
  else a.risks = a.risks.filter((r) => r !== id)
}

// Sammanställningar

/** Åtgärder kopplade till en kontroll eller risk. */
export function actionsFor(project: Project, kind: 'control' | 'risk', id: string): Action[] {
  return project.actions.filter((a) => (kind === 'control' ? a.controls.includes(id) : a.risks.includes(id)))
}

/** Om alla kopplade kontroller är uppfyllda (eller bortvalda) och alla kopplade risker är hanterade. */
function resolved(project: Project, a: Action): boolean {
  if (a.controls.length === 0 && a.risks.length === 0) return false
  const controlOk = (id: string) => {
    const x = answerFor(project, id)
    return !x.applicable || x.status === 'fulfilled'
  }
  const riskOk = (id: string) => {
    const r = project.risks.find((x) => x.id === id)
    return !r || !riskNeedsAction(project, r)
  }
  return a.controls.every(controlOk) && a.risks.every(riskOk)
}

/** Det som behöver uppmärksamhet för en åtgärd. */
export function actionWarnings(project: Project, a: Action, today: string): string[] {
  const w: string[] = []
  if (isOverdue(a, today)) w.push('Försenad')
  if (isOpen(a) && !a.owner.trim()) w.push('Saknar ansvarig')
  if (isOpen(a) && !a.due) w.push('Saknar deadline')
  if (isOpen(a) && resolved(project, a)) w.push('Underlaget är åtgärdat. Stäng åtgärden?')
  if (a.status === 'done' && (a.controls.length || a.risks.length) && !resolved(project, a)) w.push('Klar, men bristen finns kvar. Uppdatera status på kontrollen eller risken.')
  return w
}

export interface ActionSummary {
  open: number
  overdue: number
  done: number
  cancelled: number
}

export function actionSummary(project: Project, today: string): ActionSummary {
  const s: ActionSummary = { open: 0, overdue: 0, done: 0, cancelled: 0 }
  for (const a of project.actions) {
    if (isOpen(a)) s.open += 1
    if (isOverdue(a, today)) s.overdue += 1
    if (a.status === 'done') s.done += 1
    if (a.status === 'cancelled') s.cancelled += 1
  }
  return s
}

export interface ActionFilter {
  query: string
  /** 'open' = ej påbörjad och pågår. */
  status: 'open' | 'all' | ActionStatus
  owner: string
  overdue: boolean
}

export const NO_ACTION_FILTER: ActionFilter = { query: '', status: 'open', owner: '', overdue: false }

/** Åtgärderna som matchar filtret, sorterade på prioritet, deadline och ID. */
export function filterActions(project: Project, f: ActionFilter, today: string): Action[] {
  const q = f.query.trim().toLowerCase()
  return project.actions
    .filter((a) => (f.status === 'all' ? true : f.status === 'open' ? isOpen(a) : a.status === f.status))
    .filter((a) => !f.owner || a.owner === f.owner)
    .filter((a) => !f.overdue || isOverdue(a, today))
    .filter((a) => !q || [a.id, a.title, a.description, a.owner, ...a.controls, ...a.risks].some((t) => t.toLowerCase().includes(q)))
    .sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority ?? 'low'] - PRIORITY_ORDER[b.priority ?? 'low'] ||
        (a.due ?? '9999').localeCompare(b.due ?? '9999') ||
        a.id.localeCompare(b.id),
    )
}

/** Ansvariga som förekommer, för filtret. */
export const actionOwners = (project: Project): string[] =>
  [...new Set(project.actions.map((a) => a.owner.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv'))

/** Källan som text, t.ex. "Från A.8.20" eller "Manuell". */
export function sourceText(a: Action): string {
  return a.source.type === 'manual' ? 'Manuell' : `Från ${a.source.id}`
}

/** En rad i riskbehandlingsplanen (krav 6.1.3). */
export interface PlanRow {
  risk: Risk
  before: number
  planned?: number
  actual?: number
  actions: Action[]
}

/** Riskbehandlingsplanen: bedömda risker, högst risk först, med sina åtgärder. */
export function treatmentPlan(project: Project): PlanRow[] {
  return project.risks
    .filter((r) => r.before)
    .map((risk) => {
      const planned = residualRisk(project, risk, 'planned')
      const actual = residualRisk(project, risk, 'actual')
      return {
        risk,
        before: riskValue(risk.before!),
        planned: planned && riskValue(planned),
        actual: actual && riskValue(actual),
        actions: actionsFor(project, 'risk', risk.id).filter((a) => a.status !== 'cancelled'),
      }
    })
    .sort((a, b) => b.before - a.before || a.risk.id.localeCompare(b.risk.id))
}
