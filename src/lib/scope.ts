// Vilka kontroller som ingår i bedömningen: bortval i SoA, ej tillämpliga och målnivå (B-47).

import type { Control, Section } from './frameworks/schema'
import type { Project } from './project/schema'

/** Varför en kontroll inte bedöms. */
export type Exclusion = 'soa' | 'not_applicable' | 'profile'

export const EXCLUSION_LABELS: Record<Exclusion, string> = {
  soa: 'Bortvald i SoA',
  not_applicable: 'Ej tillämplig',
  profile: 'Utanför målnivån',
}

const index = new WeakMap<Section, Map<string, Control>>()

function controlIn(section: Section, id: string): Control | undefined {
  let map = index.get(section)
  if (!map) {
    map = new Map(section.groups.flatMap((g) => g.controls.map((c) => [c.id, c])))
    index.set(section, map)
  }
  return map.get(id)
}

/** Om kontrollen kan väljas bort i avsnittet: i SoA eller direkt i listan. */
export const canExclude = (section: Section): boolean => section.soa || !!section.optional

/** Varför kontrollen inte bedöms, eller undefined om den ingår. */
export function exclusion(project: Pick<Project, 'controls' | 'profile'>, section: Section, controlId: string): Exclusion | undefined {
  const level = controlIn(section, controlId)?.profile
  if (project.profile && level && level > project.profile) return 'profile'
  if (canExclude(section) && project.controls[controlId]?.applicable === false) return section.soa ? 'soa' : 'not_applicable'
  return undefined
}
