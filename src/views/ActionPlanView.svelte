<script lang="ts">
  // Åtgärdsplan: förslag, åtgärder och utskrift av riskbehandlingsplanen (README 4.9, B-34).

  import ActionItem from '../components/ActionItem.svelte'
  import MenuButton from '../components/MenuButton.svelte'
  import {
    ACTION_STATUSES,
    ACTION_STATUS_LABELS,
    NO_ACTION_FILTER,
    PRIORITY_LABELS,
    acceptSuggestion,
    actionOwners,
    actionSummary,
    addManualAction,
    addToAction,
    filterActions,
    isOpen,
    suggestions,
    type ActionFilter,
    type Suggestion,
  } from '../lib/actions'
  import { store } from '../lib/project/store.svelte'
  import { localDate } from '../lib/ui/format'
  import { nav } from '../lib/ui/nav.svelte'
  import { printer } from '../lib/ui/print.svelte'

  const onshow = nav.show

  const project = $derived(store.project!)
  const today = localDate()
  const summary = $derived(actionSummary(project, today))
  const proposed = $derived(suggestions(project, store.framework!))
  const owners = $derived(actionOwners(project))
  const openActions = $derived(project.actions.filter(isOpen))

  let filter = $state<ActionFilter>({ ...NO_ACTION_FILTER })
  let openIds = $state<Record<string, boolean>>({})
  let showAll = $state(false)
  const list = $derived(filterActions(project, filter, today))
  const shownSuggestions = $derived(showAll ? proposed : proposed.slice(0, 8))
  const now = () => new Date().toISOString()

  function accept(s: Suggestion) {
    let id = ''
    store.update((d) => (id = acceptSuggestion(d, s, now())))
    openIds[id] = true
  }

  function addTo(s: Suggestion, actionId: string) {
    if (!actionId) return
    store.update((d) => addToAction(d, actionId, s, now()))
  }

  function newAction() {
    let id = ''
    store.update((d) => (id = addManualAction(d, '', now())))
    filter = { ...NO_ACTION_FILTER }
    openIds[id] = true
  }

</script>

<div class="kpis">
  <div class="card kpi"><span class="kpi-value">{summary.open}</span><span class="meta">öppna åtgärder</span></div>
  <div class="card kpi" class:warn={summary.overdue > 0}><span class="kpi-value">{summary.overdue}</span><span class="meta">försenade</span></div>
  <div class="card kpi"><span class="kpi-value">{summary.done}</span><span class="meta">klara</span></div>
  <div class="card kpi" class:warn={proposed.length > 0}><span class="kpi-value">{proposed.length}</span><span class="meta">brister utan åtgärd</span></div>
</div>

{#if proposed.length}
  <section class="card">
    <div class="card-head">
      <h2>Förslag</h2>
      <span class="meta">Brister utan åtgärd. Förslagen sparas inte förrän de blir åtgärder.</span>
    </div>
    <ul class="suggestions">
      {#each shownSuggestions as s (s.key)}
        <li>
          <span class="prio prio-{s.priority}">{PRIORITY_LABELS[s.priority]}</span>
          <span class="sugg-text">
            <strong>{s.title}</strong>
            <span class="meta">{s.reason}{s.controls.length && s.source.type === 'risk' ? ` Omfattar ${s.controls.join(', ')}.` : ''}</span>
          </span>
          <span class="sugg-actions">
            <button type="button" class="link muted" onclick={() => onshow(s.source.type, s.source.id)}>Visa</button>
            {#if openActions.length}
              <MenuButton
                label="Lägg till i …"
                ariaLabel="Lägg {s.source.id} till en befintlig åtgärd"
                items={openActions.map((a) => ({ id: a.id, label: `${a.id} ${a.title}`, hint: a.owner || undefined }))}
                onselect={(id) => addTo(s, id)}
              />
            {/if}
            <button type="button" class="primary" onclick={() => accept(s)}>Skapa åtgärd</button>
          </span>
        </li>
      {/each}
    </ul>
    {#if proposed.length > shownSuggestions.length}
      <button type="button" class="link" onclick={() => (showAll = true)}>Visa alla {proposed.length} förslag</button>
    {/if}
  </section>
{/if}

<div class="toolbar card">
  <input type="search" placeholder="Sök i åtgärder" bind:value={filter.query} aria-label="Sök åtgärder" />
  <select bind:value={filter.status} aria-label="Filtrera på status">
    <option value="open">Öppna</option>
    <option value="all">Alla</option>
    {#each ACTION_STATUSES as s (s)}<option value={s}>{ACTION_STATUS_LABELS[s]}</option>{/each}
  </select>
  <select bind:value={filter.owner} aria-label="Filtrera på ansvarig">
    <option value="">Alla ansvariga</option>
    {#each owners as o (o)}<option value={o}>{o}</option>{/each}
  </select>
  <label class="check"><input type="checkbox" bind:checked={filter.overdue} /> Bara försenade</label>
  <span class="toolbar-end">
    <button type="button" onclick={newAction}>+ Ny åtgärd</button>
    <button type="button" onclick={() => printer.print('plan')}>Skriv ut riskbehandlingsplan</button>
  </span>
</div>

<section class="card control-group action-list">
  {#if list.length}
    <ul class="control-list">
      {#each list as a (a.id)}
        <ActionItem action={a} {today} bind:open={() => openIds[a.id] ?? false, (v) => (openIds[a.id] = v)} />
      {/each}
    </ul>
  {:else if project.actions.length}
    <p class="meta">Inga åtgärder matchar filtret.</p>
  {:else}
    <p class="meta">Inga åtgärder än. Skapa dem från förslagen ovan eller med "+ Ny åtgärd".</p>
  {/if}
</section>

