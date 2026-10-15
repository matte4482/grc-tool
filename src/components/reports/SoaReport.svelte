<script lang="ts">
  // Uttalande om tillämplighet (krav 6.1.3 d): alla kontroller i SoA-avsnitten.

  import { STATUS_LABELS, answerFor, soaSummary } from '../../lib/assessment'
  import { store } from '../../lib/project/store.svelte'

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const summary = $derived(soaSummary(project, framework))
</script>

<h2>Uttalande om tillämplighet (SoA)</h2>
<p>{summary.applicable} kontroller är tillämpliga och {summary.excluded} är bortvalda.{summary.missing ? ` ${summary.missing} bortval saknar motivering.` : ''}</p>
{#each framework.sections.filter((s) => s.soa) as s (s.id)}
  {#each s.groups as g (g.id)}
    <h3>{g.id} {g.title}</h3>
    <table>
      <thead><tr><th style="width:9%">ID</th><th style="width:30%">Kontroll</th><th style="width:10%">Tillämplig</th><th>Motivering</th><th style="width:15%">Genomförd</th></tr></thead>
      <tbody>
        {#each g.controls as c (c.id)}
          {@const a = answerFor(project, c.id)}
          <tr>
            <td>{c.id}</td>
            <td>{c.title}</td>
            <td>{a.applicable ? 'Ja' : 'Nej'}</td>
            <td>{a.soaJustification}</td>
            <td class={a.applicable ? `st-${a.status}` : 'muted'}>{a.applicable ? STATUS_LABELS[a.status] : '–'}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
{/each}
