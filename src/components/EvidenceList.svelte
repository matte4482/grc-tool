<script lang="ts">
  // Bifogade filer för en kontroll eller risk (B-31): lista, öppna, bifoga och ta bort.

  import { untrack } from 'svelte'
  import { addEvidence, evidenceOf, formatSize, ownerFolder, removeEvidence, type EvidenceOwner } from '../lib/evidence/evidence'
  import type { Evidence } from '../lib/project/schema'
  import { store } from '../lib/project/store.svelte'
  import { checkEvidence, prepareEvidence, readEvidenceFile, type EvidenceState } from '../lib/storage/evidence-files'
  import { consultantName, setConsultantName } from '../lib/storage/settings'
  import { dialog } from '../lib/ui/dialog.svelte'
  import { shortDate } from '../lib/ui/format'
  import { Runner } from '../lib/ui/runner.svelte'
  import Notice from './Notice.svelte'

  let { owner }: { owner: EvidenceOwner } = $props()

  const runner = new Runner()
  const list = $derived(evidenceOf(store.project!, owner))
  const dir = $derived(store.target?.dir)
  let name = $state(consultantName())
  // Namnfältet visas tills ett namn har sparats.
  let savedName = $state(consultantName())
  let states = $state<Record<string, EvidenceState>>({})
  let dragging = $state(false)
  let input = $state<HTMLInputElement>()

  const STATE_LABELS: Record<EvidenceState, string> = { ok: '', changed: 'Ändrad sedan den bifogades', missing: 'Saknas i mappen' }
  const baseName = (path: string) => path.split('/').pop() ?? path

  // Kontrollerar filerna när listan visas eller en fil läggs till eller tas bort, inte vid varje ändring.
  const fileKey = $derived(list.map((e) => e.id).join())
  $effect(() => {
    void fileKey
    const d = dir
    const items = untrack(() => list)
    if (!d) return
    for (const ev of items) void checkEvidence(d, ev).then((s) => (states[ev.id] = s))
  })

  function attach(files: FileList | File[] | null | undefined) {
    const chosen = [...(files ?? [])]
    if (!dir || chosen.length === 0) return
    const by = name.trim()
    if (!by) return runner.show('Ange ditt namn innan du bifogar. Det skrivs in som den som bifogade filen.')
    setConsultantName(by)
    savedName = by
    void runner.run(async () => {
      const notes: string[] = []
      for (const file of chosen) {
        const r = await prepareEvidence(dir, store.project!, owner, file, by)
        if (!r.ok) {
          notes.push(r.message)
          continue
        }
        store.update((d) => addEvidence(d, owner, r.evidence, new Date().toISOString()))
        if (r.reused) notes.push(`${file.name} fanns redan i mappen (${r.evidence.file}) och kopierades inte igen.`)
      }
      runner.show(...notes)
    })
  }

  function open(ev: Evidence) {
    if (!dir) return
    void runner.run(async () => {
      const file = await readEvidenceFile(dir, ev.file).catch(() => null)
      if (!file) return runner.show(`${ev.file} finns inte i mappen. Den kan ha flyttats eller tagits bort.`)
      const url = URL.createObjectURL(file)
      // Öppnas i ny flik. Blockeras det laddas filen ned i stället.
      if (!window.open(url, '_blank', 'noopener')) {
        const a = document.createElement('a')
        a.href = url
        a.download = baseName(ev.file)
        a.click()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    })
  }

  async function remove(ev: Evidence) {
    const ok = await dialog.ask({
      title: 'Ta bort bifogad fil?',
      message: `${baseName(ev.file)} tas bort från ${owner.id}. Filen ligger kvar i kundens mapp.`,
      confirm: 'Ta bort',
      danger: true,
    })
    if (ok) store.update((d) => removeEvidence(d, owner, ev.id))
  }

  function drop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    attach(e.dataTransfer?.files)
  }
</script>

<div class="evidence">
  {#if list.length}
    <ul class="evidence-list">
      {#each list as ev (ev.id)}
        {@const state = states[ev.id]}
        <li>
          <button type="button" class="link" title={ev.file} aria-label="Öppna {baseName(ev.file)}" disabled={!dir} onclick={() => open(ev)}>{baseName(ev.file)}</button>
          <span class="meta">{formatSize(ev.size)} · {shortDate(ev.addedAt.slice(0, 10))}{ev.addedBy ? ` · ${ev.addedBy}` : ''}</span>
          {#if ev.source === 'automatic'}<span class="badge">automatisk</span>{/if}
          {#if state && state !== 'ok'}<span class="badge warn">{STATE_LABELS[state]}</span>{/if}
          <button type="button" class="link muted" aria-label="Ta bort {baseName(ev.file)}" onclick={() => remove(ev)}>Ta bort</button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if dir}
    {#if !savedName}
      <label class="field-label" for="evidence-name-{owner.id}">Ditt namn (sparas i webbläsaren)</label>
      <input id="evidence-name-{owner.id}" bind:value={name} autocomplete="name" />
    {/if}
    <div
      class="evidence-drop"
      class:dragging
      role="group"
      aria-label="Bifoga filer"
      ondragover={(e) => {
        e.preventDefault()
        dragging = true
      }}
      ondragleave={() => (dragging = false)}
      ondrop={drop}
    >
      <button type="button" disabled={runner.busy} onclick={() => input?.click()}>Bifoga fil</button>
      <input
        class="hidden"
        type="file"
        multiple
        bind:this={input}
        aria-label="Filer att bifoga till {owner.id}"
        onchange={(e) => {
          attach(e.currentTarget.files)
          e.currentTarget.value = ''
        }}
      />
      <span class="meta">eller släpp filer här · {ownerFolder(owner)}</span>
    </div>
  {:else}
    <p class="meta">Bifogning kräver Chrome eller Edge och en öppnad mapp.</p>
  {/if}

  {#if runner.messages.length}<Notice tone="warn" lines={runner.messages} />{/if}
</div>
