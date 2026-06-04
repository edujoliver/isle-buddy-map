import type { Coordinate } from '../types'
import { linearFit } from './linearFit'

export interface CalibPoint {
  lat: number
  long: number
  x: number
  y: number
}

export interface Projection {
  project(c: Coordinate): { x: number; y: number }
  /** Inverso: pixel do mapa (world) -> coordenada do jogo. */
  unproject(x: number, y: number): Coordinate
}

// Modelo afim por eixo (sem rotação): x = f(long), y = g(lat).
// Inversão de sinal é capturada pelo slope. Para rotação, trocar por afim 2D (v2).
export function createProjection(points: CalibPoint[]): Projection {
  if (points.length < 2) throw new Error('calibração precisa de >= 2 pontos (use 3+)')
  const fx = linearFit(
    points.map((p) => p.long),
    points.map((p) => p.x),
  )
  const fy = linearFit(
    points.map((p) => p.lat),
    points.map((p) => p.y),
  )
  return {
    project: ({ lat, long }) => ({
      x: fx.slope * long + fx.intercept,
      y: fy.slope * lat + fy.intercept,
    }),
    unproject: (x, y) => ({
      long: (x - fx.intercept) / fx.slope,
      lat: (y - fy.intercept) / fy.slope,
    }),
  }
}
