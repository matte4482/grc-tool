<script lang="ts">
  // Det öppna projektet med flikar (README 4.2).
  import { soaSummary, type Attention } from '../lib/assessment'
  import { assessmentProgress, percent } from '../lib/compliance'
  import { store } from '../lib/project/store.svelte'
  import { supportsFolderAccess } from '../lib/storage/folder'
  import ControlsView from './ControlsView.svelte'
  import Overview from './Overview.svelte'
  import RiskMethodView from './RiskMethodView.svelte'
  import RiskRegisterView from './RiskRegisterView.svelte'
  import SoaView from './SoaView.svelte'

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const total = $derived(assessmentProgress(project, framework))
  const soa = $derived(soaSummary(project, framework))
  const hasSoa = $derived(framework.sections.some((s) => s.soa))

  let tab = $state('overview')
  let attention = $state<Attention | undefined>()

  const tabs = $derived([
    { id: 'overview', label: 'Översikt', count: `${percent(total.fulfilled, total.applicable)} %` },
    { id: 'method', label: 'Riskmetod', count: '' },
    { id: 'risks', label: 'Riskregister', count: String(project.risks.length) },
    ...framework.sections.map((s) => ({ id: s.id, label: s.title, count: String(s.groups.reduce((n, g) => n + g.controls.length, 0)) })),
    ...(hasSoa ? [{ id: 'soa', label: 'SoA', count: soa.missing ? `${soa.missing} saknar motivering` : String(soa.applicable) }] : []),
  ])
  const section = $derived(framework.sections.find((s) => s.id === tab))

  function go(next: string, a?: Attention) {
    attention = a
    tab = next
  }
</script>

{#if supportsFolderAccess() && store.target?.kind === 'download'}
  <p class="notice">
    Projektet är inte kopplat till en mapp och sparas inte automatiskt. Välj Spara för att välja uppdragets mapp.
  </p>
{/if}

{#if store.backupFailed}
  <p class="notice">
    Reservkopian i webbläsaren kunde inte sparas, till exempel för att webbläsarens lagring är avstängd eller full. Spara
    ofta.
  </p>
{/if}

<nav class="tabs" aria-label="Flikar">
  {#each tabs as t (t.id)}
    <button type="button" class:active={tab === t.id} aria-current={tab === t.id ? 'page' : undefined} onclick={() => go(t.id)}>
      {t.label} <span class="tab-count">{t.count}</span>
    </button>
  {/each}
  <span class="tabs-later" title="Byggs i fas 5">Åtgärdsplan kommer</span>
</nav>

{#if tab === 'overview'}
  <Overview {go} />
{:else if tab === 'method'}
  <RiskMethodView />
{:else if tab === 'risks'}
  <RiskRegisterView />
{:else if tab === 'soa'}
  <SoaView />
{:else if section}
  {#key tab}
    <ControlsView {section} initialAttention={attention} />
  {/key}
{/if}
