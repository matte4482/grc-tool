// Register över tillgängliga ramverk

import { FrameworkSchema, type Framework } from './schema'
import iso27001_2022 from './iso27001-2022.yaml'

export interface FrameworkEntry {
  id: string
  version: string
  name: string
  /** En mening om ramverket, visas på startsidan. */
  description: string
  /** Omfattning för ramverk som inte finns än, t.ex. "18 kontroller · 153 skyddsåtgärder". */
  summary?: string
  framework?: Framework
}

const available: Framework[] = [FrameworkSchema.parse(iso27001_2022)]

const descriptions: Record<string, string> = {
  iso27001: 'Certifierbar standard för ledningssystem för informationssäkerhet. Inkluderar SoA och riskhantering.',
}

const upcoming: Omit<FrameworkEntry, 'framework'>[] = [
  {
    id: 'nis2',
    version: '2022',
    name: 'NIS2',
    summary: '10 riskhanteringsåtgärder · Art. 21',
    description: 'EU-direktiv för väsentliga och viktiga verksamheter, genomfört i svensk cybersäkerhetslag.',
  },
  {
    id: 'cis',
    version: '8',
    name: 'CIS Controls v8',
    summary: '18 kontroller · 153 skyddsåtgärder',
    description: 'Praktisk teknisk baslinje, passar kunder som inte siktar på certifiering.',
  },
  {
    id: 'dora',
    version: '2022',
    name: 'DORA',
    summary: '5 områden · finansiell sektor',
    description: 'EU-förordning om digital operativ motståndskraft för finansiella entiteter.',
  },
]

export const FRAMEWORKS: readonly FrameworkEntry[] = [
  ...available.map((fw) => ({ id: fw.id, version: fw.version, name: fw.name, description: descriptions[fw.id] ?? '', framework: fw })),
  ...upcoming,
]

export function getFramework(id: string, version: string): Framework | undefined {
  return FRAMEWORKS.find((e) => e.id === id && e.version === version)?.framework
}
