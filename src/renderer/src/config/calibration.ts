import type { CalibPoint } from '../core/mapProjection'

// Espaço lógico do mapa (quadrado). Calibração e projeção vivem em [0, WORLD].
// O MapView exibe esse espaço com zoom/pan; o CalibrationPanel exibe sem zoom.
export const WORLD = 1000

const STORAGE_KEY = 'ibm.calibration.gateway'

// A calibração é feita pelo usuário (modo calibração) e persistida no localStorage.
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
