import { useEffect, useRef, useState } from 'react'
import { sfx, initAudio } from '../fx/audio'

const LINES = [
  '> ISLE BUDDY MAP // v0.1.0',
  '> INITIALIZING TRACKING SUBSYSTEM .......... OK',
  '> CLIPBOARD MONITOR ........................ ONLINE',
  '> GATEWAY UPLINK ........................... ONLINE',
  '> PRESENCE CHANNEL ......................... READY',
  '> EAC-SAFE MODE ............................ ACTIVE',
  '> ALL SYSTEMS NOMINAL.',
]

export function BootSequence({ onDone }: { onDone: () => void }) {
  const [started, setStarted] = useState(false)
  const [count, setCount] = useState(0)
  const timers = useRef<number[]>([])

  const start = (): void => {
    if (started) return
    setStarted(true)
    initAudio()
    sfx.boot()
    LINES.forEach((_, i) => {
      const id = window.setTimeout(
        () => {
          sfx.type()
          if (i % 2 === 0) sfx.hover()
          setCount(i + 1)
          if (i === LINES.length - 1) {
            const done = window.setTimeout(() => {
              sfx.connect()
              onDone()
            }, 800)
            timers.current.push(done)
          }
        },
        260 * (i + 1),
      )
      timers.current.push(id)
    })
  }

  useEffect(() => () => timers.current.forEach((t) => clearTimeout(t)), [])

  return (
    <div className="boot" onClick={start}>
      <div className="boot-scan" />
      <div className="boot-inner">
        <div className="boot-title glitch" data-text="ISLE BUDDY MAP">
          ISLE BUDDY MAP
        </div>
        <div className="boot-sub">THE ISLE · EVRIMA · GATEWAY TRACKER</div>
        {!started ? (
          <div className="boot-prompt blink">▶ CLIQUE PARA INICIAR</div>
        ) : (
          <pre className="boot-log">
            {LINES.slice(0, count).map((l, i) => (
              <div key={i} className="boot-line">
                {l}
              </div>
            ))}
            <span className="boot-cursor">█</span>
          </pre>
        )}
      </div>
    </div>
  )
}
