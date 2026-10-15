<script lang="ts">
  // Riskmatris som tabell för rapporter: antal risker per ruta.

  import { riskLevel } from '../../lib/risk/rules'

  let { counts, caption }: { counts: Map<string, number>; caption: string } = $props()
  const levels = [1, 2, 3, 4, 5]
</script>

<p class="muted">{caption}</p>
<table class="matrix">
  <tbody>
    {#each [...levels].reverse() as s (s)}
      <tr>
        <th>S{s}</th>
        {#each levels as c (c)}<td class="lvl-{riskLevel(c * s)}">{counts.get(`${c}-${s}`) || ''}</td>{/each}
      </tr>
    {/each}
    <tr><th></th>{#each levels as c (c)}<th>K{c}</th>{/each}</tr>
  </tbody>
</table>
