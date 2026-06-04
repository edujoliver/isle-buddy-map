import type { Peer } from '../types'
import { createProjection } from '../core/mapProjection'
import { GATEWAY_CALIBRATION, MAP_SIZE } from '../config/calibration'
import { PlayerMarker } from './PlayerMarker'
import mapUrl from '../assets/gateway-map.png'

const proj = createProjection(GATEWAY_CALIBRATION)

function clamp(v: number, max: number): number {
  return Math.max(0, Math.min(max, v))
}

export function MapView({ peers }: { peers: Peer[] }) {
  return (
    <div
      className="map"
      style={{
        width: MAP_SIZE.w,
        height: MAP_SIZE.h,
        backgroundImage: `url(${mapUrl})`,
        backgroundSize: 'cover',
      }}
    >
      {peers.map((p) => {
        const { x, y } = proj.project(p)
        return (
          <PlayerMarker key={p.id} peer={p} x={clamp(x, MAP_SIZE.w)} y={clamp(y, MAP_SIZE.h)} />
        )
      })}
    </div>
  )
}
