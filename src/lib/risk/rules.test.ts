import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { createProject } from '../project/project'
import type { Project, RiskControlLink, Status } from '../project/schema'
import { addRisk, approve, setBefore, setTreatment } from './operations'
import {
  approvalState,
  combinedEffect,
  defaultRiskMethod,
  heatmap,
  missingInfo,
  nextReview,
  residualRisk,
  riskLevel,
  riskSummary,
  riskValue,
  riskTextFor,
  riskWarnings,
} from './rules'
import { RiskMethodSchema } from '../project/schema'

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-07T10:00:00.000Z'

/** Projekt med en risk, given bedömning, kopplingar och status på kontroller. */
function setup(before: { consequence: number; likelihood: number }, links: RiskControlLink[], statuses: Record<string, Status> = {}) {
  const p: Project = createProject({ client: 'X', framework: iso })
  const id = addRisk(p, 'Risk', NOW)
  setBefore(p, id, before, NOW)
  setTreatment(p, id, 'reduce', NOW)
  p.risks[0].controls = links
  for (const [c, status] of Object.entries(statuses))
    p.controls[c] = { status, comment: '', owner: '', evidenceNote: '', evidence: [], applicable: true, soaJustification: '' }
  return { p, risk: p.risks[0] }
}

describe('nivåer', () => {
  it('riskvärde och nivå', () => {
    expect(riskValue({ consequence: 4, likelihood: 4 })).toBe(16)
    expect([3, 4, 6, 8, 12, 15, 25].map(riskLevel)).toEqual(['low', 'medium', 'medium', 'high', 'high', 'very_high', 'very_high'])
  })

  it('standardmetoden är giltig', () => {
    expect(RiskMethodSchema.safeParse(defaultRiskMethod()).success).toBe(true)
  })
})

describe('restrisk (B-27)', () => {
  it('exemplet R-004: planerad 4, faktisk 12', () => {
    const { p, risk } = setup({ consequence: 4, likelihood: 4 }, [{ control: 'A.8.20', effect: 'high', type: 'preventive' }], { 'A.8.20': 'partial' })
    expect(residualRisk(p, risk, 'planned')).toEqual({ consequence: 4, likelihood: 1 })
    expect(residualRisk(p, risk, 'actual')).toEqual({ consequence: 4, likelihood: 3 })
    expect(riskWarnings(p, risk)).toEqual(['A.8.20 delvis'])
  })

  it('exemplet med tre kontroller: planerad 3, faktisk 8', () => {
    const { p, risk } = setup(
      { consequence: 4, likelihood: 5 },
      [
        { control: 'A.5.15', effect: 'medium', type: 'preventive' },
        { control: 'A.8.5', effect: 'high', type: 'preventive' },
        { control: 'A.5.29', effect: 'low', type: 'limiting' },
      ],
      { 'A.5.15': 'fulfilled', 'A.8.5': 'partial', 'A.5.29': 'not_fulfilled' },
    )
    expect(riskValue(residualRisk(p, risk, 'planned')!)).toBe(3)
    expect(riskValue(residualRisk(p, risk, 'actual')!)).toBe(8)
  })

  it('sammanlagd effekt är högst 0,9 och nivån lägst 1', () => {
    const high = (control: string): RiskControlLink => ({ control, effect: 'high', type: 'preventive' })
    const { p, risk } = setup({ consequence: 5, likelihood: 5 }, [high('A.5.1'), high('A.5.2'), high('A.5.3')])
    expect(combinedEffect(p, risk, 'planned').likelihood).toBe(0.9)
    expect(residualRisk(p, risk, 'planned')).toEqual({ consequence: 5, likelihood: 1 })
  })

  it('nivån avrundas uppåt till närmaste hela nivå', () => {
    const { p, risk } = setup({ consequence: 1, likelihood: 5 }, [
      { control: 'A.5.1', effect: 'medium', type: 'preventive' },
      { control: 'A.5.2', effect: 'low', type: 'preventive' },
    ])
    // 1 − 0,5 × 0,75 = 0,625 → 5 × 0,375 = 1,875 → 2
    expect(residualRisk(p, risk, 'planned')!.likelihood).toBe(2)
  })

  it('koppling utan effekt eller typ sänker inget och syns som saknad uppgift', () => {
    const { p, risk } = setup({ consequence: 3, likelihood: 3 }, [{ control: 'A.5.1' }])
    expect(residualRisk(p, risk, 'planned')).toEqual({ consequence: 3, likelihood: 3 })
    expect(missingInfo(risk)).toEqual(['ägare', 'effekt på koppling'])
  })

  it('accepterad risk har restrisk lika med risken före behandling', () => {
    const { p, risk } = setup({ consequence: 2, likelihood: 2 }, [{ control: 'A.5.1', effect: 'high', type: 'preventive' }])
    risk.treatment = 'accept'
    expect(residualRisk(p, risk, 'planned')).toEqual({ consequence: 2, likelihood: 2 })
  })

  it('utan bedömning finns ingen restrisk', () => {
    const p = createProject({ client: 'X', framework: iso })
    addRisk(p, 'Risk', NOW)
    expect(residualRisk(p, p.risks[0], 'actual')).toBeUndefined()
  })
})

describe('godkännande och sammanfattning', () => {
  it('godkännande blir inaktuellt när restrisken ändras', () => {
    const { p, risk } = setup({ consequence: 4, likelihood: 4 }, [{ control: 'A.8.20', effect: 'high', type: 'preventive' }], { 'A.8.20': 'fulfilled' })
    expect(approve(p, risk.id, 'Anna', '', NOW)).toEqual({ ok: true })
    expect(approvalState(p, risk)).toBe('valid')
    p.controls['A.8.20'].status = 'not_fulfilled'
    expect(approvalState(p, risk)).toBe('stale')
  })

  it('över acceptansnivån krävs motivering', () => {
    const { p, risk } = setup({ consequence: 4, likelihood: 4 }, [])
    expect(approve(p, risk.id, 'Anna', '', NOW).ok).toBe(false)
    expect(approve(p, risk.id, 'Anna', 'Åtgärdas nästa år', NOW).ok).toBe(true)
    expect(risk.approval?.aboveThreshold).toBe(true)
  })

  it('nyckeltal', () => {
    const { p } = setup({ consequence: 4, likelihood: 4 }, [{ control: 'A.8.20', effect: 'high', type: 'preventive' }], { 'A.8.20': 'partial' })
    expect(riskSummary(p)).toEqual({ total: 1, aboveThreshold: 1, residualNotReached: 1, awaitingApproval: 1 })
    expect(heatmap(p, 'before').get('4-4')).toBe(1)
    expect(heatmap(p, 'actual').get('4-3')).toBe(1)
  })

  it('nästa bedömning efter metodens intervall', () => {
    const { p, risk } = setup({ consequence: 1, likelihood: 1 }, [])
    expect(nextReview(p, risk)).toBe('2027-10-07')
  })
})

describe('riskTextFor', () => {
  it('sammanfattar kopplade risker', () => {
    const { p, risk } = setup({ consequence: 4, likelihood: 4 }, [{ control: 'A.8.20', effect: 'high', type: 'preventive' }], { 'A.8.20': 'partial' })
    risk.title = 'Öppen port'
    risk.treatmentPlan = 'Stäng porten'
    expect(riskTextFor(p, 'A.8.20')).toBe('R-001 Öppen port (faktisk restrisk 12). Behandlingsplan: Stäng porten')
    expect(riskTextFor(p, 'A.5.1')).toBe('')
  })
})
