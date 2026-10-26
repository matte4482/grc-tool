<script lang="ts">
  // Uppföljning: jämför med en tidigare bedömning och starta nästa (fas 7, B-38).

  import Notice from '../components/Notice.svelte'
  import { STATUS_LABELS } from '../lib/assessment'
  import { CHANGE_LABELS, compareProjects, summaryText, type ControlChange } from '../lib/compare'
  import { followUp, parseProject } from '../lib/project/project'
  import { store } from '../lib/project/store.svelte'
  import { downloadTarget, readSelectedFile } from '../lib/storage/download'
  import { supportsFolderAccess } from '../lib/storage/folder'
  import { projectFileName } from '../lib/storage/target'
  import { prepareFolderTarget } from '../lib/storage/workflow'
  import { comparison } from '../lib/ui/comparison.svelte'
  import { dialog } from '../lib/ui/dialog.svelte'
  import { localDate } from '../lib/ui/format'
  import { nav } from '../lib/ui/nav.svelte'
  import { printer } from '../lib/ui/print.svelte'
  import { Runner } from '../lib/ui/runner.svelte'

  const ui = new Runner()
  let input = $state<HTMLInputElement>()
  let kind = $state<ControlChange | 'changed'>('changed')

  const result = $derived(comparison.previous ? compareProjects(comparison.previous, store.project!, store.framework!, localDate()) : null)
  const c = $derived(result?.ok ? result.comparison : null)
  const list = $derived(c ? c.controls.filter((d) => (kind === 'changed' ? d.change !== 'unchanged' : d.change === kind)) : [])

  function choose(e: Event & { currentTarget: HTMLInputElement }) {
    const el = e.currentTarget
    void ui.run(async () => {
      const file = el.files?.[0]
      el.value = ''
      if (!file) return
      const r = parseProject(await readSelectedFile(file))
      if (!r.ok) return ui.show('Filen kunde inte läsas:', ...r.errors)
      comparison.set(r.project, file.name)
    })
  }

  /** Ny projektfil för nästa bedömning. Den nuvarande blir jämförelsen. */
  function startNext() {
    void ui.run(async () => {
      const current = store.project!
      const ok = await dialog.ask({
        title: 'Starta nästa bedömning?',
        message:
          'En ny projektfil skapas med allt från den här bedömningen: status, kommentarer, SoA, risker, åtgärder och evidens. Godkännanden av restrisk tas bort och görs om. Den här filen ändras inte.',
        confirm: 'Skapa ny bedömning',
      })
      if (!ok) return
      if (store.hasUnsavedChanges) {
        if (store.target?.kind !== 'folder') return ui.show('Spara den här bedömningen först.')
        const saved = await store.save()
        if (!saved.ok) return ui.show(saved.message, ...saved.details)
      }
      const fileName = projectFileName(current.client.name, localDate())
      let target = downloadTarget(fileName)
      if (supportsFolderAccess()) {
        const r = await prepareFolderTarget(fileName)
        if (r.kind === 'cancelled') return
        if (r.kind === 'denied') return ui.show('Verktyget fick inte skriva i mappen.')
        if (r.exists) return ui.show(`Det finns redan en ${fileName} i mappen.`)
        target = r.target
      }
      const previousLabel = store.target?.label ?? ''
      const r = await store.start(followUp(current), target)
      if (!r.ok) return ui.show(r.message, ...r.details)
      comparison.set(current, previousLabel)
    })
  }
</script>

<Notice lines={ui.messages} tone="warn" />

{#if !c}
  <section class="card">
    <h2>Jämför med en tidigare bedömning</h2>
    {#if result && !result.ok}<p class="warn-up">{result.message}</p>{/if}
    <button type="button" class="primary" onclick={() => input?.click()}>Välj tidigare projektfil</button>
  </section>
{:else}
  <div class="page-actions">
    <button type="button" onclick={() => input?.click()}>Byt fil</button>
    <button type="button" onclick={comparison.clear}>Ta bort jämförelsen</button>
    <button type="button" onclick={() => printer.print('progress')}>Skriv ut progressrapport</button>
  </div>
  {#if result?.ok && result.warnings.length}<Notice lines={['Kontrollera filen:', ...result.warnings]} tone="warn" />{/if}

  <section class="card">
    <h2>Sammanfattning</h2>
    <p class="meta">Jämförs med {comparison.fileName}.</p>
    <p class="summary">{summaryText(c)}</p>
    <div class="kpis">
      <div class="card kpi"><span class="kpi-value">{c.before.pct} %</span><span class="meta">uppfyllda förra gången</span></div>
      <div class="card kpi"><span class="kpi-value">{c.after.pct} %</span><span class="meta">uppfyllda nu</span></div>
      <div class="card kpi"><span class="kpi-value">{c.counts.improved}</span><span class="meta">förbättrade</span></div>
      <div class="card kpi" class:warn={c.counts.worsened > 0}><span class="kpi-value">{c.counts.worsened}</span><span class="meta">försämrade</span></div>
    </div>
    <table class="compare-table">
      <thead><tr><th scope="col">Avsnitt</th><th scope="col">Förra</th><th scope="col">Nu</th><th scope="col">Förändring</th></tr></thead>
      <tbody>
        {#each c.sections as s (s.id)}
          <tr>
            <td>{s.title}</td>
            <td>{s.before} %</td>
            <td>{s.after} %</td>
            <td class:up={s.after > s.before} class:down={s.after < s.before}>{s.after - s.before >= 0 ? '+' : ''}{s.after - s.before}</td>
          </tr>
        {/each}
      </tbody>
    </table>
    <p class="meta">
      Risker: {c.risks.added.length} nya, {c.risks.changed.length} med ändrat värde, {c.risks.removed.length} borttagna. Åtgärder: {c.actions.completed.length}
      avslutade, {c.actions.added.length} nya, {c.actions.overdue.length} försenade. SoA: {c.soa.included.length} invalda, {c.soa.excluded.length} bortvalda. Ny
      evidens: {c.evidenceAdded} filer.
    </p>
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Kontroller</h2>
      <select bind:value={kind} aria-label="Visa ändring">
        <option value="changed">Alla ändrade</option>
        {#each Object.entries(CHANGE_LABELS) as [value, label] (value)}<option {value}>{label} ({c.counts[value as ControlChange]})</option>{/each}
      </select>
    </div>
    {#if list.length}
      <table class="compare-table">
        <thead><tr><th scope="col">ID</th><th scope="col">Namn</th><th scope="col">Förra</th><th scope="col">Nu</th></tr></thead>
        <tbody>
          {#each list as d (d.id)}
            <tr>
              <td><button type="button" class="link" onclick={() => nav.show('control', d.id)}>{d.id}</button></td>
              <td>{d.title}</td>
              <td>{STATUS_LABELS[d.before]}</td>
              <td>{STATUS_LABELS[d.after]}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {:else}
      <p class="meta">Inga kontroller i urvalet.</p>
    {/if}
  </section>
{/if}

<section class="card">
  <h2>Starta nästa bedömning</h2>
  <p class="meta">Ny projektfil baserad på den här.</p>
  <button type="button" disabled={ui.busy} onclick={startNext}>Starta nästa bedömning</button>
</section>

<input class="hidden" type="file" accept=".json" bind:this={input} onchange={choose} aria-label="Tidigare projektfil" />
