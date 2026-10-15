<script lang="ts">
  // Bilaga: riskmetoden med skalor, acceptansnivå och regeln för restrisk (B-27).

  import { store } from '../../lib/project/store.svelte'
  import { EFFECT_LABELS, EFFECT_VALUES, methodOf } from '../../lib/risk/rules'

  const method = $derived(methodOf(store.project!))
</script>

<h2 class="page-break">Bilaga: Riskmetod</h2>
<p>
  Fastställd av {method.approvedBy || '–'}{method.approvedAt ? `, ${method.approvedAt}` : ''}. Acceptansnivå: riskvärde {method.acceptanceThreshold}.
  Riskerna bedöms om minst var {method.reviewIntervalMonths}:e månad.
</p>
<h3>Konsekvens</h3>
<table>
  <thead><tr><th style="width:6%">Nivå</th><th style="width:16%">Namn</th>{#each method.consequence.types as t (t)}<th>{t}</th>{/each}</tr></thead>
  <tbody>
    {#each [...method.consequence.levels].reverse() as l (l.level)}
      <tr><td>{l.level}</td><td>{l.name}</td>{#each method.consequence.types as _, i (i)}<td>{l.descriptions[i] ?? ''}</td>{/each}</tr>
    {/each}
  </tbody>
</table>
<h3>Sannolikhet</h3>
<table>
  <thead><tr><th style="width:6%">Nivå</th><th style="width:16%">Namn</th><th>Frekvens</th><th>Tolkning</th></tr></thead>
  <tbody>
    {#each [...method.likelihood.levels].reverse() as l (l.level)}<tr><td>{l.level}</td><td>{l.name}</td><td>{l.frequency}</td><td>{l.interpretation}</td></tr>{/each}
  </tbody>
</table>
<h3>Restrisk</h3>
<p>
  Varje kopplad kontroll har en effektivitet ({Object.entries(EFFECT_LABELS).map(([k, v]) => `${v} ${EFFECT_VALUES[k as keyof typeof EFFECT_VALUES]}`.replace('.', ',')).join(', ')})
  och är förebyggande (sänker sannolikheten) eller begränsande (sänker konsekvensen). Planerad restrisk räknar med att kontrollerna är
  uppfyllda. Faktisk restrisk multiplicerar effektiviteten med 1 för uppfylld, 0,5 för delvis uppfylld och 0 annars. Flera kontroller
  kombineras som lager, 1 − (1 − e₁) × (1 − e₂) …, högst 0,9. Värdet avrundas uppåt till hel nivå, lägst 1. En accepterad risk behåller
  risken före behandling.
</p>
