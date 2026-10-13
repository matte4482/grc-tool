<script lang="ts">
  import Notice from '../components/Notice.svelte'
  import StatusBar from '../components/StatusBar.svelte'
  import { percent, sectionSummaries } from '../lib/compliance'
  import { FRAMEWORKS, type FrameworkEntry } from '../lib/frameworks'
  import { createProject, parseProject } from '../lib/project/project'
  import type { Project } from '../lib/project/schema'
  import { copyFromProject } from '../lib/risk/operations'
  import { store } from '../lib/project/store.svelte'
  import { addTemplateRisks, templatesFor } from '../lib/risk/templates'
  import type { Backup } from '../lib/storage/backup'
  import { downloadTarget, readSelectedFile } from '../lib/storage/download'
  import { readDrop, supportsFolderAccess } from '../lib/storage/folder'
  import type { RecentEntry } from '../lib/storage/recent'
  import { projectFileName, type SaveTarget } from '../lib/storage/target'
  import {
    openDropped,
    pickProjectInFolder,
    prepareFolderTarget,
    readProjectFile,
    reopenRecent,
    type DropResult,
    type FileRead,
  } from '../lib/storage/workflow'
  import { dialog } from '../lib/ui/dialog.svelte'
  import { relativeTime } from '../lib/ui/format'
  import { Runner } from '../lib/ui/runner.svelte'

  const canUseFolders = supportsFolderAccess()
  const ui = new Runner()
  const RECENT_SHOWN = 4

  let client = $state('')
  const firstAvailable = FRAMEWORKS.find((e) => e.framework)
  let frameworkKey = $state(firstAvailable ? keyOf(firstAvailable) : '')
  /** Startpunkt för riskregistret (B-29). */
  let startpoint = $state<'templates' | 'empty' | 'copy'>('templates')
  /** Projektet att kopiera riskmetod och risker från ("Kopiera från kund"). */
  let copySource = $state.raw<Project | null>(null)
  let copyInput = $state<HTMLInputElement>()
  let choice = $state<{ dir: FileSystemDirectoryHandle; files: string[] } | null>(null)
  let fileInput = $state<HTMLInputElement>()
  let dragging = $state(false)
  let showAllRecent = $state(false)

  const selected = $derived(FRAMEWORKS.find((f) => keyOf(f) === frameworkKey)?.framework)
  const templates = $derived(selected ? templatesFor(selected) : undefined)
  const recent = $derived(showAllRecent ? store.recent : store.recent.slice(0, RECENT_SHOWN))

  function keyOf(e: { id: string; version: string }) {
    return `${e.id}@${e.version}`
  }

  function scope(entry: FrameworkEntry) {
    if (!entry.framework) return entry.summary ?? ''
    return sectionSummaries(entry.framework).map((s) => `${s.count} ${s.unit}`).join(' · ')
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleString('sv-SE', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  // Nytt arbete
  const newProject = (e: SubmitEvent) => {
    e.preventDefault()
    return ui.run(async () => {
      const name = client.trim()
      if (!name) return ui.show('Ange kundens namn.')
      const framework = selected
      if (!framework) return ui.show('Välj ett ramverk.')
      if (startpoint === 'copy' && !copySource) return ui.show('Välj projektfilen att kopiera från.')
      const fileName = projectFileName(name)

      let target: SaveTarget = downloadTarget(fileName)
      if (canUseFolders) {
        const r = await prepareFolderTarget(fileName)
        if (r.kind === 'cancelled') return
        if (r.kind === 'denied') return ui.show('Verktyget fick inte skriva i mappen.')
        if (r.exists) return ui.show(`Det finns redan en ${fileName} i mappen. Öppna den i stället, eller välj en annan mapp.`)
        target = r.target
      }
      const project = createProject({ client: name, framework })
      if (startpoint === 'templates' && templates) addTemplateRisks(project, templates.risks, new Date().toLocaleDateString('sv-SE'))
      if (startpoint === 'copy' && copySource) copyFromProject(project, copySource, new Date().toISOString())
      const r = await store.start(project, target)
      if (!r.ok) ui.show(r.message, ...r.details)
    })
  }

  const chooseCopy = (e: Event & { currentTarget: HTMLInputElement }) => {
    const input = e.currentTarget
    return ui.run(async () => {
      const file = input.files?.[0]
      input.value = ''
      if (!file) return
      const r = parseProject(await readSelectedFile(file))
      if (!r.ok) return ui.show('Filen kunde inte läsas:', ...r.errors)
      copySource = r.project
      startpoint = 'copy'
    })
  }

  // Öppna
  async function showPicked(r: DropResult) {
    if (r.kind === 'cancelled') return
    if (r.kind === 'denied') return ui.show('Verktyget fick inte skriva i mappen.')
    if (r.kind === 'empty') return ui.show('Mappen innehåller ingen projektfil (.grc.json).')
    if (r.kind === 'not-project') return ui.show('Det är inte en projektfil. Dra in uppdragets mapp eller en fil som slutar på .grc.json.')
    if (r.kind === 'folder-unsupported') return ui.show('Den här webbläsaren kan inte öppna en mapp. Dra in projektfilen i stället.')
    if (r.kind === 'choose') return void (choice = { dir: r.dir, files: r.files })
    await openRead(r)
  }

  async function openFolderSteps() {
    choice = null
    await showPicked(await pickProjectInFolder())
  }
  const openFolder = () => ui.run(openFolderSteps)

  const openChosen = (name: string) =>
    ui.run(async () => {
      const dir = choice!.dir
      choice = null
      await openRead(await readProjectFile(dir, name))
    })

  const openSelected = (e: Event & { currentTarget: HTMLInputElement }) => {
    const input = e.currentTarget
    return ui.run(async () => {
      const file = input.files?.[0]
      input.value = ''
      if (file) await openRead({ kind: 'file', text: await readSelectedFile(file), target: downloadTarget(file.name) })
    })
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragging = false
    if (!e.dataTransfer) return
    const dropped = readDrop(e.dataTransfer) // måste läsas innan första await
    void ui.run(async () => {
      choice = null
      const d = await dropped
      if (d) await showPicked(await openDropped(d))
    })
  }

  /** Öppnar en läst projektfil och frågar om nyare ändringar i webbläsaren (B-25). */
  async function openRead({ text, target }: FileRead) {
    const r = store.open(text, target)
    if (!r.ok) return ui.show('Filen kunde inte öppnas:', ...r.errors)
    if (r.warnings.length) ui.show('Projektet öppnades, men stämmer inte helt med ramverket:', ...r.warnings)
    if (!r.newerBackup) return

    const answer = await dialog.ask({
      title: 'Nyare ändringar i webbläsaren',
      message:
        `Webbläsaren har ändringar från ${formatTime(r.newerBackup.changedAt)} som inte finns i filen ` +
        `(sparad ${formatTime(store.project!.updatedAt)}). Vill du återställa dem? ` +
        'Väljer du filen tas ändringarna i webbläsaren bort.',
      confirm: 'Återställ ändringarna',
      cancel: 'Använd filen',
    })
    // Stängd med Esc: filen används, och kopian ligger kvar till nästa gång.
    if (answer === true) {
      const restored = store.restoreBackup()
      if (!restored.ok) ui.show('Ändringarna kunde inte återställas:', ...restored.errors)
    } else if (answer === false) store.discardBackup()
  }

  // Senaste arbeten (B-26)

  const resume = (entry: RecentEntry) =>
    ui.run(async () => {
      const r = await reopenRecent(entry)
      if (r.kind === 'needs-file') {
        // Nedladdade projekt har ingen mapp. Låt konsulten välja filen.
        if (canUseFolders) return openFolderSteps()
        return fileInput?.click()
      }
      if (r.kind === 'denied') return ui.show(`Verktyget fick inte öppna mappen för ${entry.client}.`)
      if (r.kind === 'missing')
        return ui.show(
          `${entry.fileName} finns inte längre i mappen.`,
          'Filen kan ha flyttats eller bytt namn. Dra in uppdragets mapp under Öppna befintligt arbete.',
        )
      await openRead(r)
    })

  const forget = (entry: RecentEntry) =>
    ui.run(async () => {
      const ok = await dialog.ask({
        title: 'Ta bort ur Senaste arbeten?',
        message: `${entry.client} tas bort ur listan. Projektfilen påverkas inte.`,
        confirm: 'Ta bort ur listan',
      })
      if (ok) await store.removeRecent(entry.projectId)
    })

  // Reservkopior (B-25)

  const restoreFromList = (backup: Backup) =>
    ui.run(async () => {
      const fileName = backup.label || projectFileName(backup.client)
      let target: SaveTarget = downloadTarget(fileName)
      if (canUseFolders) {
        const r = await prepareFolderTarget(fileName)
        if (r.kind === 'cancelled') return
        if (r.kind === 'denied') return ui.show('Verktyget fick inte skriva i mappen.')
        if (
          r.exists &&
          !(await dialog.ask({
            title: 'Filen finns redan',
            message: `${fileName} finns redan i mappen. Ändringarna i webbläsaren skriver över den när du sparar.`,
            confirm: 'Fortsätt',
          }))
        )
          return
        target = r.target
      }
      const r = store.openBackup(backup.projectId, target)
      if (!r.ok) ui.show('Reservkopian kunde inte öppnas:', ...r.errors)
    })

  const removeBackup = (backup: Backup) =>
    ui.run(async () => {
      const ok = await dialog.ask({
        title: 'Ta bort ändringarna?',
        message: `Ändringarna för ${backup.client || 'okänd kund'} tas bort från webbläsaren. Det går inte att ångra.`,
        confirm: 'Ta bort',
        danger: true,
      })
      if (ok) store.removeBackup(backup.projectId)
    })
</script>

<div class="intro">
  <div class="eyebrow">Startsida</div>
  <h1>Starta ett nytt arbete eller fortsätt där du slutade</h1>
  <p>Bedömningen sparas som en fil i kundens SharePoint-mapp. Inget lagras hos Method IT.</p>
</div>

{#if !canUseFolders}
  <p class="notice">
    Den här webbläsaren kan inte spara direkt till en mapp. Projektfilen laddas ned i stället, och varje ändring sparas
    som reservkopia i webbläsaren tills du öppnar den nedladdade filen igen. Använd Chrome eller Edge för att spara
    direkt i kundens mapp.
  </p>
{/if}

<Notice lines={ui.messages} />

{#if store.backups.length}
  <section class="card backups" aria-labelledby="backups-h">
    <h2 id="backups-h">Osparade ändringar i webbläsaren</h2>
    <p class="meta">
      Ändringar som inte nådde projektfilen, till exempel för att fliken stängdes eller en nedladdning inte sparades.
      Återställ dem och spara, eller ta bort dem.
    </p>
    <ul class="list">
      {#each store.backups as backup (backup.projectId)}
        <li>
          <span>
            <strong>{backup.client || 'Okänd kund'}</strong>
            <span class="meta">
              · ändrad {formatTime(backup.changedAt)}{backup.downloadedAt ? ` · nedladdad ${formatTime(backup.downloadedAt)}` : ''}
            </span>
          </span>
          <span class="row">
            <button onclick={() => restoreFromList(backup)} disabled={ui.busy}>Återställ</button>
            <button onclick={() => removeBackup(backup)} disabled={ui.busy}>Ta bort</button>
          </span>
        </li>
      {/each}
    </ul>
  </section>
{/if}

<div class="start-grid">
  <section class="card new-work" aria-labelledby="new-h">
    <h2 id="new-h"><span class="step" aria-hidden="true">1</span> Nytt arbete</h2>
    <form onsubmit={newProject}>
      <label class="field-label" for="client">Kund</label>
      <input id="client" class="big-input" placeholder="Kundens namn" bind:value={client} autocomplete="off" />

      <fieldset>
        <legend class="field-label">Ramverk <span>— ett ramverk per arbete</span></legend>
        <div class="fw-grid">
          {#each FRAMEWORKS as entry (keyOf(entry))}
            <label class="fw-card" class:selected={frameworkKey === keyOf(entry)} class:upcoming={!entry.framework}>
              <input type="radio" name="framework" value={keyOf(entry)} bind:group={frameworkKey} disabled={!entry.framework} />
              <span class="fw-head">
                <span class="fw-name">{entry.name}</span>
                {#if entry.framework}<span class="radio" aria-hidden="true"></span>{:else}<span class="badge">Kommer</span>{/if}
              </span>
              <span class="fw-scope">{scope(entry)}</span>
              <span class="fw-desc">{entry.description}</span>
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset>
        <legend class="field-label">Startpunkt</legend>
        <div class="start-options">
          <label class="option" class:selected={startpoint === 'templates'} class:upcoming={!templates}>
            <input type="radio" name="startpoint" value="templates" bind:group={startpoint} disabled={!templates} />
            <span class="radio" aria-hidden="true"></span>
            <span><strong>Med typrisker</strong><span>{templates ? `${templates.risks.length} vanliga risker förifyllda` : 'Finns inte för ramverket'}</span></span>
          </label>
          <label class="option" class:selected={startpoint === 'empty'}>
            <input type="radio" name="startpoint" value="empty" bind:group={startpoint} />
            <span class="radio" aria-hidden="true"></span>
            <span><strong>Tomt register</strong><span>Börja från noll</span></span>
          </label>
          <label class="option" class:selected={startpoint === 'copy'}>
            <input type="radio" name="startpoint" value="copy" bind:group={startpoint} onclick={() => !copySource && copyInput?.click()} />
            <span class="radio" aria-hidden="true"></span>
            <span>
              <strong>Kopiera från kund</strong>
              <span>{copySource ? `${copySource.client.name} · ${copySource.risks.length} risker` : 'Återanvänd riskmetod och risker'}</span>
            </span>
          </label>
        </div>
      </fieldset>

      <input class="hidden" type="file" accept=".json" bind:this={copyInput} onchange={chooseCopy} aria-label="Projektfil att kopiera från" />
      {#if startpoint === 'copy'}
        <p class="meta">
          Riskmetoden och riskerna kopieras, men inga bedömningar, ägare eller godkännanden.
          <button type="button" class="link" onclick={() => copyInput?.click()}>{copySource ? 'Välj en annan fil' : 'Välj projektfil'}</button>
        </p>
      {/if}

      <div class="form-foot">
        <span class="meta">{canUseFolders ? 'Du väljer var filen sparas i nästa steg.' : 'Projektfilen laddas ned när arbetet skapas.'}</span>
        <button class="cta" type="submit" disabled={ui.busy}>{canUseFolders ? 'Skapa arbete och välj sparplats' : 'Skapa arbete'} →</button>
      </div>
    </form>
  </section>

  <div class="side">
    <section class="card" aria-labelledby="open-h">
      <h2 id="open-h"><span class="step" aria-hidden="true">2</span> Öppna befintligt arbete</h2>
      <div
        class="dropzone"
        class:dragging
        role="region"
        aria-label="Dra in en projektfil eller mapp"
        ondragover={(e) => {
          e.preventDefault()
          dragging = true
        }}
        ondragleave={() => (dragging = false)}
        ondrop={onDrop}
      >
        <span class="drop-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 15V4M7 9l5-5 5 5M5 20h14" />
          </svg>
        </span>
        <strong>{canUseFolders ? 'Dra in uppdragets mapp eller projektfil här' : 'Dra in en projektfil här'}</strong>
        <span class="meta">
          eller
          {#if canUseFolders}
            <button type="button" class="link" onclick={openFolder} disabled={ui.busy}>välj mapp</button> från kundens SharePoint-mapp
          {:else}
            <button type="button" class="link" onclick={() => fileInput?.click()} disabled={ui.busy}>välj fil</button>
          {/if}
          · .grc.json
        </span>
      </div>
      <input class="hidden" type="file" accept=".json" bind:this={fileInput} onchange={openSelected} aria-label="Välj projektfil" />
      {#if choice}
        <p class="meta choose">Mappen innehåller flera projektfiler. Välj en:</p>
        <ul class="files">
          {#each choice.files as name (name)}
            <li><button onclick={() => openChosen(name)} disabled={ui.busy}>{name}</button></li>
          {/each}
        </ul>
      {/if}
    </section>

    <section class="card recent-card" aria-labelledby="recent-h">
      <div class="card-head">
        <h2 id="recent-h">Senaste arbeten</h2>
        {#if store.recent.length > RECENT_SHOWN}
          <button type="button" class="link muted" onclick={() => (showAllRecent = !showAllRecent)}>
            {showAllRecent ? 'Visa färre' : 'Visa alla'}
          </button>
        {/if}
      </div>
      {#if store.recent.length}
        <ul class="recent">
          {#each recent as entry (entry.projectId)}
            <li>
              <div class="recent-row">
                <div>
                  <div class="recent-name">{entry.client}</div>
                  <div class="meta">
                    {entry.framework.name} · ändrad {relativeTime(entry.updatedAt)}{entry.kind === 'download' ? ' · nedladdad' : ''}
                  </div>
                </div>
                <div class="recent-actions">
                  <span class="pct">{percent(entry.progress.assessed, entry.progress.applicable)} %</span>
                  <button type="button" class="link gold" onclick={() => resume(entry)} disabled={ui.busy}>
                    {entry.kind === 'folder' ? 'Fortsätt' : 'Välj fil'} →
                  </button>
                </div>
              </div>
              <StatusBar {...entry.progress} />
              <button type="button" class="link muted small" onclick={() => forget(entry)} disabled={ui.busy} aria-label="Ta bort {entry.client} ur listan">
                Ta bort ur listan
              </button>
            </li>
          {/each}
        </ul>
      {:else}
        <p class="meta">Inga arbeten ännu. Projekt du skapar eller öppnar visas här, så att du kan fortsätta med ett klick.</p>
      {/if}
    </section>
  </div>
</div>
