<script lang="ts">
  import { LEVEL_LABELS, riskLevel, riskValue, type Score } from '../lib/risk/rules'

  // Riskvärde med färg efter nivå, t.ex. "16 Mycket hög".
  let { score, showLabel = true }: { score: Score | undefined; showLabel?: boolean } = $props()
  const value = $derived(score ? riskValue(score) : undefined)
</script>

{#if value !== undefined}
  <span class="level lv-{riskLevel(value)}" title="K {score!.consequence} × S {score!.likelihood}">
    {value}{#if showLabel}<span class="level-name">{LEVEL_LABELS[riskLevel(value)]}</span>{/if}
  </span>
{:else}
  <span class="level lv-none">–</span>
{/if}
