<script lang="ts">
  import RiskMatrix from '../components/RiskMatrix.svelte'
  import type { RiskMethod } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { addConsequenceType, editMethod, removeConsequenceType } from '../lib/risk/operations'
  import { defaultRiskMethod, methodOf } from '../lib/risk/rules'
  import { dialog } from '../lib/ui/dialog.svelte'

  // Riskmetod: skalor, matris, acceptansnivå och fastställande (README 4.4).
  const method = $derived(methodOf(store.project!))
  const isDefault = $derived(!store.project!.riskMethod)

  const edit = (change: (m: RiskMethod) => void) => store.update((d) => editMethod(d, change))
  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Math.round(Number(v) || min)))

  async function reset() {
    const ok = await dialog.ask({
      title: 'Återställ standard?',
      message: 'Skalorna, acceptansnivån och intervallet får standardvärdena. Fastställandet tas bort.',
      confirm: 'Återställ standard',
      danger: true,
    })
    if (ok) store.update((d) => (d.riskMethod = defaultRiskMethod()))
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

<p class="meta lead">
  Riskmetoden är underlag för krav 6.1.2 och 8.2 och skrivs ut som bilaga i rapporten. Klicka i en ruta för att ändra
  texten.{isDefault ? ' Projektet använder standardmetoden tills något ändras.' : ''}
</p>

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
  <button type="button" class="link" onclick={() => edit((m) => addConsequenceType(m, 'Ny konsekvenstyp'))}>+ Lägg till konsekvenstyp</button>
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
    <label class="field-label" for="threshold">Acceptansnivå</label>
    <div class="inline-field">
      <input id="threshold" type="number" min="1" max="25" value={method.acceptanceThreshold} onchange={(e) => edit((m) => (m.acceptanceThreshold = num(e.currentTarget.value, 1, 25)))} />
      <span class="meta">Risker med värde till och med {method.acceptanceThreshold} är acceptabla. Högre kräver behandlingsbeslut och ägare.</span>
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
  </section>
</div>

<section class="card">
  <h2>Så räknas restrisken</h2>
  <p class="meta">
    Varje kontroll som kopplas till en risk får en effektivitet: Låg 0,25, Medel 0,5 eller Hög 0,75. En förebyggande
    kontroll sänker sannolikheten och en begränsande sänker konsekvensen. Flera kontroller på samma sida kombineras som
    lager, 1 − (1 − e₁)(1 − e₂)…, med högst 0,9. Den sänkta nivån avrundas uppåt till närmaste hela nivå, lägst 1.
  </p>
  <p class="meta">
    Planerad restrisk räknar med att alla kopplade kontroller är uppfyllda. Faktisk restrisk räknar effektiviteten gånger
    1 för uppfylld, 0,5 för delvis uppfylld och 0 för ej uppfylld eller ej bedömd. Accepterade risker behandlas inte, så
    deras restrisk är risken före behandling.
  </p>
</section>
