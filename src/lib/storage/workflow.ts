import { downloadTarget } from './download'
import type { RecentEntry } from './recent'
import type { SaveTarget } from './target'
import { ensureWriteAccess, fileExists, folderTarget, listProjectFiles, pickFolder, readFile } from './folder'

// Flödena för att välja mapp och fil, utan gränssnitt.
//
// Alla flöden måste anropas från ett klick, eftersom webbläsaren bara visar
// mappdialogen och behörighetsfrågan som svar på något användaren gjort.

/** Mappfunktionerna i folder.ts. Byts ut i tester. */
export interface FolderAccess {
  pickFolder(): Promise<FileSystemDirectoryHandle | null>
  ensureWriteAccess(dir: FileSystemDirectoryHandle): Promise<boolean>
  listProjectFiles(dir: FileSystemDirectoryHandle): Promise<string[]>
  readFile(dir: FileSystemDirectoryHandle, name: string): Promise<string>
  fileExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean>
}

export const browserFolders: FolderAccess = { pickFolder, ensureWriteAccess, listProjectFiles, readFile, fileExists }

type Stopped = { kind: 'cancelled' } | { kind: 'denied' }

export type FileRead = { kind: 'file'; text: string; target: SaveTarget }

export type PickProjectResult =
  | Stopped
  | { kind: 'empty' }
  | { kind: 'choose'; dir: FileSystemDirectoryHandle; files: string[] }
  | FileRead


export async function pickProjectInFolder(fs: FolderAccess = browserFolders): Promise<PickProjectResult> {
  const dir = await fs.pickFolder()
  if (!dir) return { kind: 'cancelled' }
  if (!(await fs.ensureWriteAccess(dir))) return { kind: 'denied' }
  return projectInFolder(dir, fs)
}

/** Projektfilen i en mapp som redan har behörighet. */
async function projectInFolder(dir: FileSystemDirectoryHandle, fs: FolderAccess): Promise<PickProjectResult> {
  const files = await fs.listProjectFiles(dir)
  if (files.length === 0) return { kind: 'empty' }
  if (files.length > 1) return { kind: 'choose', dir, files }
  return readProjectFile(dir, files[0], fs)
}

/** Det som dragits in i "Öppna befintligt arbete". Byggs av readDrop() i folder.ts. */
export type Dropped =
  | { kind: 'folder'; dir: FileSystemDirectoryHandle }
  | { kind: 'file'; name: string; text: () => Promise<string> }
  | { kind: 'folder-unsupported' }

export type DropResult = PickProjectResult | { kind: 'not-project' } | { kind: 'folder-unsupported' }

/**
 * Öppnar en indragen mapp eller fil (B-29). En fil öppnas utan mapp, så
 * verktyget ber om mappen vid första sparning.
 */
export async function openDropped(dropped: Dropped, fs: FolderAccess = browserFolders): Promise<DropResult> {
  if (dropped.kind === 'folder-unsupported') return dropped
  if (dropped.kind === 'folder') {
    if (!(await fs.ensureWriteAccess(dropped.dir))) return { kind: 'denied' }
    return projectInFolder(dropped.dir, fs)
  }
  if (!dropped.name.toLowerCase().endsWith('.json')) return { kind: 'not-project' }
  return { kind: 'file', text: await dropped.text(), target: downloadTarget(dropped.name) }
}

/** Läser en projektfil i en mapp som redan har behörighet. */
export async function readProjectFile(dir: FileSystemDirectoryHandle, name: string, fs: FolderAccess = browserFolders): Promise<FileRead> {
  return { kind: 'file', text: await fs.readFile(dir, name), target: folderTarget(dir, name) }
}

export type PrepareTargetResult = Stopped | { kind: 'ready'; target: SaveTarget; exists: boolean }

/**
 * Välj mapp att spara `fileName` i: nytt arbete, "Spara som" och återställning
 * av en reservkopia. `exists` säger om filen redan finns, så att vyn kan vägra
 * (nytt arbete) eller fråga om den ska skrivas över.
 */
export async function prepareFolderTarget(fileName: string, fs: FolderAccess = browserFolders): Promise<PrepareTargetResult> {
  const dir = await fs.pickFolder()
  if (!dir) return { kind: 'cancelled' }
  if (!(await fs.ensureWriteAccess(dir))) return { kind: 'denied' }
  return { kind: 'ready', target: folderTarget(dir, fileName), exists: await fs.fileExists(dir, fileName) }
}

export type ReopenResult = { kind: 'needs-file' } | { kind: 'denied' } | { kind: 'missing' } | FileRead

/**
 * "Fortsätt" i Senaste arbeten (B-26). Mappen finns sparad, så webbläsaren
 * frågar bara om behörigheten. Projekt som laddades ned har ingen mapp och
 * måste väljas som fil igen (`needs-file`). Har filen eller mappen flyttats
 * eller tagits bort blir resultatet `missing`.
 */
export async function reopenRecent(entry: RecentEntry, fs: FolderAccess = browserFolders): Promise<ReopenResult> {
  if (entry.kind !== 'folder' || !entry.dir) return { kind: 'needs-file' }
  try {
    if (!(await fs.ensureWriteAccess(entry.dir))) return { kind: 'denied' }
    return await readProjectFile(entry.dir, entry.fileName, fs)
  } catch (e) {
    if (e instanceof DOMException && (e.name === 'NotFoundError' || e.name === 'NotReadableError')) return { kind: 'missing' }
    throw e
  }
}
