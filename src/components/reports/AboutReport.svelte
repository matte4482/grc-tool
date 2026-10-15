<script lang="ts">
  // Om bedömningen: konsultens sammanfattning, omfattning, deltagare och metod.

  import { store } from '../../lib/project/store.svelte'
  import { shortDate } from '../../lib/ui/format'

  const project = $derived(store.project!)
  const e = $derived(project.engagement)
</script>

<h2>Om bedömningen</h2>
{#if e.summary}<h3>Sammanfattning</h3><p>{e.summary}</p>{/if}
<table>
  <tbody>
    <tr><th style="width:24%">Ramverk</th><td>{store.framework?.name}</td></tr>
    <tr><th>Period</th><td>{shortDate(project.createdAt.slice(0, 10))} – {shortDate(project.updatedAt.slice(0, 10))}</td></tr>
    {#if e.scope}<tr><th>Omfattning</th><td>{e.scope}</td></tr>{/if}
    {#if e.participants}<tr><th>Deltagare</th><td>{e.participants}</td></tr>{/if}
  </tbody>
</table>
<p class="muted">
  Varje krav och kontroll har bedömts som Uppfylld, Delvis uppfylld, Ej uppfylld eller Ej bedömd, utifrån intervjuer och granskad
  evidens. Uppfyllnadsgrad = uppfyllda av tillämpliga. Kontroller som valts bort i SoA räknas inte.
</p>
