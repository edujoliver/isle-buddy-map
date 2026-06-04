import { describe, it, expect } from 'vitest'
import { createPositionTracker } from './positionTracker'

describe('positionTracker', () => {
  it('emite na primeira coordenada e dedupe na repetição', () => {
    const t = createPositionTracker()
    const a = t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(a).toEqual({ emit: { lat: 1, long: 2 } })
    const b = t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(b).toEqual({}) // dedupe: nada a emitir
  })

  it('emite de novo quando a coordenada muda', () => {
    const t = createPositionTracker()
    t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    const c = t.consume({ status: 'ok', coord: { lat: 3, long: 4 } })
    expect(c).toEqual({ emit: { lat: 3, long: 4 } })
  })

  it('sticky: texto não-coord não emite e não apaga a última', () => {
    const t = createPositionTracker()
    t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(t.consume({ status: 'not-a-coord' })).toEqual({})
    expect(t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })).toEqual({})
  })

  it('sinaliza warn em malformed', () => {
    const t = createPositionTracker()
    expect(t.consume({ status: 'malformed' })).toEqual({ warn: true })
  })
})
