import { useEffect, useMemo, useRef, useState, type WheelEvent, type MouseEvent } from 'react'
import type { Coordinate, Peer, LayerState, Marker, Stroke } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { createProjection } from '../core/mapProjection'
import { WORLD } from '../config/calibration'
import { MARKER_BY_KIND } from '../config/markerKinds'
import { PlayerMarker } from './PlayerMarker'
import { MapGrid } from './MapGrid'
import baseUrl from '../assets/gateway-map.png'
import waterUrl from '../assets/layers/water.png'
import mudUrl from '../assets/layers/mud.png'
import structuresUrl from '../assets/layers/structures.png'
import sanctuariesUrl from '../assets/layers/sanctuaries.png'
import migrationUrl from '../assets/layers/migration.png'

interface View {
  zoom: number
  x: number
  y: number
}

function formatDist(a: Coordinate, b: Coordinate): string {
  const d = Math.sqrt((a.long - b.long) ** 2 + (a.lat - b.lat) ** 2) / 100
  return d >= 1000 ? `${(d / 1000).toFixed(2)} km` : `${Math.round(d)} m`
}

export function MapView({
  peers,
  calibration,
  layers,
  manualPins,
  markers,
  myId,
  strokes,
  drawMode,
  myPos,
  onOpenRadial,
  onRemoveMarker,
  onAddStroke,
}: {
  peers: Peer[]
  calibration: CalibPoint[] | null
  layers: LayerState
  manualPins: Coordinate[]
  markers: Marker[]
  myId: string
  strokes: Stroke[]
  drawMode: boolean
  myPos: Coordinate | null
  onOpenRadial: (x: number, y: number, coord: Coordinate) => void
  onRemoveMarker: (id: string) => void
  onAddStroke: (s: Stroke) => void
}) {
  const vpRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ zoom: 0.6, x: 0, y: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [drawing, setDrawing] = useState<number[] | null>(null)
  const drag = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  const proj = useMemo(
    () => (calibration && calibration.length >= 2 ? createProjection(calibration) : null),
    [calibration],
  )

  useEffect(() => {
    const el = vpRef.current
    if (!el) return
    const update = (): void => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const zoom = (Math.min(el.clientWidth, el.clientHeight) / WORLD) * 0.94
    setView({ zoom, x: (el.clientWidth - WORLD * zoom) / 2, y: (el.clientHeight - WORLD * zoom) / 2 })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
    x: wx * view.zoom + view.x,
    y: wy * view.zoom + view.y,
  })
  const toWorld = (sx: number, sy: number): [number, number] => [
    (sx - view.x) / view.zoom,
    (sy - view.y) / view.zoom,
  ]
  const localXY = (e: MouseEvent): [number, number] => {
    const r = vpRef.current!.getBoundingClientRect()
    return [e.clientX - r.left, e.clientY - r.top]
  }

  const onWheel = (e: WheelEvent<HTMLDivElement>): void => {
    const [mx, my] = localXY(e)
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const zoom = Math.max(0.15, Math.min(10, v.zoom * factor))
      return { zoom, x: mx - (mx - v.x) * (zoom / v.zoom), y: my - (my - v.y) * (zoom / v.zoom) }
    })
  }
  const onDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    if (drawMode) {
      const [sx, sy] = localXY(e)
      setDrawing(toWorld(sx, sy))
    } else {
      drag.current = { mx: e.clientX, my: e.clientY, px: view.x, py: view.y }
    }
  }
  const onMove = (e: MouseEvent<HTMLDivElement>): void => {
    if (drawing) {
      const [sx, sy] = localXY(e)
      const [wx, wy] = toWorld(sx, sy)
      setDrawing((p) => (p ? [...p, wx, wy] : [wx, wy]))
      return
    }
    const d = drag.current
    if (!d) return
    setView((v) => ({ ...v, x: d.px + (e.clientX - d.mx), y: d.py + (e.clientY - d.my) }))
  }
  const onUp = (): void => {
    drag.current = null
    if (drawing && drawing.length >= 4) {
      onAddStroke({ id: crypto.randomUUID(), ownerId: myId, pts: drawing, t: Date.now() })
    }
    if (drawing) setDrawing(null)
  }

  const onContext = (e: MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    if (!proj) return
    const [sx, sy] = localXY(e)
    for (const m of markers) {
      if (m.ownerId !== myId) continue
      const s = toScreen(proj.project(m).x, proj.project(m).y)
      if (Math.hypot(s.x - sx, s.y - sy) < 18) {
        onRemoveMarker(m.id)
        return
      }
    }
    const [wx, wy] = toWorld(sx, sy)
    onOpenRadial(e.clientX, e.clientY, proj.unproject(wx, wy))
  }

  const projectStroke = (pts: number[]): string => {
    let s = ''
    for (let i = 0; i < pts.length; i += 2) s += `${pts[i] * view.zoom + view.x},${pts[i + 1] * view.zoom + view.y} `
    return s.trim()
  }

  const meScreen = proj && myPos ? toScreen(proj.project(myPos).x, proj.project(myPos).y) : null

  return (
    <div
      className={`map-vp${drawMode ? ' drawing' : ''}`}
      ref={vpRef}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
      onContextMenu={onContext}
    >
      <div
        className="map-world"
        style={{
          width: WORLD,
          height: WORLD,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`,
        }}
      >
        <img className={`layer base${layers.night ? ' night' : ''}`} src={baseUrl} alt="" />
        {layers.water && <img className="layer" src={waterUrl} alt="" />}
        {layers.mud && <img className="layer" src={mudUrl} alt="" />}
        {layers.sanctuaries && <img className="layer" src={sanctuariesUrl} alt="" />}
        {layers.migration && <img className="layer" src={migrationUrl} alt="" />}
        {layers.structures && <img className="layer" src={structuresUrl} alt="" />}
      </div>

      {layers.radar && <div className="radar-overlay" />}
      {layers.radar && <div className="scanline" />}
      {layers.grid && size.w > 0 && (
        <MapGrid zoom={view.zoom} panX={view.x} panY={view.y} vw={size.w} vh={size.h} />
      )}

      {/* desenhos compartilhados + linhas dos marcadores */}
      <svg className="overlay-svg">
        {strokes.map((s) => (
          <polyline key={s.id} className="stroke" points={projectStroke(s.pts)} />
        ))}
        {drawing && <polyline className="stroke drawing-now" points={projectStroke(drawing)} />}
        {proj &&
          meScreen &&
          markers.map((m) => {
            const s = toScreen(proj.project(m).x, proj.project(m).y)
            return (
              <line key={`l${m.id}`} className="cm-line" x1={meScreen.x} y1={meScreen.y} x2={s.x} y2={s.y} />
            )
          })}
      </svg>

      {proj &&
        peers.map((p) => {
          const s = toScreen(proj.project(p).x, proj.project(p).y)
          return <PlayerMarker key={p.id} peer={p} x={s.x} y={s.y} />
        })}

      {proj &&
        manualPins.map((c, i) => {
          const s = toScreen(proj.project(c).x, proj.project(c).y)
          return (
            <div key={`mp${i}`} className="manual-pin" style={{ left: s.x, top: s.y }}>
              ✕
            </div>
          )
        })}

      {proj &&
        markers.map((m) => {
          const s = toScreen(proj.project(m).x, proj.project(m).y)
          const meta = MARKER_BY_KIND[m.kind]
          return (
            <div
              key={m.id}
              className="cmd-marker"
              style={{ left: s.x, top: s.y, borderColor: meta.color }}
            >
              <span className="cm-icon">{meta.icon}</span>
              {myPos && <span className="cm-dist">{formatDist(myPos, m)}</span>}
            </div>
          )
        })}

      <div className="map-hint">
        {drawMode
          ? '✏️ modo desenho: arraste para desenhar (todos veem)'
          : 'scroll: zoom · arrastar: mover · botão direito: marcação'}
      </div>
    </div>
  )
}
