import { z } from 'zod'

/* Schema för ramverk. Använder zod för att validera data. 
  Huvudpunkter för design är:
  - Alla ID:n ska vara strängar och ints.
  - Vissa fält är valfria då vissa kontroller inte kräver motiviering eller ramverk saknar vissa fält.
*/

export const ControlSchema = z.object({
  id: z.string().min(1), // alltid sträng, inte int
  title: z.string().min(1),
  guidance: z.string().optional(), // bevis för kontrollen
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
  unit: z.string(), // "krav" eller "kontroll"
  groups: z.array(GroupSchema).min(1),
})

export const FrameworkSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    language: z.string().min(2),
    sections: z.array(SectionSchema).min(1),
  })
  .superRefine((fw, ctx) => {
    const seen = new Set<string>()
    for (const s of fw.sections)
      for (const g of s.groups)
        for (const c of g.controls) {
          if (seen.has(c.id)) ctx.addIssue({ code: 'custom', message: `Duplication of ID: ${c.id}` })
          seen.add(c.id)
        }
  })

export type Framework = z.infer<typeof FrameworkSchema>
export type Section = z.infer<typeof SectionSchema>
export type Group = z.infer<typeof GroupSchema>
export type Control = z.infer<typeof ControlSchema>
