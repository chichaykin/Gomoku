export class HapticsService {
  public enabled = true

  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'vibrate' in navigator
  }

  triggerMove(): void {
    if (!this.enabled || !this.isSupported()) return
    try {
      navigator.vibrate(10)
    } catch {
      // Fail-safe
    }
  }

  triggerWin(): void {
    if (!this.enabled || !this.isSupported()) return
    try {
      navigator.vibrate([30, 50, 30])
    } catch {
      // Fail-safe
    }
  }
}
