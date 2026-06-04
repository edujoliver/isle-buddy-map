import { useEffect, useRef, useState } from 'react'
import { JoinScreen } from './components/JoinScreen'
import { MapView } from './components/MapView'
import { CalibrationPanel } from './components/CalibrationPanel'
import { BootSequence } from './components/BootSequence'
import { Sidebar } from './components/Sidebar'
import { parseCoordinate } from './core/coordinateParser'
import { createPositionTracker } from './core/positionTracker'
import { joinRoom, type RoomHandle } from './net/roomConnection'
import { loadCalibration } from './config/calibration'
import { sfx } from './fx/audio'
import type { CalibPoint } from './core/mapProjection'
import type { Coordinate, Peer, LayerState } from './types'

const myId = crypto.randomUUID()
const THROTTLE_MS = 1500

const DEFAULT_LAYERS: LayerState = {
  grid: true,
  radar: true,
  water: true,
  mud: true,
  structures: true,
  sanctuaries: false,
  migration: false,
  night: false,
}

export default function App() {
  const [booted, setBooted] = useState(false)
  const [joined, setJoined] = useState(false)
  const [roomCode, setRoomCode] = useState('')
  const [peers, setPeers] = useState<Peer[]>([])
  const [warn, setWarn] = useState(false)
  const [calibration, setCalibration] = useState<CalibPoint[] | null>(loadCalibration())
  const [calibrating, setCalibrating] = useState(false)
  const [lastCoord, setLastCoord] = useState<Coordinate | null>(null)
  const [layers, setLayers] = useState<LayerState>(DEFAULT_LAYERS)
  const [manualPins, setManualPins] = useState<Coordinate[]>([])
  const room = useRef<RoomHandle | null>(null)
  const tracker = useRef(createPositionTracker())
  const lastSent = useRef(0)
  const pendingCoord = useRef<Coordinate | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastSig = useRef('')

  useEffect(() => {
    let lastHover: Element | null = null
    const over = (e: Event): void => {
      const b = (e.target as HTMLElement).closest?.('button') ?? null
      if (b && b !== lastHover) {
        lastHover = b
        sfx.hover()
      } else if (!b) lastHover = null
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

  useEffect(() => {
    const sig = peers.map((p) => `${p.id}:${p.updatedAt}`).sort().join('|')
    if (sig && sig !== lastSig.current) {
      lastSig.current = sig
      sfx.ping()
    }
  }, [peers])

  const handleJoin = (name: string, code: string): void => {
    room.current = joinRoom(code, { id: myId, name }, setPeers)
    setRoomCode(code)
    sfx.connect()
    setJoined(true)
  }

  const handleLeave = (): void => {
    room.current?.leave()
    room.current = null
    tracker.current = createPositionTracker()
    setPeers([])
    setManualPins([])
    setJoined(false)
    sfx.click()
  }

  const toggleLayer = (k: keyof LayerState): void => setLayers((l) => ({ ...l, [k]: !l[k] }))

  const markCoord = (text: string): void => {
    const r = parseCoordinate(text)
    if (r.status === 'ok') {
      setManualPins((p) => [...p, r.coord])
      sfx.click()
    } else {
      setWarn(true)
      sfx.error()
    }
  }

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
        setLastCoord(result.coord)
        const out = tracker.current.consume(result)
        if (out.emit) send(out.emit)
      }
    })
    return () => {
      off?.()
      if (timer.current) clearTimeout(timer.current)
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
    <div className="app-shell">
      {warn && (
        <div className="warn" onClick={() => setWarn(false)}>
          Formato de coordenada não reconhecido — o jogo pode ter mudado. (clique pra fechar)
        </div>
      )}
      <div className="app-body">
        <Sidebar
          roomCode={roomCode}
          peers={peers}
          layers={layers}
          onToggleLayer={toggleLayer}
          onLeave={handleLeave}
          onPasteCoord={markCoord}
          onClearPins={() => setManualPins([])}
          pinCount={manualPins.length}
          onCalibrate={() => setCalibrating(true)}
        />
        <MapView peers={peers} calibration={calibration} layers={layers} manualPins={manualPins} />
      </div>
    </div>
  )
}
