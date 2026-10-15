// Vilken flik som visas i det öppna projektet, och genvägar mellan flikarna.

import type { Attention } from '../assessment'
import { allControls } from '../frameworks/schema'
import { store } from '../project/store.svelte'

class Navigation {
  tab = $state('overview')
  /** Filtret "behöver uppmärksamhet" som ska gälla när fliken öppnas. */
  attention = $state<Attention | undefined>()
  /** Kontroll eller risk som ska öppnas i fliken. */
  focus = $state<string | undefined>()

  go = (tab: string, attention?: Attention): void => {
    this.attention = attention
    this.focus = undefined
    this.tab = tab
  }

  /** Öppnar en kontroll eller risk, t.ex. från åtgärdsplanen. */
  show = (kind: 'control' | 'risk', id: string): void => {
    const tab = kind === 'risk' ? 'risks' : store.framework && allControls(store.framework).find((x) => x.control.id === id)?.section.id
    if (!tab) return
    this.attention = undefined
    this.focus = id
    this.tab = tab
  }
}

export const nav = new Navigation()
