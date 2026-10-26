// Register över tillgängliga ramverk

import { FrameworkSchema, type Framework } from './schema'
import iso27001_2022 from './iso27001-2022.yaml'

export interface FrameworkEntry {
  id: string
  version: string
  name: string
  /** Omfattning för ramverk som inte finns än, t.ex. "18 kontroller · 153 skyddsåtgärder". */
  summary?: string
  framework?: Framework
}

const available: Framework[] = [FrameworkSchema.parse(iso27001_2022)]

const upcoming: Omit<FrameworkEntry, 'framework'>[] = [
  {
    id: 'nis2',
    version: '2022',
    name: 'NIS2',
    summary: '10 riskhanteringsåtgärder · Art. 21',
  },
  {
    id: 'cis',
    version: '8',
    name: 'CIS Controls v8',
    summary: '18 kontroller · 153 skyddsåtgärder',
  },
  {
    id: 'dora',
    version: '2022',
    name: 'DORA',
    summary: '5 områden · finansiell sektor',
  },
]

export const FRAMEWORKS: readonly FrameworkEntry[] = [
  ...available.map((fw) => ({ id: fw.id, version: fw.version, name: fw.name, framework: fw })),
  ...upcoming,
]

export function getFramework(id: string, version: string): Framework | undefined {
  return FRAMEWORKS.find((e) => e.id === id && e.version === version)?.framework
}
