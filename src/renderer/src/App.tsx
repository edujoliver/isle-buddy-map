import { useEffect, useRef, useState } from 'react'
import { JoinScreen } from './components/JoinScreen'
import { MapView } from './components/MapView'
import { CalibrationPanel } from './components/CalibrationPanel'
import { parseCoordinate } from './core/coordinateParser'
import { createPositionTracker } from './core/positionTracker'
import { joinRoom, type RoomHandle } from './net/roomConnection'
import { loadCalibration } from './config/calibration'
import type { CalibPoint } from './core/mapProjection'
import type { Coordinate, Peer } from './types'

const myId = crypto.randomUUID()
const THROTTLE_MS = 1500

export default function App() {
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

  const handleJoin = (name: string, code: string): void => {
    room.current = joinRoom(code, { id: myId, name }, setPeers)
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
        <span>
          {calibration
            ? `✅ Mapa calibrado (${calibration.length} pontos)`
            : '⚠️ Mapa não calibrado — os marcadores só aparecem após calibrar'}
        </span>
        <button onClick={() => setCalibrating(true)}>Calibrar mapa</button>
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
