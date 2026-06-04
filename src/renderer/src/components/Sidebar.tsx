import { useState } from 'react'
import type { Peer, LayerState } from '../types'

const LAYERS: { key: keyof LayerState; label: string }[] = [
  { key: 'grid', label: 'Grid tático' },
  { key: 'radar', label: 'Radar' },
  { key: 'water', label: 'Água / Rios' },
  { key: 'mud', label: 'Lama' },
  { key: 'structures', label: 'Estruturas' },
  { key: 'sanctuaries', label: 'Santuários' },
  { key: 'migration', label: 'Migração' },
  { key: 'night', label: 'Modo noturno' },
]

export function Sidebar({
  roomCode,
  peers,
  layers,
  onToggleLayer,
  onLeave,
  onPasteCoord,
  onCalibrate,
}: {
  roomCode: string
  peers: Peer[]
  layers: LayerState
  onToggleLayer: (k: keyof LayerState) => void
  onLeave: () => void
  onPasteCoord: (text: string) => void
  onCalibrate: () => void
}) {
  const [coordText, setCoordText] = useState('')

  const mark = (): void => {
    if (!coordText.trim()) return
    onPasteCoord(coordText)
    setCoordText('')
  }

  return (
    <aside className="sidebar">
      <div className="sb-brand">
        ISLE BUDDY MAP<span className="sep">//</span>GATEWAY
      </div>

      <div className="sb-section">
        <div className="sb-title">Sala</div>
        <div className="sb-room">{roomCode}</div>
        <button className="sb-leave" onClick={onLeave}>
          Sair da sala
        </button>
        <button className="sb-mini" onClick={onCalibrate}>
          Recalibrar mapa
        </button>
      </div>

      <div className="sb-section">
        <div className="sb-title">Marcar coordenada</div>
        <input
          className="sb-input"
          placeholder="-22,105.51, 183,969.164"
          value={coordText}
          onChange={(e) => setCoordText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && mark()}
        />
        <button onClick={mark} disabled={!coordText.trim()}>
          Marcar no mapa
        </button>
      </div>

      <div className="sb-section">
        <div className="sb-title">Camadas</div>
        <div className="sb-layers">
          {LAYERS.map(({ key, label }) => (
            <label key={key} className="sb-toggle">
              <input type="checkbox" checked={layers[key]} onChange={() => onToggleLayer(key)} />
              <span className="sb-check" />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="sb-section sb-grow">
        <div className="sb-title">Jogadores ({peers.length})</div>
        {peers.length === 0 ? (
          <div className="sb-empty">Ninguém com posição ainda. Copie sua coordenada no jogo.</div>
        ) : (
          <div className="sb-players">
            {peers.map((p) => (
              <div key={p.id} className="sb-player">
                <span className="sb-pdot" />
                <span className="sb-pname">{p.name}</span>
                <span className="sb-pcoord">
                  {(p.lat / 1000).toFixed(0)}, {(p.long / 1000).toFixed(0)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
