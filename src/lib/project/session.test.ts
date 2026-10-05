import { describe, it, expect } from 'vitest'
// ?raw läser filen som text vid bygget, så testet behöver inte node:fs
import fixture from '../../../tests/fixtures/exempel.grc.json?raw'
import type { SaveTarget } from '../storage/target'
import { createProject } from './project'
import { ProjectSession, describeStatus } from './session'
import { localBackupStore } from '../storage/backup'
import { memoryStorage } from '../storage/memory-storage'

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

describe('reservkopia i webbläsaren', () => {
  const setup = (kind: 'folder' | 'download' = 'folder') => {
    const backup = localBackupStore(memoryStorage())
    const s = new ProjectSession({ ...clock(), backup })
    const t = memoryTarget({ kind, autosave: kind === 'folder' })
    return { backup, s, t }
  }

  it('varje ändring skrivs till reservkopian', () => {
    const { backup, s, t } = setup()
    s.open(fixture, t)
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Ny'
    })
    const id = s.project!.id
    expect(JSON.parse(backup.read(id)!.project).controls['A.8.20'].comment).toBe('Ny')
  })

  it('rensas när projektet sparats till en mapp', async () => {
    const { backup, s, t } = setup('folder')
    s.open(fixture, t)
    s.update(() => {})
    await s.save()
    expect(backup.read(s.project!.id)).toBeNull()
  })

  it('ligger kvar efter nedladdning, med tidpunkten noterad', async () => {
    const { backup, s, t } = setup('download')
    s.open(fixture, t)
    s.update(() => {})
    await s.save()
    const b = backup.read(s.project!.id)!
    expect(b.downloadedAt).toBe(s.project!.updatedAt)
  })

  it('ligger kvar om sparningen misslyckas', async () => {
    const backup = localBackupStore(memoryStorage())
    const s = new ProjectSession({ ...clock(), backup })
    s.open(fixture, memoryTarget({ fail: new Error('Disken är full') }))
    s.update(() => {})
    await s.save()
    expect(backup.read(s.project!.id)).not.toBeNull()
  })

  it('ligger kvar om ett ogiltigt projekt inte kunde sparas', async () => {
    const { backup, s, t } = setup()
    s.open(fixture, t)
    s.update((d) => {
      d.client.name = ''
    })
    await s.save()
    expect(JSON.parse(backup.read(s.project!.id)!.project).client.name).toBe('')
  })

  it('när filen öppnas igen erbjuds nyare ändringar', () => {
    const { s, t } = setup()
    s.open(fixture, t)
    s.update((d) => {
      d.controls['A.8.20'].comment = 'Osparad'
    })
    // Webbläsaren kraschar; en ny session öppnar samma fil med samma lagring
    const r = s.open(fixture, t)
    expect(r.ok && r.newerBackup?.changedAt).toBeTruthy()
  })

  it('restoreBackup ger tillbaka ändringarna och räknar dem som osparade', () => {
    const backup = localBackupStore(memoryStorage())
    const first = new ProjectSession({ ...clock(), backup })
    first.open(fixture, memoryTarget())
    first.update((d) => {
      d.controls['A.8.20'].comment = 'Osparad'
    })

    const second = new ProjectSession({ ...clock(), backup })
    const r = second.open(fixture, memoryTarget())
    expect(r.ok && r.newerBackup).toBeTruthy()
    expect(second.project!.controls['A.8.20'].comment).not.toBe('Osparad')
    expect(second.restoreBackup()).toEqual({ ok: true })
    expect(second.project!.controls['A.8.20'].comment).toBe('Osparad')
    expect(second.hasUnsavedChanges).toBe(true)
  })

  it('discardBackup tar bort kopian och behåller filens version', () => {
    const { backup, s, t } = setup()
    s.open(fixture, t)
    s.update(() => {})
    const id = s.project!.id
    s.discardBackup()
    expect(backup.read(id)).toBeNull()
  })

  it('en nedladdad fil som öppnas igen rensar kopian när den är minst lika ny', async () => {
    const { backup, s, t } = setup('download')
    s.open(fixture, t)
    s.update(() => {})
    await s.save()
    const downloaded = t.writes[0]
    const again = new ProjectSession({ ...clock(), backup })
    const r = again.open(downloaded, memoryTarget({ kind: 'download', autosave: false }))
    expect(r.ok && r.newerBackup).toBeFalsy()
    expect(backup.read(again.project!.id)).toBeNull()
  })

  it('openBackup öppnar en kopia utan fil och räknar den som osparad', () => {
    const backup = localBackupStore(memoryStorage())
    const first = new ProjectSession({ ...clock(), backup })
    first.open(fixture, memoryTarget())
    first.update((d) => {
      d.client.name = 'Från kopian'
    })
    const id = first.project!.id

    const second = new ProjectSession({ ...clock(), backup })
    expect(second.listBackups().map((b) => b.client)).toEqual(['Från kopian'])
    expect(second.openBackup(id, memoryTarget({ kind: 'download', autosave: false }))).toEqual({ ok: true })
    expect(second.project!.client.name).toBe('Från kopian')
    expect(second.status.state).toBe('unsaved')
  })

  it('en kopia med ogiltigt projekt kan inte öppnas, men ligger kvar', () => {
    const backup = localBackupStore(memoryStorage())
    const first = new ProjectSession({ ...clock(), backup })
    first.open(fixture, memoryTarget())
    first.update((d) => {
      d.client.name = ''
    })
    const id = first.project!.id
    const r = new ProjectSession({ ...clock(), backup }).openBackup(id, memoryTarget())
    expect(r.ok).toBe(false)
    expect(backup.read(id)).not.toBeNull()
  })

  it('full lagring syns som backupFailed men stoppar inte arbetet', () => {
    const s = new ProjectSession({ ...clock(), backup: localBackupStore(memoryStorage({ full: true })) })
    s.open(fixture, memoryTarget())
    s.update(() => {})
    expect(s.backupFailed).toBe(true)
    expect(s.status.state).toBe('unsaved')
  })
})
