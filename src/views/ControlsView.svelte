<script lang="ts">
  // Grundkrav eller Annex A: bedömning per krav och kontroll (README 4.7).

  import { onMount, untrack } from 'svelte'
  import ControlItem from '../components/ControlItem.svelte'
  import StatusBar from '../components/StatusBar.svelte'
  import { NO_FILTER, STATUSES, STATUS_LABELS, attention, filterControls, isExcluded, linkedRisks, type Attention, type ControlFilter } from '../lib/assessment'
  import { groupProgress, percent } from '../lib/compliance'
  import type { Section } from '../lib/frameworks/schema'
  import { store } from '../lib/project/store.svelte'

  let { section, initialAttention, initialOpen }: { section: Section; initialAttention?: ControlFilter['attention']; initialOpen?: string } = $props()

  const ATTENTION_NOTE: Record<Attention, string> = {
    not_assessed: ' som inte är bedömda',
    no_owner: ' utan ansvarig',
    no_evidence: ' som är uppfyllda eller delvis uppfyllda utan evidens',
  }

  let filter = $state<ControlFilter>({ ...NO_FILTER, attention: untrack(() => initialAttention) })
  let openIds = $state<Record<string, boolean>>(untrack(() => (initialOpen ? { [initialOpen]: true } : {})))
  onMount(() => {
    if (initialOpen) document.getElementById(`ctrl-${initialOpen}`)?.scrollIntoView({ block: 'center' })
  })

  const project = $derived(store.project!)
  const groups = $derived(filterControls(project, section, filter))
  const progress = $derived(groupProgress(project, section))
  const total = $derived(
    progress.reduce((s, g) => ({ applicable: s.applicable + g.applicable, fulfilled: s.fulfilled + g.fulfilled }), { applicable: 0, fulfilled: 0 }),
  )
  const todo = $derived(attention(project, section))
  const risks = $derived(linkedRisks(project))
  const shown = $derived(groups.reduce((n, g) => n + g.controls.length, 0))
  const filtered = $derived(filter.query !== '' || filter.status !== 'all' || filter.hideExcluded || filter.attention !== undefined)

  function setAll(open: boolean) {
    openIds = open ? Object.fromEntries(groups.flatMap((g) => g.controls.map((c) => [c.id, true]))) : {}
  }

  function showGroup(id: string) {
    filter = { ...NO_FILTER }
    document.getElementById(`grp-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
</script>

<div class="controls-layout">
  <aside class="card controls-side">
    <div class="field-label">Uppfyllnadsgrad</div>
    <div class="big-pct">{percent(total.fulfilled, total.applicable)} %</div>
    <p class="meta">{total.fulfilled} av {total.applicable} tillämpliga uppfyllda</p>

    <div class="field-label">{section.soa ? 'Teman' : 'Kapitel'}</div>
    <ul class="group-list">
      {#each progress as g (g.id)}
        <li>
          <button type="button" class="group-link" onclick={() => showGroup(g.id)}>
            <span><strong>{g.id}</strong> {g.title}</span>
            <span class="meta">{g.assessed}/{g.applicable}</span>
          </button>
          <StatusBar applicable={g.applicable} assessed={g.assessed} fulfilled={g.fulfilled} partial={g.partial} notFulfilled={g.notFulfilled} />
        </li>
      {/each}
    </ul>

    <div class="field-label">Behöver uppmärksamhet</div>
    <ul class="attention">
      <li>
        <button type="button" class="link" onclick={() => (filter = { ...NO_FILTER, attention: 'not_assessed' })}>Ej bedömda</button>
        <span>{todo.notAssessed}</span>
      </li>
      <li>
        <button type="button" class="link" onclick={() => (filter = { ...NO_FILTER, attention: 'no_owner' })}>Saknar ansvarig</button>
        <span>{todo.noOwner}</span>
      </li>
      <li>
        <button type="button" class="link" onclick={() => (filter = { ...NO_FILTER, attention: 'no_evidence' })}>Saknar evidens</button>
        <span>{todo.noEvidence}</span>
      </li>
    </ul>
  </aside>

  <section class="controls-main">
    <div class="toolbar card">
      <input type="search" placeholder="Sök i {section.unit}, kommentarer och ansvariga" bind:value={filter.query} aria-label="Sök" />
      <select bind:value={filter.status} aria-label="Filtrera på status">
        <option value="all">Alla statusar</option>
        {#each STATUSES as s (s)}<option value={s}>{STATUS_LABELS[s]}</option>{/each}
      </select>
      {#if section.soa}
        <label class="check"><input type="checkbox" bind:checked={filter.hideExcluded} /> Dölj ej tillämpliga</label>
      {/if}
      <span class="toolbar-end">
        <button type="button" class="link muted" onclick={() => setAll(true)}>Visa alla detaljer</button>
        <button type="button" class="link muted" onclick={() => setAll(false)}>Dölj detaljer</button>
      </span>
    </div>

    {#if filtered}
      <p class="meta filter-note">
        Visar {shown} {section.unit}{filter.attention ? ATTENTION_NOTE[filter.attention] : ''}.
        <button type="button" class="link" onclick={() => (filter = { ...NO_FILTER })}>Visa alla</button>
      </p>
    {/if}

    {#each groups as g (g.id)}
      <section class="card control-group" id="grp-{g.id}" aria-labelledby="grp-h-{g.id}">
        <h3 id="grp-h-{g.id}"><span class="group-id">{g.id}</span> {g.title}</h3>
        <ul class="control-list">
          {#each g.controls as c (c.id)}
            <ControlItem control={c} excluded={isExcluded(project, section, c.id)} risks={risks.get(c.id) ?? []} bind:open={() => openIds[c.id] ?? false, (v) => (openIds[c.id] = v)} />
          {/each}
        </ul>
      </section>
    {:else}
      <p class="card meta">Inga {section.unit} matchar filtret.</p>
    {/each}
  </section>
</div>
