// Utskrift och Word-export av rapporterna. PrintHost ritar den valda rapporten (B-39).

import { tick } from 'svelte'
import { downloadFile } from '../storage/download'
import { wordDocument } from '../report/word'
import { store } from '../project/store.svelte'

export type ReportId = 'full' | 'dashboard' | 'gap' | 'soa' | 'plan' | 'progress'

export const REPORT_TITLES: Record<ReportId, string> = {
  full: 'Gapanalys – komplett rapport',
  dashboard: 'Lägesbild',
  gap: 'Gapanalys',
  soa: 'Uttalande om tillämplighet (SoA)',
  plan: 'Riskbehandlingsplan',
  progress: 'Progressrapport',
}

/** Rapportens rubrik. Utan riskhantering är planen en åtgärdsplan (B-47). */
export const reportTitle = (id: ReportId): string =>
  id === 'plan' && store.framework?.riskManagement === false ? 'Åtgärdsplan' : REPORT_TITLES[id]

class Printer {
  report = $state<ReportId | null>(null)

  /** Skriver ut en rapport (eller sparar som PDF via webbläsarens utskrift). */
  print = async (id: ReportId): Promise<void> => {
    this.report = id
    await tick()
    document.body.classList.add('printing')
    const done = () => {
      document.body.classList.remove('printing')
      this.report = null
      window.removeEventListener('afterprint', done)
    }
    window.addEventListener('afterprint', done)
    window.print()
  }

  /** Laddar ned rapporten som en Word-fil. */
  word = async (id: ReportId, fileName: string): Promise<void> => {
    this.report = id
    await tick()
    const html = document.querySelector('.print-sheet .report')?.outerHTML ?? ''
    this.report = null
    downloadFile(fileName, wordDocument(reportTitle(id), html), 'application/msword')
  }
}

export const printer = new Printer()
