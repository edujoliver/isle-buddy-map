export interface Coordinate {
  lat: number
  long: number
  alt?: number
}

export type ParseResult =
  | { status: 'ok'; coord: Coordinate }
  | { status: 'malformed' } // tem cara de coordenada mas não casou -> avisar
  | { status: 'not-a-coord' } // texto qualquer -> ignorar em silêncio

export interface Peer {
  id: string
  name: string
  lat: number
  long: number
  alt?: number
  updatedAt: number
}
