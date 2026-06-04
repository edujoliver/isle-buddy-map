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

export function MapView({
  peers,
  calibration,
  layers,
  manualPins,
}: {
  peers: Peer[]
  calibration: CalibPoint[] | null
  layers: LayerState
  manualPins: Coordinate[]
}) {
  const vpRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ zoom: 0.6, x: 0, y: 0 })
  const drag = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  const proj = useMemo(
    () => (calibration && calibration.length >= 2 ? createProjection(calibration) : null),
    [calibration],
  )

  useEffect(() => {
    const el = vpRef.current
    if (!el) return
    const w = el.clientWidth
    const h = el.clientHeight
    const zoom = (Math.min(w, h) / WORLD) * 0.94
    setView({ zoom, x: (w - WORLD * zoom) / 2, y: (h - WORLD * zoom) / 2 })
  }, [])

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
  const toScreen = (wx: number, wy: number): { x: number; y: number } => ({
    x: wx * view.zoom + view.x,
    y: wy * view.zoom + view.y,
  })

  return (
    <div
      className="map-vp"
      ref={vpRef}
      onWheel={onWheel}
      onMouseDown={onDown}
      onMouseMove={onMove}
      onMouseUp={onUp}
      onMouseLeave={onUp}
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
        {layers.radar && <div className="radar" />}
        {layers.grid && <MapGrid zoom={view.zoom} />}
      </div>

      {proj &&
        peers.map((p) => {
          const wp = proj.project(p)
          const s = toScreen(wp.x, wp.y)
          return <PlayerMarker key={p.id} peer={p} x={s.x} y={s.y} />
        })}

      {proj &&
        manualPins.map((c, i) => {
          const wp = proj.project(c)
          const s = toScreen(wp.x, wp.y)
          return (
            <div key={`mp${i}`} className="manual-pin" style={{ left: s.x, top: s.y }}>
              ✕
            </div>
          )
        })}

      <div className="map-hint">scroll: zoom · arrastar: mover</div>
    </div>
  )
}
