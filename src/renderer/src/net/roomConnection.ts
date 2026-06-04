import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabaseClient'
import { presenceToPeers } from '../core/presenceToPeers'
import type { Coordinate, Peer } from '../types'

export interface RoomHandle {
  updatePosition(c: Coordinate): void
  leave(): void
}

export function joinRoom(
  roomCode: string,
  me: { id: string; name: string },
  onPeers: (peers: Peer[]) => void,
): RoomHandle {
  const channel: RealtimeChannel = supabase.channel(`room:${roomCode}`, {
    config: { presence: { key: me.id } },
  })

  let state: Peer = { id: me.id, name: me.name, lat: NaN, long: NaN, updatedAt: 0 }
  let subscribed = false
  let pending: Peer | null = null

  const emitPeers = (): void => onPeers(presenceToPeers(channel.presenceState()))

  channel
    .on('presence', { event: 'sync' }, emitPeers)
    .on('presence', { event: 'join' }, emitPeers)
    .on('presence', { event: 'leave' }, emitPeers)
    .subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        subscribed = true
        await channel.track(pending ?? state)
        pending = null
      }
    })

  return {
    updatePosition(c) {
      state = { ...state, ...c, updatedAt: Date.now() }
      if (subscribed) channel.track(state)
      else pending = state // re-aplicado quando subscrever (não perde a 1ª posição)
    },
    leave() {
      channel.untrack()
      supabase.removeChannel(channel)
    },
  }
}
