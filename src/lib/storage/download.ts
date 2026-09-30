import type { SaveTarget } from './target'

// Reservläge för webbläsare utan File System Access API (Safari, Firefox).
// "Spara" laddar ned en kopia av projektfilen, och "Öppna" läser en fil som
// användaren väljer. Nedladdningar autosparas aldrig, eftersom varje sparning
// annars skulle ge en ny fil i Hämtade filer (ARCHITECTURE B-22).

/** Sparmål som laddar ned projektfilen. */
export function downloadTarget(fileName: string): SaveTarget {
  return {
    label: fileName,
    kind: 'download',
    autosave: false,
    async write(text) {
      const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
      try {
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
      } finally {
        // Vänta en stund innan adressen släpps, så att nedladdningen hinner starta.
        setTimeout(() => URL.revokeObjectURL(url), 10_000)
      }
    },
  }
}

/** Läser en fil som användaren valt i en filväljare (<input type="file">). */
export function readSelectedFile(file: File): Promise<string> {
  return file.text()
}
