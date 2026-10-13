import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { parseFindings, technicalStatus } from './findings'

const iso = getFramework('iso27001', '2022')!
const sample = {
  format: 'grc-fynd',
  version: 1,
  source: { tool: 'CloudSecComp', toolVersion: '0.1', environment: 'Azure-tenant contoso.onmicrosoft.com' },
  collectedAt: '2026-10-12T10:00:00Z',
  findings: [
    { control: 'A.8.5', status: 'fulfilled', title: 'MFA krävs för alla användare' },
    { control: 'A.8.5', status: 'partial', title: 'Två tjänstekonton saknar MFA', resource: '/subscriptions/x/…' },
    { control: 'A.8.15', status: 'not_fulfilled', title: 'Loggning saknas för Key Vault' },
    { control: 'X.1', status: 'fulfilled', title: 'Okänd kontroll' },
  ],
}

describe('fyndfil', () => {
  it('läses och valideras', () => {
    const r = parseFindings(JSON.stringify(sample))
    expect(r.ok).toBe(true)
    expect(parseFindings('{').ok).toBe(false)
    const bad = parseFindings(JSON.stringify({ ...sample, format: 'annat' }))
    expect(!bad.ok && bad.errors[0].startsWith('format:')).toBe(true)
  })

  it('sämsta status per kontroll, okända kontroller separat', () => {
    const r = parseFindings(JSON.stringify(sample))
    if (!r.ok) throw new Error()
    const t = technicalStatus(r.file, iso)
    expect(t.status.get('A.8.5')).toBe('partial')
    expect(t.status.get('A.8.15')).toBe('not_fulfilled')
    expect(t.unknown).toEqual(['X.1'])
  })
})
