<script lang="ts">
  import { answerFor, setPart, setStatus, setText, type AnswerText } from '../lib/assessment'
  import type { Control } from '../lib/frameworks/schema'
  import type { Status } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { residualRisk, riskTextFor } from '../lib/risk/rules'
  import EvidenceList from './EvidenceList.svelte'
  import LevelBadge from './LevelBadge.svelte'
  import StatusBadge from './StatusBadge.svelte'
  import StatusPicker from './StatusPicker.svelte'

  // En rad i Grundkrav eller Annex A, med bedömningen när den är öppnad.
  let {
    control,
    excluded,
    risks,
    open = $bindable(false),
  }: { control: Control; excluded: boolean; risks: { id: string; title: string }[]; open?: boolean } = $props()

  const answer = $derived(answerFor(store.project!, control.id))
  let showParts = $state(false)
  const partsOpen = $derived(showParts || answer.parts !== undefined)
  const now = () => new Date().toISOString()
  const fieldId = (f: string) => `${control.id}-${f}`

  const status = (s: Status | undefined) => s && store.update((d) => setStatus(d, control.id, s, now()))
  const part = (p: 'technical' | 'organizational', s: Status | undefined) => store.update((d) => setPart(d, control.id, p, s, now()))
  const text = (field: AnswerText, value: string) => store.update((d) => setText(d, control.id, field, value, now()))

  function suggest() {
    const extra = riskTextFor(store.project!, control.id)
    if (extra) text('comment', answer.comment.trim() ? `${answer.comment.trim()}\n${extra}` : extra)
  }

  const updated = $derived(
    answer.updated ? new Date(answer.updated.at).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '',
  )
</script>

<li class="control" class:open class:excluded id="ctrl-{control.id}">
  <button type="button" class="control-row" aria-expanded={open} onclick={() => (open = !open)}>
    <span class="control-id">{control.id}</span>
    <span class="control-title">{control.title}</span>
    <span class="control-meta">
      {#if answer.evidence.length}<span class="risk-count">{answer.evidence.length} {answer.evidence.length === 1 ? 'fil' : 'filer'}</span>{/if}
      {#if risks.length}<span class="risk-count" title={risks.map((r) => `${r.id} ${r.title}`).join('\n')}>{risks.length} {risks.length === 1 ? 'risk' : 'risker'}</span>{/if}
      {#if answer.owner}<span class="owner">{answer.owner}</span>{/if}
    </span>
    <StatusBadge status={answer.status} {excluded} />
  </button>

  {#if open}
    <div class="control-body">
      {#if excluded}
        <p class="meta">Kontrollen är bortvald i SoA och bedöms inte. Ändra under fliken SoA.</p>
      {:else}
        <StatusPicker label="Status för {control.id}" value={answer.status} onchange={status} />

        <div class="control-grid">
          <div class="control-fields">
            <label class="field-label" for={fieldId('comment')}>Motivering och observation</label>
            <textarea id={fieldId('comment')} rows="4" value={answer.comment} oninput={(e) => text('comment', e.currentTarget.value)}></textarea>

            <div class="two">
              <div>
                <label class="field-label" for={fieldId('owner')}>Ansvarig</label>
                <input id={fieldId('owner')} value={answer.owner} oninput={(e) => text('owner', e.currentTarget.value)} />
              </div>
              <div>
                <label class="field-label" for={fieldId('evidence')}>Evidens på annan plats</label>
                <input id={fieldId('evidence')} placeholder="T.ex. kundens intranät › Policyer" value={answer.evidenceNote} oninput={(e) => text('evidenceNote', e.currentTarget.value)} />
              </div>
            </div>

            <span class="field-label">Bifogad evidens</span>
            <EvidenceList owner={{ kind: 'control', id: control.id }} />

            {#if partsOpen}
              <div class="parts">
                <span class="field-label">Teknisk del</span>
                <StatusPicker label="Teknisk del för {control.id}" compact allowNone value={answer.parts?.technical} onchange={(s) => part('technical', s)} />
                <span class="field-label">Organisatorisk del</span>
                <StatusPicker label="Organisatorisk del för {control.id}" compact allowNone value={answer.parts?.organizational} onchange={(s) => part('organizational', s)} />
                <p class="meta">Underlag. Den övergripande statusen sätts alltid ovan.</p>
              </div>
            {:else}
              <button type="button" class="link muted" onclick={() => (showParts = true)}>Dela upp i teknisk och organisatorisk del</button>
            {/if}
          </div>

          <aside class="control-aside">
            {#if control.guidance}
              <div class="field-label">Bevisbörda</div>
              <p class="guidance">{control.guidance}</p>
            {/if}
            {#if risks.length}
              <div class="field-label">Kopplade risker</div>
              <ul class="linked">
                {#each risks as r (r.id)}
                  {@const full = store.project!.risks.find((x) => x.id === r.id)}
                  <li><strong>{r.id}</strong> {r.title} {#if full}<LevelBadge score={residualRisk(store.project!, full, 'actual')} showLabel={false} />{/if}</li>
                {/each}
              </ul>
              <button type="button" class="link muted" onclick={suggest}>Föreslå text från risker</button>
            {/if}
          </aside>
        </div>
        {#if updated}<p class="meta updated">Senast uppdaterad {updated}</p>{/if}
      {/if}
    </div>
  {/if}
</li>
