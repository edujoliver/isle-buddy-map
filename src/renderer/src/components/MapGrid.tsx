import { WORLD } from '../config/calibration'

const N_MAIN = 8
const COLS = 'ABCDEFGH'
const NUMPAD = [7, 8, 9, 4, 5, 6, 1, 2, 3] // layout de keypad do Squad

// Grid tático hierárquico: o grid principal (A–H × 1–8) subdivide em 3×3 keypads
// conforme o zoom aumenta (igual ao sistema de keypads do Squad).
export function MapGrid({ zoom }: { zoom: number }) {
  const cell = WORLD / N_MAIN

  // quantos níveis de subdivisão mostrar (cada nível divide a célula por 3)
  let levels = 0
  let cellPx = cell * zoom
  while (cellPx > 135 && levels < 2) {
    levels++
    cellPx /= 3
  }

  const lines: JSX.Element[] = []
  // linhas principais
  for (let i = 0; i <= N_MAIN; i++) {
    const p = i * cell
    lines.push(<line key={`mv${i}`} className="g-main" x1={p} y1={0} x2={p} y2={WORLD} />)
    lines.push(<line key={`mh${i}`} className="g-main" x1={0} y1={p} x2={WORLD} y2={p} />)
  }
  // subdivisões
  let div = N_MAIN
  for (let lvl = 1; lvl <= levels; lvl++) {
    div *= 3
    const sub = WORLD / div
    const cls = lvl === 1 ? 'g-sub1' : 'g-sub2'
    for (let i = 0; i <= div; i++) {
      if (i % 3 === 0) continue // linha já desenhada por um nível acima
      const p = i * sub
      lines.push(<line key={`${cls}v${i}`} className={cls} x1={p} y1={0} x2={p} y2={WORLD} />)
      lines.push(<line key={`${cls}h${i}`} className={cls} x1={0} y1={p} x2={WORLD} y2={p} />)
    }
  }

  const labels: JSX.Element[] = []
  // labels do grid principal
  for (let i = 0; i < N_MAIN; i++) {
    labels.push(
      <text key={`cl${i}`} className="g-label" x={i * cell + cell / 2} y={30} textAnchor="middle">
        {COLS[i]}
      </text>,
    )
    labels.push(
      <text key={`rl${i}`} className="g-label" x={12} y={i * cell + cell / 2 + 10}>
        {i + 1}
      </text>,
    )
  }
  // keypads 1–9 quando o primeiro nível de subdivisão está visível
  if (levels >= 1) {
    const k3 = cell / 3
    for (let cy = 0; cy < N_MAIN; cy++) {
      for (let cx = 0; cx < N_MAIN; cx++) {
        for (let k = 0; k < 9; k++) {
          const kx = k % 3
          const ky = (k / 3) | 0
          labels.push(
            <text
              key={`kp${cx}-${cy}-${k}`}
              className="g-kp"
              x={cx * cell + (kx + 0.5) * k3}
              y={cy * cell + (ky + 0.5) * k3 + 5}
              textAnchor="middle"
            >
              {NUMPAD[k]}
            </text>,
          )
        }
      }
    }
  }

  return (
    <svg className="map-grid" width={WORLD} height={WORLD} viewBox={`0 0 ${WORLD} ${WORLD}`}>
      {lines}
      <rect className="g-frame" x={0} y={0} width={WORLD} height={WORLD} />
      {labels}
    </svg>
  )
}
