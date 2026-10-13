<script lang="ts">
  import type { RiskMethod } from '../lib/project/schema'
  import { riskLevel, type Score } from '../lib/risk/rules'

  // Riskmatris 5 × 5: sannolikhet uppåt, konsekvens åt höger.
  // Visar antal risker per ruta, eller en risks markeringar (före, planerad, faktisk).
  let {
    method,
    counts,
    markers = [],
    selected,
    onselect,
  }: {
    method: RiskMethod
    counts?: Map<string, number>
    markers?: { score: Score; label: string; kind: 'before' | 'planned' | 'actual' }[]
    selected?: string
    onselect?: (key: string | undefined) => void
  } = $props()

  const levels = [1, 2, 3, 4, 5]
  const STEP = { before: '1', planned: '2', actual: '3' }
  const name = (list: { level: number; name: string }[], l: number) => list.find((x) => x.level === l)?.name ?? String(l)
  const here = (c: number, s: number) => markers.filter((m) => m.score.consequence === c && m.score.likelihood === s)
</script>

<div class="matrix" role="grid" aria-label="Riskmatris">
  <div class="matrix-axis y" aria-hidden="true">Sannolikhet</div>
  <div class="matrix-grid">
    {#each [...levels].reverse() as s (s)}
      <div class="matrix-row" role="row">
        <div class="matrix-label" title={name(method.likelihood.levels, s)}>{s}</div>
        {#each levels as c (c)}
          {@const key = `${c}-${s}`}
          {@const n = counts?.get(key) ?? 0}
          {@const ms = here(c, s)}
          <button
            type="button"
            role="gridcell"
            class="cell lv-{riskLevel(c * s)}"
            class:selected={selected === key}
            class:empty={counts && n === 0}
            disabled={!onselect}
            aria-label="Konsekvens {c}, sannolikhet {s}, värde {c * s}{counts ? `, ${n} risker` : ''}{ms.length ? `, ${ms.map((m) => m.label).join(', ')}` : ''}"
            onclick={() => onselect?.(selected === key ? undefined : key)}
          >
            {#if counts}{n || ''}{:else}
              {#each ms as m (m.kind)}<span class="marker mk-{m.kind}" title={m.label}>{STEP[m.kind]}</span>{/each}
              {#if !ms.length}<span class="cell-value">{c * s}</span>{/if}
            {/if}
          </button>
        {/each}
      </div>
    {/each}
    <div class="matrix-row">
      <div class="matrix-label"></div>
      {#each levels as c (c)}<div class="matrix-label x" title={name(method.consequence.levels, c)}>{c}</div>{/each}
    </div>
  </div>
  <div class="matrix-axis x" aria-hidden="true">Konsekvens</div>
</div>

{#if markers.length}
  <ul class="matrix-legend">
    <li><span class="marker mk-before">1</span> Före behandling</li>
    <li><span class="marker mk-planned">2</span> Planerad restrisk</li>
    <li><span class="marker mk-actual">3</span> Faktisk restrisk</li>
  </ul>
{/if}
