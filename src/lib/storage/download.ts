// Reservläge för webbläsare utan File System Access API (Safari, Firefox).
// "Spara" laddar ned en kopia av projektfilen, och "Öppna" läser en fil som
// användaren väljer. Nedladdningar autosparas aldrig, eftersom varje sparning
// annars skulle ge en ny fil i Hämtade filer (ARCHITECTURE B-22).

import type { SaveTarget } from './target'

/** Sparmål som laddar ned projektfilen. */
export function downloadTarget(fileName: string): SaveTarget {
  return {
    label: fileName,
    kind: 'download',
    autosave: false,
    async write(text) {
      downloadFile(fileName, text, 'application/json')
    },
  }
}

/** Laddar ned en fil som webbläsaren skapat, t.ex. en rapport eller CSV. */
export function downloadFile(fileName: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }))
  try {
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    a.click()
  } finally {
    // Vänta en stund innan adressen släpps, så att nedladdningen hinner starta.
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
  }
}

/** Läser en fil som användaren valt i en filväljare (<input type="file">). */
export function readSelectedFile(file: File): Promise<string> {
  return file.text()
}
