// Register över tillgängliga ramverk

import { FrameworkSchema, type Framework } from './schema'
import iso27001_2022 from './iso27001-2022.yaml'
import cisControls from './cis-controls-8.1.yaml'
import cisAzureFoundations from './cis-azure-foundations-6.0.0.yaml'
import cisAzureCompute from './cis-azure-compute-2.0.0.yaml'
import cisAzureDatabase from './cis-azure-database-2.0.0.yaml'
import cisAzureStorage from './cis-azure-storage-2.0.0.yaml'

export interface FrameworkEntry {
  id: string
  version: string
  name: string
  /** Omfattning för ramverk som inte finns än, t.ex. "10 riskhanteringsåtgärder". */
  summary?: string
  framework?: Framework
}

// Valideras när modulen laddas, så att ett fel i en YAML-fil stoppar både testerna och appen direkt.
const available: Framework[] = [iso27001_2022, cisControls, cisAzureFoundations, cisAzureCompute, cisAzureDatabase, cisAzureStorage].map((raw) =>
  FrameworkSchema.parse(raw),
)

const upcoming: Omit<FrameworkEntry, 'framework'>[] = [
  {
    id: 'nis2',
    version: '2022',
    name: 'NIS2',
    summary: '10 riskhanteringsåtgärder · Art. 21',
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
