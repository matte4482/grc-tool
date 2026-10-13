<script lang="ts">
  import ImportTemplatesDialog from '../components/ImportTemplatesDialog.svelte'
  import LevelBadge from '../components/LevelBadge.svelte'
  import Notice from '../components/Notice.svelte'
  import RiskMatrix from '../components/RiskMatrix.svelte'
  import type { Treatment } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { TREATMENT_LABELS, addRisk } from '../lib/risk/operations'
  import {
    LEVEL_LABELS,
    approvalState,
    heatmap,
    methodOf,
    missingInfo,
    residualRisk,
    riskLevel,
    riskSummary,
    riskValue,
    riskWarnings,
    type Level,
  } from '../lib/risk/rules'
  import { templatesFor } from '../lib/risk/templates'
  import RiskDetail from './RiskDetail.svelte'

  // Riskregister med nyckeltal, värmekarta och tabell (README 4.5). Riskdetaljen öppnas här.
  let selected = $state<string | null>(null)
  let mode = $state<'before' | 'planned' | 'actual'>('before')
  let cell = $state<string | undefined>()
  let query = $state('')
  let level = $state<Level | 'all'>('all')
  let owner = $state('all')
  let treatment = $state<Treatment | 'all'>('all')
  let importing = $state(false)
  let messages = $state<string[]>([])

  const project = $derived(store.project!)
  const method = $derived(methodOf(project))
  const summary = $derived(riskSummary(project))
  const owners = $derived([...new Set(project.risks.map((r) => r.owner.trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'sv')))
  const hasTemplates = $derived(!!templatesFor(store.framework!))

  const rows = $derived(
    project.risks
      .map((r) => ({ risk: r, planned: residualRisk(project, r, 'planned'), actual: residualRisk(project, r, 'actual') }))
      .filter(({ risk: r, planned, actual }) => {
        const q = query.trim().toLowerCase()
        if (q && ![r.id, r.title, r.description, r.owner, ...r.assets].some((t) => t.toLowerCase().includes(q))) return false
        if (level !== 'all' && (!r.before || riskLevel(riskValue(r.before)) !== level)) return false
        if (owner !== 'all' && r.owner.trim() !== owner) return false
        if (treatment !== 'all' && r.treatment !== treatment) return false
        if (cell) {
          const s = mode === 'before' ? r.before : mode === 'planned' ? planned : actual
          if (!s || `${s.consequence}-${s.likelihood}` !== cell) return false
        }
        return true
      }),
  )

  function newRisk() {
    let id = ''
    store.update((d) => (id = addRisk(d, 'Ny risk', new Date().toISOString())))
    selected = id
  }

  const APPROVAL = { none: '–', valid: 'Godkänd', stale: 'Inaktuell' }
</script>

{#if selected && project.risks.some((r) => r.id === selected)}
  <RiskDetail riskId={selected} onselect={(id) => (selected = id)} />
{:else}
  <Notice lines={messages} tone="warn" />
  <div class="kpis">
    <div class="card kpi"><span class="kpi-value">{summary.total}</span><span class="meta">risker</span></div>
    <div class="card kpi" class:warn={summary.aboveThreshold > 0}><span class="kpi-value">{summary.aboveThreshold}</span><span class="meta">över acceptansnivå ({method.acceptanceThreshold})</span></div>
    <div class="card kpi" class:warn={summary.residualNotReached > 0}><span class="kpi-value">{summary.residualNotReached}</span><span class="meta">restrisk ej uppnådd</span></div>
    <div class="card kpi"><span class="kpi-value">{summary.awaitingApproval}</span><span class="meta">väntar på godkännande</span></div>
  </div>

  <div class="register-top">
    <section class="card heat">
      <div class="card-head">
        <h2>Värmekarta</h2>
        <div class="segmented small" role="radiogroup" aria-label="Visa risk">
          {#each [['before', 'Före'], ['planned', 'Planerad'], ['actual', 'Faktisk']] as [v, l] (v)}
            <button type="button" role="radio" aria-checked={mode === v} class:active={mode === v} onclick={() => ((mode = v as typeof mode), (cell = undefined))}>{l}</button>
          {/each}
        </div>
      </div>
      <RiskMatrix {method} counts={heatmap(project, mode)} selected={cell} onselect={(k) => (cell = k)} />
      <p class="meta">{cell ? 'Tabellen visar risker i vald ruta. Klicka igen för att visa alla.' : 'Klicka i en ruta för att filtrera tabellen.'}</p>
    </section>

    <section class="card register-actions">
      <h2>Lägg till</h2>
      <button type="button" class="cta" onclick={newRisk}>+ Ny risk</button>
      {#if hasTemplates}
        <button type="button" onclick={() => (importing = true)}>Importera typrisker</button>
      {/if}
      <p class="meta">Typrisker som inte gäller tar du bort i riskdetaljen. De kan importeras igen.</p>
    </section>
  </div>

  <div class="toolbar card">
    <input type="search" placeholder="Sök risk, tillgång eller ägare" bind:value={query} aria-label="Sök risk" />
    <select bind:value={level} aria-label="Nivå">
      <option value="all">Alla nivåer</option>
      {#each Object.entries(LEVEL_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}
    </select>
    <select bind:value={owner} aria-label="Ägare">
      <option value="all">Alla ägare</option>
      {#each owners as o (o)}<option value={o}>{o}</option>{/each}
    </select>
    <select bind:value={treatment} aria-label="Behandling">
      <option value="all">All behandling</option>
      {#each Object.entries(TREATMENT_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}
    </select>
  </div>

  <section class="card table-card">
    <div class="table-scroll">
      <table class="risk-table">
        <thead>
          <tr>
            <th scope="col">ID</th><th scope="col">Risk</th><th scope="col">Ägare</th><th scope="col">K</th><th scope="col">S</th>
            <th scope="col">Värde</th><th scope="col">Behandling</th><th scope="col">Kontroller</th><th scope="col">Restrisk</th><th scope="col">Godkänd</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as { risk: r, planned, actual } (r.id)}
            {@const missing = missingInfo(r)}
            {@const warn = riskWarnings(project, r)}
            {@const appr = approvalState(project, r)}
            <tr onclick={() => (selected = r.id)}>
              <td><button type="button" class="link id-link" onclick={() => (selected = r.id)}>{r.id}</button></td>
              <td>
                <span class="risk-title">{r.title}</span>
                {#if r.assets.length}<span class="meta block">{r.assets.join(', ')}</span>{/if}
                {#if missing.length}<span class="missing-tag">Saknar {missing.join(', ')}</span>{/if}
              </td>
              <td>{r.owner || '–'}</td>
              <td>{r.before?.consequence ?? '–'}</td>
              <td>{r.before?.likelihood ?? '–'}</td>
              <td><LevelBadge score={r.before} showLabel={false} /></td>
              <td>{TREATMENT_LABELS[r.treatment]}</td>
              <td>{r.controls.length}</td>
              <td class="residual">
                {#if planned && actual}
                  <LevelBadge score={planned} showLabel={false} />
                  {#if warn.length}<span class="warn-up" title={warn.join(', ')}>▲ Faktisk {riskValue(actual)} — {warn.join(', ')}</span>{/if}
                {:else}–{/if}
              </td>
              <td class="appr-{appr}">{APPROVAL[appr]}</td>
            </tr>
          {:else}
            <tr><td colspan="10" class="meta">{project.risks.length ? 'Inga risker matchar filtret.' : 'Registret är tomt. Lägg till en risk eller importera typrisker.'}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
  </section>

  <ImportTemplatesDialog open={importing} onclose={() => (importing = false)} ondone={(n) => ((importing = false), (messages = n ? [`${n} typrisker importerades.`] : []))} />
{/if}
