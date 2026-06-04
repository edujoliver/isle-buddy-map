import type { CalibPoint } from '../core/mapProjection'

// Tamanho de EXIBIÇÃO do mapa (a imagem 1400x1400 é escalada para isto via
// background-size: contain). Cliques e marcadores vivem neste espaço 0..700.
export const MAP_SIZE = { w: 700, h: 700 }

const STORAGE_KEY = 'ibm.calibration.gateway'

// A calibração é feita pelo usuário (modo calibração) e persistida no localStorage.
// Sem bounds públicos confiáveis, calibrar com pontos reais é a forma precisa.
export function loadCalibration(): CalibPoint[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const pts = JSON.parse(raw)
    return Array.isArray(pts) && pts.length >= 2 ? (pts as CalibPoint[]) : null
  } catch {
    return null
  }
}

export function saveCalibration(points: CalibPoint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
}

export function clearCalibration(): void {
  localStorage.removeItem(STORAGE_KEY)
}
