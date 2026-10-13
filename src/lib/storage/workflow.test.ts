import { describe, it, expect } from 'vitest'
import type { RecentEntry } from './recent'
import { openDropped, pickProjectInFolder, prepareFolderTarget, reopenRecent, type FolderAccess } from './workflow'

/** En låtsad mapp: filnamn → innehåll. */
function fakeFolders(opts: { files?: Record<string, string>; picked?: boolean; access?: boolean } = {}) {
  const files = opts.files ?? {}
  const dir = { name: 'uppdrag' } as unknown as FileSystemDirectoryHandle
  const fs: FolderAccess = {
    pickFolder: async () => (opts.picked === false ? null : dir),
    ensureWriteAccess: async () => opts.access !== false,
    listProjectFiles: async () => Object.keys(files).sort(),
    readFile: async (_d, name) => {
      if (!(name in files)) throw new DOMException('finns inte', 'NotFoundError')
      return files[name]
    },
    fileExists: async (_d, name) => name in files,
  }
  return { dir, fs }
}

describe('pickProjectInFolder', () => {
  it('avbruten dialog', async () => {
    expect(await pickProjectInFolder(fakeFolders({ picked: false }).fs)).toEqual({ kind: 'cancelled' })
  })

  it('nekad behörighet', async () => {
    expect(await pickProjectInFolder(fakeFolders({ access: false }).fs)).toEqual({ kind: 'denied' })
  })

  it('mapp utan projektfil', async () => {
    expect(await pickProjectInFolder(fakeFolders().fs)).toEqual({ kind: 'empty' })
  })

  it('en projektfil läses direkt', async () => {
    const r = await pickProjectInFolder(fakeFolders({ files: { 'kund.grc.json': '{}' } }).fs)
    expect(r.kind).toBe('file')
    if (r.kind !== 'file') return
    expect(r.text).toBe('{}')
    expect(r.target.label).toBe('kund.grc.json')
    expect(r.target.kind).toBe('folder')
  })

  it('flera projektfiler: konsulten får välja', async () => {
    const { fs, dir } = fakeFolders({ files: { 'b.grc.json': '', 'a.grc.json': '' } })
    expect(await pickProjectInFolder(fs)).toEqual({ kind: 'choose', dir, files: ['a.grc.json', 'b.grc.json'] })
  })
})

describe('prepareFolderTarget', () => {
  it('säger om filen redan finns', async () => {
    const r = await prepareFolderTarget('kund.grc.json', fakeFolders({ files: { 'kund.grc.json': '{}' } }).fs)
    expect(r.kind === 'ready' && r.exists).toBe(true)
    const r2 = await prepareFolderTarget('ny.grc.json', fakeFolders({ files: { 'kund.grc.json': '{}' } }).fs)
    expect(r2.kind === 'ready' && r2.exists).toBe(false)
    expect(r2.kind === 'ready' && r2.target.dir).toBeTruthy()
  })

  it('avbruten och nekad', async () => {
    expect(await prepareFolderTarget('x.grc.json', fakeFolders({ picked: false }).fs)).toEqual({ kind: 'cancelled' })
    expect(await prepareFolderTarget('x.grc.json', fakeFolders({ access: false }).fs)).toEqual({ kind: 'denied' })
  })
})

describe('reopenRecent', () => {
  const entry = (dir: FileSystemDirectoryHandle | undefined, kind: 'folder' | 'download' = 'folder'): RecentEntry => ({
    projectId: 'p',
    client: 'Kund',
    framework: { id: 'iso27001', version: '2022', name: 'ISO/IEC 27001:2022' },
    fileName: 'kund.grc.json',
    kind,
    dir,
    updatedAt: '2026-10-05T10:00:00.000Z',
    usedAt: '2026-10-05T10:00:00.000Z',
    progress: { assessed: 0, applicable: 119 },
  })

  it('öppnar filen i den sparade mappen', async () => {
    const { fs, dir } = fakeFolders({ files: { 'kund.grc.json': '{"a":1}' } })
    const r = await reopenRecent(entry(dir), fs)
    expect(r.kind === 'file' && r.text).toBe('{"a":1}')
  })

  it('nedladdade projekt måste väljas som fil', async () => {
    expect(await reopenRecent(entry(undefined, 'download'), fakeFolders().fs)).toEqual({ kind: 'needs-file' })
  })

  it('flyttad fil', async () => {
    const { fs, dir } = fakeFolders()
    expect(await reopenRecent(entry(dir), fs)).toEqual({ kind: 'missing' })
  })

  it('nekad behörighet', async () => {
    const { fs, dir } = fakeFolders({ access: false })
    expect(await reopenRecent(entry(dir), fs)).toEqual({ kind: 'denied' })
  })
})

describe('openDropped', () => {
  it('en indragen mapp öppnas som vid val av mapp', async () => {
    const { fs, dir } = fakeFolders({ files: { 'kund.grc.json': '{"a":1}' } })
    const r = await openDropped({ kind: 'folder', dir }, fs)
    expect(r.kind === 'file' && r.target.kind).toBe('folder')
  })

  it('en indragen mapp med flera projektfiler: välj', async () => {
    const { fs, dir } = fakeFolders({ files: { 'a.grc.json': '', 'b.grc.json': '' } })
    expect((await openDropped({ kind: 'folder', dir }, fs)).kind).toBe('choose')
  })

  it('nekad behörighet till indragen mapp', async () => {
    const { fs, dir } = fakeFolders({ access: false })
    expect(await openDropped({ kind: 'folder', dir }, fs)).toEqual({ kind: 'denied' })
  })

  it('en indragen fil öppnas utan mapp', async () => {
    const r = await openDropped({ kind: 'file', name: 'kund.grc.json', text: async () => '{}' }, fakeFolders().fs)
    expect(r.kind === 'file' && r.text).toBe('{}')
    expect(r.kind === 'file' && r.target.kind).toBe('download')
  })

  it('andra filtyper avvisas', async () => {
    expect(await openDropped({ kind: 'file', name: 'rapport.docx', text: async () => '' }, fakeFolders().fs)).toEqual({ kind: 'not-project' })
  })

  it('mapp i webbläsare som inte kan öppna mappar', async () => {
    expect(await openDropped({ kind: 'folder-unsupported' }, fakeFolders().fs)).toEqual({ kind: 'folder-unsupported' })
  })
})
