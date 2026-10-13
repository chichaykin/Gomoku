export class SoundService {
  private ctx: AudioContext | null = null
  public enabled = true

  private getContext(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
        this.ctx = new AudioCtxClass()
      } catch {
        this.ctx = null
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {})
    }
    return this.ctx
  }

  unlock(): void {
    if (typeof AudioContext !== 'undefined') {
      try {
        if (!this.ctx) {
          const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
          this.ctx = new AudioCtxClass()
        }
        if (this.ctx.state === 'suspended') {
          this.ctx.resume().catch(() => {})
        }
      } catch {
        // Fail-safe
      }
    }
  }

  playStone(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // 30 ms white noise burst
      const bufferSize = Math.floor(ctx.sampleRate * 0.03)
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const data = buffer.getChannelData(0)
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.7
      }

      const noise = ctx.createBufferSource()
      noise.buffer = buffer

      // Bandpass filter centered at 1800 Hz (resonates like solid stone/wood)
      const filter = ctx.createBiquadFilter()
      filter.type = 'bandpass'
      filter.frequency.setValueAtTime(1800, now)
      filter.Q.setValueAtTime(2.5, now)

      // Gain envelope
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.7, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035)

      noise.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      noise.start(now)
      noise.stop(now + 0.04)
    } catch {
      // Audio playback fail-safe
    }
  }

  playWin(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      // 3-note ascending arpeggio (C5, E5, G5)
      const notes = [523.25, 659.25, 783.99]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        const start = now + idx * 0.12
        gain.gain.setValueAtTime(0.001, start)
        gain.gain.linearRampToValueAtTime(0.25, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(start)
        osc.stop(start + 0.3)
      })
    } catch {
      // Fail-safe
    }
  }

  playLose(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      // 2 descending notes (440 Hz -> 330 Hz)
      const notes = [440, 330]

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(freq, now)

        const start = now + idx * 0.16
        gain.gain.setValueAtTime(0.001, start)
        gain.gain.linearRampToValueAtTime(0.2, start + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.26)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(start)
        osc.stop(start + 0.28)
      })
    } catch {
      // Fail-safe
    }
  }

  playClick(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.008)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 0.01)
    } catch {
      // Fail-safe
    }
  }
}
