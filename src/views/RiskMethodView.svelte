<script lang="ts">
  // Riskmetod: skalor, matris, acceptansnivå och fastställande (README 4.4).

  import MenuButton from '../components/MenuButton.svelte'
  import RiskMatrix from '../components/RiskMatrix.svelte'
  import type { RiskMethod } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { addConsequenceType, editMethod, removeConsequenceType } from '../lib/risk/operations'
  import { CONSEQUENCE_CATEGORIES, defaultRiskMethod, methodOf } from '../lib/risk/rules'
  import { dialog } from '../lib/ui/dialog.svelte'
  import { localDate, shortDate } from '../lib/ui/format'

  const method = $derived(methodOf(store.project!))
  const isDefault = $derived(!store.project!.riskMethod)

  const edit = (change: (m: RiskMethod) => void) => store.update((d) => editMethod(d, change))
  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))

  // Fastställandet visas som text när det är klart, och som fält när det ändras.
  let editing = $state(!methodOf(store.project!).approvedBy.trim())
  let message = $state('')

  /** Klar: kräver vem som fastställt metoden och sätter dagens datum om det saknas. */
  function done() {
    if (!method.approvedBy.trim()) return void (message = 'Ange vem som har fastställt metoden.')
    if (!method.approvedAt) edit((m) => (m.approvedAt = localDate()))
    message = ''
    editing = false
  }

  async function reset() {
    const ok = await dialog.ask({
      title: 'Återställ standard?',
      message: 'Skalorna, acceptansnivån och intervallet får standardvärdena. Fastställandet tas bort.',
      confirm: 'Återställ standard',
      danger: true,
    })
    if (ok) {
      store.update((d) => (d.riskMethod = defaultRiskMethod()))
      editing = true
    }
  }

  async function removeType(i: number) {
    const ok = await dialog.ask({
      title: 'Ta bort konsekvenstyp?',
      message: `"${method.consequence.types[i]}" och dess beskrivningar tas bort.`,
      confirm: 'Ta bort',
      danger: true,
    })
    if (ok) edit((m) => removeConsequenceType(m, i))
  }
</script>

{#if isDefault}<p class="meta lead">Standardmetoden används.</p>{/if}

<section class="card">
  <div class="card-head">
    <h2>Konsekvensskala</h2>
    <button type="button" class="link muted" onclick={reset}>Återställ standard</button>
  </div>
  <div class="table-scroll">
    <table class="method-table">
      <thead>
        <tr>
          <th scope="col">Nivå</th>
          <th scope="col">Namn</th>
          {#each method.consequence.types as type, i (i)}
            <th scope="col">
              <span class="type-head">
                <input class="cell-input head" value={type} aria-label="Konsekvenstyp {i + 1}" oninput={(e) => edit((m) => (m.consequence.types[i] = e.currentTarget.value))} />
                {#if method.consequence.types.length > 1}
                  <button type="button" class="link muted" aria-label="Ta bort {type}" onclick={() => removeType(i)}>×</button>
                {/if}
              </span>
            </th>
          {/each}
        </tr>
      </thead>
      <tbody>
        {#each method.consequence.levels as l, li (l.level)}
          <tr>
            <td class="lvl">{l.level}</td>
            <td><input class="cell-input" value={l.name} aria-label="Namn nivå {l.level}" oninput={(e) => edit((m) => (m.consequence.levels[li].name = e.currentTarget.value))} /></td>
            {#each l.descriptions as d, di (di)}
              <td>
                <input
                  class="cell-input"
                  value={d}
                  aria-label="{method.consequence.types[di]}, nivå {l.level}"
                  oninput={(e) => edit((m) => (m.consequence.levels[li].descriptions[di] = e.currentTarget.value))}
                />
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <div class="method-actions">
    <MenuButton
      label="+ Lägg till konsekvenstyp"
      items={[
        ...CONSEQUENCE_CATEGORIES.map((c) => ({ id: c, label: c, disabled: method.consequence.types.includes(c) })),
        { id: '', label: 'Egen typ …', hint: 'Skriv namnet i kolumnrubriken' },
      ]}
      onselect={(name) => edit((m) => addConsequenceType(m, name || 'Ny konsekvenstyp'))}
    />
  </div>
</section>

<section class="card">
  <h2>Sannolikhetsskala</h2>
  <div class="table-scroll">
    <table class="method-table">
      <thead>
        <tr><th scope="col">Nivå</th><th scope="col">Namn</th><th scope="col">Frekvens</th><th scope="col">Tolkning</th></tr>
      </thead>
      <tbody>
        {#each method.likelihood.levels as l, li (l.level)}
          <tr>
            <td class="lvl">{l.level}</td>
            <td><input class="cell-input" value={l.name} aria-label="Sannolikhet nivå {l.level}" oninput={(e) => edit((m) => (m.likelihood.levels[li].name = e.currentTarget.value))} /></td>
            <td><input class="cell-input" value={l.frequency} aria-label="Frekvens nivå {l.level}" oninput={(e) => edit((m) => (m.likelihood.levels[li].frequency = e.currentTarget.value))} /></td>
            <td><input class="cell-input" value={l.interpretation} aria-label="Tolkning nivå {l.level}" oninput={(e) => edit((m) => (m.likelihood.levels[li].interpretation = e.currentTarget.value))} /></td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<div class="method-grid">
  <section class="card">
    <h2>Riskmatris</h2>
    <RiskMatrix {method} />
    <ul class="legend">
      <li><span class="dot lv-low"></span>Låg 1–3</li>
      <li><span class="dot lv-medium"></span>Medel 4–6</li>
      <li><span class="dot lv-high"></span>Hög 8–12</li>
      <li><span class="dot lv-very_high"></span>Mycket hög 15–25</li>
    </ul>
  </section>

  <section class="card">
    <h2>Acceptans och fastställande</h2>
    {#if editing}
      <label class="field-label" for="threshold">Acceptansnivå</label>
      <div class="inline-field">
        <input id="threshold" type="number" min="1" max="25" value={method.acceptanceThreshold} onchange={(e) => edit((m) => (m.acceptanceThreshold = num(e.currentTarget.value, 1, 25)))} />
        <span class="meta">Acceptabelt till och med {method.acceptanceThreshold}</span>
      </div>
      <label class="field-label" for="interval">Ny bedömning</label>
      <div class="inline-field">
        <input id="interval" type="number" min="1" max="60" value={method.reviewIntervalMonths} onchange={(e) => edit((m) => (m.reviewIntervalMonths = num(e.currentTarget.value, 1, 60)))} />
        <span class="meta">månader, och vid väsentlig förändring.</span>
      </div>
      <div class="two">
        <div>
          <label class="field-label" for="approved-by">Fastställd av</label>
          <input id="approved-by" placeholder="Namn och roll" value={method.approvedBy} oninput={(e) => edit((m) => (m.approvedBy = e.currentTarget.value))} />
        </div>
        <div>
          <label class="field-label" for="approved-at">Datum</label>
          <input id="approved-at" type="date" value={method.approvedAt ?? ''} onchange={(e) => edit((m) => (m.approvedAt = e.currentTarget.value || undefined))} />
        </div>
      </div>
      {#if message}<p class="warn-up">{message}</p>{/if}
      <div class="method-actions">
        <button type="button" class="primary" onclick={done}>Klar</button>
      </div>
    {:else}
      <dl class="approved">
        <dt>Acceptansnivå</dt><dd>Riskvärde {method.acceptanceThreshold}</dd>
        <dt>Ny bedömning</dt><dd>Var {method.reviewIntervalMonths}:e månad och vid väsentlig förändring.</dd>
        <dt>Fastställd av</dt><dd>{method.approvedBy}{method.approvedAt ? `, ${shortDate(method.approvedAt)}` : ''}</dd>
      </dl>
      <button type="button" class="link muted" onclick={() => (editing = true)}>Ändra</button>
    {/if}
  </section>
</div>
