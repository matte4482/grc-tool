import { z } from 'zod'
import type { Framework } from '../frameworks/schema'
import type { Status } from '../project/schema'

// Filformat för fynd från en automatisk granskning, t.ex. CloudSecComp mot Azure (B-18, B-31).
// Formatet är bestämt nu så att granskningen kan byggas för sig. Inläsningen i verktyget byggs
// när det finns ett program som skriver filen.

const finding = z.object({
  /** Annex A-kontroll, t.ex. "A.8.5". */
  control: z.string().min(1),
  /** Den tekniska delens status enligt granskningen. */
  status: z.enum(['fulfilled', 'partial', 'not_fulfilled']),
  title: z.string().min(1),
  detail: z.string().default(''),
  /** Resurs i molnmiljön, t.ex. ett Azure-resurs-ID. */
  resource: z.string().default(''),
  /** Filer som styrker fyndet, relativt mappen evidens/ bredvid fyndfilen. */
  evidence: z.array(z.object({ file: z.string().min(1), sha256: z.string().regex(/^[0-9a-f]{64}$/) })).default([]),
})

export const FindingsFileSchema = z.object({
  format: z.literal('grc-fynd'),
  version: z.literal(1),
  source: z.object({
    tool: z.string().min(1),
    toolVersion: z.string().default(''),
    /** Granskad miljö, t.ex. "Azure-tenant contoso.onmicrosoft.com". */
    environment: z.string().min(1),
  }),
  collectedAt: z.iso.datetime({ offset: true }),
  findings: z.array(finding),
})

export type FindingsFile = z.infer<typeof FindingsFileSchema>
export type Finding = z.infer<typeof finding>

export type ParseFindingsResult = { ok: true; file: FindingsFile } | { ok: false; errors: string[] }

export function parseFindings(text: string): ParseFindingsResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['Filen är inte giltig JSON.'] }
  }
  const r = FindingsFileSchema.safeParse(data)
  if (!r.success) return { ok: false, errors: r.error.issues.map((i) => `${i.path.join('.') || '(roten)'}: ${i.message}`) }
  return { ok: true, file: r.data }
}

const RANK: Record<Finding['status'], number> = { not_fulfilled: 0, partial: 1, fulfilled: 2 }

/**
 * Teknisk status per kontroll. Flera fynd på samma kontroll ger det sämsta,
 * så att ett enda problem inte döljs. Kontroller som inte finns i ramverket listas separat.
 */
export function technicalStatus(file: FindingsFile, framework: Framework): { status: Map<string, Status>; unknown: string[] } {
  const known = new Set(framework.sections.filter((s) => s.soa).flatMap((s) => s.groups.flatMap((g) => g.controls.map((c) => c.id))))
  const status = new Map<string, Status>()
  const unknown = new Set<string>()
  for (const f of file.findings) {
    if (!known.has(f.control)) {
      unknown.add(f.control)
      continue
    }
    const prev = status.get(f.control) as Finding['status'] | undefined
    if (!prev || RANK[f.status] < RANK[prev]) status.set(f.control, f.status)
  }
  return { status, unknown: [...unknown] }
}
