<script lang="ts">
  // Gapanalys: brister med åtgärd, och alla krav och kontroller per avsnitt.

  import { actionsFor } from '../../lib/actions'
  import { STATUS_LABELS, answerFor, isDeficient, isExcluded } from '../../lib/assessment'
  import { allControls } from '../../lib/frameworks/schema'
  import { percent, sectionProgress } from '../../lib/compliance'
  import { store } from '../../lib/project/store.svelte'

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const sections = $derived(sectionProgress(project, framework))
  const gaps = $derived(
    allControls(framework)
      .filter(({ section, control }) => isDeficient(project, section, control.id))
      .map(({ control }) => ({ control, answer: answerFor(project, control.id) })),
  )
</script>

<h2>Gapanalys</h2>
<p>
  Bedömningen omfattar {sections.map((s) => `${s.count} ${s.unit}`).join(' och ')}. Av de tillämpliga är
  {sections.map((s) => `${percent(s.fulfilled, s.applicable)} % av ${s.title}`).join(' och ')} uppfyllda.
</p>

<h3>Brister ({gaps.length})</h3>
{#if gaps.length}
  <table>
    <thead><tr><th>ID</th><th>Krav eller kontroll</th><th>Status</th><th>Observation</th><th>Åtgärd</th></tr></thead>
    <tbody>
      {#each gaps as { control, answer } (control.id)}
        <tr>
          <td>{control.id}</td>
          <td>{control.title}</td>
          <td class="st-{answer.status}">{STATUS_LABELS[answer.status]}</td>
          <td>{answer.comment}</td>
          <td>{actionsFor(project, 'control', control.id).map((a) => `${a.id} ${a.title}`).join('; ')}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p class="muted">Inga brister.</p>
{/if}

{#each framework.sections as s (s.id)}
  <h2 class="page-break">{s.title}</h2>
  {#each s.groups as g (g.id)}
    <h3>{g.id} {g.title}</h3>
    <table>
      <thead><tr><th style="width:9%">ID</th><th style="width:28%">Namn</th><th style="width:13%">Status</th><th>Motivering och observation</th><th style="width:14%">Ansvarig</th></tr></thead>
      <tbody>
        {#each g.controls as c (c.id)}
          {@const a = answerFor(project, c.id)}
          {@const excluded = isExcluded(project, s, c.id)}
          <tr>
            <td>{c.id}</td>
            <td>{c.title}</td>
            <td class={excluded ? 'muted' : `st-${a.status}`}>{excluded ? 'Ej tillämplig' : STATUS_LABELS[a.status]}</td>
            <td>{excluded ? a.soaJustification : a.comment}{a.evidence.length ? ` (Evidens: ${a.evidence.map((e) => e.file.split('/').pop()).join(', ')})` : ''}</td>
            <td>{a.owner}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {/each}
{/each}
