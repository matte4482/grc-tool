<script lang="ts">
  // Status som liten bricka i en rad. `excluded` = bortvald i SoA.

  import { STATUS_LABELS } from '../lib/assessment'
  import type { Status } from '../lib/project/schema'

  let { status, excluded = false }: { status: Status; excluded?: boolean } = $props()
</script>

<span class="badge-status st-{excluded ? 'excluded' : status}">{excluded ? 'Ej tillämplig' : STATUS_LABELS[status]}</span>
