import { describe, it, expect } from 'vitest'
import { getFramework } from './frameworks'
import { createProject } from './project/project'
import { setApplicable, setStatus, setText } from './assessment'
import { addRisk, approve, setBefore, setTreatment } from './risk/operations'
import { readiness } from './dashboard'

const iso = getFramework('iso27001', '2022')!
const annex = iso.sections.find((s) => s.id === 'annex-a')!
const NOW = '2026-10-14T10:00:00.000Z'
const fresh = () => createProject({ client: 'X', framework: iso })
const pct = (p: ReturnType<typeof fresh>, key: string) => readiness(p, iso).items.find((i) => i.key === key)!.pct

describe('redo för revision', () => {
  it('nytt projekt är inte redo; delar utan innehåll räknas inte, utom risker', () => {
    const r = readiness(fresh(), iso)
    expect(r.items.map((i) => [i.key, i.pct, i.applies])).toEqual([
      ['assessed', 0, true],
      ['mandatory', 0, true],
      ['controls', 0, true],
      ['evidence', 0, false],
      ['soa', 0, false],
      ['risks', 0, true],
      ['actions', 0, false],
    ])
    expect([r.pct, r.verdict]).toEqual([0, 'not_ready'])
  })

  it('evidens, SoA och risker', () => {
    const p = fresh()
    setStatus(p, 'A.5.1', 'fulfilled', NOW)
    setStatus(p, 'A.5.2', 'fulfilled', NOW)
    setText(p, 'A.5.2', 'evidenceNote', 'Intranätet', NOW)
    expect(pct(p, 'evidence')).toBe(50)
    setApplicable(p, annex, 'A.7.10', false, NOW)
    expect(pct(p, 'soa')).toBe(0)
    addRisk(p, 'R', NOW)
    setBefore(p, 'R-001', { consequence: 2, likelihood: 2 }, NOW)
    setTreatment(p, 'R-001', 'accept', NOW)
    approve(p, 'R-001', 'VD', '', NOW)
    expect(pct(p, 'risks')).toBe(100)
  })

  it('allt uppfyllt och motiverat ger redo', () => {
    const p = fresh()
    for (const s of iso.sections) for (const g of s.groups) for (const c of g.controls) {
      setStatus(p, c.id, 'fulfilled', NOW)
      setText(p, c.id, 'evidenceNote', 'Finns', NOW)
    }
    addRisk(p, 'R', NOW)
    setBefore(p, 'R-001', { consequence: 1, likelihood: 1 }, NOW)
    setTreatment(p, 'R-001', 'accept', NOW)
    approve(p, 'R-001', 'VD', '', NOW)
    const r = readiness(p, iso)
    expect([r.pct, r.verdict]).toEqual([100, 'ready'])
    setStatus(p, '4.1', 'partial', NOW)
    expect(readiness(p, iso).verdict).toBe('close')
  })
})
