import type { Peer, Marker } from '../types'

// Estado bruto do Presence: Record<key, Array<payload & { presence_ref }>>.
// Pega o meta mais recente de cada key (dedupe), mapeia para Peer e filtra
// quem não tem posição válida.
export function presenceToPeers(state: Record<string, any[]>): Peer[] {
  const peers: Peer[] = []
  for (const metas of Object.values(state)) {
    if (!metas?.length) continue
    const m = metas[metas.length - 1] // meta mais recente dessa key
    peers.push({
      id: m.id,
      name: m.name,
      lat: m.lat,
      long: m.long,
      alt: m.alt,
      updatedAt: m.updatedAt,
    })
  }
  return peers.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.long))
}

// Junta as marcações de TODOS os jogadores da sala (cada um carrega as suas no
// próprio estado de presença).
export function presenceToMarkers(state: Record<string, any[]>): Marker[] {
  const out: Marker[] = []
  for (const metas of Object.values(state)) {
    if (!metas?.length) continue
    const m = metas[metas.length - 1]
    if (Array.isArray(m.markers)) {
      for (const mk of m.markers) {
        if (mk && Number.isFinite(mk.lat) && Number.isFinite(mk.long)) out.push(mk as Marker)
      }
    }
  }
  return out
}
