<script lang="ts">
  // Lägesbild på en sida: redo för revision, uppfyllnad, risker och åtgärder (fas 6).

  import { actionSummary } from '../../lib/actions'
  import { soaSummary, totalAttention } from '../../lib/assessment'
  import { assessmentProgress, groupProgress, percent, sectionProgress } from '../../lib/compliance'
  import { VERDICT_LABELS, readiness } from '../../lib/dashboard'
  import { store } from '../../lib/project/store.svelte'
  import { heatmap, riskSummary } from '../../lib/risk/rules'
  import { localDate } from '../../lib/ui/format'
  import MatrixTable from './MatrixTable.svelte'

  let { showSummary = false }: { showSummary?: boolean } = $props()
  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const ready = $derived(readiness(project, framework))
  const total = $derived(assessmentProgress(project, framework))
  const sections = $derived(sectionProgress(project, framework))
  const themes = $derived(framework.sections.filter((s) => s.soa).flatMap((s) => groupProgress(project, s)))
  const risks = $derived(riskSummary(project))
  const actions = $derived(actionSummary(project, localDate()))
  const soa = $derived(soaSummary(project, framework))
  const todo = $derived(totalAttention(project, framework))
  const w = (n: number, of: number) => `${of ? (100 * n) / of : 0}%`
</script>

<h2>Lägesbild</h2>
{#if showSummary && project.engagement.summary}<p>{project.engagement.summary}</p>{/if}
<div class="kpis">
  <div class="kpi"><b>{percent(total.fulfilled, total.applicable)} %</b>uppfyllda av {total.applicable} tillämpliga</div>
  <div class="kpi"><b>{ready.pct} %</b>redo för revision · {VERDICT_LABELS[ready.verdict].toLowerCase()}</div>
  <div class="kpi"><b>{risks.aboveThreshold}</b>risker över acceptansnivån</div>
  <div class="kpi"><b>{actions.open}</b>öppna åtgärder, {actions.overdue} försenade</div>
</div>

<div class="two-col">
  <div>
    <h3>Redo för revision</h3>
    <table>
      <tbody>
        {#each ready.items as i (i.key)}<tr><td>{i.label}</td><td class="num">{i.applies ? `${i.done} av ${i.total}` : '–'}</td><td class="num">{i.applies ? `${i.pct} %` : '–'}</td></tr>{/each}
      </tbody>
    </table>
  </div>
  <div>
    <h3>Uppfyllnad per avsnitt</h3>
    <table>
      <thead><tr><th>Avsnitt</th><th class="num">Uppfyllda</th><th class="num">Delvis</th><th class="num">Ej</th><th class="num">Ej bedömda</th></tr></thead>
      <tbody>
        {#each sections as s (s.id)}
          <tr><td>{s.title}</td><td class="num">{percent(s.fulfilled, s.applicable)} %</td><td class="num">{s.partial}</td><td class="num">{s.notFulfilled}</td><td class="num">{s.applicable - s.assessed}</td></tr>
        {/each}
      </tbody>
    </table>
    {#each themes as t (t.id)}
      <p class="muted">{t.id} {t.title}: {percent(t.fulfilled, t.applicable)} %</p>
      <div class="bar"><span class="ok" style:width={w(t.fulfilled, t.applicable)}></span><span class="partial" style:width={w(t.partial, t.applicable)}></span><span class="no" style:width={w(t.notFulfilled, t.applicable)}></span></div>
    {/each}
  </div>
</div>

<div class="two-col section">
  <div>
    <h3>Riskprofil</h3>
    <div class="two-col">
      <div><MatrixTable counts={heatmap(project, 'before')} caption="Före behandling" /></div>
      <div><MatrixTable counts={heatmap(project, 'actual')} caption="Faktisk restrisk" /></div>
    </div>
  </div>
  <div>
    <h3>Att göra före revision</h3>
    <table>
      <tbody>
        <tr><td>Ej bedömda krav och kontroller</td><td class="num">{todo.notAssessed}</td></tr>
        <tr><td>Uppfyllda utan evidens</td><td class="num">{todo.noEvidence}</td></tr>
        <tr><td>Saknar ansvarig</td><td class="num">{todo.noOwner}</td></tr>
        <tr><td>Risker som väntar på godkännande</td><td class="num">{risks.awaitingApproval}</td></tr>
        {#if framework.sections.some((s) => s.soa)}<tr><td>Bortval i SoA utan motivering</td><td class="num">{soa.missing}</td></tr>{/if}
        <tr><td>Försenade åtgärder</td><td class="num">{actions.overdue}</td></tr>
      </tbody>
    </table>
  </div>
</div>
