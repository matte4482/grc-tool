<script lang="ts">
  import StatusBar from '../components/StatusBar.svelte'
  import { attention, soaSummary, type Attention } from '../lib/assessment'
  import { assessmentProgress, groupProgress, percent, sectionProgress } from '../lib/compliance'
  import { store } from '../lib/project/store.svelte'
  import { riskSummary } from '../lib/risk/rules'
  import { allEvidence } from '../lib/evidence/evidence'
  import { checkEvidence, type EvidenceState } from '../lib/storage/evidence-files'

  // Översikt: uppfyllnadsgrad, fördelning per status och det som behöver uppmärksamhet (README 4.3).
  let { go }: { go: (tab: string, attention?: Attention) => void } = $props()

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const total = $derived(assessmentProgress(project, framework))
  const sections = $derived(sectionProgress(project, framework))
  const themes = $derived(framework.sections.filter((s) => s.soa).flatMap((s) => groupProgress(project, s)))
  const soa = $derived(soaSummary(project, framework))
  const risks = $derived(riskSummary(project))
  const todo = $derived(framework.sections.map((s) => ({ section: s, ...attention(project, s) })))

  const distribution = $derived([
    { label: 'Uppfylld', value: total.fulfilled, cls: 'ok' },
    { label: 'Delvis uppfylld', value: total.partial, cls: 'partial' },
    { label: 'Ej uppfylld', value: total.notFulfilled, cls: 'no' },
    { label: 'Ej bedömd', value: total.applicable - total.assessed, cls: 'none' },
    { label: 'Ej tillämplig', value: total.total - total.applicable, cls: 'excluded' },
  ])

  // Kontroll av alla bifogade filer (B-31). Kräver mappåtkomst.
  const evidence = $derived(allEvidence(project))
  let checked = $state<{ owner: string; file: string; state: EvidenceState }[] | null>(null)
  let checking = $state(false)

  async function checkAll() {
    const dir = store.target?.dir
    if (!dir) return
    checking = true
    const result = []
    for (const { owner, evidence: ev } of evidence) result.push({ owner: owner.id, file: ev.file, state: await checkEvidence(dir, ev) })
    checked = result.filter((r) => r.state !== 'ok')
    checking = false
  }

  function rename(value: string) {
    store.update((d) => {
      d.client.name = value
    })
  }
</script>

<div class="overview">
  <section class="card kpi-main">
    <div class="field-label">Uppfyllnadsgrad</div>
    <div class="big-pct">{percent(total.fulfilled, total.applicable)} %</div>
    <p class="meta">{total.fulfilled} av {total.applicable} tillämpliga uppfyllda · {total.assessed} bedömda</p>
    <div class="dist-bar" role="img" aria-label={distribution.map((d) => `${d.label} ${d.value}`).join(', ')}>
      {#each distribution as d (d.label)}<span class={d.cls} style:width="{(100 * d.value) / Math.max(total.total, 1)}%"></span>{/each}
    </div>
    <ul class="legend">
      {#each distribution as d (d.label)}<li><span class="dot {d.cls}"></span>{d.label} <strong>{d.value}</strong></li>{/each}
    </ul>
  </section>

  <section class="card">
    <h2>Per avsnitt</h2>
    <ul class="progress-list">
      {#each sections as s (s.id)}
        <li>
          <button type="button" class="group-link" onclick={() => go(s.id)}>
            <span>{s.title}</span><span class="meta">{percent(s.fulfilled, s.applicable)} % uppfyllda</span>
          </button>
          <StatusBar applicable={s.applicable} assessed={s.assessed} fulfilled={s.fulfilled} partial={s.partial} notFulfilled={s.notFulfilled} />
        </li>
      {/each}
    </ul>
    {#if themes.length}
      <h3 class="sub">Per tema</h3>
      <ul class="progress-list">
        {#each themes as t (t.id)}
          <li>
            <div class="group-link static"><span><strong>{t.id}</strong> {t.title}</span><span class="meta">{percent(t.fulfilled, t.applicable)} %</span></div>
            <StatusBar applicable={t.applicable} assessed={t.assessed} fulfilled={t.fulfilled} partial={t.partial} notFulfilled={t.notFulfilled} />
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section class="card">
    <div class="card-head">
      <h2>Risker</h2>
      <button type="button" class="link muted" onclick={() => go('risks')}>Riskregister →</button>
    </div>
    <ul class="attention">
      <li><span>Risker i registret</span><span>{risks.total}</span></li>
      <li><span>Över acceptansnivå</span><span>{risks.aboveThreshold}</span></li>
      <li><span>Restrisk ej uppnådd</span><span>{risks.residualNotReached}</span></li>
      <li><span>Väntar på godkännande</span><span>{risks.awaitingApproval}</span></li>
    </ul>
  </section>

  <section class="card">
    <h2>Behöver uppmärksamhet</h2>
    <ul class="attention">
      {#each todo as t (t.section.id)}
        <li><button type="button" class="link" onclick={() => go(t.section.id, 'not_assessed')}>{t.section.title}: ej bedömda</button><span>{t.notAssessed}</span></li>
        <li><button type="button" class="link" onclick={() => go(t.section.id, 'no_owner')}>{t.section.title}: saknar ansvarig</button><span>{t.noOwner}</span></li>
        <li><button type="button" class="link" onclick={() => go(t.section.id, 'no_evidence')}>{t.section.title}: saknar evidens</button><span>{t.noEvidence}</span></li>
      {/each}
      <li><button type="button" class="link" onclick={() => go('soa')}>SoA: bortvalda utan motivering</button><span>{soa.missing}</span></li>
    </ul>
    {#if evidence.length && store.target?.dir}
      <p class="meta">
        {evidence.length} bifogade filer.
        <button type="button" class="link" disabled={checking} onclick={checkAll}>{checking ? 'Kontrollerar …' : 'Kontrollera att de finns kvar'}</button>
      </p>
      {#if checked && checked.length === 0}<p class="meta">Alla filer finns kvar och är oförändrade.</p>{/if}
      {#if checked?.length}
        <ul class="attention">
          {#each checked as c (c.owner + c.file)}
            <li><span>{c.owner}: {c.file}</span><span class="badge warn">{c.state === 'missing' ? 'saknas' : 'ändrad'}</span></li>
          {/each}
        </ul>
      {/if}
    {/if}
  </section>

  <section class="card">
    <h2>Projekt</h2>
    <label class="field-label" for="client-name">Kund</label>
    <input id="client-name" class="big-input" value={project.client.name} oninput={(e) => rename(e.currentTarget.value)} />
    <p class="meta">{framework.name} · {store.target?.label ?? ''}</p>
    <p class="meta">
      Ändringar sparas automatiskt var tionde minut{store.target?.autosave ? '' : ' (inte vid nedladdning)'}. Stäng inte fliken med osparade ändringar.
    </p>
  </section>
</div>
