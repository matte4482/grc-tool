import type { KeyValueStorage } from './backup'

// Används bara av testerna: en localStorage i minnet.

/** En localStorage i minnet. `full` gör att alla skrivningar misslyckas, som när lagringen är full. */
export function memoryStorage(opts: { full?: boolean } = {}): KeyValueStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    get length() {
      return data.size
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => {
      if (opts.full) throw new DOMException('Lagringen är full', 'QuotaExceededError')
      data.set(k, v)
    },
    removeItem: (k) => void data.delete(k),
  }
}
