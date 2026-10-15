import { describe, it, expect } from 'vitest'
import { getFramework } from '../frameworks'
import { createProject } from '../project/project'
import { setStatus, setText } from '../assessment'
import { actionRows, controlRows, riskRows, toCsv } from './csv'
import { addRisk } from '../risk/operations'

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-14T10:00:00.000Z'

describe('CSV', () => {
  it('semikolon, citattecken, BOM och skydd mot formler', () => {
    expect(toCsv([['a;b', 'säg "hej"', '=SUMMA(A1)', 3]])).toBe('﻿"a;b";"säg ""hej""";\'=SUMMA(A1);3\r\n')
  })

  it('en rad per kontroll, risk och åtgärd', () => {
    const p = createProject({ client: 'X', framework: iso })
    setStatus(p, 'A.5.1', 'partial', NOW)
    setText(p, 'A.5.1', 'owner', 'CISO', NOW)
    addRisk(p, 'Phishing', NOW)
    const controls = controlRows(p, iso)
    expect(controls.length).toBe(1 + 26 + 93)
    expect(controls.find((r) => r[2] === 'A.5.1')!.slice(4, 6)).toEqual(['Ja', 'Delvis uppfylld'])
    expect(riskRows(p)[1].slice(0, 2)).toEqual(['R-001', 'Phishing'])
    expect(actionRows(p)).toHaveLength(1)
  })
})
