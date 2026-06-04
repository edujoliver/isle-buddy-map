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

export type MarkerKind = 'rally' | 'enemy' | 'danger' | 'food' | 'water' | 'look'

export interface Marker {
  id: string
  kind: MarkerKind
  lat: number
  long: number
  ownerId: string
  ownerName: string
}

export interface Stroke {
  id: string
  ownerId: string
  pts: number[] // [x0,y0,x1,y1,...] em coords do mundo (compacto p/ broadcast)
  t: number // createdAt (ms)
}

export interface LayerState {
  grid: boolean
  radar: boolean
  water: boolean
  mud: boolean
  structures: boolean
  sanctuaries: boolean
  migration: boolean
  night: boolean
}
