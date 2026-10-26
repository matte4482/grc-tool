<script lang="ts">
  // Åtgärder för en kontroll eller risk, och "Skapa åtgärd" när en brist saknar åtgärd.

  import { ACTION_STATUS_LABELS, acceptSuggestion, actionsFor, suggestionFor } from '../lib/actions'
  import { store } from '../lib/project/store.svelte'
  import { nav } from '../lib/ui/nav.svelte'

  let { kind, id }: { kind: 'control' | 'risk'; id: string } = $props()

  const linked = $derived(actionsFor(store.project!, kind, id))
  const suggestion = $derived(suggestionFor(store.project!, store.framework!, kind, id))

  function create() {
    if (suggestion) store.update((d) => void acceptSuggestion(d, suggestion, new Date().toISOString()))
  }
</script>

{#if linked.length}
  <ul class="linked-actions">
    {#each linked as a (a.id)}
      <li>
        <button type="button" class="link" onclick={() => nav.go('actions')}>{a.id}</button>
        {a.title} <span class="meta">({ACTION_STATUS_LABELS[a.status].toLowerCase()})</span>
      </li>
    {/each}
  </ul>
{/if}
{#if suggestion}
  <p class="meta">{suggestion.reason}</p>
  <button type="button" class="link" onclick={create}>Skapa åtgärd</button>
{:else if !linked.length}
  <p class="meta">Ingen åtgärd behövs.</p>
{/if}
