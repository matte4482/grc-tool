// Datum och tid som text i gränssnittet.

const time = (d: Date) => d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

// Skapar sträng med relativ tid
export function relativeTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const yesterday = new Date(now)
  yesterday.setDate(now.getDate() - 1)
  if (dayKey(d) === dayKey(now)) return `i dag ${time(d)}`
  if (dayKey(d) === dayKey(yesterday)) return `i går ${time(d)}`
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
  if (d.getFullYear() !== now.getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('sv-SE', opts).replace('.', '')
}

/** Dagens datum i webbläsarens tidszon som ÅÅÅÅ-MM-DD. */
export function localDate(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ÅÅÅÅ-MM-DD som kort text, t.ex. "15 okt 2026". */
export const shortDate = (date: string): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }).replace('.', '')
