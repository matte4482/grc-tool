import { describe, it, expect } from 'vitest'
import { getFramework } from './frameworks'
import { checkAgainstFramework, createProject, validateProject } from './project/project'
import { addRisk, linkControl, removeRisk, setBefore, setTreatment } from './risk/operations'
import { setStatus } from './assessment'
import {
  NO_ACTION_FILTER,
  acceptSuggestion,
  actionSummary,
  actionWarnings,
  actionsFor,
  addManualAction,
  addToAction,
  filterActions,
  setActionStatus,
  setActionText,
  setDue,
  suggestionFor,
  suggestions,
  treatmentPlan,
  unlink,
} from './actions'

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-12T10:00:00.000Z'
const TODAY = '2026-10-12'

/** Projekt med R-001 (K4 × S4 = 16) kopplad till A.8.5, som är delvis uppfylld, och A.5.1 ej uppfylld. */
function setup() {
  const p = createProject({ client: 'X', framework: iso })
  addRisk(p, 'Phishing', NOW)
  setBefore(p, 'R-001', { consequence: 4, likelihood: 4 }, NOW)
  setTreatment(p, 'R-001', 'reduce', NOW)
  linkControl(p, 'R-001', { control: 'A.8.5', effect: 'high', type: 'preventive' }, NOW)
  setStatus(p, 'A.8.5', 'partial', NOW)
  setStatus(p, 'A.5.1', 'not_fulfilled', NOW)
  return p
}

describe('förslag', () => {
  it('risk över acceptansnivån tar med sina bristande kontroller', () => {
    const p = setup()
    const s = suggestions(p, iso)
    expect(s.map((x) => x.key)).toEqual(['risk:R-001', 'control:A.5.1'])
    expect(s[0].controls).toEqual(['A.8.5'])
    expect(s[0].reason).toBe('Restrisken 12 är över acceptansnivån 6.')
    expect(s[1].priority).toBe('high')
  })

  it('delvis uppfylld ger medel, bortvald och accepterad ger inget', () => {
    const p = setup()
    setTreatment(p, 'R-001', 'accept', NOW)
    p.controls['A.5.1'].applicable = false
    expect(suggestions(p, iso).map((x) => [x.key, x.priority])).toEqual([['control:A.8.5', 'medium']])
  })

  it('godkänt förslag blir åtgärd och föreslås inte igen', () => {
    const p = setup()
    const id = acceptSuggestion(p, suggestions(p, iso)[0], NOW)
    expect(id).toBe('ATG-001')
    expect([p.actions[0].controls, p.actions[0].risks, p.actions[0].priority, p.actions[0].source]).toEqual([['A.8.5'], ['R-001'], 'high', { type: 'risk', id: 'R-001' }])
    expect(p.risks[0].history.at(-1)!.text).toBe('Åtgärd ATG-001 skapad')
    expect(suggestions(p, iso).map((x) => x.key)).toEqual(['control:A.5.1'])
    expect(validateProject(p)).toEqual([])
  })

  it('förslag kan läggas till befintlig åtgärd', () => {
    const p = setup()
    const id = acceptSuggestion(p, suggestionFor(p, iso, 'risk', 'R-001')!, NOW)
    addToAction(p, id, suggestionFor(p, iso, 'control', 'A.5.1')!, NOW)
    expect(p.actions[0].controls).toEqual(['A.8.5', 'A.5.1'])
    expect(suggestions(p, iso)).toEqual([])
    expect(actionsFor(p, 'control', 'A.5.1').map((a) => a.id)).toEqual(['ATG-001'])
  })
})

describe('åtgärder', () => {
  it('manuell åtgärd, status och slutdatum', () => {
    const p = setup()
    const id = addManualAction(p, '', NOW)
    expect(p.actions[0].title).toBe('Ny åtgärd')
    setActionStatus(p, id, 'done', NOW)
    expect(p.actions[0].completedAt).toBe(TODAY)
    setActionStatus(p, id, 'in_progress', NOW)
    expect(p.actions[0].completedAt).toBeUndefined()
    expect(validateProject(p)).toEqual([])
  })

  it('varningar: försenad, saknar ansvarig, underlaget åtgärdat, klar men brist kvar', () => {
    const p = setup()
    const id = acceptSuggestion(p, suggestionFor(p, iso, 'control', 'A.5.1')!, NOW)
    setDue(p, id, '2026-10-01')
    expect(actionWarnings(p, p.actions[0], TODAY)).toEqual(['Försenad', 'Saknar ansvarig'])
    setStatus(p, 'A.5.1', 'fulfilled', NOW)
    setActionText(p, id, 'owner', 'IT-chef')
    expect(actionWarnings(p, p.actions[0], TODAY)).toEqual(['Försenad', 'Underlaget är åtgärdat. Stäng åtgärden?'])
    setActionStatus(p, id, 'done', NOW)
    setStatus(p, 'A.5.1', 'partial', NOW)
    expect(actionWarnings(p, p.actions[0], TODAY)).toEqual(['Klar, men bristen finns kvar. Uppdatera status på kontrollen eller risken.'])
  })

  it('filter, sortering och nyckeltal', () => {
    const p = setup()
    for (const s of suggestions(p, iso)) acceptSuggestion(p, s, NOW)
    const m = addManualAction(p, 'Utbildning', NOW)
    setDue(p, 'ATG-002', '2026-10-01')
    setActionStatus(p, m, 'cancelled', NOW)
    expect(filterActions(p, NO_ACTION_FILTER, TODAY).map((a) => a.id)).toEqual(['ATG-002', 'ATG-001'])
    expect(filterActions(p, { ...NO_ACTION_FILTER, status: 'all' }, TODAY).map((a) => a.id)).toEqual(['ATG-002', 'ATG-001', 'ATG-003'])
    expect(filterActions(p, { ...NO_ACTION_FILTER, overdue: true }, TODAY).map((a) => a.id)).toEqual(['ATG-002'])
    expect(actionSummary(p, TODAY)).toEqual({ open: 2, overdue: 1, done: 0, cancelled: 1 })
  })

  it('koppling kan tas bort; borttagen risk tas bort ur åtgärden', () => {
    const p = setup()
    const id = acceptSuggestion(p, suggestions(p, iso)[0], NOW)
    unlink(p, id, 'control', 'A.8.5')
    expect(p.actions[0].controls).toEqual([])
    removeRisk(p, 'R-001')
    expect(p.actions[0].risks).toEqual([])
    expect(validateProject(p)).toEqual([])
    expect(checkAgainstFramework(p, iso)).toEqual([])
  })
})

describe('riskbehandlingsplan', () => {
  it('bedömda risker, högst först, utan avbrutna åtgärder', () => {
    const p = setup()
    addRisk(p, 'Ej bedömd', NOW)
    addRisk(p, 'Låg', NOW)
    setBefore(p, 'R-003', { consequence: 2, likelihood: 2 }, NOW)
    const id = acceptSuggestion(p, suggestions(p, iso)[0], NOW)
    const rows = treatmentPlan(p)
    expect(rows.map((r) => [r.risk.id, r.before, r.planned, r.actual])).toEqual([
      ['R-001', 16, 4, 12],
      ['R-003', 4, 4, 4],
    ])
    expect(rows[0].actions.map((a) => a.id)).toEqual([id])
    setActionStatus(p, id, 'cancelled', NOW)
    expect(treatmentPlan(p)[0].actions).toEqual([])
  })
})

describe('förslag för en kontroll eller risk', () => {
  it('ger samma förslag som listan', () => {
    const p = setup()
    setStatus(p, 'A.8.24', 'partial', NOW)
    const all = suggestions(p, iso)
    for (const s of all) {
      const kind = s.source.type
      expect(suggestionFor(p, iso, kind, s.source.id)).toEqual(s)
    }
    expect(suggestionFor(p, iso, 'control', 'A.8.5')!.key).toBe('risk:R-001')
    expect(suggestionFor(p, iso, 'control', 'A.6.1')).toBeUndefined()
  })
})
