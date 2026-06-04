import { describe, it, expect } from 'vitest'
import { createProjection } from './mapProjection'

// Pontos sintéticos: long->x com slope +, lat->y com slope - (Y cresce pra baixo)
const CALIB = [
  { lat: 0, long: 0, x: 50, y: 950 },
  { lat: 100, long: 100, x: 150, y: 850 },
  { lat: 200, long: 50, x: 100, y: 750 },
]

describe('mapProjection', () => {
  const proj = createProjection(CALIB)

  it('projeta um ponto de calibração de volta nos seus pixels', () => {
    const p = proj.project({ lat: 100, long: 100 })
    expect(p.x).toBeCloseTo(150, 0)
    expect(p.y).toBeCloseTo(850, 0)
  })

  it('projeta um ponto independente (não usado na calibração) de forma coerente', () => {
    // long=200 continua a reta de x; lat=300 continua a de y (decrescente)
    const p = proj.project({ lat: 300, long: 200 })
    expect(p.x).toBeGreaterThan(150) // x cresce com long
    expect(p.y).toBeLessThan(750) // y decresce com lat
  })
})
