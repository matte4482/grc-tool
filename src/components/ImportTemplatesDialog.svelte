<script lang="ts">
  import { store } from '../lib/project/store.svelte'
  import { addTemplateRisks, templatesFor, unusedTemplates } from '../lib/risk/templates'
  import Modal from './Modal.svelte'

  // Importera typrisker som inte redan finns i registret (README 4.5).
  let { open, onclose, ondone }: { open: boolean; onclose: () => void; ondone: (count: number) => void } = $props()

  const set = $derived(templatesFor(store.framework!))
  const available = $derived(set ? unusedTemplates(store.project!, set) : [])
  let chosen = $state<Record<string, boolean>>({})
  const picked = $derived(available.filter((t) => chosen[t.id] ?? true))

  function run() {
    const list = picked
    store.update((d) => void addTemplateRisks(d, list, new Date().toLocaleDateString('sv-SE')))
    chosen = {}
    ondone(list.length)
  }
</script>

<Modal {open} title="Importera typrisker" {onclose} wide>
  {#if available.length}
    <ul class="pick-list">
      {#each available as t (t.id)}
        <li>
          <label class="check">
            <input type="checkbox" checked={chosen[t.id] ?? true} onchange={(e) => (chosen[t.id] = e.currentTarget.checked)} />
            <span><strong>{t.title}</strong><span class="meta block">{t.description}</span></span>
          </label>
          <span class="meta">{t.controls.length} kontroller</span>
        </li>
      {/each}
    </ul>
    <div class="dialog-actions">
      <button type="button" onclick={onclose}>Avbryt</button>
      <button type="button" class="primary" disabled={!picked.length} onclick={run}>Importera {picked.length}</button>
    </div>
  {:else}
    <p class="meta">Alla typrisker finns redan i registret.</p>
  {/if}
</Modal>
