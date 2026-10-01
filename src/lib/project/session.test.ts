import { describe, it, expect } from 'vitest'
// ?raw läser filen som text vid bygget, så testet behöver inte node:fs
import fixture from '../../../tests/fixtures/exempel.grc.json?raw'
import type { SaveTarget } from '../storage/target'
import { createProject } from './project'
import { ProjectSession, describeStatus } from './session'

/** Ett sparmål i minnet som minns vad som skrevs. Kan fås att misslyckas eller vänta. */
function memoryTarget(opts: { fail?: Error; autosave?: boolean; kind?: 'folder' | 'download' } = {}) {
  let gate: Promise<void> | null = null
  let open: () => void = () => {}
  const writes: string[] = []
  return {
    label: 'kund.grc.json',
    kind: opts.kind ?? 'folder',
    autosave: opts.autosave ?? true,
    writes,
    /** Nästa skrivning väntar tills release() anropas. */
    hold() {
      gate = new Promise<void>((r) => (open = r))
    },
    release() {
      open()
    },
    async write(text: string) {
      if (opts.fail) throw opts.fail
      if (gate) await gate
      writes.push(text)
    },
  } satisfies SaveTarget & Record<string, unknown>
}

const clock = (start = '2026-09-29T10:00:00.000Z') => {
  let t = new Date(start).getTime()
  return { now: () => new Date((t += 60_000)) }
}

const newProject = () =>
  createProject({ client: 'Exempelbolaget AB', framework: { id: 'iso27001', version: '2022' }, now: new Date('2026-09-29T09:00:00Z') })

describe('nytt projekt', () => {
  it('sparas direkt när arbetet startar', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget()
    expect(await s.start(newProject(), t)).toEqual({ ok: true })
    expect(t.writes).toHaveLength(1)
    expect(JSON.parse(t.writes[0]).client.name).toBe('Exempelbolaget AB')
    expect(s.status.state).toBe('saved')
    expect(s.hasUnsavedChanges).toBe(false)
    expect(s.framework?.id).toBe('iso27001')
  })

  it('okänt ramverk startas inte', async () => {
    const s = new ProjectSession(clock())
    const p = { ...newProject(), framework: { id: 'nis2', version: '2022' } }
    const r = await s.start(p, memoryTarget())
    expect(r.ok).toBe(false)
    expect(s.status.state).toBe('error')
  })
})

describe('öppna', () => {
  it('öppnar en giltig fil utan varningar', () => {
    const s = new ProjectSession(clock())
    expect(s.open(fixture, memoryTarget())).toEqual({ ok: true, warnings: [] })
    expect(s.project?.client.name).toBe('Exempelbolaget AB')
    expect(s.status).toEqual({ state: 'saved', at: '2026-09-22T14:42:00Z' })
    expect(s.hasUnsavedChanges).toBe(false)
  })

  it('en ogiltig fil öppnas inte, och det öppna projektet lämnas orört', () => {
    const s = new ProjectSession(clock())
    s.open(fixture, memoryTarget())
    const before = s.project
    const r = s.open('{ inte json', memoryTarget())
    expect(r).toEqual({ ok: false, errors: ['Filen är inte giltig JSON.'] })
    expect(s.project).toBe(before)
  })

  it('avvikelser mot ramverket blir varningar, inte fel', () => {
    const s = new ProjectSession(clock())
    const raw = JSON.parse(fixture)
    raw.controls['A.9.9'] = { status: 'fulfilled' }
    expect(s.open(JSON.stringify(raw), memoryTarget())).toEqual({ ok: true, warnings: ['Bedömning: okänd kontroll A.9.9'] })
  })
})

describe('ändringar', () => {
  it('update ändrar inte det gamla projektobjektet och markerar osparat', () => {
    const s = new ProjectSession(clock())
    s.open(fixture, memoryTarget())
    const before = s.project!
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Ny kommentar'
    })
    expect(before.controls['A.8.20'].comment).not.toBe('Ny kommentar')
    expect(s.project!.controls['A.8.20'].comment).toBe('Ny kommentar')
    expect(s.status.state).toBe('unsaved')
    expect(s.hasUnsavedChanges).toBe(true)
  })

  it('newId ger nästa ID och sparar löpnumret, utan att ändra det gamla objektet', () => {
    const s = new ProjectSession(clock())
    s.open(fixture, memoryTarget())
    const before = s.project!
    expect(s.newId('risk')).toBe('R-004')
    expect(s.newId('risk')).toBe('R-005')
    expect(s.project!.nextNumber.risk).toBe(6)
    expect(before.nextNumber.risk).toBe(4)
    expect(s.hasUnsavedChanges).toBe(true)
  })

  it('update utan öppet projekt kastar', () => {
    expect(() => new ProjectSession().update(() => {})).toThrow(/Inget projekt/)
  })

  it('onChange anropas vid varje ändring', () => {
    let calls = 0
    const s = new ProjectSession({ ...clock(), onChange: () => calls++ })
    s.open(fixture, memoryTarget())
    s.update(() => {})
    s.update(() => {})
    expect(calls).toBe(3)
  })
})

describe('spara', () => {
  it('skriver projektet med ny tidsstämpel', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget()
    s.open(fixture, t)
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Ny'
    })
    expect(await s.save()).toEqual({ ok: true })
    const saved = JSON.parse(t.writes[0])
    expect(saved.controls['A.8.20'].comment).toBe('Ny')
    expect(saved.updatedAt).toBe(s.project!.updatedAt)
    expect(saved.updatedAt).not.toBe('2026-09-22T14:42:00Z')
    expect(s.status.state).toBe('saved')
    expect(s.hasUnsavedChanges).toBe(false)
  })

  it('ett ogiltigt projekt skrivs aldrig; felet syns i statusen', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget()
    s.open(fixture, t)
    s.update((d) => {
      ;(d.controls['A.8.20'] as { status: string }).status = 'ok'
    })
    const r = await s.save()
    expect(r.ok).toBe(false)
    expect(t.writes).toHaveLength(0)
    expect(s.status.state).toBe('error')
    if (s.status.state === 'error') {
      expect(s.status.message).toBe('Projektet innehåller fel och sparades inte.')
      expect(s.status.details[0]).toMatch(/^controls\.A\.8\.20\.status: /)
    }
    expect(s.hasUnsavedChanges).toBe(true)
  })

  it('skrivfel syns i statusen och ändringarna räknas som osparade', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget({ fail: new Error('Disken är full') })
    s.open(fixture, t)
    s.update(() => {})
    const r = await s.save()
    expect(r).toEqual({ ok: false, message: 'Kunde inte skriva till kund.grc.json.', details: ['Disken är full'] })
    expect(s.hasUnsavedChanges).toBe(true)
  })

  it('ändringar under pågående skrivning räknas fortfarande som osparade', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget()
    s.open(fixture, t)
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Första'
    })
    t.hold()
    const saving = s.save()
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Andra'
    })
    t.release()
    await saving
    expect(JSON.parse(t.writes[0]).controls['A.8.20'].comment).toBe('Första')
    expect(s.project!.controls['A.8.20'].comment).toBe('Andra')
    expect(s.status.state).toBe('unsaved')
    expect(s.hasUnsavedChanges).toBe(true)
  })

  it('saveAs byter sparmål', async () => {
    const s = new ProjectSession(clock())
    const first = memoryTarget()
    const second = memoryTarget()
    s.open(fixture, first)
    await s.saveAs(second)
    expect(first.writes).toHaveLength(0)
    expect(second.writes).toHaveLength(1)
    expect(s.target).toBe(second)
  })
})

describe('autosparning', () => {
  it('sparar bara när något har ändrats', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget()
    s.open(fixture, t)
    await s.autosaveTick()
    expect(t.writes).toHaveLength(0)
    s.update(() => {})
    await s.autosaveTick()
    expect(t.writes).toHaveLength(1)
    await s.autosaveTick()
    expect(t.writes).toHaveLength(1)
  })

  it('nedladdningar autosparas aldrig', async () => {
    const s = new ProjectSession(clock())
    const t = memoryTarget({ kind: 'download', autosave: false })
    s.open(fixture, t)
    s.update(() => {})
    await s.autosaveTick()
    expect(t.writes).toHaveLength(0)
  })
})

describe('describeStatus', () => {
  it('visar var och när det sparades', () => {
    const d = describeStatus({ state: 'saved', at: '2026-09-29T12:42:00Z' }, memoryTarget())
    expect(d.tone).toBe('ok')
    expect(d.text).toMatch(/^Sparat till kund\.grc\.json \d\d:\d\d$/)
  })

  it('varnar för att nedladdningar inte sparas automatiskt', () => {
    const d = describeStatus({ state: 'saved', at: '2026-09-29T12:42:00Z' }, memoryTarget({ kind: 'download' }))
    expect(d.tone).toBe('warn')
    expect(d.text).toMatch(/Sparas inte automatiskt/)
  })

  it('visar felet', () => {
    const d = describeStatus({ state: 'error', message: 'Kunde inte skriva.', details: [], since: '' }, null)
    expect(d).toEqual({ text: 'Kunde inte skriva.', tone: 'error' })
  })
})
