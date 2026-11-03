/* Schema för ramverk. Använder zod för att validera data. */

import { z } from 'zod'

export const ControlSchema = z.object({
  id: z.string().min(1), // alltid sträng, inte int
  title: z.string().min(1),
  guidance: z.string().optional(), // bevis för kontrollen, eller vad som kontrolleras
  remediation: z.string().optional(), // hur en brist åtgärdas (B-47)
  profile: z.int().min(1).optional(), // lägsta nivå kontrollen ingår i, t.ex. 1 = IG1 eller Level 1
  automated: z.boolean().optional(), // kan kontrolleras automatiskt (CIS Benchmarks)
  refs: z.array(z.string()).optional(), // referenser, t.ex. Azure Policy-ID
})

export const GroupSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  controls: z.array(ControlSchema).min(1),
})

export const SectionSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  soa: z.boolean(), // true = ingår i Statement of Applicability
  optional: z.boolean().optional(), // kontroller kan markeras ej tillämpliga direkt i listan (B-47)
  groupLabel: z.string().optional(), // rubrik för grupperna i sidopanelen, t.ex. "Kontroller"
  unit: z.string(), // "krav" eller "kontroll"
  groups: z.array(GroupSchema).min(1),
})

/** Flikar i projektet. Ett avsnitt får inte ha samma ID, eftersom avsnitten också är flikar. */
export const RESERVED_SECTION_IDS = ['overview', 'method', 'risks', 'soa', 'actions', 'followup', 'reports']

export const FrameworkSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    language: z.string().min(2),
    /** Nivåer som bygger på varandra, t.ex. IG1–IG3 eller Level 1–2. Kontrollens profile pekar hit (1 = första). */
    profiles: z.array(z.string().min(1)).optional(),
    riskManagement: z.boolean().default(true), // riskmetod, riskregister och riskbehandlingsplan
    readiness: z.boolean().default(true), // "Redo för revision" på översikten (B-37)
    guidanceLabel: z.string().default('Bevisbörda'),
    /** Varifrån innehållet kommer, visas i rapporten. */
    source: z.string().optional(),
    sections: z.array(SectionSchema).min(1),
  })
  .superRefine((fw, ctx) => {
    for (const s of fw.sections)
      if (RESERVED_SECTION_IDS.includes(s.id)) ctx.addIssue({ code: 'custom', message: `Avsnitts-ID:t ${s.id} är reserverat för en flik` })
    const seen = new Set<string>()
    for (const s of fw.sections)
      for (const g of s.groups)
        for (const c of g.controls) {
          if (seen.has(c.id)) ctx.addIssue({ code: 'custom', message: `Dubblett-ID: ${c.id}` })
          seen.add(c.id)
          if (c.profile && c.profile > (fw.profiles?.length ?? 0)) ctx.addIssue({ code: 'custom', message: `${c.id}: okänd nivå ${c.profile}` })
        }
  })

export type Framework = z.output<typeof FrameworkSchema>
export type FrameworkInput = z.input<typeof FrameworkSchema>
export type Section = z.infer<typeof SectionSchema>
export type Group = z.infer<typeof GroupSchema>
export type Control = z.infer<typeof ControlSchema>

/** Alla kontroller med avsnitt och grupp, i ramverkets ordning. */
export function allControls(fw: Framework): { section: Section; group: Group; control: Control }[] {
  return fw.sections.flatMap((section) => section.groups.flatMap((group) => group.controls.map((control) => ({ section, group, control }))))
}

export const controlTitles = (fw: Framework): Map<string, string> => new Map(allControls(fw).map(({ control }) => [control.id, control.title]))
