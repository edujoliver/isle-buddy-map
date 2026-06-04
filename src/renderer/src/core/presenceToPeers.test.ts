import { describe, it, expect } from 'vitest'
import { presenceToPeers } from './presenceToPeers'

describe('presenceToPeers', () => {
  it('desembrulha presence_ref e mapeia para Peer', () => {
    const state = {
      u1: [{ presence_ref: 'r1', id: 'u1', name: 'Edu', lat: 1, long: 2, updatedAt: 10 }],
    }
    expect(presenceToPeers(state)).toEqual([
      { id: 'u1', name: 'Edu', lat: 1, long: 2, alt: undefined, updatedAt: 10 },
    ])
  })

  it('dedupe por key: usa o meta mais recente quando há mais de um', () => {
    const state = {
      u1: [
        { presence_ref: 'r1', id: 'u1', name: 'Edu', lat: 1, long: 2, updatedAt: 10 },
        { presence_ref: 'r2', id: 'u1', name: 'Edu', lat: 5, long: 6, updatedAt: 20 },
      ],
    }
    expect(presenceToPeers(state)).toHaveLength(1)
    expect(presenceToPeers(state)[0]).toMatchObject({ id: 'u1', lat: 5, long: 6 })
  })

  it('filtra peers sem posição válida', () => {
    const state = {
      u2: [{ presence_ref: 'r3', id: 'u2', name: 'Sem', lat: NaN, long: NaN, updatedAt: 0 }],
    }
    expect(presenceToPeers(state)).toEqual([])
  })
})
