import type { Coordinate, ParseResult } from '../types'

export interface TrackerOutput {
  emit?: Coordinate
  warn?: boolean
}

// Política pura de envio: dedupe (não reenvia coord igual), sticky (texto
// não-coord não apaga a última), e sinaliza malformed para a UI avisar.
export function createPositionTracker() {
  let last: Coordinate | null = null
  return {
    consume(r: ParseResult): TrackerOutput {
      if (r.status === 'malformed') return { warn: true }
      if (r.status === 'not-a-coord') return {}
      const c = r.coord
      if (last && last.lat === c.lat && last.long === c.long) return {}
      last = c
      return { emit: c }
    },
  }
}
