<script lang="ts">
  // Åtgärdsplan för ramverk utan riskhantering, t.ex. CIS (B-47). Ersätter riskbehandlingsplanen.

  import { ACTION_STATUS_LABELS, PRIORITY_LABELS } from '../../lib/actions'
  import { store } from '../../lib/project/store.svelte'
  import { shortDate } from '../../lib/ui/format'

  const ORDER = { high: 0, medium: 1, low: 2 } as const
  const project = $derived(store.project!)
  const actions = $derived(
    project.actions
      .filter((a) => a.status !== 'cancelled')
      .sort((a, b) => (a.status === 'done' ? 1 : 0) - (b.status === 'done' ? 1 : 0) || ORDER[a.priority ?? 'low'] - ORDER[b.priority ?? 'low'] || a.id.localeCompare(b.id)),
  )
</script>

<h2>Åtgärdsplan</h2>
{#if actions.length}
  <table>
    <thead>
      <tr><th style="width:9%">ID</th><th>Åtgärd</th><th style="width:13%">Gäller</th><th style="width:15%">Ansvarig</th><th style="width:11%">Deadline</th><th style="width:9%">Prioritet</th><th style="width:10%">Status</th></tr>
    </thead>
    <tbody>
      {#each actions as a (a.id)}
        <tr>
          <td>{a.id}</td>
          <td><strong>{a.title}</strong>{#if a.description}<br />{a.description}{/if}</td>
          <td>{a.controls.join(', ') || '–'}</td>
          <td>{a.owner || '–'}</td>
          <td>{a.due ? shortDate(a.due) : '–'}</td>
          <td>{a.priority ? PRIORITY_LABELS[a.priority] : '–'}</td>
          <td>{ACTION_STATUS_LABELS[a.status]}</td>
        </tr>
      {/each}
    </tbody>
  </table>
{:else}
  <p class="muted">Inga åtgärder.</p>
{/if}
