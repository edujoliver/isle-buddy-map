import type { CalibPoint } from '../core/mapProjection'

// ⚠️ PLACEHOLDER — substituir pelos valores REAIS do Gateway na Task 9
// (imagem do mapa em boa resolução + 3+ pontos coord<->pixel medidos no jogo,
// e confirmar se há rotação de eixo). Estes valores só evitam o app quebrar e
// posicionam os marcadores de forma aproximada.
export const MAP_SIZE = { w: 1000, h: 1000 }

export const GATEWAY_CALIBRATION: CalibPoint[] = [
  { lat: -400000, long: -400000, x: 0, y: 1000 },
  { lat: 400000, long: 400000, x: 1000, y: 0 },
  { lat: 0, long: 0, x: 500, y: 500 },
]
