// Áudio procedural via Web Audio API — sons sci-fi/HUD gerados na hora,
// sem nenhum arquivo. Inspirado nos bips de interface do The Isle.

let ctx: AudioContext | null = null
let master: GainNode | null = null
let muted = false

function ac(): AudioContext {
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new Ctor()
    master = ctx.createGain()
    master.gain.value = 0.5
    master.connect(ctx.destination)
  }
  return ctx
}

/** Retoma o contexto no primeiro gesto do usuário (política de autoplay). */
export function initAudio(): void {
  const c = ac()
  if (c.state === 'suspended') void c.resume()
}

export function toggleMute(): boolean {
  muted = !muted
  if (master) master.gain.value = muted ? 0 : 0.5
  return muted
}

interface ToneOpts {
  freq: number
  to?: number
  dur?: number
  type?: OscillatorType
  gain?: number
  delay?: number
}

function tone({ freq, to, dur = 0.12, type = 'sine', gain = 0.05, delay = 0 }: ToneOpts): void {
  if (muted) return
  const c = ac()
  const out = master ?? c.destination
  const t0 = c.currentTime + delay
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur)
  g.gain.setValueAtTime(0.0001, t0)
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(out)
  osc.start(t0)
  osc.stop(t0 + dur + 0.02)
}

function noise(dur = 0.08, gain = 0.03, hp = 800): void {
  if (muted) return
  const c = ac()
  const out = master ?? c.destination
  const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
  const src = c.createBufferSource()
  src.buffer = buf
  const filter = c.createBiquadFilter()
  filter.type = 'highpass'
  filter.frequency.value = hp
  const g = c.createGain()
  g.gain.setValueAtTime(gain, c.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur)
  src.connect(filter).connect(g).connect(out)
  src.start()
}

export const sfx = {
  hover(): void {
    tone({ freq: 1400, dur: 0.04, type: 'square', gain: 0.015 })
  },
  click(): void {
    tone({ freq: 660, to: 330, dur: 0.1, type: 'square', gain: 0.04 })
    noise(0.05, 0.02, 1200)
  },
  ping(): void {
    tone({ freq: 1320, to: 660, dur: 0.35, type: 'sine', gain: 0.045 })
    tone({ freq: 1980, to: 990, dur: 0.35, type: 'sine', gain: 0.015, delay: 0.01 })
  },
  connect(): void {
    tone({ freq: 440, dur: 0.1, type: 'triangle', gain: 0.04, delay: 0 })
    tone({ freq: 660, dur: 0.1, type: 'triangle', gain: 0.04, delay: 0.1 })
    tone({ freq: 990, dur: 0.18, type: 'triangle', gain: 0.05, delay: 0.2 })
  },
  error(): void {
    tone({ freq: 180, to: 120, dur: 0.3, type: 'sawtooth', gain: 0.05 })
    noise(0.12, 0.02, 300)
  },
  boot(): void {
    tone({ freq: 120, to: 880, dur: 0.7, type: 'sawtooth', gain: 0.03 })
    noise(0.5, 0.015, 400)
  },
  type(): void {
    tone({ freq: 2200, dur: 0.012, type: 'square', gain: 0.008 })
  },
}
