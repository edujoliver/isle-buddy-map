import { useState } from 'react'

function randomCode(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem chars ambíguos
  const bytes = crypto.getRandomValues(new Uint8Array(8)) // CSPRNG
  let s = ''
  for (let i = 0; i < 8; i++) s += a[bytes[i] % a.length]
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

export function JoinScreen({ onJoin }: { onJoin: (name: string, room: string) => void }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  return (
    <div className="screen">
      <div className="panel">
        <div className="panel-header">⚠ ISLE BUDDY MAP</div>
        <div className="panel-body">
          <span className="field-label">Asset Name</span>
          <input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
          <span className="field-label">Room Code</span>
          <input
            placeholder="Código da sala"
            value={room}
            onChange={(e) => setRoom(e.target.value.toUpperCase())}
          />
          <div className="row">
            <button onClick={() => setRoom(randomCode())}>Gerar</button>
            <button disabled={!name || !room} onClick={() => onJoin(name.trim(), room.trim())}>
              Entrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
