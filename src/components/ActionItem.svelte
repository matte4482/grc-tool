<script lang="ts">
  // En åtgärd i åtgärdsplanen, med alla fält när den är öppnad.

  import {
    ACTION_STATUSES,
    ACTION_STATUS_LABELS,
    PRIORITY_LABELS,
    actionWarnings,
    setActionStatus,
    setActionText,
    setDue,
    setPriority,
    sourceText,
    unlink,
    type ActionText,
  } from '../lib/actions'
  import type { Action, ActionStatus, Priority } from '../lib/project/schema'
  import { controlTitles } from '../lib/frameworks/schema'
  import { store } from '../lib/project/store.svelte'
  import { shortDate } from '../lib/ui/format'
  import { nav } from '../lib/ui/nav.svelte'

  let {
    action,
    today,
    open = $bindable(false),
  }: { action: Action; today: string; open?: boolean } = $props()
  const onshow = nav.show

  const project = $derived(store.project!)
  const warnings = $derived(actionWarnings(project, action, today))
  const id = $derived(action.id)
  const now = () => new Date().toISOString()
  const text = (field: ActionText, value: string) => store.update((d) => setActionText(d, id, field, value))
  const controlTitle = $derived(controlTitles(store.framework!))
  const titleOf = (riskId: string) => project.risks.find((r) => r.id === riskId)?.title ?? 'borttagen'
</script>

<li class="control action" class:open class:closed={action.status === 'done' || action.status === 'cancelled'} id="act-{id}">
  <button type="button" class="control-row" aria-expanded={open} onclick={() => (open = !open)}>
    <span class="control-id">{id}</span>
    <span class="control-title">{action.title}</span>
    <span class="control-meta">
      {#if warnings.length}<span class="warn-up" title={warnings.join('\n')}>{warnings[0]}</span>{/if}
      {#if action.owner}<span class="owner">{action.owner}</span>{/if}
      {#if action.due}<span class="owner">{shortDate(action.due)}</span>{/if}
      {#if action.priority}<span class="prio prio-{action.priority}">{PRIORITY_LABELS[action.priority]}</span>{/if}
    </span>
    <span class="badge-status act-{action.status}">{ACTION_STATUS_LABELS[action.status]}</span>
  </button>

  {#if open}
    <div class="control-body">
      <div class="segmented" role="radiogroup" aria-label="Status för {id}">
        {#each ACTION_STATUSES as s (s)}
          <button type="button" role="radio" aria-checked={action.status === s} class:active={action.status === s} class="act-{s}" onclick={() => store.update((d) => setActionStatus(d, id, s as ActionStatus, now()))}>
            {ACTION_STATUS_LABELS[s]}
          </button>
        {/each}
      </div>

      <div class="control-grid">
        <div class="control-fields">
          <label class="field-label" for="{id}-title">Åtgärd</label>
          <input id="{id}-title" value={action.title} oninput={(e) => text('title', e.currentTarget.value)} />
          <label class="field-label" for="{id}-desc">Beskrivning</label>
          <textarea id="{id}-desc" rows="3" value={action.description} oninput={(e) => text('description', e.currentTarget.value)}></textarea>
          <div class="three">
            <div>
              <label class="field-label" for="{id}-owner">Ansvarig</label>
              <input id="{id}-owner" value={action.owner} oninput={(e) => text('owner', e.currentTarget.value)} />
            </div>
            <div>
              <label class="field-label" for="{id}-due">Deadline</label>
              <input id="{id}-due" type="date" value={action.due ?? ''} onchange={(e) => store.update((d) => setDue(d, id, e.currentTarget.value))} />
            </div>
            <div>
              <label class="field-label" for="{id}-prio">Prioritet</label>
              <select id="{id}-prio" value={action.priority ?? ''} onchange={(e) => store.update((d) => setPriority(d, id, (e.currentTarget.value || undefined) as Priority | undefined))}>
                <option value="">Ingen</option>
                {#each Object.entries(PRIORITY_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}
              </select>
            </div>
          </div>
          {#each warnings as w (w)}<p class="warn-up">{w}</p>{/each}
        </div>

        <aside class="control-aside">
          <div class="field-label">Gäller</div>
          <ul class="linked">
            {#each action.controls as c (c)}
              <li>
                <button type="button" class="link" onclick={() => onshow('control', c)}>{c}</button>
                <span class="meta">{controlTitle.get(c)}</span>
                <button type="button" class="link muted" aria-label="Ta bort {c} från {id}" onclick={() => store.update((d) => unlink(d, id, 'control', c))}>×</button>
              </li>
            {/each}
            {#each action.risks as r (r)}
              <li>
                <button type="button" class="link" onclick={() => onshow('risk', r)}>{r}</button>
                <span class="meta">{titleOf(r)}</span>
                <button type="button" class="link muted" aria-label="Ta bort {r} från {id}" onclick={() => store.update((d) => unlink(d, id, 'risk', r))}>×</button>
              </li>
            {:else}
              {#if !action.controls.length}<li class="meta">Ingen kontroll eller risk.</li>{/if}
            {/each}
          </ul>
          <p class="meta">{sourceText(action)} · skapad {shortDate(action.createdAt)}{action.completedAt ? ` · klar ${shortDate(action.completedAt)}` : ''}</p>
        </aside>
      </div>
    </div>
  {/if}
</li>
