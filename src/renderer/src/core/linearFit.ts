export interface Fit {
  slope: number
  intercept: number
}

// Mínimos quadrados 1D. Requer >= 2 pontos pareados.
export function linearFit(xs: number[], ys: number[]): Fit {
  const n = xs.length
  if (n < 2 || ys.length !== n) throw new Error('linearFit precisa de >= 2 pontos pareados')
  const sx = xs.reduce((a, b) => a + b, 0)
  const sy = ys.reduce((a, b) => a + b, 0)
  const sxx = xs.reduce((a, x) => a + x * x, 0)
  const sxy = xs.reduce((a, x, i) => a + x * ys[i], 0)
  const denom = n * sxx - sx * sx
  if (denom === 0) throw new Error('pontos de x degenerados (todos iguais)')
  const slope = (n * sxy - sx * sy) / denom
  const intercept = (sy - slope * sx) / n
  return { slope, intercept }
}
