// Dashboarden: hur redo kunden är för certifieringsrevision (B-37).

import { allControls, type Framework } from './frameworks/schema'
import type { Project } from './project/schema'
import { isOpen, suggestions } from './actions'
import { answerFor, isExcluded } from './assessment'
import { percent, sectionProgress } from './compliance'
import { needsEvidence } from './evidence/evidence'
import { approvalState } from './risk/rules'

export interface ReadinessItem {
  key: 'assessed' | 'mandatory' | 'controls' | 'evidence' | 'soa' | 'risks' | 'actions'
  label: string
  done: number
  total: number
  pct: number
  /** Falskt när det inte finns något att bedöma, t.ex. inga bortval i SoA. Räknas då inte in. */
  applies: boolean
}

export type Verdict = 'ready' | 'close' | 'not_ready'

export const VERDICT_LABELS: Record<Verdict, string> = {
  ready: 'Redo för certifieringsrevision',
  close: 'Nära, men något återstår',
  not_ready: 'Inte redo för revision',
}

export interface Readiness {
  items: ReadinessItem[]
  /** Medelvärdet av delarna, 0–100. */
  pct: number
  verdict: Verdict
}

const item = (key: ReadinessItem['key'], label: string, done: number, total: number, requiredEvenIfEmpty = false): ReadinessItem => ({
  key,
  label,
  done,
  total,
  pct: percent(done, total),
  applies: total > 0 || requiredEvenIfEmpty,
})

/**
 * Redo för revision: upp till sju delar som var och en ger 0–100 %. Helheten är medelvärdet av
 * delarna som gäller. "Redo" kräver minst 90 % och att alla grundkrav (avsnitt utan SoA) är uppfyllda.
 */
export function readiness(project: Project, framework: Framework): Readiness {
  const sections = sectionProgress(project, framework)
  const sum = (list: typeof sections, key: 'applicable' | 'assessed' | 'fulfilled') => list.reduce((n, s) => n + s[key], 0)
  const mandatory = sections.filter((_, i) => !framework.sections[i].soa)
  const soaSections = sections.filter((_, i) => framework.sections[i].soa)

  let claimed = 0
  let withEvidence = 0
  let excluded = 0
  let justified = 0
  for (const { section, control } of allControls(framework)) {
    const a = answerFor(project, control.id)
    if (isExcluded(project, section, control.id)) {
      excluded += 1
      if (a.soaJustification.trim()) justified += 1
    } else if (a.status === 'fulfilled' || a.status === 'partial') {
      claimed += 1
      if (!needsEvidence(a)) withEvidence += 1
    }
  }

  const handled = project.risks.filter((r) => r.before && r.treatment !== 'undecided' && approvalState(project, r) === 'valid').length
  const open = project.actions.filter(isOpen)
  const planned = open.filter((a) => a.owner.trim() && a.due).length
  const unplanned = suggestions(project, framework).length

  const items = [
    item('assessed', 'Alla krav och kontroller bedömda', sum(sections, 'assessed'), sum(sections, 'applicable')),
    ...(mandatory.length ? [item('mandatory', 'Grundkrav uppfyllda', sum(mandatory, 'fulfilled'), sum(mandatory, 'applicable'))] : []),
    ...(soaSections.length ? [item('controls', 'Tillämpliga kontroller uppfyllda', sum(soaSections, 'fulfilled'), sum(soaSections, 'applicable'))] : []),
    item('evidence', 'Evidens för uppfyllda', withEvidence, claimed),
    ...(soaSections.length ? [item('soa', 'Bortval i SoA motiverade', justified, excluded)] : []),
    item('risks', 'Risker behandlade och godkända', handled, project.risks.length, true),
    item('actions', 'Brister med planerad åtgärd (ansvarig och deadline)', planned, open.length + unplanned),
  ]
  const counted = items.filter((i) => i.applies)
  const pct = Math.round(counted.reduce((n, i) => n + i.pct, 0) / counted.length)
  const required = items.find((i) => i.key === 'mandatory')
  const mandatoryOk = !required || required.done === required.total
  const verdict: Verdict = pct >= 90 && mandatoryOk ? 'ready' : pct >= 70 ? 'close' : 'not_ready'
  return { items, pct, verdict }
}
