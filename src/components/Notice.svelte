<script lang="ts">
  // Ett meddelande: första raden som rubrik, resten som lista.
  let { lines, tone = 'error' }: { lines: string[]; tone?: 'error' | 'warn' } = $props()
</script>

{#if lines.length}
  <div class="notice" class:error={tone === 'error'} role={tone === 'error' ? 'alert' : 'status'}>
    <p>{lines[0]}</p>
    {#if lines.length > 1}
      <ul>
        {#each lines.slice(1) as line}<li>{line}</li>{/each}
      </ul>
    {/if}
  </div>
{/if}
