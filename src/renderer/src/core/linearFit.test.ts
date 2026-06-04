import { describe, it, expect } from 'vitest'
import { linearFit } from './linearFit'

describe('linearFit', () => {
  it('recupera slope/intercept de uma reta perfeita', () => {
    // y = 2x + 1
    const f = linearFit([0, 1, 2, 3], [1, 3, 5, 7])
    expect(f.slope).toBeCloseTo(2)
    expect(f.intercept).toBeCloseTo(1)
  })

  it('lida com slope negativo (eixo invertido)', () => {
    // y = -3x + 10
    const f = linearFit([0, 1, 2], [10, 7, 4])
    expect(f.slope).toBeCloseTo(-3)
    expect(f.intercept).toBeCloseTo(10)
  })

  it('lança erro com menos de 2 pontos', () => {
    expect(() => linearFit([1], [1])).toThrow()
  })
})
