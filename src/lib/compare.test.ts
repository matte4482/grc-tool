import { describe, it, expect } from 'vitest'
import { getFramework } from './frameworks'
import { createProject, followUp, validateProject } from './project/project'
import { setApplicable, setStatus } from './assessment'
import { addRisk, approve, setBefore, setTreatment } from './risk/operations'
import { addManualAction, setActionStatus, setDue } from './actions'
import { compareProjects, summaryText } from './compare'

const iso = getFramework('iso27001', '2022')!
const annex = iso.sections.find((s) => s.id === 'annex-a')!
const NOW = '2026-10-14T10:00:00.000Z'

function earlier() {
  const p = createProject({ client: 'Kund AB', framework: iso, now: new Date('2025-10-01T10:00:00Z') })
  setStatus(p, 'A.5.1', 'not_fulfilled', NOW)
  setStatus(p, 'A.5.2', 'fulfilled', NOW)
  setStatus(p, 'A.5.3', 'partial', NOW)
  addRisk(p, 'Phishing', NOW)
  setBefore(p, 'R-001', { consequence: 4, likelihood: 4 }, NOW)
  setTreatment(p, 'R-001', 'accept', NOW)
  approve(p, 'R-001', 'VD', 'Godtas', NOW)
  addRisk(p, 'Brand', NOW)
  addManualAction(p, 'Inför MFA', NOW)
  return p
}

describe('uppföljning', () => {
  it('nytt ID, pekar på den tidigare, godkännanden tas bort', () => {
    const prev = earlier()
    const next = followUp(prev, new Date('2026-10-14T10:00:00Z'))
    expect(next.id).not.toBe(prev.id)
    expect(next.previousId).toBe(prev.id)
    expect(next.risks[0].approval).toBeNull()
    expect(next.controls['A.5.1'].status).toBe('not_fulfilled')
    expect(prev.risks[0].approval?.by).toBe('VD')
    expect(validateProject(next)).toEqual([])
  })
})

describe('jämförelse', () => {
  it('kontroller, SoA, risker, åtgärder och sammanfattning', () => {
    const prev = earlier()
    const curr = followUp(prev, new Date('2026-10-14T10:00:00Z'))
    setStatus(curr, 'A.5.1', 'fulfilled', NOW)
    setStatus(curr, 'A.5.2', 'partial', NOW)
    setStatus(curr, 'A.5.4', 'fulfilled', NOW)
    setApplicable(curr, annex, 'A.7.10', false, NOW)
    curr.risks = curr.risks.filter((r) => r.id !== 'R-002')
    addRisk(curr, 'Ransomware', NOW)
    setActionStatus(curr, 'ATG-001', 'done', NOW)
    const late = addManualAction(curr, 'Utbildning', NOW)
    setDue(curr, late, '2026-01-01')

    const r = compareProjects(prev, curr, iso, '2026-10-14')
    if (!r.ok) throw new Error(r.message)
    const c = r.comparison
    expect(r.warnings).toEqual([])
    expect([c.counts.improved, c.counts.worsened, c.counts.new]).toEqual([1, 1, 1])
    expect(c.soa.excluded).toEqual(['A.7.10'])
    expect([c.risks.added.map((x) => x.id), c.risks.removed.map((x) => x.id)]).toEqual([['R-003'], ['R-002']])
    expect([c.actions.completed.map((a) => a.id), c.actions.added.map((a) => a.id), c.actions.overdue.map((a) => a.id)]).toEqual([['ATG-001'], [late], [late]])
    expect(summaryText(c)).toBe(
      `Uppfyllnaden har ökat från ${c.before.pct} % till ${c.after.pct} %. 1 kontroll har förbättrats och 1 har försämrats. 1 risk är ny och 1 har tagits bort. 1 åtgärd har avslutats och 1 är försenade.`,
    )
  })

  it('olika ramverk eller samma fil kan inte jämföras; annan kund ger varning', () => {
    const prev = earlier()
    expect(compareProjects(prev, prev, iso, '2026-10-14').ok).toBe(false)
    const other = createProject({ client: 'Annan AB', framework: iso })
    const r = compareProjects(prev, other, iso, '2026-10-14')
    expect(r.ok && r.warnings[0]).toBe('Kundnamnen skiljer sig: Kund AB och Annan AB.')
    expect(compareProjects(prev, { ...other, framework: { id: 'nis2', version: '1' } }, iso, '2026-10-14').ok).toBe(false)
  })
})
