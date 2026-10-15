<script lang="ts">
  // Riskdetalj: information, bedömning i tre steg, kopplade kontroller och godkännande (README 4.6).

  import EvidenceList from '../components/EvidenceList.svelte'
  import LevelBadge from '../components/LevelBadge.svelte'
  import LinkedActions from '../components/LinkedActions.svelte'
  import LinkControlDialog from '../components/LinkControlDialog.svelte'
  import Notice from '../components/Notice.svelte'
  import RiskMatrix from '../components/RiskMatrix.svelte'
  import StatusBadge from '../components/StatusBadge.svelte'
  import { answerFor } from '../lib/assessment'
  import { allControls, controlTitles } from '../lib/frameworks/schema'
  import type { RiskControlLink, Treatment } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import {
    TREATMENT_LABELS,
    approve,
    linkControl,
    removeRisk,
    revokeApproval,
    setAssets,
    setBefore,
    setLink,
    setRiskText,
    setTreatment,
    unlinkControl,
    type RiskText,
  } from '../lib/risk/operations'
  import { EFFECT_LABELS, TYPE_LABELS, approvalState, methodOf, nextReview, residualRisk, riskValue, riskWarnings } from '../lib/risk/rules'
  import { dialog } from '../lib/ui/dialog.svelte'
  import { nav } from '../lib/ui/nav.svelte'

  let { riskId, onselect }: { riskId: string; onselect: (id: string | null) => void } = $props()

  const project = $derived(store.project!)
  const method = $derived(methodOf(project))
  const index = $derived(project.risks.findIndex((r) => r.id === riskId))
  const risk = $derived(project.risks[index])
  const planned = $derived(residualRisk(project, risk, 'planned'))
  const actual = $derived(residualRisk(project, risk, 'actual'))
  const warn = $derived(riskWarnings(project, risk))
  const appr = $derived(approvalState(project, risk))
  const above = $derived(actual ? riskValue(actual) > method.acceptanceThreshold : false)
  const controlTitle = $derived(controlTitles(store.framework!))
  const soaControls = $derived(new Set(allControls(store.framework!).filter((x) => x.section.soa).map((x) => x.control.id)))

  let linking = $state(false)
  let messages = $state<string[]>([])
  let approver = $state('')
  let justification = $state('')

  const now = () => new Date().toISOString()
  const text = (field: RiskText, value: string) => store.update((d) => setRiskText(d, riskId, field, value))

  // Påbörjad bedömning: sparas först när både konsekvens och sannolikhet är valda.
  let pending = $state({ consequence: 0, likelihood: 0 })
  $effect(() => {
    void riskId
    pending = { consequence: 0, likelihood: 0 }
  })

  function score(part: 'consequence' | 'likelihood', value: string) {
    const next = { ...(risk.before ?? pending), [part]: Number(value) }
    if (next.consequence && next.likelihood) {
      store.update((d) => setBefore(d, riskId, next, now()))
      pending = { consequence: 0, likelihood: 0 }
    } else {
      pending = next
      if (risk.before) store.update((d) => setBefore(d, riskId, undefined, now()))
    }
  }

  function link(l: RiskControlLink) {
    let note: string | undefined
    store.update((d) => (note = linkControl(d, riskId, l, now())))
    messages = note ? [note] : []
  }

  function doApprove() {
    let result = { ok: true } as ReturnType<typeof approve>
    store.update((d) => (result = approve(d, riskId, approver, justification, now())))
    messages = result.ok ? [] : [result.message]
    if (result.ok) justification = ''
  }

  async function remove() {
    const ok = await dialog.ask({
      title: `Ta bort ${riskId}?`,
      message: `"${risk.title}" tas bort ur registret. Kontroller som bara var kopplade till risken låses upp i SoA. ID:t återanvänds inte.`,
      confirm: 'Ta bort risken',
      danger: true,
    })
    if (!ok) return
    const id = riskId
    onselect(null)
    store.update((d) => removeRisk(d, id))
  }

  const fmt = (d?: string) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short', year: 'numeric' }) : '–')
</script>

<div class="detail-head">
  <button type="button" class="link" onclick={() => onselect(null)}>← Riskregister</button>
  <span class="detail-nav">
    <button type="button" disabled={index <= 0} onclick={() => onselect(project.risks[index - 1].id)}>← Föregående</button>
    <span class="meta">{index + 1} av {project.risks.length}</span>
    <button type="button" disabled={index >= project.risks.length - 1} onclick={() => onselect(project.risks[index + 1].id)}>Nästa →</button>
  </span>
</div>

<div class="detail-title">
  <span class="risk-id">{risk.id}</span>
  <input class="title-input" value={risk.title} aria-label="Riskens namn" oninput={(e) => text('title', e.currentTarget.value)} />
  {#if risk.template}<span class="badge">Typrisk {risk.template}</span>{/if}
</div>

<Notice lines={messages} />

<div class="detail-grid">
  <section class="card">
    <h2>Riskinformation</h2>
    <label class="field-label" for="r-desc">Beskrivning</label>
    <textarea id="r-desc" rows="4" value={risk.description} oninput={(e) => text('description', e.currentTarget.value)}></textarea>
    <label class="field-label" for="r-threat">Hot</label>
    <textarea id="r-threat" rows="3" value={risk.threat} oninput={(e) => text('threat', e.currentTarget.value)}></textarea>
    <label class="field-label" for="r-vuln">Sårbarhet</label>
    <textarea id="r-vuln" rows="3" value={risk.vulnerability} oninput={(e) => text('vulnerability', e.currentTarget.value)}></textarea>
    <label class="field-label" for="r-assets">Tillgångar och processer <span>— skilj med komma</span></label>
    <input id="r-assets" value={risk.assets.join(', ')} onchange={(e) => store.update((d) => setAssets(d, riskId, e.currentTarget.value.split(',')))} />
    <div class="two">
      <div>
        <label class="field-label" for="r-owner">Riskägare</label>
        <input id="r-owner" value={risk.owner} oninput={(e) => text('owner', e.currentTarget.value)} />
      </div>
      <div>
        <label class="field-label" for="r-treat">Behandling</label>
        <select id="r-treat" value={risk.treatment} onchange={(e) => store.update((d) => setTreatment(d, riskId, e.currentTarget.value as Treatment, now()))}>
          {#each Object.entries(TREATMENT_LABELS) as [v, l] (v)}<option value={v}>{l}</option>{/each}
        </select>
      </div>
    </div>
    <label class="field-label" for="r-plan">Behandlingsplan</label>
    <textarea id="r-plan" rows="3" value={risk.treatmentPlan} oninput={(e) => text('treatmentPlan', e.currentTarget.value)}></textarea>
    <p class="meta dates">
      Identifierad {fmt(risk.identifiedAt)} · senast bedömd {fmt(risk.lastAssessedAt)} · nästa bedömning {fmt(nextReview(project, risk))}
    </p>
  </section>

  <section class="card">
    <h2>Bedömning</h2>
    <div class="two">
      <div>
        <label class="field-label" for="r-k">Konsekvens</label>
        <select id="r-k" value={String(risk.before?.consequence ?? (pending.consequence || ''))} onchange={(e) => score('consequence', e.currentTarget.value)}>
          <option value="">Ej bedömd</option>
          {#each method.consequence.levels as l (l.level)}<option value={String(l.level)}>{l.level} {l.name}</option>{/each}
        </select>
      </div>
      <div>
        <label class="field-label" for="r-s">Sannolikhet</label>
        <select id="r-s" value={String(risk.before?.likelihood ?? (pending.likelihood || ''))} onchange={(e) => score('likelihood', e.currentTarget.value)}>
          <option value="">Ej bedömd</option>
          {#each method.likelihood.levels as l (l.level)}<option value={String(l.level)}>{l.level} {l.name}</option>{/each}
        </select>
      </div>
    </div>
    <RiskMatrix
      {method}
      markers={[
        ...(risk.before ? [{ score: risk.before, label: 'Före behandling', kind: 'before' as const }] : []),
        ...(planned ? [{ score: planned, label: 'Planerad restrisk', kind: 'planned' as const }] : []),
        ...(actual ? [{ score: actual, label: 'Faktisk restrisk', kind: 'actual' as const }] : []),
      ]}
    />
    <dl class="steps">
      <div><dt>Före behandling</dt><dd><LevelBadge score={risk.before} /></dd></div>
      <div><dt>Planerad restrisk</dt><dd><LevelBadge score={planned} /></dd></div>
      <div><dt>Faktisk restrisk</dt><dd><LevelBadge score={actual} /></dd></div>
    </dl>
    {#if warn.length && actual}<p class="warn-up">▲ Faktisk {riskValue(actual)} — {warn.join(', ')}</p>{/if}
    {#if risk.treatment === 'accept'}<p class="meta">Risken accepteras, så restrisken är risken före behandling.</p>{/if}
  </section>
</div>

<section class="card">
  <div class="card-head">
    <h2>Kopplade kontroller</h2>
    <button type="button" onclick={() => (linking = true)}>+ Koppla kontroll</button>
  </div>
  {#if risk.controls.length}
    <div class="table-scroll">
      <table class="link-table">
        <thead><tr><th scope="col">Kontroll</th><th scope="col">Status</th><th scope="col">SoA</th><th scope="col">Effekt</th><th scope="col">Typ</th><th scope="col"><span class="sr-only">Ta bort</span></th></tr></thead>
        <tbody>
          {#each risk.controls as l (l.control)}
            {@const a = answerFor(project, l.control)}
            <tr>
              <td><button type="button" class="link" onclick={() => nav.show('control', l.control)}>{l.control}</button> {controlTitle.get(l.control) ?? 'Okänd kontroll'}</td>
              <td><StatusBadge status={a.status} /></td>
              <td class="meta">{soaControls.has(l.control) ? 'Låst tillämplig' : '–'}</td>
              <td>
                <select value={l.effect ?? ''} aria-label="Effekt för {l.control}" onchange={(e) => store.update((d) => setLink(d, riskId, l.control, { effect: (e.currentTarget.value || undefined) as RiskControlLink['effect'] }))}>
                  <option value="">Välj</option>
                  {#each Object.entries(EFFECT_LABELS) as [v, t] (v)}<option value={v}>{t}</option>{/each}
                </select>
              </td>
              <td>
                <select value={l.type ?? ''} aria-label="Typ för {l.control}" onchange={(e) => store.update((d) => setLink(d, riskId, l.control, { type: (e.currentTarget.value || undefined) as RiskControlLink['type'] }))}>
                  <option value="">Välj</option>
                  {#each Object.entries(TYPE_LABELS) as [v, t] (v)}<option value={v}>{t}</option>{/each}
                </select>
              </td>
              <td><button type="button" class="link muted" aria-label="Ta bort koppling till {l.control}" onclick={() => store.update((d) => unlinkControl(d, riskId, l.control, now()))}>Ta bort</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <p class="meta">Inga kontroller kopplade. Utan kopplingar blir restrisken samma som risken före behandling.</p>
  {/if}
</section>

<section class="card">
  <h2>Åtgärder</h2>
  <LinkedActions kind="risk" id={riskId} />
</section>

<section class="card">
  <h2>Evidens</h2>
  <p class="meta">Underlag för bedömningen, t.ex. anteckningar från riskworkshopen.</p>
  <EvidenceList owner={{ kind: 'risk', id: riskId }} />
</section>

<div class="detail-grid">
  <section class="card">
    <h2>Godkännande av restrisk</h2>
    {#if risk.approval}
      <p>
        Godkänd av <strong>{risk.approval.by}</strong> {fmt(risk.approval.at)}{risk.approval.residual ? `, restrisk ${risk.approval.residual}` : ''}.
      </p>
      {#if risk.approval.aboveThreshold}<p class="meta">Accepterad över acceptansnivån: {risk.approval.justification}</p>{/if}
      {#if appr === 'stale'}<p class="warn-up">Restrisken har ändrats sedan godkännandet ({actual ? riskValue(actual) : '–'} nu). Godkänn på nytt.</p>{/if}
      <button type="button" class="link muted" onclick={() => store.update((d) => revokeApproval(d, riskId, now()))}>Ta bort godkännande</button>
    {/if}
    {#if !risk.approval || appr === 'stale'}
      <label class="field-label" for="r-approver">Riskägare som godkänner</label>
      <input id="r-approver" placeholder={risk.owner || 'Namn och roll'} bind:value={approver} />
      {#if above}
        <label class="field-label" for="r-why">Motivering <span>— restrisken är över acceptansnivån ({method.acceptanceThreshold})</span></label>
        <textarea id="r-why" rows="2" bind:value={justification}></textarea>
      {/if}
      <button type="button" class="primary approve" disabled={!actual} onclick={() => ((approver ||= risk.owner), doApprove())}>
        {above ? 'Acceptera högre risk' : 'Godkänn restrisk'}
      </button>
      {#if !actual}<p class="meta">Bedöm risken först.</p>{/if}
    {/if}
  </section>

  <section class="card">
    <h2>Historik</h2>
    <ul class="history">
      {#each [...risk.history].reverse() as h, i (i)}
        <li><span class="meta">{new Date(h.at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span> {h.text}{h.by ? ` (${h.by})` : ''}</li>
      {:else}
        <li class="meta">Ingen historik.</li>
      {/each}
    </ul>
  </section>
</div>

<div class="danger-zone">
  <button type="button" class="danger" onclick={remove}>Ta bort risken</button>
</div>

<LinkControlDialog open={linking} {riskId} onclose={() => (linking = false)} onlink={(l) => link(l)} />
