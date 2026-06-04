import { WORLD } from '../config/calibration'

const N = 10 // 10x10 células
const COLS = 'ABCDEFGHIJ'

// Grid tático sobreposto ao mapa (colunas A–J, linhas 1–10).
// As linhas usam non-scaling-stroke, então ficam finas em qualquer zoom.
export function MapGrid() {
  const cell = WORLD / N
  const lines = []
  for (let i = 0; i <= N; i++) {
    const p = i * cell
    lines.push(<line key={`v${i}`} x1={p} y1={0} x2={p} y2={WORLD} />)
    lines.push(<line key={`h${i}`} x1={0} y1={p} x2={WORLD} y2={p} />)
  }
  const labels = []
  for (let i = 0; i < N; i++) {
    labels.push(
      <text key={`c${i}`} x={i * cell + cell / 2} y={26} textAnchor="middle">
        {COLS[i]}
      </text>,
    )
    labels.push(
      <text key={`r${i}`} x={8} y={i * cell + cell / 2 + 8}>
        {i + 1}
      </text>,
    )
  }
  return (
    <svg className="map-grid" width={WORLD} height={WORLD} viewBox={`0 0 ${WORLD} ${WORLD}`}>
      <g className="grid-lines">{lines}</g>
      <rect className="grid-frame" x={0} y={0} width={WORLD} height={WORLD} />
      <g className="grid-labels">{labels}</g>
    </svg>
  )
}
