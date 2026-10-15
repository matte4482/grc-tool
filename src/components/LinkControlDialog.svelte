<script lang="ts">
  // Dialog för att koppla Annex A-kontroller till en risk (README 4.5).

  import { answerFor } from '../lib/assessment'
  import type { RiskControlLink } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { EFFECT_LABELS, TYPE_LABELS } from '../lib/risk/rules'
  import { templatesFor } from '../lib/risk/templates'
  import Modal from './Modal.svelte'
  import StatusBadge from './StatusBadge.svelte'

  let { open, riskId, onclose, onlink }: { open: boolean; riskId: string; onclose: () => void; onlink: (link: RiskControlLink) => void } = $props()

  let query = $state('')
  let effect = $state<'low' | 'medium' | 'high'>('medium')
  let type = $state<'preventive' | 'limiting'>('preventive')

  const project = $derived(store.project!)
  const risk = $derived(project.risks.find((r) => r.id === riskId))
  const linked = $derived(new Set(risk?.controls.map((l) => l.control) ?? []))
  const suggested = $derived.by(() => {
    const t = risk?.template ? templatesFor(store.framework!)?.risks.find((x) => x.id === risk.template) : undefined
    return new Map((t?.controls ?? []).map((c) => [c.control, c]))
  })
  const controls = $derived.by(() => {
    const q = query.trim().toLowerCase()
    // Risker behandlas med SoA-kontrollerna (Annex A). Har ramverket ingen SoA går alla att koppla.
    const soa = store.framework!.sections.filter((s) => s.soa)
    const all = (soa.length ? soa : store.framework!.sections).flatMap((s) => s.groups.flatMap((g) => g.controls))
    return all
      .filter((c) => !linked.has(c.id) && (!q || `${c.id} ${c.title}`.toLowerCase().includes(q)))
      .sort((a, b) => Number(suggested.has(b.id)) - Number(suggested.has(a.id)))
  })

  function link(id: string) {
    const s = suggested.get(id)
    onlink(s ? { control: id, effect: s.effect, type: s.type } : { control: id, effect, type })
  }
</script>

<Modal {open} title="Koppla kontroll till {riskId}" {onclose} wide>
  <div class="toolbar flat">
    <input type="search" placeholder="Sök bland Annex A" bind:value={query} aria-label="Sök kontroll" />
    <label class="inline-select">Effekt
      <select bind:value={effect}>{#each Object.entries(EFFECT_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}</select>
    </label>
    <label class="inline-select">Typ
      <select bind:value={type}>{#each Object.entries(TYPE_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}</select>
    </label>
  </div>
  <p class="meta">Föreslagna kontroller från typrisken kopplas med sin föreslagna effekt och typ.</p>
  <ul class="pick-list">
    {#each controls as c (c.id)}
      {@const s = suggested.get(c.id)}
      <li>
        <span><strong>{c.id}</strong> {c.title}{#if s}<span class="suggested">Föreslagen · {TYPE_LABELS[s.type]}, {EFFECT_LABELS[s.effect]}</span>{/if}</span>
        <StatusBadge status={answerFor(project, c.id).status} excluded={answerFor(project, c.id).applicable === false} />
        <button type="button" onclick={() => link(c.id)}>Koppla</button>
      </li>
    {:else}
      <li class="meta">Inga kontroller matchar.</li>
    {/each}
  </ul>
</Modal>
