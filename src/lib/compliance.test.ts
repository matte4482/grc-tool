import { describe, it, expect } from 'vitest'
import fixture from '../../tests/fixtures/exempel.grc.json?raw'
import { getFramework } from './frameworks'
import { createProject, parseProject } from './project/project'
import { assessmentProgress, percent, sectionProgress, sectionSummaries } from './compliance'

const iso = getFramework('iso27001', '2022')!

describe('sectionSummaries', () => {
  it('läser avsnitten ur ramverket', () => {
    expect(sectionSummaries(iso)).toEqual([
      { id: 'clauses', title: 'Grundläggande krav', unit: 'krav', count: 26 },
      { id: 'annex-a', title: 'Annex A', unit: 'kontroller', count: 93 },
    ])
  })
})

describe('assessmentProgress', () => {
  it('ett nytt projekt har inget bedömt', () => {
    const p = createProject({ client: 'X', framework: iso })
    expect(assessmentProgress(p, iso)).toEqual({ total: 119, applicable: 119, assessed: 0, fulfilled: 0, partial: 0, notFulfilled: 0 })
  })

  it('räknar bedömda och uppfyllda, och hoppar över bortvalda i SoA', () => {
    const r = parseProject(fixture)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    // Exempelfilen: 6.1.2 uppfylld, A.8.20 delvis, A.7.4 bortvald (ej bedömd)
    expect(assessmentProgress(r.project, iso)).toEqual({ total: 119, applicable: 118, assessed: 2, fulfilled: 1, partial: 1, notFulfilled: 0 })
  })

  it('grundkrav kan inte räknas som bortvalda', () => {
    const p = createProject({ client: 'X', framework: iso })
    p.controls['4.1'] = { status: 'fulfilled', applicable: false, comment: '', owner: '', evidenceNote: '', evidence: [], soaJustification: '' }
    expect(assessmentProgress(p, iso).applicable).toBe(119)
  })
})

describe('sectionProgress', () => {
  it('delar upp förloppet per avsnitt', () => {
    const r = parseProject(fixture)
    if (!r.ok) throw new Error(r.errors.join('\n'))
    const [clauses, annex] = sectionProgress(r.project, iso)
    expect(clauses).toEqual({ id: 'clauses', title: 'Grundläggande krav', unit: 'krav', count: 26, total: 26, applicable: 26, assessed: 1, fulfilled: 1, partial: 0, notFulfilled: 0 })
    expect(annex.applicable).toBe(92)
    expect(annex.assessed).toBe(1)
  })
})

describe('percent', () => {
  it('avrundar och klarar noll', () => {
    expect(percent(1, 3)).toBe(33)
    expect(percent(2, 3)).toBe(67)
    expect(percent(0, 0)).toBe(0)
  })
})
