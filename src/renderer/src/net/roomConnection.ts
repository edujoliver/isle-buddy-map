import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { presenceToPeers, presenceToMarkers } from '../core/presenceToPeers'
import type { Coordinate, Peer, Marker, Stroke } from '../types'

interface PresenceState extends Peer {
  markers: Marker[]
}

export interface RoomHandle {
  updatePosition(c: Coordinate): void
  setMarkers(markers: Marker[]): void
  sendStroke(stroke: Stroke): void
  leave(): void
}

export interface RoomCallbacks {
  onPeers: (peers: Peer[]) => void
  onMarkers: (markers: Marker[]) => void
  onStroke: (stroke: Stroke) => void
}

export function joinRoom(
  roomCode: string,
  me: { id: string; name: string },
  cb: RoomCallbacks,
): RoomHandle {
  const channel: RealtimeChannel = supabase.channel(`room:${roomCode}`, {
    config: { presence: { key: me.id }, broadcast: { self: false } },
  })

  let state: PresenceState = {
    id: me.id,
    name: me.name,
    lat: NaN,
    long: NaN,
    updatedAt: 0,
    markers: [],
  }
  let subscribed = false

  const emit = (): void => {
    const ps = channel.presenceState()
    cb.onPeers(presenceToPeers(ps))
    cb.onMarkers(presenceToMarkers(ps))
  }
  const track = (): void => {
    if (subscribed) channel.track(state)
  }

  channel
    .on('presence', { event: 'sync' }, emit)
    .on('presence', { event: 'join' }, emit)
    .on('presence', { event: 'leave' }, emit)
    .on('broadcast', { event: 'stroke' }, ({ payload }) => cb.onStroke(payload as Stroke))
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true
        await channel.track(state) // usa o state mais recente (posição/markers já setados)
      }
    })

  return {
    updatePosition(c) {
      state = { ...state, ...c, updatedAt: Date.now() }
      track()
    },
    setMarkers(markers) {
      state = { ...state, markers }
      track()
    },
    sendStroke(stroke) {
      void channel.send({ type: 'broadcast', event: 'stroke', payload: stroke })
    },
    leave() {
      channel.untrack()
      supabase.removeChannel(channel)
    },
  }
}
