import type { Coordinate, ParseResult } from '../types'

// Formato REAL copiado pelo The Isle (Profile -> Asset Location), confirmado:
//   "-22,105.51, 183,969.164,  22,571.219"
//   3 números crus (SEM rótulos), vírgula = separador de MILHAR, ponto = decimal.
//   Os valores são separados entre si por vírgula + 1+ espaços (a vírgula de
//   milhar NUNCA tem espaço depois — é assim que desfazemos a ambiguidade).
//   nums[0], nums[1] = plano do mapa; nums[2] = altitude. A identidade exata
//   (lat vs long, e qual eixo de pixel) é resolvida na calibração (Task 9).
const NUM_RE = /^-?[\d,]+(?:\.\d+)?$/

export function parseCoordinate(text: string): ParseResult {
  const parts = text.trim().split(/,\s+/) // separa valores; milhar não casa (sem espaço)
  if (parts.length === 2 || parts.length === 3) {
    if (parts.every((p) => NUM_RE.test(p))) {
      const nums = parts.map((p) => parseFloat(p.replace(/,/g, '')))
      if (nums.slice(0, 2).every((n) => Number.isFinite(n))) {
        const coord: Coordinate = { lat: nums[0], long: nums[1] }
        if (nums.length === 3 && Number.isFinite(nums[2])) coord.alt = nums[2]
        return { status: 'ok', coord }
      }
    }
    // tem cara de coordenada (2+ partes numéricas) mas não casou -> avisar
    const numericish = parts.filter((p) => /\d/.test(p) && /[.,]/.test(p)).length
    if (numericish >= 2) return { status: 'malformed' }
  }
  return { status: 'not-a-coord' }
}
