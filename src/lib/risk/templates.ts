import { z } from 'zod'
import { takeId } from '../project/project'
import { RiskSchema, type Project, type Risk } from '../project/schema'
import typriskerIso27001 from './typrisker-iso27001.yaml'

// Typrisker: färdiga risker som startpunkt för riskregistret (B-29).

const TemplateLinkSchema = z.object({
  control: z.string().min(1),
  type: z.enum(['preventive', 'limiting']),
  effect: z.enum(['low', 'medium', 'high']),
})

export const RiskTemplateSchema = z.object({
  id: z.string().regex(/^TR-\d{2,}$/, 'Typrisk-ID ska ha formen TR-01'),
  title: z.string().min(1),
  description: z.string(),
  threat: z.string(),
  vulnerability: z.string(),
  assets: z.array(z.string().min(1)),
  controls: z.array(TemplateLinkSchema).min(1),
})

export const RiskTemplateSetSchema = z
  .object({
    id: z.string().min(1),
    version: z.int().min(1),
    framework: z.object({ id: z.string(), version: z.string() }),
    risks: z.array(RiskTemplateSchema).min(1),
  })
  .superRefine((set, ctx) => {
    const seen = new Set<string>()
    set.risks.forEach((r, i) => {
      if (seen.has(r.id)) ctx.addIssue({ code: 'custom', path: ['risks', i, 'id'], message: `Dubblett-ID för typrisk: ${r.id}` })
      seen.add(r.id)
    })
  })

export type RiskTemplate = z.infer<typeof RiskTemplateSchema>
export type RiskTemplateSet = z.infer<typeof RiskTemplateSetSchema>

const sets: RiskTemplateSet[] = [RiskTemplateSetSchema.parse(typriskerIso27001)]

/** Typriskerna för ett ramverk, eller undefined om det inte finns några. */
export function templatesFor(framework: { id: string; version: string }): RiskTemplateSet | undefined {
  return sets.find((s) => s.framework.id === framework.id && s.framework.version === framework.version)
}

/** Lägger till typrisker som nya risker med egna ID:n. Ändrar `draft`. */
export function addTemplateRisks(draft: Project, templates: RiskTemplate[], today: string, now = new Date().toISOString()): Risk[] {
  const added: Risk[] = []
  for (const t of templates) {
    const { id, nextNumber } = takeId(draft.nextNumber, 'risk')
    draft.nextNumber = nextNumber
    const risk = RiskSchema.parse({
      id,
      title: t.title,
      description: t.description,
      threat: t.threat,
      vulnerability: t.vulnerability,
      assets: t.assets,
      controls: t.controls,
      template: t.id,
      identifiedAt: today,
      history: [{ at: now, by: '', text: `Skapad från typrisk ${t.id}` }],
    })
    draft.risks.push(risk)
    added.push(risk)
  }
  return added
}

/** Typrisker som inte redan finns i projektet. */
export function unusedTemplates(project: Project, set: RiskTemplateSet): RiskTemplate[] {
  const used = new Set(project.risks.map((r) => r.template).filter(Boolean))
  return set.risks.filter((t) => !used.has(t.id))
}
