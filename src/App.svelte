<script lang="ts">
  // Appens ram: sidhuvud med sparstatus och knappar, och den vy som visas.
  // Startsidan när inget projekt är öppet, annars projektet.
  import { onMount } from 'svelte'
  import DialogHost from './components/DialogHost.svelte'
  import Notice from './components/Notice.svelte'
  import { PROJECT_SCHEMA_VERSION } from './lib/project/schema'
  import { store } from './lib/project/store.svelte'
  import { downloadTarget } from './lib/storage/download'
  import { supportsFolderAccess } from './lib/storage/folder'
  import { projectFileName } from './lib/storage/target'
  import { prepareFolderTarget } from './lib/storage/workflow'
  import { dialog } from './lib/ui/dialog.svelte'
  import { Runner } from './lib/ui/runner.svelte'
  import ProjectPage from './views/ProjectPage.svelte'
  import StartPage from './views/StartPage.svelte'

  const version = __APP_VERSION__
  const canUseFolders = supportsFolderAccess()
  const ui = new Runner()

  onMount(() => store.startAutosave())

  // Indragen fil frågar om mappen vis "Spara"
  const save = () => (canUseFolders && store.target?.kind === 'download' ? saveAs() : ui.run(async () => void (await store.save())))

  const saveAs = () =>
    ui.run(async () => {
      const fileName = store.target?.label ?? projectFileName(store.project?.client.name ?? '')
      if (!canUseFolders) return void (await store.saveAs(downloadTarget(fileName)))
      const r = await prepareFolderTarget(fileName)
      if (r.kind === 'cancelled') return
      if (r.kind === 'denied') return ui.show('Verktyget fick inte skriva i mappen.')
      if (
        r.exists &&
        !(await dialog.ask({ title: 'Filen finns redan', message: `${fileName} finns redan i mappen. Vill du skriva över den?`, confirm: 'Skriv över', danger: true }))
      )
        return
      await store.saveAs(r.target)
    })

  /**
   * Tillbaka till startsidan. I en mapp sparas projektet först. En nedladdning
   * startas inte utan att konsulten bett om det, så där frågar vi i stället;
   * ändringarna finns kvar som reservkopia på startsidan (B-25).
   */
  const close = () =>
    ui.run(async () => {
      if (store.close()) return
      if (store.target?.kind === 'folder') {
        const r = await store.save()
        if (r.ok) store.close()
        return
      }
      const ok = await dialog.ask({
        title: 'Stänga utan att spara?',
        message: 'Ändringarna har inte sparats till fil. De finns kvar i webbläsaren och kan återställas från startsidan.',
        confirm: 'Stäng ändå',
        cancel: 'Fortsätt arbeta',
      })
      if (ok) store.close({ discard: true })
    })
</script>

<header class="app">
  <div class="wrap head-row">
    <div class="brand">
      <span class="logo" aria-hidden="true">M</span>
      <div>
        <div class="eyebrow">Method IT</div>
        <div class="app-name">GRC-verktyget</div>
      </div>
      {#if store.project}
        <div class="client">{store.project.client.name} · {store.framework?.name}</div>
      {/if}
    </div>
    {#if store.project}
      <div class="head-actions">
        <span class="save-state tone-{store.statusText.tone}" role="status">{store.statusText.text}</span>
        <button onclick={save} disabled={ui.busy}>Spara</button>
        <button onclick={saveAs} disabled={ui.busy}>Spara som</button>
        <button onclick={close} disabled={ui.busy}>Stäng</button>
      </div>
    {:else}
      <span class="version">Version {version}</span>
    {/if}
  </div>
</header>

<main class="wrap">
  <Notice lines={ui.messages} />

  {#if store.status.state === 'error' && store.status.details.length}
    <Notice lines={[store.status.message, ...store.status.details]} />
  {/if}

  {#if store.project && store.framework}
    <ProjectPage />
  {:else}
    <StartPage />
  {/if}

  {#if store.project}
    <p class="info">Bedömningen sparas som en fil i kundens mapp. Inget lagras hos Method IT.</p>
  {/if}
</main>

<DialogHost />

<footer class="wrap">
  Version {version} · projektfilformat {PROJECT_SCHEMA_VERSION}
</footer>
