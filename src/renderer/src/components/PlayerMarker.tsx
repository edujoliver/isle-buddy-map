import type { Peer } from '../types'

export function PlayerMarker({ peer, x, y }: { peer: Peer; x: number; y: number }) {
  const ageMs = Date.now() - peer.updatedAt
  const stale = ageMs > 60_000
  return (
    <div className="marker" style={{ left: x, top: y, opacity: stale ? 0.4 : 1 }}>
      {!stale && <span className="ping" />}
      <span className="dot" />
      <span className="label">
        {peer.name}
        {stale ? ` (visto há ${Math.round(ageMs / 1000)}s)` : ''}
      </span>
    </div>
  )
}
