import { useMemo } from 'react'
import type { Peer } from '../types'
import type { CalibPoint } from '../core/mapProjection'
import { createProjection } from '../core/mapProjection'
import { MAP_SIZE } from '../config/calibration'
import { PlayerMarker } from './PlayerMarker'
import mapUrl from '../assets/gateway-map.png'

function clamp(v: number, max: number): number {
  return Math.max(0, Math.min(max, v))
}

export function MapView({
  peers,
  calibration,
}: {
  peers: Peer[]
  calibration: CalibPoint[] | null
}) {
  const proj = useMemo(
    () => (calibration && calibration.length >= 2 ? createProjection(calibration) : null),
    [calibration],
  )

  return (
    <div
      className="map"
      style={{
        width: MAP_SIZE.w,
        height: MAP_SIZE.h,
        backgroundImage: `url(${mapUrl})`,
        backgroundSize: 'contain',
      }}
    >
      {proj
        ? peers.map((p) => {
            const { x, y } = proj.project(p)
            return (
              <PlayerMarker key={p.id} peer={p} x={clamp(x, MAP_SIZE.w)} y={clamp(y, MAP_SIZE.h)} />
            )
          })
        : null}
    </div>
  )
}
