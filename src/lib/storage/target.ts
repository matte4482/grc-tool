// Sparmål för projektfilen och filnamn.

export interface SaveTarget {
  /** Visas i sparstatusen, t.ex. "exempelbolaget-ab.grc.json". */
  readonly label: string
  /** 'folder' = skriver direkt till fil, 'download' = laddar ned en kopia. */
  readonly kind: 'folder' | 'download'
  /** Om autosparning får använda målet. Nedladdningar autosparas aldrig. */
  readonly autosave: boolean
  /**
   * Mappen filen ligger i, när kind är 'folder'. Sparas i "Senaste arbeten" så att
   * projektet kan öppnas igen utan att mappen väljs på nytt (B-26).
   */
  readonly dir?: FileSystemDirectoryHandle
  /** Skriver hela filen. Kastar vid fel; store fångar och visar felet. */
  write(text: string): Promise<void>
}

/**
 * Filnamn för projektfilen utifrån kundnamnet, t.ex. "Exempelbolaget AB"
 * → "exempelbolaget-ab.grc.json". Bara a–z, 0–9 och bindestreck, så att
 * namnet fungerar i SharePoint, OneDrive, Windows och macOS.
 */
export function projectFileName(client: string, suffix = ''): string {
  const slug = client
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // å → a, ä → a, ö → o, é → e
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || 'projekt'}${suffix ? `-${suffix}` : ''}${PROJECT_EXTENSION}`
}

export const PROJECT_EXTENSION = '.grc.json'
