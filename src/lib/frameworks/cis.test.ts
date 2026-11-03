import { describe, it, expect } from 'vitest'
import cisRaw from './cis-controls-8.1.yaml'
import foundationsRaw from './cis-azure-foundations-6.0.0.yaml'
import computeRaw from './cis-azure-compute-2.0.0.yaml'
import databaseRaw from './cis-azure-database-2.0.0.yaml'
import storageRaw from './cis-azure-storage-2.0.0.yaml'
import { FrameworkSchema, allControls } from './schema'
import { acceptSuggestion, suggestions } from '../actions'
import { setApplicable, setStatus } from '../assessment'
import { assessmentProgress } from '../compliance'
import { profileProgress, readiness } from '../dashboard'
import { createProject } from '../project/project'
import { controlRows } from '../report/csv'
import { exclusion } from '../scope'

const NOW = '2026-10-28T10:00:00.000Z'
const cis = FrameworkSchema.parse(cisRaw)
const azure = { foundations: foundationsRaw, compute: computeRaw, database: databaseRaw, storage: storageRaw }
const parsed = Object.fromEntries(Object.entries(azure).map(([k, v]) => [k, FrameworkSchema.parse(v)]))

describe('CIS Controls v8.1', () => {
  it('har 18 kontroller och 153 skyddsåtgärder, 56 i IG1 och 23 bara i IG3', () => {
    const list = allControls(cis).map((x) => x.control)
    expect(cis.sections[0].groups).toHaveLength(18)
    expect(list).toHaveLength(153)
    expect(list.filter((c) => c.profile === 1)).toHaveLength(56)
    expect(list.filter((c) => c.profile === 2)).toHaveLength(74)
    expect(list.filter((c) => c.profile === 3)).toHaveLength(23)
  })

  it('har egna kontrollfrågor och åtgärder för varje skyddsåtgärd', () => {
    expect(allControls(cis).every(({ control: c }) => c.guidance && c.remediation)).toBe(true)
  })

  it('har ingen riskhantering och inget "redo för revision"', () => {
    expect(cis.riskManagement).toBe(false)
    expect(cis.readiness).toBe(false)
    expect(cis.profiles).toEqual(['IG1', 'IG2', 'IG3'])
  })
})

describe('CIS Azure-benchmarks', () => {
  it('har rätt antal rekommendationer', () => {
    expect(Object.fromEntries(Object.entries(parsed).map(([k, fw]) => [k, allControls(fw).length]))).toEqual({
      foundations: 127,
      compute: 99,
      database: 49,
      storage: 64,
    })
  })

  it('varje rekommendation har nivå, automatiserad och egen åtgärd', () => {
    for (const fw of Object.values(parsed))
      for (const { control: c } of allControls(fw)) {
        expect([1, 2]).toContain(c.profile)
        expect(typeof c.automated).toBe('boolean')
        expect(c.remediation?.length).toBeGreaterThan(10)
      }
  })

  it('innehåller bara tillåtna fält, inga CIS-texter', () => {
    const allowed = ['id', 'title', 'profile', 'automated', 'guidance', 'remediation', 'refs']
    for (const raw of Object.values(azure) as { sections: { groups: { controls: Record<string, unknown>[] }[] }[] }[])
      for (const s of raw.sections) for (const g of s.groups) for (const c of g.controls) expect(Object.keys(c).every((k) => allowed.includes(k))).toBe(true)
  })

  it('har kopplingar för en känd rekommendation', () => {
    const c = allControls(parsed.foundations).find((x) => x.control.id === '9.3.4')!.control
    expect(c.profile).toBe(1)
    expect(c.automated).toBe(true)
    expect(c.refs).toEqual(['CIS Controls v8: 3.10', 'Azure Policy: 404c3081-a854-4457-ae30-26a93ef643f9'])
  })
})

describe('målnivå och ej tillämpliga (B-47)', () => {
  const section = cis.sections[0]

  it('kontroller över målnivån bedöms inte', () => {
    const p = createProject({ client: 'X', framework: cis, profile: 1 })
    expect(exclusion(p, section, '1.1')).toBeUndefined()
    expect(exclusion(p, section, '1.3')).toBe('profile')
    expect(assessmentProgress(p, cis).applicable).toBe(56)
  })

  it('en kontroll kan markeras ej tillämplig direkt i listan', () => {
    const p = createProject({ client: 'X', framework: cis, profile: 1 })
    expect(setApplicable(p, section, '1.1', false, NOW)).toBe(true)
    expect(exclusion(p, section, '1.1')).toBe('not_applicable')
    expect(assessmentProgress(p, cis).applicable).toBe(55)
  })

  it('uppfyllnad per nivå räknar lägre nivåer med, oavsett målnivå', () => {
    const p = createProject({ client: 'X', framework: cis, profile: 1 })
    setStatus(p, '1.1', 'fulfilled', NOW)
    setStatus(p, '1.3', 'fulfilled', NOW)
    const levels = profileProgress(p, cis)
    expect(levels.map((l) => [l.label, l.applicable, l.fulfilled, l.target])).toEqual([
      ['IG1', 56, 1, true],
      ['IG2', 130, 2, false],
      ['IG3', 153, 2, false],
    ])
  })

  it('"redo för revision" räknar inte risker när ramverket saknar riskhantering', () => {
    const p = createProject({ client: 'X', framework: cis })
    expect(readiness(p, cis).items.some((i) => i.key === 'risks')).toBe(false)
  })
})

describe('åtgärdstext (B-47)', () => {
  it('blir beskrivningen i förslaget och åtgärden', () => {
    const fw = parsed.foundations
    const p = createProject({ client: 'X', framework: fw, profile: 2 })
    setStatus(p, '9.3.4', 'not_fulfilled', NOW)
    const s = suggestions(p, fw).find((x) => x.source.type === 'control' && x.source.id === '9.3.4')!
    expect(s.description).toContain('Säker överföring krävs')
    const id = acceptSuggestion(p, s, NOW)
    expect(p.actions.find((a) => a.id === id)!.description).toBe(s.description)
  })

  it('CSV får nivå, automatisk och åtgärd sist', () => {
    const fw = parsed.foundations
    const p = createProject({ client: 'X', framework: fw })
    const rows = controlRows(p, fw)
    expect(rows[0].slice(-3)).toEqual(['Nivå', 'Automatisk', 'Så åtgärdas det'])
    expect(rows.find((r) => r[2] === '9.3.4')!.slice(-3, -1)).toEqual(['Level 1', 'Ja'])
  })
})
