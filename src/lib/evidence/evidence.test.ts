import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { createProject, validateProject } from '../project/project'
import { addRisk } from '../risk/operations'
import { addEvidence, allEvidence, candidateNames, findByHash, formatSize, needsEvidence, ownerFolder, removeEvidence, safeName } from './evidence'

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-12T10:00:00.000Z'
const SHA = 'a'.repeat(64)
const data = (file: string, sha = SHA) => ({ file, size: 10, sha256: sha, source: 'manual' as const, addedBy: 'Konsult K.' })

describe('namn och sökvägar', () => {
  it('säkra filnamn', () => {
    expect(safeName('Policy: v2/slutlig?.pdf')).toBe('Policy_ v2_slutlig_.pdf')
    expect(safeName('  ..  ')).toBe('fil')
    expect(ownerFolder({ kind: 'control', id: 'A.8.5' })).toBe('evidens/A.8.5')
  })

  it('lediga namn i tur och ordning', () => {
    const g = candidateNames('policy.pdf')
    expect([g.next().value, g.next().value, g.next().value]).toEqual(['policy.pdf', 'policy (2).pdf', 'policy (3).pdf'])
    expect(candidateNames('README').next().value).toBe('README')
  })

  it('storlek som text', () => {
    expect(formatSize(500)).toBe('500 B')
    expect(formatSize(2048)).toBe('2 kB')
    expect(formatSize(1.5 * 1024 * 1024)).toBe('1,5 MB')
  })
})

describe('referenser', () => {
  it('på kontroll och risk, med egna ID:n och giltigt projekt', () => {
    const p = createProject({ client: 'X', framework: iso })
    const risk = addRisk(p, 'Risk', NOW)
    expect(addEvidence(p, { kind: 'control', id: 'A.8.5' }, data('evidens/A.8.5/mfa.png'), NOW)).toBe('EV-001')
    expect(addEvidence(p, { kind: 'risk', id: risk }, data('evidens/R-001/rapport.pdf', 'b'.repeat(64)), NOW)).toBe('EV-002')
    expect(allEvidence(p)).toHaveLength(2)
    expect(p.risks[0].history.at(-1)?.text).toBe('Evidens bifogad: evidens/R-001/rapport.pdf')
    expect(findByHash(p, SHA)?.file).toBe('evidens/A.8.5/mfa.png')
    expect(validateProject(p)).toEqual([])
  })

  it('borttagning tar bara bort referensen, och ID:t återanvänds inte', () => {
    const p = createProject({ client: 'X', framework: iso })
    addEvidence(p, { kind: 'control', id: 'A.8.5' }, data('evidens/A.8.5/mfa.png'), NOW)
    removeEvidence(p, { kind: 'control', id: 'A.8.5' }, 'EV-001')
    expect(p.controls['A.8.5'].evidence).toEqual([])
    expect(addEvidence(p, { kind: 'control', id: 'A.8.5' }, data('evidens/A.8.5/x.png'), NOW)).toBe('EV-002')
  })
})

describe('saknar evidens', () => {
  const answer = (status: string, files = 0, note = '') => ({ status, evidence: Array(files).fill({}), evidenceNote: note })
  it('uppfylld eller delvis utan fil och anteckning', () => {
    expect(needsEvidence(answer('fulfilled'))).toBe(true)
    expect(needsEvidence(answer('partial'))).toBe(true)
    expect(needsEvidence(answer('fulfilled', 1))).toBe(false)
    expect(needsEvidence(answer('fulfilled', 0, 'I ledningssystemet'))).toBe(false)
    expect(needsEvidence(answer('not_fulfilled'))).toBe(false)
    expect(needsEvidence(undefined)).toBe(false)
  })
})
