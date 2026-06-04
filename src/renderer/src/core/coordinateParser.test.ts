import { describe, it, expect } from 'vitest'
import { parseCoordinate } from './coordinateParser'

describe('parseCoordinate', () => {
  it('parseia o formato REAL do The Isle (amostra capturada do jogo)', () => {
    // tools/captured-coord.txt — 3 números crus, vírgula=milhar, ponto=decimal,
    // separados por vírgula + espaço(s); note o ESPAÇO DUPLO antes do 3º valor.
    const r = parseCoordinate('-22,105.51, 183,969.164,  22,571.219')
    expect(r).toEqual({
      status: 'ok',
      coord: { lat: -22105.51, long: 183969.164, alt: 22571.219 },
    })
  })

  it('lida com espaço simples e duplo entre valores', () => {
    expect(parseCoordinate('100.5, 200.25,  300.75')).toEqual({
      status: 'ok',
      coord: { lat: 100.5, long: 200.25, alt: 300.75 },
    })
  })

  it('aceita dois valores (sem altitude)', () => {
    expect(parseCoordinate('-22,105.51, 183,969.164')).toEqual({
      status: 'ok',
      coord: { lat: -22105.51, long: 183969.164 },
    })
  })

  it('marca como malformed quando parece coordenada mas não casa', () => {
    expect(parseCoordinate('12.5, , 30.1').status).toBe('malformed')
    expect(parseCoordinate('10.0, abc, 30.1').status).toBe('malformed')
  })

  it('ignora texto que claramente não é coordenada', () => {
    expect(parseCoordinate('https://google.com').status).toBe('not-a-coord')
    expect(parseCoordinate('').status).toBe('not-a-coord')
    expect(parseCoordinate('oi, tudo bem?').status).toBe('not-a-coord')
  })
})
