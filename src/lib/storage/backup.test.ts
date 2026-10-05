import { describe, it, expect } from 'vitest'
import { createProject } from '../project/project'
import { isNewerThan, localBackupStore } from './backup'
import { memoryStorage } from './memory-storage'

const project = (client = 'Exempelbolaget AB') =>
  createProject({ client, framework: { id: 'iso27001', version: '2022' }, now: new Date('2026-10-05T09:00:00Z') })

describe('localBackupStore', () => {
  it('skriver, läser och rensar en kopia', () => {
    const store = localBackupStore(memoryStorage())
    const p = project()
    expect(store.write(p, 'kund.grc.json', '2026-10-05T10:00:00.000Z')).toBe(true)
    const b = store.read(p.id)!
    expect(b.client).toBe('Exempelbolaget AB')
    expect(b.label).toBe('kund.grc.json')
    expect(JSON.parse(b.project).id).toBe(p.id)
    store.clear(p.id)
    expect(store.read(p.id)).toBeNull()
  })

  it('sparar även ett ogiltigt projekt, så att inget går förlorat', () => {
    const store = localBackupStore(memoryStorage())
    const p = { ...project(), client: { name: '' } }
    expect(store.write(p, '', '2026-10-05T10:00:00.000Z')).toBe(true)
    expect(JSON.parse(store.read(p.id)!.project).client.name).toBe('')
  })

  it('listar kopior nyast först och hoppar över andra nycklar', () => {
    const storage = memoryStorage()
    storage.setItem('någon-annan-app', 'x')
    const store = localBackupStore(storage)
    const a = project('A')
    const b = project('B')
    store.write(a, '', '2026-10-05T10:00:00.000Z')
    store.write(b, '', '2026-10-05T11:00:00.000Z')
    expect(store.list().map((x) => x.client)).toEqual(['B', 'A'])
  })

  it('noterar nedladdning utan att ta bort kopian', () => {
    const store = localBackupStore(memoryStorage())
    const p = project()
    store.write(p, '', '2026-10-05T10:00:00.000Z')
    store.markDownloaded(p.id, '2026-10-05T10:05:00.000Z')
    expect(store.read(p.id)?.downloadedAt).toBe('2026-10-05T10:05:00.000Z')
  })

  it('full eller avstängd lagring ger false i stället för fel', () => {
    expect(localBackupStore(memoryStorage({ full: true })).write(project(), '', '2026-10-05T10:00:00.000Z')).toBe(false)
    const none = localBackupStore(null)
    expect(none.write(project(), '', '2026-10-05T10:00:00.000Z')).toBe(false)
    expect(none.list()).toEqual([])
  })

  it('trasiga poster ignoreras', () => {
    const storage = memoryStorage()
    storage.setItem('grc-verktyget:reservkopia:x', '{ inte json')
    expect(localBackupStore(storage).list()).toEqual([])
  })
})

describe('isNewerThan', () => {
  it('jämför tidpunkter, inte text', () => {
    const b = { projectId: 'x', client: '', label: '', changedAt: '2026-10-05T10:00:00.000Z', project: '{}' }
    expect(isNewerThan(b, '2026-10-05T09:59:59Z')).toBe(true)
    expect(isNewerThan(b, '2026-10-05T10:00:00Z')).toBe(false)
    expect(isNewerThan(b, '2026-10-05T12:00:00+02:00')).toBe(false)
  })
})
