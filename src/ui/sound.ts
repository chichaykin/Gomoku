export class SoundService {
  private ctx: AudioContext | null = null
  public enabled = true

  private getContext(): AudioContext | null {
    if (!this.enabled) return null
    if (!this.ctx && typeof AudioContext !== 'undefined') {
      try {
        const AudioCtxClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
        if (AudioCtxClass) {
          this.ctx = new AudioCtxClass()
        }
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
          const AudioCtxClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
          if (AudioCtxClass) {
            this.ctx = new AudioCtxClass()
          }
        }
        if (this.ctx && this.ctx.state === 'suspended') {
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

      // 1. Resonant Bronze Temple Gong (low fundamental + inharmonic partials)
      const gongFreqs = [146.83, 392.0, 587.33, 880.0]
      const gongGains = [0.35, 0.18, 0.12, 0.06]

      gongFreqs.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = i === 0 ? 'sine' : 'triangle'
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0.001, now)
        gain.gain.linearRampToValueAtTime(gongGains[i], now + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + (i === 0 ? 2.6 : 1.8))

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now)
        osc.stop(now + 2.7)
      })

      // 2. Ceremonial Koto / Shamisen Pentatonic Arpeggio (D4 -> F4 -> G4 -> A4 -> D5)
      const kotoNotes = [293.66, 349.23, 392.0, 440.0, 587.33]

      kotoNotes.forEach((freq, idx) => {
        const start = now + 0.12 + idx * 0.18

        const osc = ctx.createOscillator()
        const filter = ctx.createBiquadFilter()
        const gain = ctx.createGain()

        // Plucked string acoustic modeling
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(freq, start)

        filter.type = 'lowpass'
        filter.frequency.setValueAtTime(freq * 3.5, start)
        filter.frequency.exponentialRampToValueAtTime(freq * 1.1, start + 0.45)

        gain.gain.setValueAtTime(0.001, start)
        gain.gain.linearRampToValueAtTime(0.22, start + 0.015)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.8)

        osc.connect(filter)
        filter.connect(gain)
        gain.connect(ctx.destination)

        osc.start(start)
        osc.stop(start + 0.85)
      })
    } catch {
      // Audio playback fail-safe
    }
  }

  playLose(): void {
    const ctx = this.getContext()
    if (!ctx) return

    try {
      const now = ctx.currentTime

      // Contemplative bamboo flute tone (Shakuhachi style gentle descent)
      const osc = ctx.createOscillator()
      const filter = ctx.createBiquadFilter()
      const gain = ctx.createGain()

      osc.type = 'sine'
      osc.frequency.setValueAtTime(220.0, now)
      osc.frequency.exponentialRampToValueAtTime(146.83, now + 0.9)

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, now)
      filter.frequency.exponentialRampToValueAtTime(280, now + 0.9)

      gain.gain.setValueAtTime(0.001, now)
      gain.gain.linearRampToValueAtTime(0.2, now + 0.05)
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2)

      osc.connect(filter)
      filter.connect(gain)
      gain.connect(ctx.destination)

      osc.start(now)
      osc.stop(now + 1.25)
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
