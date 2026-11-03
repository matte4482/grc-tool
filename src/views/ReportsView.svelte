<script lang="ts">
  // Rapporter: förhandsvisning, utskrift (PDF), Word och export till Excel (README 4.10, B-39).

  import ReportBody from '../components/reports/ReportBody.svelte'
  import { actionRows, controlRows, riskRows, toCsv } from '../lib/report/csv'
  import { store } from '../lib/project/store.svelte'
  import { downloadFile } from '../lib/storage/download'
  import { PROJECT_EXTENSION, projectFileName } from '../lib/storage/target'
  import { comparison } from '../lib/ui/comparison.svelte'
  import { localDate } from '../lib/ui/format'
  import { printer, reportTitle, type ReportId } from '../lib/ui/print.svelte'

  const risks = $derived(store.framework!.riskManagement)
  const REPORTS: { id: ReportId; text: string }[] = $derived([
    { id: 'full', text: 'Alla delar' },
    { id: 'dashboard', text: 'En sida' },
    { id: 'gap', text: 'Brister, krav och kontroller' },
    { id: 'soa', text: '6.1.3 d' },
    { id: 'plan', text: risks ? '6.1.3 e–f' : 'Alla åtgärder' },
    { id: 'progress', text: 'Kräver jämförelse' },
  ])

  let selected = $state<ReportId>('full')
  const hasSoa = $derived(store.framework!.sections.some((s) => s.soa))
  const shown = $derived(REPORTS.filter((r) => r.id !== 'soa' || hasSoa))
  const base = $derived(`${projectFileName(store.project!.client.name).replace(PROJECT_EXTENSION, '')}-${localDate()}`)
  const csv = (name: string, rows: (string | number)[][]) => downloadFile(`${base}-${name}.csv`, toCsv(rows), 'text/csv;charset=utf-8')
</script>

<div class="reports-layout">
  <aside class="card reports-side">
    <h2>Rapporter</h2>
    <ul class="report-list">
      {#each shown as r (r.id)}
        <li>
          <label class:selected={selected === r.id}>
            <input type="radio" name="report" value={r.id} bind:group={selected} disabled={(r.id === 'progress' && !comparison.previous) || (r.id === 'soa' && !hasSoa)} />
            <span><strong>{reportTitle(r.id)}</strong><span class="meta block">{r.text}</span></span>
          </label>
        </li>
      {/each}
    </ul>
    <button type="button" class="primary" onclick={() => printer.print(selected)}>Skriv ut eller spara som PDF</button>
    <button type="button" onclick={() => printer.word(selected, `${base}-${selected}.doc`)}>Ladda ned för Word</button>

    <h3 class="sub">Exportera till Excel</h3>
    <button type="button" onclick={() => csv('kontroller', controlRows(store.project!, store.framework!))}>Krav och kontroller</button>
    {#if risks}<button type="button" onclick={() => csv('risker', riskRows(store.project!))}>Risker</button>{/if}
    <button type="button" onclick={() => csv('atgarder', actionRows(store.project!))}>Åtgärder</button>
  </aside>

  <section class="report-preview" aria-label="Förhandsvisning">
    <ReportBody id={selected} />
  </section>
</div>
