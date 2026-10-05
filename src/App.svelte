<script lang="ts">
  // Fas 1: ett enkelt skal för att skapa, öppna och spara projekt.
  // Den riktiga startsidan byggs i fas 2 och vyerna i fas 2–7.
  import { onMount } from 'svelte'
  import { FRAMEWORKS, countControls, getFramework } from './lib/frameworks'
  import { createProject } from './lib/project/project'
  import { PROJECT_SCHEMA_VERSION } from './lib/project/schema'
  import { store } from './lib/project/store.svelte'
  import { downloadTarget, readSelectedFile } from './lib/storage/download'
  import {
    ensureWriteAccess,
    fileExists,
    folderTarget,
    listProjectFiles,
    pickFolder,
    readFile,
    supportsFolderAccess,
  } from './lib/storage/folder'
  import { projectFileName } from './lib/storage/target'
  import type { Backup } from './lib/storage/backup'

  const version = __APP_VERSION__
  const canUseFolders = supportsFolderAccess()

  let client = $state('')
  let messages = $state<string[]>([])
  let choice = $state<{ dir: FileSystemDirectoryHandle; files: string[] } | null>(null)
  let busy = $state(false)

  onMount(() => store.startAutosave())

  /** Kör en åtgärd från ett klick. Oväntade fel visas i stället för att försvinna. */
  async function run(action: () => Promise<void>) {
    messages = []
    busy = true
    try {
      await action()
    } catch (e) {
      messages = ['Något gick fel.', e instanceof Error ? e.message : String(e)]
    } finally {
      busy = false
    }
  }

  function mayLeaveProject(): boolean {
    return !store.hasUnsavedChanges || confirm('Det finns osparade ändringar. Vill du fortsätta ändå?')
  }

  const newProject = () =>
    run(async () => {
      const name = client.trim()
      if (!name) return void (messages = ['Ange kundens namn.'])
      if (!mayLeaveProject()) return
      const project = createProject({ client: name, framework: getFramework('iso27001', '2022')! })
      const fileName = projectFileName(name)

      if (!canUseFolders) {
        const r = await store.start(project, downloadTarget(fileName))
        if (!r.ok) messages = [r.message, ...r.details]
        return
      }
      const dir = await pickFolder()
      if (!dir) return
      if (!(await ensureWriteAccess(dir))) return void (messages = ['Verktyget fick inte skriva i mappen.'])
      if (await fileExists(dir, fileName))
        return void (messages = [`Det finns redan en ${fileName} i mappen. Öppna den i stället, eller välj en annan mapp.`])
      const r = await store.start(project, folderTarget(dir, fileName))
      if (!r.ok) messages = [r.message, ...r.details]
    })

  const openFolder = () =>
    run(async () => {
      if (!mayLeaveProject()) return
      const dir = await pickFolder()
      if (!dir) return
      if (!(await ensureWriteAccess(dir))) return void (messages = ['Verktyget fick inte skriva i mappen.'])
      const files = await listProjectFiles(dir)
      if (files.length === 0) return void (messages = ['Mappen innehåller ingen projektfil (.grc.json).'])
      if (files.length === 1) return openFile(dir, files[0])
      choice = { dir, files }
    })

  async function openFile(dir: FileSystemDirectoryHandle, name: string) {
    choice = null
    showOpenResult(store.open(await readFile(dir, name), folderTarget(dir, name)))
  }

  const openSelected = (e: Event & { currentTarget: HTMLInputElement }) =>
    run(async () => {
      const file = e.currentTarget.files?.[0]
      e.currentTarget.value = ''
      if (!file || !mayLeaveProject()) return
      showOpenResult(store.open(await readSelectedFile(file), downloadTarget(file.name)))
    })

  function showOpenResult(r: ReturnType<typeof store.open>) {
    if (!r.ok) return void (messages = ['Filen kunde inte öppnas:', ...r.errors])
    if (r.warnings.length) messages = ['Projektet öppnades, men stämmer inte helt med ramverket:', ...r.warnings]

    // Reservkopian i webbläsaren har ändringar som inte finns i filen (B-25).
    if (r.newerBackup) {
      const question =
        `Webbläsaren har ändringar från ${formatTime(r.newerBackup.changedAt)} som inte finns i filen ` +
        `(sparad ${formatTime(store.project!.updatedAt)}). Vill du återställa dem?\n\n` +
        'OK återställer ändringarna. Avbryt använder filen som den är och tar bort ändringarna i webbläsaren.'
      if (confirm(question)) {
        const restored = store.restoreBackup()
        if (!restored.ok) messages = ['Ändringarna kunde inte återställas:', ...restored.errors]
      } else store.discardBackup()
    }
  }

  /** Återställer en reservkopia från listan på startsidan och låter konsulten välja var den sparas. */
  const restoreFromList = (backup: Backup) =>
    run(async () => {
      if (!mayLeaveProject()) return
      const fileName = backup.label || projectFileName(backup.client)
      let target = downloadTarget(fileName)
      if (canUseFolders) {
        const dir = await pickFolder()
        if (!dir) return
        if (!(await ensureWriteAccess(dir))) return void (messages = ['Verktyget fick inte skriva i mappen.'])
        if ((await fileExists(dir, fileName)) && !confirm(`${fileName} finns redan i mappen. Ändringarna i webbläsaren skriver över den när du sparar. Vill du fortsätta?`))
          return
        target = folderTarget(dir, fileName)
      }
      const r = store.openBackup(backup.projectId, target)
      if (!r.ok) messages = ['Reservkopian kunde inte öppnas:', ...r.errors]
    })

  function removeBackup(backup: Backup) {
    if (confirm(`Ta bort ändringarna för ${backup.client || 'okänd kund'} från webbläsaren? Det går inte att ångra.`))
      store.removeBackup(backup.projectId)
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  const save = () => run(async () => void (await store.save()))

  const saveAs = () =>
    run(async () => {
      const fileName = store.target?.label ?? projectFileName(store.project?.client.name ?? '')
      if (!canUseFolders) return void (await store.saveAs(downloadTarget(fileName)))
      const dir = await pickFolder()
      if (!dir) return
      if (!(await ensureWriteAccess(dir))) return void (messages = ['Verktyget fick inte skriva i mappen.'])
      if ((await fileExists(dir, fileName)) && !confirm(`${fileName} finns redan i mappen. Vill du skriva över den?`)) return
      await store.saveAs(folderTarget(dir, fileName))
    })

  function renameClient(value: string) {
    store.update((draft) => {
      draft.client.name = value
    })
  }
</script>

<header class="app">
  <div class="wrap head-row">
    <div>
      <div class="eyebrow">Method</div>
      <h1>GRC-verktyget</h1>
      {#if store.project}
        <div class="client">{store.project.client.name} · {store.framework?.name}</div>
      {/if}
    </div>
    {#if store.project}
      <div class="head-actions">
        <span class="save-state tone-{store.statusText.tone}">{store.statusText.text}</span>
        <button onclick={save} disabled={busy}>Spara</button>
        <button onclick={saveAs} disabled={busy}>Spara som</button>
      </div>
    {/if}
  </div>
</header>

<main class="wrap">
  {#if !canUseFolders}
    <p class="notice">
      Den här webbläsaren kan inte spara direkt till en mapp. Projektfilen laddas ned i stället och sparas inte
      automatiskt till fil. Varje ändring sparas som reservkopia i webbläsaren tills du laddar ned filen och öppnar
      den igen. Använd Chrome eller Edge för att spara direkt i kundens mapp.
    </p>
  {/if}

  {#if messages.length}
    <div class="notice error" role="alert">
      <p>{messages[0]}</p>
      {#if messages.length > 1}
        <ul>
          {#each messages.slice(1) as line}<li>{line}</li>{/each}
        </ul>
      {/if}
    </div>
  {/if}

  {#if store.status.state === 'error' && store.status.details.length}
    <div class="notice error" role="alert">
      <p>{store.status.message}</p>
      <ul>
        {#each store.status.details as line}<li>{line}</li>{/each}
      </ul>
    </div>
  {/if}

  {#if store.project && store.backupFailed}
    <p class="notice">
      Reservkopian i webbläsaren kunde inte sparas, till exempel för att webbläsarens lagring är avstängd eller full.
      Spara ofta.
    </p>
  {/if}

  {#if store.project}
    <section class="card">
      <h2>Projekt</h2>
      <label class="field">
        <span>Kund</span>
        <input value={store.project.client.name} oninput={(e) => renameClient(e.currentTarget.value)} />
      </label>
      <p class="meta">
        Ändringar sparas automatiskt var tionde minut{store.target?.autosave ? '' : ' (inte vid nedladdning)'}.
        Stäng inte fliken med osparade ändringar.
      </p>
    </section>
  {:else}
    {#if store.backups.length}
      <section class="card backups">
        <h2>Osparade ändringar i webbläsaren</h2>
        <p class="meta">
          Ändringar som inte nådde projektfilen, till exempel för att fliken stängdes eller en nedladdning inte
          sparades. Återställ dem och spara, eller ta bort dem.
        </p>
        <ul class="files">
          {#each store.backups as backup (backup.projectId)}
            <li class="backup">
              <span>
                <strong>{backup.client || 'Okänd kund'}</strong>
                <span class="meta">
                  · ändrad {formatTime(backup.changedAt)}{backup.downloadedAt
                    ? ` · nedladdad ${formatTime(backup.downloadedAt)}`
                    : ''}
                </span>
              </span>
              <span class="row">
                <button onclick={() => restoreFromList(backup)} disabled={busy}>Återställ</button>
                <button onclick={() => removeBackup(backup)} disabled={busy}>Ta bort</button>
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/if}

    <section class="card">
      <h2>Nytt arbete</h2>
      <div class="row">
        <input placeholder="Kundens namn" bind:value={client} />
        <button class="primary" onclick={newProject} disabled={busy}>
          {canUseFolders ? 'Välj mapp och skapa' : 'Skapa'}
        </button>
      </div>
    </section>

    <section class="card">
      <h2>Öppna befintligt arbete</h2>
      {#if canUseFolders}
        <button class="primary" onclick={openFolder} disabled={busy}>Välj uppdragets mapp</button>
        {#if choice}
          <p class="meta">Mappen innehåller flera projektfiler. Välj en:</p>
          <ul class="files">
            {#each choice.files as name (name)}
              <li><button onclick={() => run(() => openFile(choice!.dir, name))}>{name}</button></li>
            {/each}
          </ul>
        {/if}
      {:else}
        <input type="file" accept=".json" onchange={openSelected} />
      {/if}
    </section>

    <section class="card">
      <h2>Ramverk</h2>
      <ul class="frameworks">
        {#each FRAMEWORKS as entry (entry.id + entry.version)}
          <li class:upcoming={!entry.framework}>
            <span class="name">{entry.name}</span>
            {#if entry.framework}
              <span class="meta">
                {countControls(entry.framework, 'clauses')} krav ·
                {countControls(entry.framework, 'annex-a')} kontroller
              </span>
            {:else}
              <span class="badge">Kommer</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}

  <p class="info">Bedömningen sparas som en fil i kundens mapp. Inget lagras hos Method IT.</p>
</main>

<footer class="wrap">
  Version {version} · projektfilformat {PROJECT_SCHEMA_VERSION}
</footer>
