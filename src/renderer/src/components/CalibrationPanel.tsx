import { useState, type MouseEvent } from 'react'
import type { Coordinate } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { WORLD, saveCalibration } from '../config/calibration'
import mapUrl from '../assets/gateway-map.png'

const DISPLAY = 640 // tamanho fixo do mapa de calibração (sem zoom)

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
    // converte o clique (display) para o espaço lógico do mapa [0, WORLD]
    const x = ((e.clientX - rect.left) / rect.width) * WORLD
    const y = ((e.clientY - rect.top) / rect.height) * WORLD
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
          width: DISPLAY,
          height: DISPLAY,
          backgroundImage: `url(${mapUrl})`,
          backgroundSize: '100% 100%',
          cursor: lastCoord ? 'crosshair' : 'not-allowed',
        }}
        onClick={handleClick}
      >
        {points.map((p, i) => (
          <div
            key={i}
            className="calib-pin"
            style={{ left: (p.x / WORLD) * DISPLAY, top: (p.y / WORLD) * DISPLAY }}
          >
            {i + 1}
          </div>
        ))}
      </div>
    </div>
  )
}
