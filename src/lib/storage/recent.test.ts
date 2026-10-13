import { describe, it, expect } from 'vitest'
import fixture from '../../../tests/fixtures/exempel.grc.json?raw'
import { getFramework } from '../frameworks'
import { parseProject } from '../project/project'
import { MAX_RECENT, idbRecentStore, memoryRecentStore, mergeRecent, recentEntry, type RecentEntry } from './recent'
import type { SaveTarget } from './target'

const iso = getFramework('iso27001', '2022')!
const target = (kind: 'folder' | 'download'): SaveTarget => ({
  label: 'exempelbolaget-ab.grc.json',
  kind,
  autosave: kind === 'folder',
  write: async () => {},
})
const project = () => {
  const r = parseProject(fixture)
  if (!r.ok) throw new Error(r.errors.join('\n'))
  return r.project
}
const entry = (id: string, usedAt: string): RecentEntry => ({
  ...recentEntry(project(), iso, target('folder'), usedAt),
  projectId: id,
})

describe('recentEntry', () => {
  it('innehåller det startsidan visar, och förloppet', () => {
    const e = recentEntry(project(), iso, target('download'), '2026-10-05T10:00:00.000Z')
    expect(e.client).toBe('Exempelbolaget AB')
    expect(e.framework).toEqual({ id: 'iso27001', version: '2022', name: 'ISO/IEC 27001:2022' })
    expect(e.fileName).toBe('exempelbolaget-ab.grc.json')
    expect(e.kind).toBe('download')
    expect(e.dir).toBeUndefined()
    expect(e.updatedAt).toBe('2026-09-22T14:42:00Z')
    expect(e.progress).toEqual({ assessed: 2, applicable: 118, fulfilled: 1, partial: 1, notFulfilled: 0 })
  })

  it('innehåller ingen bedömning, bara det som syns i listan', () => {
    const e = recentEntry(project(), iso, target('folder'), '2026-10-05T10:00:00.000Z')
    expect(Object.keys(e).sort()).toEqual(
      ['client', 'fileName', 'framework', 'kind', 'progress', 'projectId', 'updatedAt', 'usedAt'].sort(),
    )
  })
})

describe('mergeRecent', () => {
  const dir = { name: 'uppdrag' } as unknown as FileSystemDirectoryHandle
  const folder = { ...recentEntry(project(), iso, { ...target('folder'), dir }, '2026-10-05T10:00:00.000Z') }
  const download = recentEntry(project(), iso, target('download'), '2026-10-07T10:00:00.000Z')

  it('en nedladdning behåller mappen från en tidigare post', () => {
    const m = mergeRecent(folder, download)
    expect(m.kind).toBe('folder')
    expect(m.dir).toBe(dir)
    expect(m.usedAt).toBe('2026-10-07T10:00:00.000Z')
  })

  it('annars ersätts posten', () => {
    expect(mergeRecent(undefined, download)).toBe(download)
    expect(mergeRecent(download, folder)).toBe(folder)
  })
})

describe('memoryRecentStore', () => {
  it('senast använda först, och samma projekt bara en gång', async () => {
    const store = memoryRecentStore()
    await store.put(entry('a', '2026-10-05T10:00:00.000Z'))
    await store.put(entry('b', '2026-10-05T11:00:00.000Z'))
    await store.put(entry('a', '2026-10-05T12:00:00.000Z'))
    expect((await store.list()).map((e) => e.projectId)).toEqual(['a', 'b'])
  })

  it('sparar högst MAX_RECENT projekt', async () => {
    const store = memoryRecentStore()
    for (let i = 0; i < MAX_RECENT + 3; i++) await store.put(entry(`p${i}`, `2026-10-05T10:${String(i).padStart(2, '0')}:00.000Z`))
    const list = await store.list()
    expect(list).toHaveLength(MAX_RECENT)
    expect(list[0].projectId).toBe(`p${MAX_RECENT + 2}`)
  })

  it('remove tar bort ur listan', async () => {
    const store = memoryRecentStore()
    await store.put(entry('a', '2026-10-05T10:00:00.000Z'))
    await store.remove('a')
    expect(await store.list()).toEqual([])
  })
})

describe('idbRecentStore utan IndexedDB', () => {
  it('ger en tom lista i stället för fel', async () => {
    const store = idbRecentStore(null)
    await store.put(entry('a', '2026-10-05T10:00:00.000Z'))
    expect(await store.list()).toEqual([])
  })
})
