<script lang="ts">
  // En rapport med sidhuvud. Används både för förhandsvisning och utskrift.

  import { store } from '../../lib/project/store.svelte'
  import { comparison } from '../../lib/ui/comparison.svelte'
  import { REPORT_TITLES, type ReportId } from '../../lib/ui/print.svelte'
  import AboutReport from './AboutReport.svelte'
  import DashboardReport from './DashboardReport.svelte'
  import GapReport from './GapReport.svelte'
  import ProgressReport from './ProgressReport.svelte'
  import ReportHeader from './ReportHeader.svelte'
  import SoaReport from './SoaReport.svelte'
  import TreatmentPlanReport from './TreatmentPlanReport.svelte'

  let { id }: { id: ReportId } = $props()
</script>

<div class="report" class:single={id !== 'full' && id !== 'gap'}>
  <ReportHeader title={REPORT_TITLES[id]} />
  {#if id === 'gap' || id === 'full'}<AboutReport />{/if}
  {#if id === 'dashboard' || id === 'full'}<div class:page-break={id === 'full'}><DashboardReport showSummary={id === 'dashboard'} /></div>{/if}
  {#if id === 'progress' || (id === 'full' && comparison.previous)}<div class:page-break={id === 'full'}><ProgressReport /></div>{/if}
  {#if id === 'gap' || id === 'full'}<div class="page-break"><GapReport /></div>{/if}
  {#if id === 'soa' || (id === 'full' && store.framework?.sections.some((s) => s.soa))}<div class="page-break"><SoaReport /></div>{/if}
  {#if id === 'plan' || id === 'full'}<div class:page-break={id === 'full'}><TreatmentPlanReport /></div>{/if}
</div>
