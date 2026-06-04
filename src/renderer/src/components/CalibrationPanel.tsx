import { useState, type MouseEvent } from 'react'
import type { Coordinate } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { MAP_SIZE, saveCalibration } from '../config/calibration'
import mapUrl from '../assets/gateway-map.png'

export function CalibrationPanel({
  lastCoord,
  onDone,
  onCancel,
}: {
  lastCoord: Coordinate | null
  onDone: (points: CalibPoint[]) => void
  onCancel: () => void
}) {
  const [points, setPoints] = useState<CalibPoint[]>([])

  const handleClick = (e: MouseEvent<HTMLDivElement>): void => {
    if (!lastCoord) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setPoints([...points, { lat: lastCoord.lat, long: lastCoord.long, x, y }])
  }

  const save = (): void => {
    saveCalibration(points)
    onDone(points)
  }

  return (
    <div className="calib">
      <div className="calib-bar">
        <strong>Calibração</strong>
        <span>
          No jogo, copie sua coordenada (TAB → Asset Location) e clique no mapa exatamente onde
          você está. Repita em 3+ lugares espalhados.
        </span>
        <span className="calib-coord">
          {lastCoord
            ? `coord atual: ${Math.round(lastCoord.lat)}, ${Math.round(lastCoord.long)}`
            : 'copie uma coordenada no jogo...'}
        </span>
        <span>Pontos: {points.length}</span>
        <button disabled={points.length < 3 || !lastCoord} onClick={save}>
          Salvar
        </button>
        <button onClick={() => setPoints([])}>Limpar</button>
        <button onClick={onCancel}>Cancelar</button>
      </div>
      <div
        className="map calib-map"
        style={{
          width: MAP_SIZE.w,
          height: MAP_SIZE.h,
          backgroundImage: `url(${mapUrl})`,
          backgroundSize: 'contain',
          cursor: lastCoord ? 'crosshair' : 'not-allowed',
        }}
        onClick={handleClick}
      >
        {points.map((p, i) => (
          <div key={i} className="calib-pin" style={{ left: p.x, top: p.y }}>
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
