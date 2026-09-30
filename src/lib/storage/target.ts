// Ett sparmål: vart projektfilen skrivs. Store vet inte om det är en mapp
// eller en nedladdning, bara att den kan anropa write() (ARCHITECTURE B-22).

export interface SaveTarget {
  /** Visas i sparstatusen, t.ex. "exempelbolaget-ab.grc.json". */
  readonly label: string
  /** 'folder' = skriver direkt till fil, 'download' = laddar ned en kopia. */
  readonly kind: 'folder' | 'download'
  /** Om autosparning får använda målet. Nedladdningar autosparas aldrig. */
  readonly autosave: boolean
  /** Skriver hela filen. Kastar vid fel; store fångar och visar felet. */
  write(text: string): Promise<void>
}

/**
 * Filnamn för projektfilen utifrån kundnamnet, t.ex. "Exempelbolaget AB"
 * → "exempelbolaget-ab.grc.json". Bara a–z, 0–9 och bindestreck, så att
 * namnet fungerar i SharePoint, OneDrive, Windows och macOS.
 */
export function projectFileName(client: string): string {
  const slug = client
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // å → a, ä → a, ö → o, é → e
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/, '')
  return `${slug || 'projekt'}${PROJECT_EXTENSION}`
}

export const PROJECT_EXTENSION = '.grc.json'
