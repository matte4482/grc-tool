// Inställningar för konsulten i den här webbläsaren. Ingen kunddata.

import type { KeyValueStorage } from './backup'

const NAME_KEY = 'grc-verktyget:konsult'

function storage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Konsultens namn, som skrivs vid bifogad evidens. Tom sträng om det inte är angivet. */
export function consultantName(store: KeyValueStorage | null = storage()): string {
  try {
    return store?.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setConsultantName(name: string, store: KeyValueStorage | null = storage()): void {
  try {
    store?.setItem(NAME_KEY, name.trim())
  } catch {
    // Sparas inte; namnet frågas igen nästa gång.
  }
}
