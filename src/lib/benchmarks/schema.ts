/* Schema för tekniska benchmarks (CIS Benchmarks). Bara ID, nivå och kopplingar, inga CIS-texter (B-45). */

import { z } from 'zod'

const id = z.string().regex(/^\d+(\.\d+)*$/, 'ID ska vara siffror med punkter, t.ex. 9.3.4')

export const BenchmarkSectionSchema = z.object({
  id,
  title: z.string().min(1),
})

/** En rekommendation i ett benchmark. Egen svensk rubrik, och egen åtgärdstext när den skrivs. */
export const RecommendationSchema = z.object({
  id,
  title: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2)]),
  automated: z.boolean(),
  ig: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(), // lägsta implementeringsgrupp i CIS Controls v8
  cisControls: z.array(z.string().regex(/^\d{1,2}(\.\d{1,2})?$/)), // CIS Controls v8
  azurePolicy: z.array(z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)),
  remediation: z.string().optional(), // egen kort åtgärdstext, fylls senare
})

export const BenchmarkSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1),
    version: z.string().regex(/^\d+\.\d+\.\d+$/),
    name: z.string().min(1),
    publisher: z.string().min(1),
    language: z.string().min(2),
    sections: z.array(BenchmarkSectionSchema).min(1),
    recommendations: z.array(RecommendationSchema).min(1),
  })
  .superRefine((b, ctx) => {
    const seen = new Set<string>()
    for (const r of b.recommendations) {
      if (seen.has(r.id)) ctx.addIssue({ code: 'custom', message: `Dubblett-ID: ${r.id}` })
      seen.add(r.id)
      if (!sectionOf(b.sections, r.id)) ctx.addIssue({ code: 'custom', message: `${r.id} saknar avsnitt` })
    }
  })

export type Benchmark = z.infer<typeof BenchmarkSchema>
export type BenchmarkSection = z.infer<typeof BenchmarkSectionSchema>
export type Recommendation = z.infer<typeof RecommendationSchema>

/** Närmaste avsnitt för en rekommendation, t.ex. 9.3.4 hör till 9.3. */
export function sectionOf(sections: BenchmarkSection[], recId: string): BenchmarkSection | undefined {
  return sections.filter((s) => recId.startsWith(s.id + '.')).sort((a, b) => b.id.length - a.id.length)[0]
}
