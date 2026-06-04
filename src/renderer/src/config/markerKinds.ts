import type { MarkerKind } from '../types'

export interface MarkerMeta {
  kind: MarkerKind
  label: string
  icon: string
  color: string
}

// Tipos de marcação no estilo "comando de pelotão" (Squad), adaptados ao The Isle.
export const MARKER_KINDS: MarkerMeta[] = [
  { kind: 'rally', label: 'Encontro', icon: '🚩', color: '#45c5f0' },
  { kind: 'enemy', label: 'Inimigo', icon: '💀', color: '#e0533b' },
  { kind: 'danger', label: 'Perigo', icon: '⚠️', color: '#ffb02e' },
  { kind: 'food', label: 'Comida', icon: '🍖', color: '#c77dff' },
  { kind: 'water', label: 'Água', icon: '💧', color: '#3aa0ff' },
  { kind: 'look', label: 'Olhar', icon: '👁️', color: '#46c79a' },
]

export const MARKER_BY_KIND: Record<MarkerKind, MarkerMeta> = Object.fromEntries(
  MARKER_KINDS.map((m) => [m.kind, m]),
) as Record<MarkerKind, MarkerMeta>
