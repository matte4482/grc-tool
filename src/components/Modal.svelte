<script lang="ts">
  import type { Snippet } from 'svelte'

  // Modal ruta med rubrik och innehåll. Stängs med Esc eller onclose.
  let { open, title, onclose, children, wide = false }: { open: boolean; title: string; onclose: () => void; children: Snippet; wide?: boolean } = $props()
  let el = $state<HTMLDialogElement>()

  $effect(() => {
    if (!el) return
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  })
</script>

<dialog bind:this={el} class="dialog modal" class:wide aria-label={title} oncancel={(e) => (e.preventDefault(), onclose())}>
  {#if open}
    <div class="card-head">
      <h2>{title}</h2>
      <button type="button" class="link muted" aria-label="Stäng" onclick={onclose}>Stäng ×</button>
    </div>
    {@render children()}
  {/if}
</dialog>
