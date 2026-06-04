import { useEffect, useMemo, useRef, useState, type WheelEvent, type MouseEvent } from 'react'
import type { Coordinate, Peer, LayerState } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { createProjection } from '../core/mapProjection'
import { WORLD } from '../config/calibration'
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
  myPos,
  waypoints,
  onAddWaypoint,
  onRemoveWaypoint,
}: {
  peers: Peer[]
  calibration: CalibPoint[] | null
  layers: LayerState
  manualPins: Coordinate[]
  myPos: Coordinate | null
  waypoints: Coordinate[]
  onAddWaypoint: (c: Coordinate) => void
  onRemoveWaypoint: (i: number) => void
}) {
  const vpRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ zoom: 0.6, x: 0, y: 0 })
  const [size, setSize] = useState({ w: 0, h: 0 })
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

  const onWheel = (e: WheelEvent<HTMLDivElement>): void => {
    const el = vpRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    setView((v) => {
      const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15
      const zoom = Math.max(0.15, Math.min(10, v.zoom * factor))
      return { zoom, x: mx - (mx - v.x) * (zoom / v.zoom), y: my - (my - v.y) * (zoom / v.zoom) }
    })
  }
  const onDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (e.button !== 0) return
    drag.current = { mx: e.clientX, my: e.clientY, px: view.x, py: view.y }
  }
  const onMove = (e: MouseEvent<HTMLDivElement>): void => {
    const d = drag.current
    if (!d) return
    setView((v) => ({ ...v, x: d.px + (e.clientX - d.mx), y: d.py + (e.clientY - d.my) }))
  }
  const onUp = (): void => {
    drag.current = null
  }

  // botão direito: remove o waypoint clicado, ou adiciona um novo
  const onContext = (e: MouseEvent<HTMLDivElement>): void => {
    e.preventDefault()
    if (!proj) return
    const el = vpRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    for (let i = 0; i < waypoints.length; i++) {
      const wp = proj.project(waypoints[i])
      const s = toScreen(wp.x, wp.y)
      if (Math.hypot(s.x - sx, s.y - sy) < 16) {
        onRemoveWaypoint(i)
        return
      }
    }
    onAddWaypoint(proj.unproject((sx - view.x) / view.zoom, (sy - view.y) / view.zoom))
  }

  const meScreen = proj && myPos ? toScreen(proj.project(myPos).x, proj.project(myPos).y) : null

  return (
    <div
      className="map-vp"
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

      {/* linhas dos waypoints até você */}
      {proj && meScreen && waypoints.length > 0 && (
        <svg className="overlay-svg">
          {waypoints.map((c, i) => {
            const wp = proj.project(c)
            const s = toScreen(wp.x, wp.y)
            return (
              <line key={i} className="wp-line" x1={meScreen.x} y1={meScreen.y} x2={s.x} y2={s.y} />
            )
          })}
        </svg>
      )}

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
        waypoints.map((c, i) => {
          const s = toScreen(proj.project(c).x, proj.project(c).y)
          return (
            <div key={`wp${i}`} className="waypoint" style={{ left: s.x, top: s.y }}>
              <span className="wp-flag">⚑</span>
              {myPos && <span className="wp-dist">{formatDist(myPos, c)}</span>}
            </div>
          )
        })}

      <div className="map-hint">scroll: zoom · arrastar: mover · botão direito: waypoint (clique nele p/ remover)</div>
    </div>
  )
}
