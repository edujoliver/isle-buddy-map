import { MARKER_KINDS } from '../config/markerKinds'
import type { MarkerKind } from '../types'

// Menu radial estilo Squad: abre no botão direito, tipos dispostos em círculo.
export function RadialMenu({
  x,
  y,
  onSelect,
  onClose,
}: {
  x: number
  y: number
  onSelect: (k: MarkerKind) => void
  onClose: () => void
}) {
  const n = MARKER_KINDS.length
  const radius = 78
  return (
    <div
      className="radial-backdrop"
      onClick={onClose}
      onContextMenu={(e) => {
        e.preventDefault()
        onClose()
      }}
    >
      <div className="radial" style={{ left: x, top: y }}>
        <div className="radial-center" />
        {MARKER_KINDS.map((m, i) => {
          const ang = (i / n) * Math.PI * 2 - Math.PI / 2
          return (
            <button
              key={m.kind}
              className="radial-item"
              style={{
                left: Math.cos(ang) * radius,
                top: Math.sin(ang) * radius,
                borderColor: m.color,
              }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect(m.kind)
              }}
            >
              <span className="ri-icon">{m.icon}</span>
              <span className="ri-label">{m.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
