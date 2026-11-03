import { describe, it, expect } from 'vitest'
import foundations from './cis-azure-foundations-6.0.0.yaml'
import compute from './cis-azure-compute-2.0.0.yaml'
import database from './cis-azure-database-2.0.0.yaml'
import storage from './cis-azure-storage-2.0.0.yaml'
import { BenchmarkSchema, sectionOf } from './schema'

const files = { foundations, compute, database, storage }
const parsed = Object.fromEntries(Object.entries(files).map(([k, v]) => [k, BenchmarkSchema.parse(v)])) // kastar vid fel

describe('CIS Azure-benchmarks', () => {
  it('har rätt antal rekommendationer', () => {
    expect(Object.fromEntries(Object.entries(parsed).map(([k, b]) => [k, b.recommendations.length]))).toEqual({
      foundations: 127,
      compute: 99,
      database: 49,
      storage: 64,
    })
  })

  it('innehåller inga CIS-texter, bara egna fält', () => {
    const allowed = ['id', 'title', 'level', 'automated', 'ig', 'cisControls', 'azurePolicy', 'remediation']
    for (const b of Object.values(files) as { recommendations: Record<string, unknown>[] }[])
      for (const r of b.recommendations) expect(Object.keys(r).every((k) => allowed.includes(k))).toBe(true)
  })

  it('hittar närmaste avsnitt', () => {
    expect(sectionOf(parsed.foundations.sections, '9.3.4')?.id).toBe('9.3')
    expect(sectionOf(parsed.foundations.sections, '9.3.1.2')?.id).toBe('9.3.1')
  })

  it('har kopplingar för en känd rekommendation', () => {
    const r = parsed.foundations.recommendations.find((x) => x.id === '9.3.4')!
    expect(r.level).toBe(1)
    expect(r.automated).toBe(true)
    expect(r.cisControls).toEqual(['3.10'])
    expect(r.azurePolicy).toEqual(['404c3081-a854-4457-ae30-26a93ef643f9'])
  })
})
