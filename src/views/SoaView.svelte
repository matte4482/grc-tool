<script lang="ts">
  import { answerFor, filterSoa, linkedRisks, setApplicable, setText, soaSummary, type SoaFilter } from '../lib/assessment'
  import { store } from '../lib/project/store.svelte'

  // Statement of Applicability: tillämplighet och motivering per Annex A-kontroll (README 4.8).
  let filter = $state<SoaFilter>('all')
  let query = $state('')

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const summary = $derived(soaSummary(project, framework))
  const groups = $derived(filterSoa(project, framework, filter, query))
  const locked = $derived(linkedRisks(project))
  const sectionOf = (id: string) => framework.sections.find((s) => s.soa && s.groups.some((g) => g.controls.some((c) => c.id === id)))!
  const now = () => new Date().toISOString()

  const FILTERS: { value: SoaFilter; label: string }[] = [
    { value: 'all', label: 'Alla' },
    { value: 'applicable', label: 'Tillämpliga' },
    { value: 'excluded', label: 'Bortvalda' },
    { value: 'missing', label: 'Saknar motivering' },
  ]

  function toggle(id: string, applicable: boolean) {
    store.update((d) => void setApplicable(d, sectionOf(id), id, applicable, now()))
  }
</script>

<div class="soa-summary">
  <div class="card kpi"><span class="kpi-value">{summary.applicable}</span><span class="meta">tillämpliga</span></div>
  <div class="card kpi"><span class="kpi-value">{summary.excluded}</span><span class="meta">bortvalda</span></div>
  <div class="card kpi" class:warn={summary.missing > 0}>
    <span class="kpi-value">{summary.missing}</span><span class="meta">bortvalda utan motivering</span>
  </div>
  <div class="card kpi"><span class="kpi-value">{summary.locked}</span><span class="meta">låsta av risker</span></div>
</div>

<div class="toolbar card">
  <div class="segmented" role="radiogroup" aria-label="Filter">
    {#each FILTERS as f (f.value)}
      <button type="button" role="radio" aria-checked={filter === f.value} class:active={filter === f.value} onclick={() => (filter = f.value)}>
        {f.label}
      </button>
    {/each}
  </div>
  <input type="search" placeholder="Sök kontroll eller motivering" bind:value={query} aria-label="Sök" />
</div>

{#each groups as g (g.id)}
  <section class="card soa-group" aria-labelledby="soa-{g.id}">
    <h3 id="soa-{g.id}"><span class="group-id">{g.id}</span> {g.title}</h3>
    <table class="soa-table">
      <thead>
        <tr><th scope="col">Kontroll</th><th scope="col">Tillämplig</th><th scope="col">Motivering</th></tr>
      </thead>
      <tbody>
        {#each g.controls as c (c.id)}
          {@const a = answerFor(project, c.id)}
          {@const risks = locked.get(c.id) ?? []}
          <tr class:excluded={!a.applicable}>
            <td><strong>{c.id}</strong> {c.title}</td>
            <td class="soa-check">
              <label>
                <input
                  type="checkbox"
                  checked={a.applicable}
                  disabled={risks.length > 0}
                  onchange={(e) => toggle(c.id, e.currentTarget.checked)}
                  aria-label="{c.id} tillämplig"
                />
                {a.applicable ? 'Ja' : 'Nej'}
              </label>
              {#if risks.length}<span class="lock" title={risks.map((r) => `${r.id} ${r.title}`).join('\n')}>Låst: {risks.map((r) => r.id).join(', ')}</span>{/if}
            </td>
            <td>
              <input
                class="soa-why"
                class:missing={!a.applicable && a.soaJustification.trim() === ''}
                value={a.soaJustification}
                placeholder={a.applicable ? 'Valfri motivering' : 'Motivering krävs för bortval'}
                oninput={(e) => store.update((d) => setText(d, c.id, 'soaJustification', e.currentTarget.value, now()))}
                aria-label="Motivering för {c.id}"
              />
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </section>
{:else}
  <p class="card meta">Inga kontroller matchar filtret.</p>
{/each}
