<script lang="ts">
  import { percent } from '../lib/compliance'

  // Stapel delad i uppfylld, delvis och ej uppfylld, av alla tillämpliga.
  let {
    applicable,
    assessed,
    fulfilled,
    partial,
    notFulfilled,
  }: { applicable: number; assessed: number; fulfilled?: number; partial?: number; notFulfilled?: number } = $props()

  // Poster sparade före statusfälten fanns visar bara andelen bedömda.
  const hasStatus = $derived(fulfilled !== undefined)
  const w = (n = 0) => `${(100 * n) / Math.max(applicable, 1)}%`
</script>

<div
  class="status-bar"
  role="img"
  aria-label={hasStatus
    ? `${fulfilled} uppfyllda, ${partial} delvis, ${notFulfilled} ej uppfyllda av ${applicable}`
    : `${assessed} av ${applicable} bedömda, ${percent(assessed, applicable)} %`}
>
  {#if hasStatus}
    <span class="ok" style:width={w(fulfilled)}></span>
    <span class="partial" style:width={w(partial)}></span>
    <span class="no" style:width={w(notFulfilled)}></span>
  {:else}
    <span class="assessed" style:width={w(assessed)}></span>
  {/if}
</div>
