import { WORLD } from '../config/calibration'

const N_MAIN = 8

// Grid tático estilo Squad: linhas finas, desenhado em SCREEN-SPACE (fora do
// transform de zoom) para ficar sempre nítido. Subdivide em 3×3 conforme o zoom.
export function MapGrid({
  zoom,
  panX,
  panY,
  vw,
  vh,
}: {
  zoom: number
  panX: number
  panY: number
  vw: number
  vh: number
}) {
  const cellPx0 = (WORLD / N_MAIN) * zoom
  let levels = 0
  let cellPx = cellPx0
  while (cellPx > 130 && levels < 2) {
    levels++
    cellPx /= 3
  }

  const x0 = panX
  const x1 = panX + WORLD * zoom
  const y0 = panY
  const y1 = panY + WORLD * zoom

  const lines: JSX.Element[] = []
  const drawLevel = (div: number, cls: string): void => {
    const step = WORLD / div
    for (let i = 0; i <= div; i++) {
      const w = i * step
      const sx = w * zoom + panX
      const sy = w * zoom + panY
      if (sx >= -1 && sx <= vw + 1) {
        lines.push(<line key={`${cls}v${i}`} className={cls} x1={sx} y1={y0} x2={sx} y2={y1} />)
      }
      if (sy >= -1 && sy <= vh + 1) {
        lines.push(<line key={`${cls}h${i}`} className={cls} x1={x0} y1={sy} x2={x1} y2={sy} />)
      }
    }
  }
  // do mais fino para o mais grosso, para as linhas grossas ficarem por cima
  if (levels >= 2) drawLevel(N_MAIN * 9, 'g-sub2')
  if (levels >= 1) drawLevel(N_MAIN * 3, 'g-sub1')
  drawLevel(N_MAIN, 'g-main')

  return (
    <svg className="map-grid" width={vw} height={vh}>
      {lines}
    </svg>
  )
}
