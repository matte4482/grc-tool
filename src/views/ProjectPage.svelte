<script lang="ts">
  // Det öppna projektet med flikar (README 4.2).
  import { actionSummary } from '../lib/actions'
  import { soaSummary } from '../lib/assessment'
  import { assessmentProgress, percent } from '../lib/compliance'
  import { store } from '../lib/project/store.svelte'
  import { supportsFolderAccess } from '../lib/storage/folder'
  import { localDate } from '../lib/ui/format'
  import { nav } from '../lib/ui/nav.svelte'
  import ActionPlanView from './ActionPlanView.svelte'
  import { comparison } from '../lib/ui/comparison.svelte'
  import ControlsView from './ControlsView.svelte'
  import FollowUpView from './FollowUpView.svelte'
  import ReportsView from './ReportsView.svelte'
  import Overview from './Overview.svelte'
  import RiskMethodView from './RiskMethodView.svelte'
  import RiskRegisterView from './RiskRegisterView.svelte'
  import SoaView from './SoaView.svelte'

  const project = $derived(store.project!)
  const framework = $derived(store.framework!)
  const total = $derived(assessmentProgress(project, framework))
  const soa = $derived(soaSummary(project, framework))
  const hasSoa = $derived(framework.sections.some((s) => s.soa))

  const actions = $derived(actionSummary(project, localDate()))
  nav.go('overview')
  comparison.clear()

  const tabs = $derived([
    { id: 'overview', label: 'Översikt', count: `${percent(total.fulfilled, total.applicable)} %` },
    { id: 'method', label: 'Riskmetod', count: '' },
    { id: 'risks', label: 'Riskregister', count: String(project.risks.length) },
    ...framework.sections.map((s) => ({ id: s.id, label: s.title, count: String(s.groups.reduce((n, g) => n + g.controls.length, 0)) })),
    ...(hasSoa ? [{ id: 'soa', label: 'SoA', count: soa.missing ? `${soa.missing} saknar motivering` : String(soa.applicable) }] : []),
    { id: 'actions', label: 'Åtgärdsplan', count: actions.overdue ? `${actions.overdue} försenade` : String(actions.open) },
    { id: 'followup', label: 'Uppföljning', count: comparison.previous ? 'jämförs' : '' },
    { id: 'reports', label: 'Rapporter', count: '' },
  ])
  const section = $derived(framework.sections.find((s) => s.id === nav.tab))
</script>

{#if supportsFolderAccess() && store.target?.kind === 'download'}
  <p class="notice">
    Inte kopplat till en mapp och sparas inte automatiskt. Välj Spara för att välja mapp.
  </p>
{/if}

{#if store.backupFailed}
  <p class="notice">
    Reservkopian i webbläsaren kunde inte sparas. Spara ofta.
  </p>
{/if}

<nav class="tabs" aria-label="Flikar">
  {#each tabs as t (t.id)}
    <button type="button" class:active={nav.tab === t.id} aria-current={nav.tab === t.id ? 'page' : undefined} onclick={() => nav.go(t.id)}>
      {t.label} <span class="tab-count">{t.count}</span>
    </button>
  {/each}
</nav>

{#if nav.tab === 'overview'}
  <Overview />
{:else if nav.tab === 'method'}
  <RiskMethodView />
{:else if nav.tab === 'risks'}
  {#key nav.focus}
    <RiskRegisterView initialRisk={nav.focus} />
  {/key}
{:else if nav.tab === 'actions'}
  <ActionPlanView />
{:else if nav.tab === 'followup'}
  <FollowUpView />
{:else if nav.tab === 'reports'}
  <ReportsView />
{:else if nav.tab === 'soa'}
  <SoaView />
{:else if section}
  {#key nav.tab + (nav.focus ?? '')}
    <ControlsView {section} initialAttention={nav.attention} initialOpen={nav.focus} />
  {/key}
{/if}
