// Riskmetod, riskvärden och restrisk (B-27). Ren TypeScript, inget sparas.

import type { Project, Risk, RiskMethod, Status } from '../project/schema'

/** Standardmetoden i README 4.4. Används tills konsulten ändrar metoden. */
export function defaultRiskMethod(): RiskMethod {
  return {
    consequence: {
      types: ['Verksamhet och ekonomi', 'Information och anseende'],
      levels: [
        { level: 1, name: 'Försumbar', descriptions: ['Ingen märkbar påverkan på verksamheten', 'Ingen extern kännedom'] },
        { level: 2, name: 'Begränsad', descriptions: ['Kortvarig störning, liten kostnad', 'Enstaka klagomål'] },
        { level: 3, name: 'Måttlig', descriptions: ['Störning i flera dagar, märkbar kostnad', 'Lokal uppmärksamhet'] },
        { level: 4, name: 'Allvarlig', descriptions: ['Stor ekonomisk förlust eller långt avbrott', 'Nationell uppmärksamhet'] },
        { level: 5, name: 'Kritisk', descriptions: ['Verksamhetens fortlevnad hotas', 'Varaktigt förtroendetapp'] },
      ],
    },
    likelihood: {
      levels: [
        { level: 1, name: 'Mycket osannolik', frequency: 'Mer sällan än vart 10:e år', interpretation: 'Har inte hänt hos oss eller liknande verksamheter' },
        { level: 2, name: 'Osannolik', frequency: 'Vart 5–10:e år', interpretation: 'Har hänt i branschen' },
        { level: 3, name: 'Möjlig', frequency: 'Vart 1–5:e år', interpretation: 'Har hänt hos oss eller kan rimligen hända' },
        { level: 4, name: 'Sannolik', frequency: 'Varje år', interpretation: 'Händer regelbundet' },
        { level: 5, name: 'Mycket sannolik', frequency: 'Flera gånger per år', interpretation: 'Händer ofta eller pågår' },
      ],
    },
    acceptanceThreshold: 6,
    reviewIntervalMonths: 12,
    approvedBy: '',
  }
}

/** Konsekvenstyper att välja bland när en typ läggs till i riskmetoden. */
export const CONSEQUENCE_CATEGORIES = [
  'Människa och Hälsa',
  'Miljö',
  'Förtroende och Varumärke',
  'Lagar och Regler (Compliance)',
]

/** Projektets riskmetod, eller standardmetoden om ingen är fastställd. */
export function methodOf(project: Project): RiskMethod {
  return project.riskMethod ?? defaultRiskMethod()
}

export type Score = { consequence: number; likelihood: number }
export type Level = 'low' | 'medium' | 'high' | 'very_high'

export const LEVEL_LABELS: Record<Level, string> = { low: 'Låg', medium: 'Medel', high: 'Hög', very_high: 'Mycket hög' }

export const riskValue = (s: Score): number => s.consequence * s.likelihood

/** Nivå i matrisen: Låg 1–3, Medel 4–6, Hög 8–12, Mycket hög 15–25. */
export function riskLevel(value: number): Level {
  if (value <= 3) return 'low'
  if (value <= 6) return 'medium'
  if (value <= 12) return 'high'
  return 'very_high'
}

export const EFFECT_VALUES = { low: 0.25, medium: 0.5, high: 0.75 } as const
export const EFFECT_LABELS = { low: 'Låg', medium: 'Medel', high: 'Hög' } as const
export const TYPE_LABELS = { preventive: 'Förebyggande', limiting: 'Begränsande' } as const

const STATUS_FACTOR: Record<Status, number> = { fulfilled: 1, partial: 0.5, not_fulfilled: 0, not_assessed: 0 }
const MAX_EFFECT = 0.9

/** Sammanlagd effekt per sida. `planned` räknar med att alla kontroller är uppfyllda. */
export function combinedEffect(project: Project, risk: Risk, mode: 'planned' | 'actual'): { likelihood: number; consequence: number } {
  const remaining = { likelihood: 1, consequence: 1 }
  for (const link of risk.controls) {
    if (!link.effect || !link.type) continue
    const status = project.controls[link.control]?.status ?? 'not_assessed'
    const e = EFFECT_VALUES[link.effect] * (mode === 'planned' ? 1 : STATUS_FACTOR[status])
    const side = link.type === 'preventive' ? 'likelihood' : 'consequence'
    remaining[side] *= 1 - e
  }
  return {
    likelihood: Math.min(MAX_EFFECT, 1 - remaining.likelihood),
    consequence: Math.min(MAX_EFFECT, 1 - remaining.consequence),
  }
}

/** Nivå efter sänkning, avrundad uppåt, lägst 1. Sex decimaler tar bort flyttalsfel. */
const lowered = (level: number, effect: number) => Math.max(1, Math.ceil(Number((level * (1 - effect)).toFixed(6))))

/**
 * Restrisk efter behandling. Saknas bedömning före behandling finns ingen restrisk.
 * Accepterade risker behandlas inte, så restrisken är risken före behandling.
 */
export function residualRisk(project: Project, risk: Risk, mode: 'planned' | 'actual'): Score | undefined {
  if (!risk.before) return undefined
  if (risk.treatment === 'accept') return { ...risk.before }
  const e = combinedEffect(project, risk, mode)
  return { consequence: lowered(risk.before.consequence, e.consequence), likelihood: lowered(risk.before.likelihood, e.likelihood) }
}

/** Kontroller som gör att faktisk restrisk är högre än planerad, t.ex. "A.8.5 delvis". */
export function riskWarnings(project: Project, risk: Risk): string[] {
  const planned = residualRisk(project, risk, 'planned')
  const actual = residualRisk(project, risk, 'actual')
  if (!planned || !actual || riskValue(actual) <= riskValue(planned)) return []
  const words: Record<Status, string> = { fulfilled: '', partial: 'delvis', not_fulfilled: 'ej uppfylld', not_assessed: 'ej bedömd' }
  return risk.controls
    .filter((l) => l.effect && l.type)
    .map((l) => ({ id: l.control, status: project.controls[l.control]?.status ?? 'not_assessed' }))
    .filter((c) => c.status !== 'fulfilled')
    .map((c) => `${c.id} ${words[c.status]}`)
}

/** Det som saknas i en risk. Tom lista = komplett. */
export function missingInfo(risk: Risk): string[] {
  const missing: string[] = []
  if (!risk.owner.trim()) missing.push('ägare')
  if (!risk.before) missing.push('bedömning')
  if (risk.treatment === 'undecided') missing.push('behandling')
  if (risk.controls.some((l) => !l.effect || !l.type)) missing.push('effekt på koppling')
  return missing
}

export type ApprovalState = 'none' | 'valid' | 'stale'

/** Om restrisken är godkänd, och om den ändrats sedan godkännandet. */
export function approvalState(project: Project, risk: Risk): ApprovalState {
  if (!risk.approval) return 'none'
  const actual = residualRisk(project, risk, 'actual')
  if (risk.approval.residual !== undefined && actual && riskValue(actual) !== risk.approval.residual) return 'stale'
  return 'valid'
}

export interface RiskSummary {
  total: number
  /** Risk före behandling över acceptansnivån. */
  aboveThreshold: number
  /** Faktisk restrisk högre än planerad. */
  residualNotReached: number
  /** Bedömda och behandlade risker utan giltigt godkännande. */
  awaitingApproval: number
}

export function riskSummary(project: Project): RiskSummary {
  const threshold = methodOf(project).acceptanceThreshold
  const s: RiskSummary = { total: project.risks.length, aboveThreshold: 0, residualNotReached: 0, awaitingApproval: 0 }
  for (const r of project.risks) {
    if (r.before && riskValue(r.before) > threshold) s.aboveThreshold += 1
    if (riskWarnings(project, r).length) s.residualNotReached += 1
    if (r.before && r.treatment !== 'undecided' && approvalState(project, r) !== 'valid') s.awaitingApproval += 1
  }
  return s
}

/** Datum för nästa bedömning: senaste bedömningen plus metodens intervall. */
export function nextReview(project: Project, risk: Risk): string | undefined {
  const from = risk.lastAssessedAt ?? risk.identifiedAt
  const d = new Date(`${from}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + methodOf(project).reviewIntervalMonths)
  return d.toISOString().slice(0, 10)
}

/** Antal risker per ruta i matrisen, som "K-S" → antal. */
export function heatmap(project: Project, mode: 'before' | 'planned' | 'actual'): Map<string, number> {
  const map = new Map<string, number>()
  for (const r of project.risks) {
    const s = mode === 'before' ? r.before : residualRisk(project, r, mode)
    if (!s) continue
    const key = `${s.consequence}-${s.likelihood}`
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return map
}

/** Text om kopplade risker, för "Föreslå text från risker" vid en kontroll (README 4.7). */
export function riskTextFor(project: Project, controlId: string): string {
  return project.risks
    .filter((r) => r.controls.some((l) => l.control === controlId))
    .map((r) => {
      const actual = residualRisk(project, r, 'actual')
      const value = actual ? ` (faktisk restrisk ${riskValue(actual)})` : ''
      const plan = r.treatmentPlan.trim() ? ` Behandlingsplan: ${r.treatmentPlan.trim()}` : ''
      return `${r.id} ${r.title}${value}.${plan}`
    })
    .join('\n')
}
