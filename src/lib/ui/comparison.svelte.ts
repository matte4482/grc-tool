// Den tidigare bedömningen som det öppna projektet jämförs med (fas 7). Finns bara i minnet.

import type { Project } from '../project/schema'

class ComparisonState {
  previous = $state.raw<Project | null>(null)
  fileName = $state('')

  set = (project: Project, fileName: string): void => {
    this.previous = project
    this.fileName = fileName
  }

  clear = (): void => {
    this.previous = null
    this.fileName = ''
  }
}

export const comparison = new ComparisonState()
