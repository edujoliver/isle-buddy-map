import { useEffect, useMemo, useRef, useState, type WheelEvent, type MouseEvent } from 'react'
import type { Peer } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { createProjection } from '../core/mapProjection'
import { WORLD } from '../config/calibration'
import { PlayerMarker } from './PlayerMarker'
import { MapGrid } from './MapGrid'
import mapUrl from '../assets/gateway-map.png'

interface View {
  zoom: number
  x: number
  y: number
}

export function MapView({
  peers,
  calibration,
}: {
  peers: Peer[]
  calibration: CalibPoint[] | null
}) {
  const vpRef = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<View>({ zoom: 0.6, x: 0, y: 0 })
  const drag = useRef<{ mx: number; my: number; px: number; py: number; moved: boolean } | null>(null)

  const proj = useMemo(
    () => (calibration && calibration.length >= 2 ? createProjection(calibration) : null),
    [calibration],
  )

  // Enquadra o mapa inteiro ao montar.
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
      const zoom = Math.max(0.15, Math.min(8, v.zoom * factor))
      // mantém o ponto sob o cursor fixo
      const x = mx - (mx - v.x) * (zoom / v.zoom)
      const y = my - (my - v.y) * (zoom / v.zoom)
      return { zoom, x, y }
    })
  }

  const onDown = (e: MouseEvent<HTMLDivElement>): void => {
    drag.current = { mx: e.clientX, my: e.clientY, px: view.x, py: view.y, moved: false }
  }
  const onMove = (e: MouseEvent<HTMLDivElement>): void => {
    const d = drag.current
    if (!d) return
    d.moved = true
    setView((v) => ({ ...v, x: d.px + (e.clientX - d.mx), y: d.py + (e.clientY - d.my) }))
  }
  const onUp = (): void => {
    drag.current = null
  }

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
          backgroundImage: `url(${mapUrl})`,
        }}
      >
        <div className="radar" />
        <MapGrid />
      </div>

      {proj &&
        peers.map((p) => {
          const wp = proj.project(p)
          return (
            <PlayerMarker
              key={p.id}
              peer={p}
              x={wp.x * view.zoom + view.x}
              y={wp.y * view.zoom + view.y}
            />
          )
        })}

      <div className="map-hint">scroll: zoom · arrastar: mover</div>
    </div>
  )
}
