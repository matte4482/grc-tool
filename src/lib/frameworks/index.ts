import { FrameworkSchema, type Framework } from './schema'
import iso27001_2022 from './iso27001-2022.yaml'

// Register över tillgängliga ramverk

export interface FrameworkEntry {
  id: string
  version: string
  name: string
  framework?: Framework
}

const available: Framework[] = [FrameworkSchema.parse(iso27001_2022)]

const upcoming: Omit<FrameworkEntry, 'framework'>[] = [
  { id: 'nis2', version: '2022', name: 'NIS2' },
  { id: 'cis', version: '8', name: 'CIS Controls v8' },
  { id: 'dora', version: '2022', name: 'DORA' },
]

export const FRAMEWORKS: readonly FrameworkEntry[] = [
  ...available.map((fw) => ({ id: fw.id, version: fw.version, name: fw.name, framework: fw })),
  ...upcoming,
]

export function getFramework(id: string, version: string): Framework | undefined {
  return FRAMEWORKS.find((e) => e.id === id && e.version === version)?.framework
}

export function countControls(fw: Framework, sectionId: string): number {
  const section = fw.sections.find((s) => s.id === sectionId)
  return section ? section.groups.reduce((n, g) => n + g.controls.length, 0) : 0
}
