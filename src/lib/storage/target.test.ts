import { describe, it, expect } from 'vitest'
import { projectFileName } from './target'

describe('projectFileName', () => {
  it('gör om kundnamnet till ett säkert filnamn', () => {
    expect(projectFileName('Exempelbolaget AB')).toBe('exempelbolaget-ab.grc.json')
  })

  it('ersätter å, ä, ö och andra accenter', () => {
    expect(projectFileName('Åkerö Vägbygge & Söner')).toBe('akero-vagbygge-soner.grc.json')
    expect(projectFileName('Café Élan')).toBe('cafe-elan.grc.json')
  })

  it('tar bort tecken som inte fungerar i SharePoint eller Windows', () => {
    expect(projectFileName('Kund: "A/B" <test>?*')).toBe('kund-a-b-test.grc.json')
  })

  it('ger ett standardnamn när inget är kvar', () => {
    expect(projectFileName('')).toBe('projekt.grc.json')
    expect(projectFileName('!!!')).toBe('projekt.grc.json')
  })

  it('kortar långa namn utan bindestreck i slutet', () => {
    const name = projectFileName('a'.repeat(59) + ' bolaget')
    expect(name).toBe('a'.repeat(59) + '.grc.json')
  })
})
