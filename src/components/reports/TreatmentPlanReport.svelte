<script lang="ts">
  // Riskbehandlingsplan (krav 6.1.3 e–f) med riskmetoden som bilaga.

  import { ACTION_STATUS_LABELS, treatmentPlan } from '../../lib/actions'
  import { store } from '../../lib/project/store.svelte'
  import { TREATMENT_LABELS } from '../../lib/risk/operations'
  import { methodOf } from '../../lib/risk/rules'
  import { shortDate } from '../../lib/ui/format'
  import RiskMethodAppendix from './RiskMethodAppendix.svelte'

  const project = $derived(store.project!)
  const rows = $derived(treatmentPlan(project))
  const method = $derived(methodOf(project))
</script>

<h2>Riskbehandlingsplan</h2>
<p>
  Acceptansnivå: riskvärde {method.acceptanceThreshold}. Riskvärde = konsekvens × sannolikhet (1–25). Planerad restrisk räknar med att
  kopplade kontroller är uppfyllda; faktisk restrisk utgår från deras status i dag. Metoden beskrivs i bilagan.
</p>

{#each rows as row (row.risk.id)}
  <div class="section">
    <h3>{row.risk.id} {row.risk.title}</h3>
    <table>
      <tbody>
        <tr><th style="width:22%">Riskägare</th><td>{row.risk.owner || '–'}</td><th style="width:22%">Behandling</th><td>{TREATMENT_LABELS[row.risk.treatment]}</td></tr>
        <tr><th>Före behandling</th><td>{row.before}</td><th>Restrisk planerad / faktisk</th><td>{row.planned ?? '–'} / {row.actual ?? '–'}</td></tr>
        <tr><th>Kontroller</th><td colspan="3">{row.risk.controls.map((l) => l.control).join(', ') || '–'}</td></tr>
        {#if row.risk.treatmentPlan}<tr><th>Plan</th><td colspan="3">{row.risk.treatmentPlan}</td></tr>{/if}
        <tr>
          <th>Godkänd restrisk</th>
          <td colspan="3">
            {#if row.risk.approval}{row.risk.approval.by}, {row.risk.approval.at}{row.risk.approval.aboveThreshold ? ` (över acceptansnivån: ${row.risk.approval.justification})` : ''}{:else}Ej godkänd{/if}
          </td>
        </tr>
      </tbody>
    </table>
    {#if row.actions.length}
      <table>
        <thead><tr><th>Åtgärd</th><th style="width:20%">Ansvarig</th><th style="width:14%">Deadline</th><th style="width:12%">Status</th></tr></thead>
        <tbody>
          {#each row.actions as a (a.id)}
            <tr><td>{a.id} {a.title}</td><td>{a.owner || '–'}</td><td>{a.due ? shortDate(a.due) : '–'}</td><td>{ACTION_STATUS_LABELS[a.status]}</td></tr>
          {/each}
        </tbody>
      </table>
    {:else if row.risk.treatment !== 'accept'}
      <p class="muted">Inga åtgärder.</p>
    {/if}
  </div>
{:else}
  <p class="muted">Inga bedömda risker.</p>
{/each}

<RiskMethodAppendix />
