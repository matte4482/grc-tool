<script lang="ts">
  // Status som liten bricka i en rad. `excluded` = varför kontrollen inte bedöms (scope.ts).

  import { STATUS_LABELS } from '../lib/assessment'
  import type { Status } from '../lib/project/schema'
  import type { Exclusion } from '../lib/scope'

  let { status, excluded }: { status: Status; excluded?: Exclusion | boolean } = $props()
  const label = $derived(excluded === 'profile' ? 'Utanför nivå' : excluded ? 'Ej tillämplig' : STATUS_LABELS[status])
</script>

<span class="badge-status st-{excluded ? 'excluded' : status}">{label}</span>
