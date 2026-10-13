<script lang="ts">
  import { dialog } from '../lib/ui/dialog.svelte'

  // Visar dialogen från lib/ui/dialog.svelte.ts. Läggs en gång i App.
  let el = $state<HTMLDialogElement>()

  $effect(() => {
    if (!el) return
    if (dialog.current && !el.open) el.showModal()
    if (!dialog.current && el.open) el.close()
  })
</script>

<dialog bind:this={el} class="dialog" aria-labelledby="dialog-title" oncancel={() => dialog.answer(null)}>
  {#if dialog.current}
    <h2 id="dialog-title">{dialog.current.title}</h2>
    <p>{dialog.current.message}</p>
    <div class="dialog-actions">
      <button type="button" onclick={() => dialog.answer(false)}>{dialog.current.cancel ?? 'Avbryt'}</button>
      <button type="button" class={dialog.current.danger ? 'danger' : 'primary'} onclick={() => dialog.answer(true)}>
        {dialog.current.confirm}
      </button>
    </div>
  {/if}
</dialog>
