import { PROJECT_EXTENSION, type SaveTarget } from './target'

// Sparande via File System Access API (ARCHITECTURE B-22).
//
// Konsulten väljer uppdragets mapp, till exempel kundens synkade SharePoint-mapp.
// Verktyget får då läsa och skriva i just den mappen: projektfilen nu, och
// evidensmappen i fas 4. API:t finns i Chrome och Edge, inte i Safari och Firefox;
// där används download.ts i stället.
//
// Typerna för showDirectoryPicker och behörigheter finns inte i TypeScripts
// standardbibliotek, eftersom API:t inte finns i alla webbläsare. De beskrivs
// därför lokalt här i stället för som globala tillägg.

type Mode = { mode: 'read' | 'readwrite' }

interface PermissionHandle {
  queryPermission(opts: Mode): Promise<PermissionState>
  requestPermission(opts: Mode): Promise<PermissionState>
}

interface DirectoryPickerWindow {
  showDirectoryPicker(opts?: Mode & { id?: string }): Promise<FileSystemDirectoryHandle>
}

interface IterableDirectory {
  entries(): AsyncIterable<[string, FileSystemHandle]>
}

/** Om webbläsaren kan skriva direkt till en vald mapp. */
export function supportsFolderAccess(): boolean {
  return typeof window !== 'undefined' && typeof (window as Partial<DirectoryPickerWindow>).showDirectoryPicker === 'function'
}

/**
 * Låter konsulten välja uppdragets mapp. Returnerar null om dialogen avbryts.
 * Andra fel (t.ex. en systemmapp som webbläsaren vägrar ge åtkomst till) kastas.
 */
export async function pickFolder(): Promise<FileSystemDirectoryHandle | null> {
  try {
    // id gör att dialogen öppnas i samma mapp som förra gången.
    return await (window as unknown as DirectoryPickerWindow).showDirectoryPicker({ id: 'grc-uppdrag', mode: 'readwrite' })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return null
    throw e
  }
}

/**
 * Ser till att verktyget får skriva i mappen. Webbläsaren kan fråga användaren.
 * Måste anropas från ett klick, eftersom webbläsaren annars inte visar frågan.
 */
export async function ensureWriteAccess(dir: FileSystemDirectoryHandle): Promise<boolean> {
  const handle = dir as unknown as PermissionHandle
  const opts: Mode = { mode: 'readwrite' }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

/** Namnen på alla projektfiler (*.grc.json) i mappen, i bokstavsordning. */
export async function listProjectFiles(dir: FileSystemDirectoryHandle): Promise<string[]> {
  const names: string[] = []
  for await (const [name, handle] of (dir as unknown as IterableDirectory).entries())
    if (handle.kind === 'file' && name.toLowerCase().endsWith(PROJECT_EXTENSION)) names.push(name)
  return names.sort((a, b) => a.localeCompare(b, 'sv'))
}

/** Läser en fil i mappen som text. */
export async function readFile(dir: FileSystemDirectoryHandle, name: string): Promise<string> {
  const file = await (await dir.getFileHandle(name)).getFile()
  return file.text()
}

/** Om en fil med namnet redan finns i mappen. */
export async function fileExists(dir: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await dir.getFileHandle(name)
    return true
  } catch (e) {
    if (e instanceof DOMException && e.name === 'NotFoundError') return false
    throw e
  }
}

/**
 * Sparmål för en projektfil i en vald mapp.
 *
 * createWritable() skriver till en tillfällig fil och byter ut originalet först
 * när close() lyckas. Avbryts skrivningen blir den gamla filen kvar orörd, så
 * en halvskriven projektfil kan inte uppstå.
 */
export function folderTarget(dir: FileSystemDirectoryHandle, fileName: string): SaveTarget {
  return {
    label: fileName,
    kind: 'folder',
    autosave: true,
    async write(text) {
      const file = await dir.getFileHandle(fileName, { create: true })
      const stream = await file.createWritable()
      try {
        await stream.write(text)
        await stream.close()
      } catch (e) {
        await stream.abort().catch(() => {})
        throw e
      }
    },
  }
}
