<script lang="ts">
  // Rapportens sidhuvud: logotyp, rubrik, kund, ramverk, datum och konsult.

  import { store } from '../../lib/project/store.svelte'
  import logo from '../../lib/ui/logo.jpg'
  import { consultantName } from '../../lib/storage/settings'
  import { localDate, shortDate } from '../../lib/ui/format'

  let { title }: { title: string } = $props()
  const by = consultantName()
</script>

<div class="r-head">
  <div>
    <img class="r-logo" src={logo} alt="Method" />
    <h1>{title}</h1>
    <p>{store.project?.client.name} · {store.framework?.name}</p>
  </div>
  <div class="r-meta">
    {shortDate(localDate())}<br />
    {#if by}Konsult: {by}<br />{/if}
    GRC-verktyget {__APP_VERSION__}
  </div>
</div>
