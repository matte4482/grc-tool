// Bedömning av krav och kontroller, och SoA (B-28). Ren TypeScript.
// Ändringsfunktionerna ändrar ett utkast och anropas via store.update.

import { consultantName } from './storage/settings'
import type { Control, Framework, Group, Section } from './frameworks/schema'
import { needsEvidence } from './evidence/evidence'
import { emptyAnswer } from './project/project'
import type { ControlAssessment, Project, Status } from './project/schema'

export const STATUS_LABELS: Record<Status, string> = {
  fulfilled: 'Uppfylld',
  partial: 'Delvis uppfylld',
  not_fulfilled: 'Ej uppfylld',
  not_assessed: 'Ej bedömd',
}

/** Statusarna i den ordning de visas. */
export const STATUSES: Status[] = ['fulfilled', 'partial', 'not_fulfilled', 'not_assessed']

// Delas av alla obedömda kontroller och får därför inte ändras.
const EMPTY: ControlAssessment = Object.freeze({ ...emptyAnswer(), evidence: Object.freeze([]) as unknown as ControlAssessment['evidence'] })

/** Bedömningen av en kontroll. Saknas den räknas kontrollen som ej bedömd och tillämplig. */
export function answerFor(project: Project, controlId: string): ControlAssessment {
  return project.controls[controlId] ?? EMPTY
}

/** Om kontrollen är bortvald i SoA. Bara kontroller i ett SoA-avsnitt kan vara bortvalda. */
export function isExcluded(project: Project, section: Section, controlId: string): boolean {
  return section.soa && project.controls[controlId]?.applicable === false
}

/** Tillämplig och delvis eller ej uppfylld, alltså en brist. */
export function isDeficient(project: Project, section: Section, controlId: string): boolean {
  const status = answerFor(project, controlId).status
  return !isExcluded(project, section, controlId) && (status === 'partial' || status === 'not_fulfilled')
}

/** Risker kopplade till varje kontroll, som kontroll-ID → risker. */
export function linkedRisks(project: Project): Map<string, { id: string; title: string }[]> {
  const map = new Map<string, { id: string; title: string }[]>()
  for (const r of project.risks)
    for (const link of r.controls) {
      const list = map.get(link.control) ?? []
      if (!list.some((x) => x.id === r.id)) list.push({ id: r.id, title: r.title })
      map.set(link.control, list)
    }
  return map
}

// Ändringar

/** Fälten konsulten fyller i för en kontroll. */
export type AnswerText = 'comment' | 'owner' | 'evidenceNote' | 'soaJustification'

function edit(draft: Project, controlId: string, now: string, change: (a: ControlAssessment) => void): void {
  const answer = (draft.controls[controlId] ??= emptyAnswer())
  change(answer)
  answer.updated = { at: now, by: consultantName() }
}

export function setStatus(draft: Project, controlId: string, status: Status, now: string): void {
  edit(draft, controlId, now, (a) => (a.status = status))
}

export function setText(draft: Project, controlId: string, field: AnswerText, value: string, now: string): void {
  edit(draft, controlId, now, (a) => (a[field] = value))
}

/** Teknisk eller organisatorisk del (B-18). `undefined` tar bort delen. */
export function setPart(draft: Project, controlId: string, part: 'technical' | 'organizational', status: Status | undefined, now: string): void {
  edit(draft, controlId, now, (a) => {
    const parts = { ...a.parts, [part]: status }
    if (status === undefined) delete parts[part]
    a.parts = parts.technical || parts.organizational ? parts : undefined
  })
}

/** Tar bort uppdelningen i teknisk och organisatorisk del. */
export function clearParts(draft: Project, controlId: string, now: string): void {
  if (draft.controls[controlId]?.parts) edit(draft, controlId, now, (a) => (a.parts = undefined))
}

/**
 * Väljer in eller bort en kontroll i SoA. Kontroller kopplade till risker kan
 * inte väljas bort. Returnerar false om ändringen inte gjordes.
 */
export function setApplicable(draft: Project, section: Section, controlId: string, applicable: boolean, now: string): boolean {
  if (!section.soa) return false
  if (!applicable && linkedRisks(draft).has(controlId)) return false
  edit(draft, controlId, now, (a) => (a.applicable = applicable))
  return true
}

// Filter och sammanställningar

export interface ControlFilter {
  query: string
  status: Status | 'all'
  hideExcluded: boolean
  /** Bara kontroller som behöver uppmärksamhet. */
  attention?: Attention
}

export const NO_FILTER: ControlFilter = { query: '', status: 'all', hideExcluded: false }

/** Grupperna med de kontroller som matchar filtret. Tomma grupper tas bort. */
export function filterControls(project: Project, section: Section, filter: ControlFilter): (Group & { controls: Control[] })[] {
  const q = filter.query.trim().toLowerCase()
  const matches = (c: Control) => {
    const a = answerFor(project, c.id)
    const excluded = isExcluded(project, section, c.id)
    if (filter.hideExcluded && excluded) return false
    if (filter.status !== 'all' && (excluded || a.status !== filter.status)) return false
    if (filter.attention && (excluded || !needsAttention(a, filter.attention))) return false
    if (!q) return true
    return [c.id, c.title, c.guidance ?? '', a.comment, a.owner, a.evidenceNote, ...a.evidence.map((e) => e.file)].some((t) => t.toLowerCase().includes(q))
  }
  return section.groups.map((g) => ({ ...g, controls: g.controls.filter(matches) })).filter((g) => g.controls.length > 0)
}

/** Det som kan behöva uppmärksamhet för en kontroll. */
export type Attention = 'not_assessed' | 'no_owner' | 'no_evidence'

function needsAttention(a: ControlAssessment, kind: Attention): boolean {
  if (kind === 'not_assessed') return a.status === 'not_assessed'
  if (kind === 'no_owner') return a.owner.trim() === ''
  return needsEvidence(a)
}

/** Det som behöver uppmärksamhet i ett avsnitt. Bortvalda kontroller räknas inte. */
export function attention(project: Project, section: Section): { notAssessed: number; noOwner: number; noEvidence: number } {
  const count = { notAssessed: 0, noOwner: 0, noEvidence: 0 }
  for (const g of section.groups)
    for (const c of g.controls) {
      if (isExcluded(project, section, c.id)) continue
      const a = answerFor(project, c.id)
      if (needsAttention(a, 'not_assessed')) count.notAssessed += 1
      if (needsAttention(a, 'no_owner')) count.noOwner += 1
      if (needsAttention(a, 'no_evidence')) count.noEvidence += 1
    }
  return count
}

/** Summan av det som behöver uppmärksamhet i alla avsnitt. */
export function totalAttention(project: Project, framework: Framework): ReturnType<typeof attention> {
  return framework.sections
    .map((s) => attention(project, s))
    .reduce((a, b) => ({ notAssessed: a.notAssessed + b.notAssessed, noOwner: a.noOwner + b.noOwner, noEvidence: a.noEvidence + b.noEvidence }))
}

export type SoaFilter = 'all' | 'applicable' | 'excluded' | 'missing'

/** SoA:s sammanfattning: tillämpliga, bortvalda och bortvalda utan motivering. */
export function soaSummary(project: Project, framework: Framework): { applicable: number; excluded: number; missing: number; locked: number } {
  const locked = linkedRisks(project)
  const summary = { applicable: 0, excluded: 0, missing: 0, locked: 0 }
  for (const s of framework.sections.filter((x) => x.soa))
    for (const g of s.groups)
      for (const c of g.controls) {
        const a = answerFor(project, c.id)
        if (a.applicable) summary.applicable += 1
        else summary.excluded += 1
        if (!a.applicable && a.soaJustification.trim() === '') summary.missing += 1
        if (locked.has(c.id)) summary.locked += 1
      }
  return summary
}

/** Kontrollerna i SoA-avsnitten som matchar filtret. */
export function filterSoa(project: Project, framework: Framework, filter: SoaFilter, query = ''): (Group & { controls: Control[] })[] {
  const q = query.trim().toLowerCase()
  const keep = (c: Control) => {
    const a = answerFor(project, c.id)
    if (filter === 'applicable' && !a.applicable) return false
    if (filter === 'excluded' && a.applicable) return false
    if (filter === 'missing' && (a.applicable || a.soaJustification.trim() !== '')) return false
    return !q || [c.id, c.title, a.soaJustification].some((t) => t.toLowerCase().includes(q))
  }
  return framework.sections
    .filter((s) => s.soa)
    .flatMap((s) => s.groups.map((g) => ({ ...g, controls: g.controls.filter(keep) })))
    .filter((g) => g.controls.length > 0)
}
