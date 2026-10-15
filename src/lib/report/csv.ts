// Export till Excel som CSV: kontroller, risker och åtgärder (B-39).

import { allControls, type Framework } from '../frameworks/schema'
import type { Project } from '../project/schema'
import { ACTION_STATUS_LABELS, PRIORITY_LABELS, sourceText } from '../actions'
import { STATUS_LABELS, answerFor, isExcluded } from '../assessment'
import { TREATMENT_LABELS } from '../risk/operations'
import { residualRisk, riskValue } from '../risk/rules'

/**
 * CSV som svenska Excel öppnar direkt: semikolon, BOM och CRLF. Värden som
 * börjar med = + - @ får en apostrof först, så att Excel inte kör dem som formler.
 */
export function toCsv(rows: (string | number)[][]): string {
  const cell = (v: string | number) => {
    let s = String(v)
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`
    return /[;"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n'
}

export function controlRows(project: Project, framework: Framework): string[][] {
  const rows = [['Avsnitt', 'Grupp', 'ID', 'Namn', 'Tillämplig', 'Status', 'Teknisk del', 'Organisatorisk del', 'Motivering och observation', 'Ansvarig', 'Bifogade filer', 'Evidens på annan plats', 'SoA-motivering', 'Senast uppdaterad']]
  for (const { section: s, group: g, control: c } of allControls(framework)) {
    const a = answerFor(project, c.id)
    const part = (x?: keyof typeof STATUS_LABELS) => (x ? STATUS_LABELS[x] : '')
    rows.push([
      s.title,
      `${g.id} ${g.title}`,
      c.id,
      c.title,
      isExcluded(project, s, c.id) ? 'Nej' : 'Ja',
      STATUS_LABELS[a.status],
      part(a.parts?.technical),
      part(a.parts?.organizational),
      a.comment,
      a.owner,
      a.evidence.map((e) => e.file).join(', '),
      a.evidenceNote,
      a.soaJustification,
      a.updated ? a.updated.at.slice(0, 10) : '',
    ])
  }
  return rows
}

export function riskRows(project: Project): string[][] {
  const rows = [['ID', 'Risk', 'Beskrivning', 'Hot', 'Sårbarhet', 'Tillgångar', 'Riskägare', 'Konsekvens', 'Sannolikhet', 'Riskvärde', 'Behandling', 'Kontroller', 'Planerad restrisk', 'Faktisk restrisk', 'Godkänd av', 'Godkänd']]
  for (const r of project.risks) {
    const value = (mode: 'planned' | 'actual') => {
      const s = residualRisk(project, r, mode)
      return s ? String(riskValue(s)) : ''
    }
    rows.push([
      r.id,
      r.title,
      r.description,
      r.threat,
      r.vulnerability,
      r.assets.join(', '),
      r.owner,
      r.before ? String(r.before.consequence) : '',
      r.before ? String(r.before.likelihood) : '',
      r.before ? String(riskValue(r.before)) : '',
      TREATMENT_LABELS[r.treatment],
      r.controls.map((l) => l.control).join(', '),
      value('planned'),
      value('actual'),
      r.approval?.by ?? '',
      r.approval?.at ?? '',
    ])
  }
  return rows
}

export function actionRows(project: Project): string[][] {
  const rows = [['ID', 'Åtgärd', 'Beskrivning', 'Ansvarig', 'Deadline', 'Status', 'Prioritet', 'Kontroller', 'Risker', 'Källa', 'Skapad', 'Klar']]
  for (const a of project.actions)
    rows.push([
      a.id,
      a.title,
      a.description,
      a.owner,
      a.due ?? '',
      ACTION_STATUS_LABELS[a.status],
      a.priority ? PRIORITY_LABELS[a.priority] : '',
      a.controls.join(', '),
      a.risks.join(', '),
      sourceText(a),
      a.createdAt,
      a.completedAt ?? '',
    ])
  return rows
}
