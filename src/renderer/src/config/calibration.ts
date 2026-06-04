import type { CalibPoint } from '../core/mapProjection'

// Espaço lógico do mapa (quadrado). Calibração e projeção vivem em [0, WORLD].
export const WORLD = 1000

// ============================================================
// Calibração PADRÃO derivada do islemaps.com (engenharia reversa confirmada):
//   - O jogo copia "nº1, nº2, nº3" (nº1 = parser.lat, nº2 = parser.long).
//   - islemaps converte: lng = nº2/1000 ; lat = -nº1/1000 (Leaflet CRS.Simple).
//   - A imagem base (map-light) ocupa os bounds [W -560, E 674] × [S -616, N 618]
//     (quadrado de 1234 unidades).
//   => worldX = (nº2/1000 + 560) / 1234 * WORLD
//      worldY = (618 + nº1/1000) / 1234 * WORLD
// Validado: coord (-22105.51, 183969.164) → nx 0.6029, ny 0.4829 (bate exato).
// IMPORTANTE: assets/gateway-map.png DEVE ser a base do islemaps p/ isto valer.
// ============================================================
export const DEFAULT_CALIBRATION: CalibPoint[] = [
  { lat: 0, long: 0, x: 453.809, y: 500.81 },
  { lat: 400000, long: 400000, x: 777.958, y: 824.959 },
  { lat: -400000, long: 400000, x: 777.958, y: 176.661 },
  { lat: 400000, long: -400000, x: 129.66, y: 824.959 },
]

const STORAGE_KEY = 'ibm.calibration.gateway'

// Retorna a calibração salva pelo usuário, ou a padrão do islemaps (app já
// nasce calibrado). O usuário pode recalibrar manualmente para sobrescrever.
export function loadCalibration(): CalibPoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const pts = JSON.parse(raw)
      if (Array.isArray(pts) && pts.length >= 2) return pts as CalibPoint[]
    }
  } catch {
    /* ignore */
  }
  return DEFAULT_CALIBRATION
}

export function saveCalibration(points: CalibPoint[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(points))
}

export function clearCalibration(): void {
  localStorage.removeItem(STORAGE_KEY)
}
