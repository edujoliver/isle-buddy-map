import { useEffect, useRef, useState } from 'react'
import { JoinScreen } from './components/JoinScreen'
import { MapView } from './components/MapView'
import { CalibrationPanel } from './components/CalibrationPanel'
import { BootSequence } from './components/BootSequence'
import { parseCoordinate } from './core/coordinateParser'
import { createPositionTracker } from './core/positionTracker'
import { joinRoom, type RoomHandle } from './net/roomConnection'
import { loadCalibration } from './config/calibration'
import { sfx } from './fx/audio'
import type { CalibPoint } from './core/mapProjection'
import type { Coordinate, Peer } from './types'

const myId = crypto.randomUUID()
const THROTTLE_MS = 1500

export default function App() {
  const [booted, setBooted] = useState(false)
  const [joined, setJoined] = useState(false)
  const [peers, setPeers] = useState<Peer[]>([])
  const [warn, setWarn] = useState(false)
  const [calibration, setCalibration] = useState<CalibPoint[] | null>(loadCalibration())
  const [calibrating, setCalibrating] = useState(false)
  const [lastCoord, setLastCoord] = useState<Coordinate | null>(null)
  const room = useRef<RoomHandle | null>(null)
  const tracker = useRef(createPositionTracker())
  const lastSent = useRef(0)
  const pendingCoord = useRef<Coordinate | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSig = useRef('')

  // Sons de UI globais: hover/click em qualquer botão.
  useEffect(() => {
    let lastHover: Element | null = null
    const over = (e: Event): void => {
      const b = (e.target as HTMLElement).closest?.('button') ?? null
      if (b && b !== lastHover) {
        lastHover = b
        sfx.hover()
      } else if (!b) {
        lastHover = null
      }
    }
    const click = (e: Event): void => {
      if ((e.target as HTMLElement).closest?.('button')) sfx.click()
    }
    document.addEventListener('mouseover', over)
    document.addEventListener('click', click)
    return () => {
      document.removeEventListener('mouseover', over)
      document.removeEventListener('click', click)
    }
  }, [])

  // Ping sonoro sempre que alguma posição muda na sala.
  useEffect(() => {
    const sig = peers
      .map((p) => `${p.id}:${p.updatedAt}`)
      .sort()
      .join('|')
    if (sig && sig !== lastSig.current) {
      lastSig.current = sig
      sfx.ping()
    }
  }, [peers])

  const handleJoin = (name: string, code: string): void => {
    room.current = joinRoom(code, { id: myId, name }, setPeers)
    sfx.connect()
    setJoined(true)
  }

  // Throttle com trailing edge: não perde a posição final.
  const send = (c: Coordinate): void => {
    const since = Date.now() - lastSent.current
    if (since >= THROTTLE_MS) {
      lastSent.current = Date.now()
      room.current?.updatePosition(c)
    } else {
      pendingCoord.current = c
      if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null
          if (pendingCoord.current) {
            lastSent.current = Date.now()
            room.current?.updatePosition(pendingCoord.current)
            pendingCoord.current = null
          }
        }, THROTTLE_MS - since)
      }
    }
  }

  useEffect(() => {
    if (!joined) return
    const off = window.api.onClipboardText((text: string) => {
      const result = parseCoordinate(text)
      if (result.status === 'malformed') {
        setWarn(true)
        sfx.error()
        return
      }
      if (result.status === 'ok') {
        setLastCoord(result.coord) // sempre disponível para a calibração
        const out = tracker.current.consume(result) // dedupe para o envio
        if (out.emit) send(out.emit)
      }
    })
    return () => {
      off?.()
      if (timer.current) clearTimeout(timer.current)
      room.current?.leave()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [joined])

  if (!booted) return <BootSequence onDone={() => setBooted(true)} />
  if (!joined) return <JoinScreen onJoin={handleJoin} />

  if (calibrating) {
    return (
      <CalibrationPanel
        lastCoord={lastCoord}
        onDone={(pts) => {
          setCalibration(pts)
          setCalibrating(false)
        }}
        onCancel={() => setCalibrating(false)}
      />
    )
  }

  return (
    <>
      <div className="topbar">
        <span className="brand">
          ISLE BUDDY MAP<span className="sep">//</span>GATEWAY
        </span>
        <div className="topbar-right">
          <span className={calibration ? 'status-ok' : 'status-warn'}>
            {calibration ? `● CALIBRADO · ${calibration.length} PTS` : '▲ MAPA NÃO CALIBRADO'}
          </span>
          <button onClick={() => setCalibrating(true)}>Calibrar</button>
        </div>
      </div>
      {warn && (
        <div className="warn" onClick={() => setWarn(false)}>
          Formato de coordenada não reconhecido — o jogo pode ter mudado. (clique pra fechar)
        </div>
      )}
      <MapView peers={peers} calibration={calibration} />
    </>
  )
}
