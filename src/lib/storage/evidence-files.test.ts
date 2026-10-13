import { describe, it, expect } from 'vitest'
import { addEvidence } from '../evidence/evidence'
import { getFramework } from '../frameworks'
import { createProject } from '../project/project'
import { checkEvidence, prepareEvidence, readEvidenceFile, saveEvidenceFile, sha256Hex } from './evidence-files'

// Mapp i minnet med de delar av File System Access API som används.
class MemoryDir {
  dirs = new Map<string, MemoryDir>()
  files = new Map<string, File>()
  async getDirectoryHandle(name: string, opts: { create?: boolean } = {}) {
    if (!this.dirs.has(name)) {
      if (!opts.create) throw new DOMException('saknas', 'NotFoundError')
      this.dirs.set(name, new MemoryDir())
    }
    return this.dirs.get(name)!
  }
  async getFileHandle(name: string, opts: { create?: boolean } = {}) {
    if (!this.files.has(name)) {
      if (!opts.create) throw new DOMException('saknas', 'NotFoundError')
      this.files.set(name, new File([], name))
    }
    return {
      getFile: async () => this.files.get(name)!,
      createWritable: async () => {
        const parts: BlobPart[] = []
        return {
          write: async (b: BlobPart) => void parts.push(b),
          close: async () => void this.files.set(name, new File(parts, name)),
          abort: async () => {},
        }
      },
    }
  }
}

const iso = getFramework('iso27001', '2022')!
const NOW = '2026-10-12T10:00:00.000Z'
const asDir = (d: MemoryDir) => d as unknown as FileSystemDirectoryHandle
const control = { kind: 'control' as const, id: 'A.5.1' }

describe('evidensfiler', () => {
  it('kopierar till undermapp med ledigt namn', async () => {
    const dir = new MemoryDir()
    const file = new File(['policy'], 'policy.pdf')
    expect(await saveEvidenceFile(asDir(dir), 'evidens/A.5.1', file)).toBe('evidens/A.5.1/policy.pdf')
    expect(await saveEvidenceFile(asDir(dir), 'evidens/A.5.1', file)).toBe('evidens/A.5.1/policy (2).pdf')
    expect(await (await readEvidenceFile(asDir(dir), 'evidens/A.5.1/policy.pdf')).text()).toBe('policy')
  })

  it('upptäcker ändrade och saknade filer', async () => {
    const dir = new MemoryDir()
    const path = await saveEvidenceFile(asDir(dir), 'evidens/A.5.1', new File(['v1'], 'a.txt'))
    const sha256 = await sha256Hex(new File(['v1'], 'a.txt'))
    expect(await checkEvidence(asDir(dir), { file: path, sha256 })).toBe('ok')
    await saveEvidenceFile(asDir(dir), 'evidens/A.5.1', new File(['x'], 'b.txt'))
    expect(await checkEvidence(asDir(dir), { file: 'evidens/A.5.1/b.txt', sha256 })).toBe('changed')
    expect(await checkEvidence(asDir(dir), { file: 'evidens/X/c.txt', sha256 })).toBe('missing')
  })

  it('återanvänder samma fil och vägrar dubbletter', async () => {
    const dir = new MemoryDir()
    const p = createProject({ client: 'X', framework: iso })
    const file = new File(['bevis'], 'bevis.pdf')
    const first = await prepareEvidence(asDir(dir), p, control, file, 'K')
    expect(first.ok && [first.reused, first.evidence.file, first.evidence.size]).toEqual([false, 'evidens/A.5.1/bevis.pdf', 5])
    if (first.ok) addEvidence(p, control, first.evidence, NOW)

    expect((await prepareEvidence(asDir(dir), p, control, file, 'K')).ok).toBe(false)
    const other = await prepareEvidence(asDir(dir), p, { kind: 'control', id: 'A.5.2' }, file, 'K')
    expect(other.ok && [other.reused, other.evidence.file]).toEqual([true, 'evidens/A.5.1/bevis.pdf'])
  })
})
