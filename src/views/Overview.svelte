<script lang="ts">
  // Översikt och dashboard: redo för revision, uppfyllnad, risker, åtgärder och det som återstår (README 4.3, fas 6).

  import RiskMatrix from '../components/RiskMatrix.svelte'
  import StatusBar from '../components/StatusBar.svelte'
  import { actionSummary, suggestions } from '../lib/actions'
  import { VERDICT_LABELS, readiness, type ReadinessItem } from '../lib/dashboard'
  import { heatmap, methodOf } from '../lib/risk/rules'
  import { consultantName, setConsultantName } from '../lib/storage/settings'
  import { localDate } from '../lib/ui/format'
  import { printer } from '../lib/ui/print.svelte'
  import { attention, soaSummary } from '../lib/assessment'
  import { assessmentProgress, groupProgress, percent, sectionProgress } from '../lib/compliance'
  import { store } from '../lib/project/store.svelte'
  import { nav } from '../lib/ui/nav.svelte'
  import { riskSummary } from '../lib/risk/rules'
  import { allEvidence } from '../lib/evidence/evidence'
  import { checkEvidence, type EvidenceState } from '../lib/storage/evidence-files'

  const go = nav.go

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const total = $derived(assessmentProgress(project, framework))
  const sections = $derived(sectionProgress(project, framework))
  const themes = $derived(framework.sections.filter((s) => s.soa).flatMap((s) => groupProgress(project, s)))
  const soa = $derived(soaSummary(project, framework))
  const risks = $derived(riskSummary(project))
  const todo = $derived(framework.sections.map((s) => ({ section: s, ...attention(project, s) })))
  const ready = $derived(readiness(project, framework))
  const actions = $derived(actionSummary(project, localDate()))
  const unplanned = $derived(suggestions(project, framework).length)
  const method = $derived(methodOf(project))
  let name = $state(consultantName())
  let profile = $state<'before' | 'actual'>('before')

  /** Fliken som visar det som återstår för en del av "redo för revision". */
  function open(key: ReadinessItem['key']) {
    const first = framework.sections[0]?.id
    const soaSection = framework.sections.find((s) => s.soa)?.id ?? first
    const mandatory = framework.sections.find((s) => !s.soa)?.id ?? first
    const target: Record<ReadinessItem['key'], () => void> = {
      assessed: () => go(todo.find((t) => t.notAssessed > 0)?.section.id ?? first, 'not_assessed'),
      mandatory: () => go(mandatory),
      controls: () => go(soaSection),
      evidence: () => go(todo.find((t) => t.noEvidence > 0)?.section.id ?? first, 'no_evidence'),
      soa: () => go('soa'),
      risks: () => go('risks'),
      actions: () => go('actions'),
    }
    target[key]()
  }

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

  function engagement(field: 'scope' | 'participants' | 'summary', value: string) {
    store.update((d) => {
      d.engagement[field] = value
    })
  }

  function rename(value: string) {
    store.update((d) => {
      d.client.name = value
    })
  }
</script>

<div class="page-actions">
  <button type="button" onclick={() => printer.print('dashboard')}>Skriv ut lägesbild</button>
  <button type="button" onclick={() => go('reports')}>Rapporter →</button>
</div>

<div class="overview">
  <div class="ov-col">
    <section class="card readiness verdict-{ready.verdict}">
      <div class="field-label">Redo för revision</div>
      <div class="big-pct">{ready.pct} %</div>
      <p class="verdict">{VERDICT_LABELS[ready.verdict]}</p>
      <ul class="readiness-list">
        {#each ready.items as i (i.key)}
          <li>
            <button type="button" class="link" onclick={() => open(i.key)}>{i.label}</button>
            <span class="meta">{i.applies ? `${i.done} av ${i.total}` : 'inget att göra'}</span>
            <span class="mini-bar"><span style:width="{i.applies ? i.pct : 0}%"></span></span>
          </li>
        {/each}
      </ul>
    </section>
    <section class="card">
      <div class="card-head">
        <h2>Åtgärder</h2>
        <button type="button" class="link muted" onclick={() => go('actions')}>Åtgärdsplan →</button>
      </div>
      <ul class="attention">
        <li><span>Öppna</span><span>{actions.open}</span></li>
        <li><span>Försenade</span><span class:bad={actions.overdue > 0}>{actions.overdue}</span></li>
        <li><span>Klara</span><span>{actions.done}</span></li>
        <li><span>Brister utan åtgärd</span><span>{unplanned}</span></li>
      </ul>
    </section>
  </div>
  <div class="ov-col">
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
      <div class="card-head">
        <h2>Riskprofil</h2>
        <button type="button" class="link muted" onclick={() => go('risks')}>Riskregister →</button>
      </div>
      <div class="segmented small" role="radiogroup" aria-label="Visa risk">
        {#each [['before', 'Före behandling'], ['actual', 'Faktisk restrisk']] as [v, l] (v)}
          <button type="button" role="radio" aria-checked={profile === v} class:active={profile === v} onclick={() => (profile = v as typeof profile)}>{l}</button>
        {/each}
      </div>
      <RiskMatrix {method} counts={heatmap(project, profile)} />
      <ul class="attention">
        <li><span>Risker i registret</span><span>{risks.total}</span></li>
        <li><span>Över acceptansnivå</span><span>{risks.aboveThreshold}</span></li>
        <li><span>Restrisk ej uppnådd</span><span>{risks.residualNotReached}</span></li>
        <li><span>Väntar på godkännande</span><span>{risks.awaitingApproval}</span></li>
      </ul>
    </section>
  </div>
  <div class="ov-col">
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
      <h2>Behöver uppmärksamhet</h2>
      <ul class="attention">
        {#each todo as t (t.section.id)}
          <li><button type="button" class="link" onclick={() => go(t.section.id, 'not_assessed')}>{t.section.title}: ej bedömda</button><span>{t.notAssessed}</span></li>
          <li><button type="button" class="link" onclick={() => go(t.section.id, 'no_owner')}>{t.section.title}: saknar ansvarig</button><span>{t.noOwner}</span></li>
          <li><button type="button" class="link" onclick={() => go(t.section.id, 'no_evidence')}>{t.section.title}: saknar evidens</button><span>{t.noEvidence}</span></li>
        {/each}
        {#if framework.sections.some((s) => s.soa)}
          <li><button type="button" class="link" onclick={() => go('soa')}>SoA: bortvalda utan motivering</button><span>{soa.missing}</span></li>
        {/if}
      </ul>
      {#if evidence.length && store.target?.dir}
        <p class="meta">
          {evidence.length} bifogade filer.
          <button type="button" class="link" disabled={checking} onclick={checkAll}>{checking ? 'Kontrollerar …' : 'Kontrollera'}</button>
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
  </div>
</div>

<section class="card project-card">
  <h2>Projekt</h2>
  <div class="project-grid">
    <div>
      <label class="field-label" for="client-name">Kund</label>
      <input id="client-name" class="big-input" value={project.client.name} oninput={(e) => rename(e.currentTarget.value)} />
      <p class="meta">{framework.name} · {store.target?.label ?? ''}</p>
      <label class="field-label" for="consultant-name">Ditt namn</label>
      <input id="consultant-name" bind:value={name} onchange={() => setConsultantName(name)} autocomplete="name" />
    </div>
    <div>
      <label class="field-label" for="eng-scope">Omfattning</label>
      <textarea id="eng-scope" placeholder="Verksamhet, platser, system" value={project.engagement.scope} oninput={(e) => engagement('scope', e.currentTarget.value)}></textarea>
      <label class="field-label" for="eng-participants">Deltagare och intervjuade</label>
      <textarea id="eng-participants" value={project.engagement.participants} oninput={(e) => engagement('participants', e.currentTarget.value)}></textarea>
    </div>
  </div>
  <label class="field-label" for="eng-summary">Sammanfattning och slutsats</label>
  <textarea id="eng-summary" class="summary-field" value={project.engagement.summary} oninput={(e) => engagement('summary', e.currentTarget.value)}></textarea>
</section>
