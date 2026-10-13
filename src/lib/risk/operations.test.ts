import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { createProject, validateProject } from '../project/project'
import { addRisk, addConsequenceType, copyFromProject, editMethod, linkControl, removeConsequenceType, removeRisk, unlinkControl } from './operations'
import { addTemplateRisks, templatesFor, unusedTemplates } from './templates'
import { methodOf } from './rules'

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-07T10:00:00.000Z'
const fresh = () => createProject({ client: 'X', framework: iso })

describe('risker', () => {
  it('ny risk får nästa ID och historik', () => {
    const p = fresh()
    expect(addRisk(p, 'Phishing', NOW)).toBe('R-001')
    expect(addRisk(p, '', NOW)).toBe('R-002')
    expect(p.risks[1].title).toBe('Ny risk')
    expect(p.risks[0].history[0].text).toBe('Risk skapad')
    expect(validateProject(p)).toEqual([])
  })

  it('borttagen risk: ID återanvänds inte och kontrollen låses upp', () => {
    const p = fresh()
    addTemplateRisks(p, templatesFor(iso)!.risks.slice(0, 1), '2026-10-07')
    removeRisk(p, 'R-001')
    expect(p.risks).toEqual([])
    expect(addRisk(p, 'Ny', NOW)).toBe('R-002')
  })

  it('borttagen typrisk kan importeras igen', () => {
    const p = fresh()
    const set = templatesFor(iso)!
    addTemplateRisks(p, set.risks, '2026-10-07')
    expect(unusedTemplates(p, set)).toEqual([])
    removeRisk(p, 'R-003')
    expect(unusedTemplates(p, set).map((t) => t.id)).toEqual(['TR-03'])
  })
})

describe('kopplingar', () => {
  it('koppling av bortvald kontroll gör den tillämplig och ger en notis', () => {
    const p = fresh()
    const id = addRisk(p, 'Risk', NOW)
    p.controls['A.7.10'] = { status: 'not_assessed', comment: '', owner: '', evidenceNote: '', evidence: [], applicable: false, soaJustification: 'Nej' }
    const note = linkControl(p, id, { control: 'A.7.10', effect: 'low', type: 'preventive' }, NOW)
    expect(note).toContain('A.7.10 var bortvald')
    expect(p.controls['A.7.10'].applicable).toBe(true)
    expect(linkControl(p, id, { control: 'A.7.10' }, NOW)).toBeUndefined()
    expect(p.risks[0].controls).toHaveLength(1)
    unlinkControl(p, id, 'A.7.10', NOW)
    expect(p.risks[0].controls).toEqual([])
  })
})

describe('riskmetod', () => {
  it('ändring utgår från standardmetoden', () => {
    const p = fresh()
    editMethod(p, (m) => (m.acceptanceThreshold = 8))
    expect(p.riskMethod?.acceptanceThreshold).toBe(8)
    expect(methodOf(p).consequence.levels).toHaveLength(5)
  })

  it('konsekvenstyper läggs till och tas bort med beskrivningar', () => {
    const p = fresh()
    editMethod(p, (m) => addConsequenceType(m, 'Hälsa och säkerhet'))
    expect(p.riskMethod!.consequence.levels[0].descriptions).toHaveLength(3)
    editMethod(p, (m) => removeConsequenceType(m, 0))
    expect(p.riskMethod!.consequence.types).toEqual(['Information och anseende', 'Hälsa och säkerhet'])
    expect(validateProject(p)).toEqual([])
  })
})

describe('kopiera från kund', () => {
  it('tar riskmetod och risker men inga bedömningar', () => {
    const source = fresh()
    source.client.name = 'Gammal kund'
    editMethod(source, (m) => (m.acceptanceThreshold = 4))
    const id = addRisk(source, 'Risk', NOW)
    source.risks[0].owner = 'Kalle'
    source.risks[0].before = { consequence: 3, likelihood: 3 }
    source.risks[0].controls = [{ control: 'A.5.1', effect: 'low', type: 'preventive' }]
    expect(id).toBe('R-001')
    const p = fresh()
    expect(copyFromProject(p, source, NOW)).toBe(1)
    expect(p.riskMethod?.acceptanceThreshold).toBe(4)
    expect(p.risks[0].owner).toBe('')
    expect(p.risks[0].before).toBeUndefined()
    expect(p.risks[0].controls).toEqual([{ control: 'A.5.1', effect: 'low', type: 'preventive' }])
    expect(validateProject(p)).toEqual([])
  })
})
