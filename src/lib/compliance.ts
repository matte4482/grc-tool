// Beräkningar av hur långt en bedömning har kommit. Ren TypeScript, så att
// startsidan, dashboarden och rapporten räknar likadant.

import type { Framework, Group, Section } from './frameworks/schema'
import type { Project } from './project/schema'

export interface SectionSummary {
  id: string
  title: string
  unit: string // bestämmer om krav eller kontroll
  count: number
}

/** Avsnitten i ett ramverk med antal kontroller, t.ex. "26 krav", "93 kontroller". */
export function sectionSummaries(framework: Framework): SectionSummary[] {
  return framework.sections.map((s) => ({
    id: s.id,
    title: s.title,
    unit: s.unit,
    count: s.groups.reduce((n, g) => n + g.controls.length, 0),
  }))
}

export interface Progress {
  total: number
  applicable: number
  assessed: number
  fulfilled: number
  partial: number
  notFulfilled: number
}

const EMPTY: Progress = { total: 0, applicable: 0, assessed: 0, fulfilled: 0, partial: 0, notFulfilled: 0 }

export function assessmentProgress(project: Project, framework: Framework): Progress {
  const sum = { ...EMPTY }
  for (const s of sectionProgress(project, framework))
    for (const key of Object.keys(EMPTY) as (keyof Progress)[]) sum[key] += s[key]
  return sum
}

/** Progress per avsnitt, t.ex. för grundkrav och Annex A var för sig. */
export function sectionProgress(project: Project, framework: Framework): (SectionSummary & Progress)[] {
  return framework.sections.map((section) => {
    const progress = tally(project, section.soa, section.groups.flatMap((g) => g.controls))
    return { id: section.id, title: section.title, unit: section.unit, count: progress.total, ...progress }
  })
}

/** Progress per grupp i ett avsnitt, t.ex. per tema A.5–A.8 eller kapitel 4–10. */
export function groupProgress(project: Project, section: Section): (Pick<Group, 'id' | 'title'> & Progress)[] {
  return section.groups.map((g) => ({ id: g.id, title: g.title, ...tally(project, section.soa, g.controls) }))
}

/** Räknar status för en mängd kontroller. Bortval räknas bara i SoA-avsnitt. */
function tally(project: Project, soa: boolean, controls: { id: string }[]): Progress {
  const progress: Progress = { ...EMPTY }
  for (const control of controls) {
    progress.total += 1
    const answer = project.controls[control.id]
    if (soa && answer?.applicable === false) continue
    progress.applicable += 1
    if (answer && answer.status !== 'not_assessed') progress.assessed += 1
    if (answer?.status === 'fulfilled') progress.fulfilled += 1
    if (answer?.status === 'partial') progress.partial += 1
    if (answer?.status === 'not_fulfilled') progress.notFulfilled += 1
  }
  return progress
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((100 * part) / whole)
}
