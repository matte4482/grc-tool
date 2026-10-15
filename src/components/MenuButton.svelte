<script lang="ts">
  // Knapp som öppnar en lista med val, t.ex. "Lägg till i …" eller ny konsekvenstyp. Stängs vid val, Esc eller klick utanför.

  let {
    label,
    items,
    onselect,
    ariaLabel = label,
    variant = 'button',
  }: {
    label: string
    items: { id: string; label: string; hint?: string; disabled?: boolean }[]
    onselect: (id: string) => void
    ariaLabel?: string
    variant?: 'button' | 'link'
  } = $props()

  let open = $state(false)
  let root = $state<HTMLElement>()

  function choose(id: string) {
    open = false
    onselect(id)
  }

  function outside(e: MouseEvent) {
    if (open && root && !root.contains(e.target as Node)) open = false
  }
</script>

<svelte:window onclick={outside} onkeydown={(e) => e.key === 'Escape' && (open = false)} />

<div class="menu" bind:this={root}>
  <button type="button" class={variant === 'link' ? 'link' : 'menu-toggle'} aria-haspopup="menu" aria-expanded={open} aria-label={ariaLabel} onclick={() => (open = !open)}>
    {label}
  </button>
  {#if open}
    <ul class="menu-list" role="menu">
      {#each items as item (item.id)}
        <li role="none">
          <button type="button" role="menuitem" disabled={item.disabled} onclick={() => choose(item.id)}>
            <span>{item.label}</span>
            {#if item.hint}<span class="meta">{item.hint}</span>{/if}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
