<script lang="ts">
  // Progressrapport: vad som ändrats sedan den tidigare bedömningen (fas 7).

  import { ACTION_STATUS_LABELS } from '../../lib/actions'
  import { CHANGE_LABELS, compareProjects, summaryText, type ControlChange } from '../../lib/compare'
  import { STATUS_LABELS } from '../../lib/assessment'
  import { store } from '../../lib/project/store.svelte'
  import { comparison } from '../../lib/ui/comparison.svelte'
  import { localDate, shortDate } from '../../lib/ui/format'

  const result = $derived(comparison.previous ? compareProjects(comparison.previous, store.project!, store.framework!, localDate()) : null)
  const SHOWN: ControlChange[] = ['improved', 'worsened', 'new', 'unassessed']
</script>

<h2>Progress sedan förra bedömningen</h2>
{#if !result}
  <p class="muted">Ingen tidigare bedömning är vald. Välj den under fliken Uppföljning.</p>
{:else if !result.ok}
  <p>{result.message}</p>
{:else}
  {@const c = result.comparison}
  <p>Jämförelse mellan bedömningen {shortDate(c.before.date)} och {shortDate(c.after.date)}.</p>
  <p><strong>{summaryText(c)}</strong></p>
  <table>
    <thead><tr><th>Avsnitt</th><th class="num">Förra</th><th class="num">Nu</th><th class="num">Förändring</th></tr></thead>
    <tbody>
      <tr><td>Totalt</td><td class="num">{c.before.pct} %</td><td class="num">{c.after.pct} %</td><td class="num">{c.after.pct - c.before.pct >= 0 ? '+' : ''}{c.after.pct - c.before.pct}</td></tr>
      {#each c.sections as s (s.id)}<tr><td>{s.title}</td><td class="num">{s.before} %</td><td class="num">{s.after} %</td><td class="num">{s.after - s.before >= 0 ? '+' : ''}{s.after - s.before}</td></tr>{/each}
    </tbody>
  </table>

  {#each SHOWN as kind (kind)}
    {@const list = c.controls.filter((d) => d.change === kind)}
    {#if list.length}
      <h3>{CHANGE_LABELS[kind]} ({list.length})</h3>
      <table>
        <thead><tr><th style="width:10%">ID</th><th>Namn</th><th style="width:18%">Förra</th><th style="width:18%">Nu</th></tr></thead>
        <tbody>{#each list as d (d.id)}<tr><td>{d.id}</td><td>{d.title}</td><td class="st-{d.before}">{STATUS_LABELS[d.before]}</td><td class="st-{d.after}">{STATUS_LABELS[d.after]}</td></tr>{/each}</tbody>
      </table>
    {/if}
  {/each}

  {#if c.soa.included.length || c.soa.excluded.length}
    <h3>SoA</h3>
    {#if c.soa.included.length}<p>Invalda: {c.soa.included.join(', ')}</p>{/if}
    {#if c.soa.excluded.length}<p>Bortvalda: {c.soa.excluded.join(', ')}</p>{/if}
  {/if}

  <h3>Risker</h3>
  <table>
    <thead><tr><th style="width:10%">ID</th><th>Risk</th><th style="width:18%">Ändring</th><th class="num" style="width:12%">Förra</th><th class="num" style="width:12%">Nu</th></tr></thead>
    <tbody>
      {#each c.risks.added as r (r.id)}<tr><td>{r.id}</td><td>{r.title}</td><td>Ny</td><td class="num">–</td><td class="num">{r.after ?? '–'}</td></tr>{/each}
      {#each c.risks.changed as r (r.id)}<tr><td>{r.id}</td><td>{r.title}</td><td>Ändrat riskvärde</td><td class="num">{r.before ?? '–'}</td><td class="num">{r.after ?? '–'}</td></tr>{/each}
      {#each c.risks.removed as r (r.id)}<tr><td>{r.id}</td><td>{r.title}</td><td>Borttagen</td><td class="num">{r.before ?? '–'}</td><td class="num">–</td></tr>{/each}
      {#if !c.risks.added.length && !c.risks.changed.length && !c.risks.removed.length}<tr><td colspan="5" class="muted">Inga ändringar.</td></tr>{/if}
    </tbody>
  </table>

  <h3>Åtgärder</h3>
  <table>
    <thead><tr><th style="width:12%">ID</th><th>Åtgärd</th><th style="width:20%">Ändring</th><th style="width:14%">Status</th></tr></thead>
    <tbody>
      {#each c.actions.completed as a (a.id)}<tr><td>{a.id}</td><td>{a.title}</td><td>Avslutad</td><td>{ACTION_STATUS_LABELS[a.status]}</td></tr>{/each}
      {#each c.actions.added.filter((a) => a.status !== 'done') as a (a.id)}<tr><td>{a.id}</td><td>{a.title}</td><td>Ny</td><td>{ACTION_STATUS_LABELS[a.status]}</td></tr>{/each}
      {#each c.actions.overdue as a (a.id)}<tr><td>{a.id}</td><td>{a.title}</td><td>Försenad{a.due ? ` (${shortDate(a.due)})` : ''}</td><td>{ACTION_STATUS_LABELS[a.status]}</td></tr>{/each}
    </tbody>
  </table>
  <p class="muted">Ny evidens sedan förra bedömningen: {c.evidenceAdded} filer.</p>
{/if}
