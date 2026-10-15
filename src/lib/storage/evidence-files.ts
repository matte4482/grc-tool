// Evidensfiler i uppdragets mapp (B-31). Kräver mappåtkomst (Chrome, Edge).

import type { Project } from '../project/schema'
import { fileExists } from './folder'
import { MAX_EVIDENCE_BYTES, candidateNames, evidenceOf, findByHash, formatSize, ownerFolder, type EvidenceOwner, type NewEvidence } from '../evidence/evidence'

/** SHA-256 som hex, för att upptäcka flyttade eller ändrade filer. */
export async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function folder(dir: FileSystemDirectoryHandle, path: string, create: boolean): Promise<FileSystemDirectoryHandle> {
  let current = dir
  for (const part of path.split('/').filter(Boolean)) current = await current.getDirectoryHandle(part, { create })
  return current
}

/** Kopierar filen till `folderPath` med ett ledigt namn. Ger sökvägen relativt projektmappen. */
export async function saveEvidenceFile(dir: FileSystemDirectoryHandle, folderPath: string, file: File): Promise<string> {
  const target = await folder(dir, folderPath, true)
  let name = ''
  for (const candidate of candidateNames(file.name)) {
    if (!(await fileExists(target, candidate))) {
      name = candidate
      break
    }
  }
  const stream = await (await target.getFileHandle(name, { create: true })).createWritable()
  try {
    await stream.write(file)
    await stream.close()
  } catch (e) {
    await stream.abort().catch(() => {})
    throw e
  }
  return `${folderPath}/${name}`
}

/** Läser en evidensfil. Kastar NotFoundError om den flyttats eller tagits bort. */
export async function readEvidenceFile(dir: FileSystemDirectoryHandle, path: string): Promise<File> {
  const parts = path.split('/')
  const name = parts.pop()!
  return (await (await folder(dir, parts.join('/'), false)).getFileHandle(name)).getFile()
}

export type EvidenceState = 'ok' | 'changed' | 'missing'

/** Om filen finns kvar och är oförändrad sedan den bifogades. */
export async function checkEvidence(dir: FileSystemDirectoryHandle, evidence: { file: string; sha256: string }): Promise<EvidenceState> {
  try {
    return (await sha256Hex(await readEvidenceFile(dir, evidence.file))) === evidence.sha256 ? 'ok' : 'changed'
  } catch {
    return 'missing'
  }
}

export type Prepared = { ok: true; evidence: NewEvidence; reused: boolean } | { ok: false; message: string }

/**
 * Gör en vald fil klar att bifogas: kontrollerar storleken, återanvänder samma
 * fil om den redan finns i projektet och kopierar den annars till mappen.
 */
export async function prepareEvidence(dir: FileSystemDirectoryHandle, project: Project, owner: EvidenceOwner, file: File, by: string): Promise<Prepared> {
  if (file.size > MAX_EVIDENCE_BYTES)
    return { ok: false, message: `${file.name} är större än ${formatSize(MAX_EVIDENCE_BYTES)}. Lägg den i kundens mapp och ange var den finns i anteckningen.` }
  const sha256 = await sha256Hex(file)
  if (evidenceOf(project, owner).some((e) => e.sha256 === sha256)) return { ok: false, message: `${file.name} är redan bifogad här.` }
  const same = findByHash(project, sha256)
  if (same && (await checkEvidence(dir, same)) === 'ok')
    return { ok: true, reused: true, evidence: { file: same.file, size: same.size, sha256, source: 'manual', addedBy: by } }
  const path = await saveEvidenceFile(dir, ownerFolder(owner), file)
  return { ok: true, reused: false, evidence: { file: path, size: file.size, sha256, source: 'manual', addedBy: by } }
}
