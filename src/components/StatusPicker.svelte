<script lang="ts">
  import { STATUSES, STATUS_LABELS } from '../lib/assessment'
  import type { Status } from '../lib/project/schema'

  // Val av status som knappar i rad. `allowNone` lägger till "Ingen" (för delstatus).
  let {
    value,
    onchange,
    label,
    disabled = false,
    allowNone = false,
    compact = false,
  }: {
    value: Status | undefined
    onchange: (status: Status | undefined) => void
    label: string
    disabled?: boolean
    allowNone?: boolean
    compact?: boolean
  } = $props()

  const options = $derived<(Status | undefined)[]>(allowNone ? [...STATUSES.filter((s) => s !== 'not_assessed'), undefined] : STATUSES)
</script>

<div class="status-picker" class:compact role="radiogroup" aria-label={label}>
  {#each options as option (option ?? 'none')}
    <button
      type="button"
      role="radio"
      aria-checked={value === option}
      class="st-{option ?? 'none'}"
      class:active={value === option}
      {disabled}
      onclick={() => onchange(option)}
    >
      {option ? STATUS_LABELS[option] : 'Ingen'}
    </button>
  {/each}
</div>
