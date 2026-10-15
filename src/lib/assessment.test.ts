import { describe, it, expect } from 'vitest'
import { getFramework } from './frameworks'
import { createProject, validateProject } from './project/project'
import { addTemplateRisks, templatesFor } from './risk/templates'
import {
  NO_FILTER,
  answerFor,
  attention,
  clearParts,
  filterControls,
  filterSoa,
  linkedRisks,
  setApplicable,
  setPart,
  setStatus,
  setText,
  soaSummary,
} from './assessment'
import { groupProgress } from './compliance'

const iso = getFramework('iso27001', '2022')!
const clauses = iso.sections.find((s) => s.id === 'clauses')!
const annex = iso.sections.find((s) => s.id === 'annex-a')!
const NOW = '2026-10-07T10:00:00.000Z'
const fresh = () => createProject({ client: 'X', framework: iso })

describe('ändringar', () => {
  it('status skapar bedömningen och sätter senast uppdaterad', () => {
    const p = fresh()
    expect(answerFor(p, 'A.5.1').status).toBe('not_assessed')
    setStatus(p, 'A.5.1', 'partial', NOW)
    expect(p.controls['A.5.1'].status).toBe('partial')
    expect(p.controls['A.5.1'].updated?.at).toBe(NOW)
    expect(validateProject(p)).toEqual([])
  })

  it('textfält', () => {
    const p = fresh()
    setText(p, '4.1', 'comment', 'Kontextanalys finns', NOW)
    setText(p, '4.1', 'owner', 'CISO', NOW)
    expect(p.controls['4.1'].comment).toBe('Kontextanalys finns')
    expect(p.controls['4.1'].owner).toBe('CISO')
  })

  it('teknisk och organisatorisk del kan sättas och tas bort', () => {
    const p = fresh()
    setPart(p, 'A.8.5', 'technical', 'fulfilled', NOW)
    expect(p.controls['A.8.5'].parts).toEqual({ technical: 'fulfilled' })
    setPart(p, 'A.8.5', 'technical', undefined, NOW)
    expect(p.controls['A.8.5'].parts).toBeUndefined()
  })

  it('grundkrav kan inte väljas bort', () => {
    const p = fresh()
    expect(setApplicable(p, clauses, '4.1', false, NOW)).toBe(false)
    expect(p.controls['4.1']).toBeUndefined()
  })

  it('kontroller kopplade till risker kan inte väljas bort', () => {
    const p = fresh()
    addTemplateRisks(p, templatesFor(iso)!.risks, '2026-10-07')
    expect(linkedRisks(p).get('A.8.5')?.[0].id).toBe('R-001')
    expect(setApplicable(p, annex, 'A.8.5', false, NOW)).toBe(false)
    expect(setApplicable(p, annex, 'A.7.10', false, NOW)).toBe(true)
    expect(p.controls['A.7.10'].applicable).toBe(false)
  })
})

describe('filter', () => {
  it('sök i ID, namn, bevisbörda och kommentar', () => {
    const p = fresh()
    setText(p, 'A.5.1', 'comment', 'Policyn saknar datum', NOW)
    const ids = (q: string) => filterControls(p, annex, { ...NO_FILTER, query: q }).flatMap((g) => g.controls.map((c) => c.id))
    expect(ids('saknar datum')).toEqual(['A.5.1'])
    expect(ids('A.8.24')).toEqual(['A.8.24'])
  })

  it('status, dölj bortvalda och ej bedömda', () => {
    const p = fresh()
    setStatus(p, 'A.5.1', 'fulfilled', NOW)
    setApplicable(p, annex, 'A.5.2', false, NOW)
    const count = (f: Partial<typeof NO_FILTER>) => filterControls(p, annex, { ...NO_FILTER, ...f }).reduce((n, g) => n + g.controls.length, 0)
    expect(count({ status: 'fulfilled' })).toBe(1)
    expect(count({ hideExcluded: true })).toBe(92)
    expect(count({ attention: 'not_assessed' })).toBe(91)
  })
})

describe('sammanställningar', () => {
  it('behöver uppmärksamhet räknar inte bortvalda', () => {
    const p = fresh()
    setStatus(p, 'A.5.1', 'fulfilled', NOW)
    setText(p, 'A.5.1', 'owner', 'IT-chef', NOW)
    setApplicable(p, annex, 'A.5.2', false, NOW)
    expect(attention(p, annex)).toEqual({ notAssessed: 91, noOwner: 91, noEvidence: 1 })
  })

  it('SoA: tillämpliga, bortvalda, saknad motivering och låsta', () => {
    const p = fresh()
    addTemplateRisks(p, templatesFor(iso)!.risks.slice(0, 1), '2026-10-07')
    setApplicable(p, annex, 'A.7.10', false, NOW)
    setApplicable(p, annex, 'A.7.11', false, NOW)
    setText(p, 'A.7.11', 'soaJustification', 'Inga egna lokaler', NOW)
    expect(soaSummary(p, iso)).toEqual({ applicable: 91, excluded: 2, missing: 1, locked: 4 })
    expect(filterSoa(p, iso, 'missing').flatMap((g) => g.controls.map((c) => c.id))).toEqual(['A.7.10'])
  })

  it('förlopp per tema', () => {
    const p = fresh()
    setStatus(p, 'A.6.1', 'not_fulfilled', NOW)
    const a6 = groupProgress(p, annex).find((g) => g.id === 'A.6')!
    expect(a6.total).toBe(8)
    expect(a6.notFulfilled).toBe(1)
  })
})

describe('uppdelning', () => {
  it('kan tas bort helt', () => {
    const p = fresh()
    setPart(p, 'A.8.5', 'technical', 'fulfilled', NOW)
    setPart(p, 'A.8.5', 'organizational', 'partial', NOW)
    clearParts(p, 'A.8.5', NOW)
    expect(p.controls['A.8.5'].parts).toBeUndefined()
    clearParts(p, 'A.5.1', NOW)
    expect(p.controls['A.5.1']).toBeUndefined()
  })
})
