<script lang="ts">
  // Rapporten som skrivs ut. Ligger direkt under body så att resten av sidan kan döljas.

  import { REPORT_CSS } from '../../lib/report/style'
  import { printer } from '../../lib/ui/print.svelte'
  import ReportBody from './ReportBody.svelte'

  function toBody(node: HTMLElement) {
    document.body.appendChild(node)
    return { destroy: () => node.remove() }
  }
</script>

<div class="print-sheet" use:toBody>
  {@html `<style>${REPORT_CSS}</style>`}
  {#if printer.report}<ReportBody id={printer.report} />{/if}
</div>
