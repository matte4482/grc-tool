import type { Evidence, Project } from '../project/schema'
import { takeId } from '../project/project'

// Bifogad evidens på kontroller och risker.
// Filerna ligger i mappen evidens/ bredvid projektfilen; projektfilen har bara referensen.

export const EVIDENCE_DIR = 'evidens'
export const MAX_EVIDENCE_BYTES = 100 * 1024 * 1024

/** Vad evidensen styrker*/
export type EvidenceOwner = { kind: 'control'; id: string } | { kind: 'risk'; id: string }

export function safeName(name: string): string {
  const cleaned = name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
  return cleaned.slice(0, 120) || 'fil'
}

export const ownerFolder = (owner: EvidenceOwner): string => `${EVIDENCE_DIR}/${safeName(owner.id)}`

export function* candidateNames(name: string): Generator<string> {
  const safe = safeName(name)
  yield safe
  const dot = safe.lastIndexOf('.')
  const [base, ext] = dot > 0 ? [safe.slice(0, dot), safe.slice(dot)] : [safe, '']
  for (let n = 2; ; n++) yield `${base} (${n})${ext}`
}

export function evidenceOf(project: Project, owner: EvidenceOwner): Evidence[] {
  if (owner.kind === 'control') return project.controls[owner.id]?.evidence ?? []
  return project.risks.find((r) => r.id === owner.id)?.evidence ?? []
}

/** All evidens i projektet med vad den hör till. */
export function allEvidence(project: Project): { owner: EvidenceOwner; evidence: Evidence }[] {
  return [
    ...Object.entries(project.controls).flatMap(([id, a]) => a.evidence.map((evidence) => ({ owner: { kind: 'control' as const, id }, evidence }))),
    ...project.risks.flatMap((r) => r.evidence.map((evidence) => ({ owner: { kind: 'risk' as const, id: r.id }, evidence }))),
  ]
}

/** Samma fil som redan finns i projektet, så att den inte kopieras igen. */
export function findByHash(project: Project, sha256: string): Evidence | undefined {
  return allEvidence(project).find((x) => x.evidence.sha256 === sha256)?.evidence
}

export type NewEvidence = Pick<Evidence, 'file' | 'size' | 'sha256' | 'source' | 'addedBy'> & { note?: string }

/** Lägger till en referens med nytt EV-ID. Kontrollen skapas om den saknas. Returnerar ID:t. */
export function addEvidence(draft: Project, owner: EvidenceOwner, data: NewEvidence, now: string): string {
  const { id, nextNumber } = takeId(draft.nextNumber, 'evidence')
  draft.nextNumber = nextNumber
  const evidence: Evidence = { id, ...data, addedAt: now }
  if (owner.kind === 'control') {
    const answer = (draft.controls[owner.id] ??= {
      status: 'not_assessed',
      comment: '',
      owner: '',
      evidenceNote: '',
      evidence: [],
      applicable: true,
      soaJustification: '',
    })
    answer.evidence.push(evidence)
    answer.updated = { at: now, by: data.addedBy }
  } else {
    const risk = draft.risks.find((r) => r.id === owner.id)
    if (!risk) throw new Error(`Risken ${owner.id} finns inte.`)
    risk.evidence.push(evidence)
    risk.history.push({ at: now, by: data.addedBy, text: `Evidens bifogad: ${data.file}` })
  }
  return id
}

/** Tar bort referensen men inte filen. */
export function removeEvidence(draft: Project, owner: EvidenceOwner, evidenceId: string): void {
  const list = evidenceOf(draft, owner)
  const i = list.findIndex((e) => e.id === evidenceId)
  if (i >= 0) list.splice(i, 1)
}

/** Säger till om kontroll behöver evidens. */
export function needsEvidence(answer: { status: string; evidence: unknown[]; evidenceNote: string } | undefined): boolean {
  if (!answer) return false
  return (answer.status === 'fulfilled' || answer.status === 'partial') && answer.evidence.length === 0 && answer.evidenceNote.trim() === ''
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`
  return `${(bytes / 1024 / 1024).toLocaleString('sv-SE', { maximumFractionDigits: 1 })} MB`
}
