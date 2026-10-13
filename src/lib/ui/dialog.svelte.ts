// Egen dialogruta med tydliga knappar

export interface DialogOptions {
  title: string
  message: string
  confirm: string
  cancel?: string
  danger?: boolean
}

class DialogState {
  current = $state<(DialogOptions & { resolve: (ok: boolean | null) => void }) | null>(null)

  // true = bekräfta, false = avbryt-knappen, null = stängd med Esc.
  ask = (options: DialogOptions): Promise<boolean | null> =>
    new Promise((resolve) => {
      this.current?.resolve(null)
      this.current = { ...options, resolve }
    })

  answer = (ok: boolean | null): void => {
    const c = this.current
    this.current = null
    c?.resolve(ok)
  }
}

export const dialog = new DialogState()
