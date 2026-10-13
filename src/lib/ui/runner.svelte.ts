// Kör knapparnas funktioner säkert.
// Varje vy skapar en egen Runner.

export class Runner {
  messages = $state<string[]>([])
  busy = $state(false)

  show = (...lines: string[]): void => {
    this.messages = lines
  }

  run = async (action: () => Promise<void> | void): Promise<void> => {
    this.messages = []
    this.busy = true
    try {
      await action()
    } catch (e) {
      this.messages = ['Något gick fel.', e instanceof Error ? e.message : String(e)]
    } finally {
      this.busy = false
    }
  }
}
