import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { createProject, validateProject } from '../project/project'
import { RiskTemplateSetSchema, addTemplateRisks, templatesFor } from './templates'

const iso = getFramework('iso27001', '2022')!
const set = templatesFor(iso)!

describe('typrisker för ISO 27001', () => {
  it('finns och har 15 risker', () => {
    expect(set.risks).toHaveLength(15)
  })

  it('kopplar bara till Annex A-kontroller som finns i ramverket', () => {
    const annex = new Set(iso.sections.find((s) => s.id === 'annex-a')!.groups.flatMap((g) => g.controls.map((c) => c.id)))
    const unknown = set.risks.flatMap((r) => r.controls.map((c) => c.control)).filter((id) => !annex.has(id))
    expect(unknown).toEqual([])
  })

  it('samma kontroll kopplas bara en gång per risk', () => {
    for (const r of set.risks) expect(new Set(r.controls.map((c) => c.control)).size).toBe(r.controls.length)
  })

  it('dubbletter av typrisk-ID avvisas', () => {
    const r = RiskTemplateSetSchema.safeParse({ ...set, risks: [set.risks[0], set.risks[0]] })
    expect(r.success).toBe(false)
  })

  it('saknas för ramverk utan typrisker', () => {
    expect(templatesFor({ id: 'nis2', version: '2022' })).toBeUndefined()
  })
})

describe('addTemplateRisks', () => {
  it('ger egna ID:n, räknar upp löpnumret och ger ett giltigt projekt', () => {
    const p = createProject({ client: 'X', framework: iso })
    const added = addTemplateRisks(p, set.risks, '2026-10-07')
    expect(added.map((r) => r.id).slice(0, 2)).toEqual(['R-001', 'R-002'])
    expect(p.risks).toHaveLength(15)
    expect(p.nextNumber.risk).toBe(16)
    expect(p.risks[0].template).toBe('TR-01')
    expect(p.risks[0].identifiedAt).toBe('2026-10-07')
    expect(p.risks[0].treatment).toBe('undecided')
    expect(p.risks[0].before).toBeUndefined()
    expect(validateProject(p)).toEqual([])
  })

  it('fortsätter numreringen efter befintliga risker', () => {
    const p = createProject({ client: 'X', framework: iso })
    p.nextNumber.risk = 5
    addTemplateRisks(p, set.risks.slice(0, 1), '2026-10-07')
    expect(p.risks[0].id).toBe('R-005')
  })
})
