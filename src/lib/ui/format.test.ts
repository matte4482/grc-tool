import { describe, it, expect } from 'vitest'
import { relativeTime } from './format'

const now = new Date(2026, 9, 7, 10, 0)
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m, d, h, min).toISOString()

describe('relativeTime', () => {
  it('i dag och i går med klockslag', () => {
    expect(relativeTime(at(2026, 9, 7, 9, 5), now)).toBe('i dag 09:05')
    expect(relativeTime(at(2026, 9, 6, 16, 40), now)).toBe('i går 16:40')
  })

  it('äldre datum utan klockslag, med år om det är ett annat år', () => {
    expect(relativeTime(at(2026, 8, 18), now)).toBe('18 sep')
    expect(relativeTime(at(2025, 8, 18), now)).toBe('18 sep 2025')
  })
})
