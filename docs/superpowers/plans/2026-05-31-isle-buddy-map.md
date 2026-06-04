# Isle Buddy Map — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App desktop que lê a coordenada do The Isle do clipboard e mostra a posição dos amigos de uma sala ao vivo num mapa do Gateway, sem tocar no jogo (seguro pro EasyAntiCheat).

**Architecture:** Electron (processo principal lê o clipboard e repassa por IPC) + React (renderer com a UI, mapa e conexão). Supabase Realtime com **Presence** transporta as posições entre os membros da sala — sem banco, sem login. O núcleo de lógica (parser, projeção, política de envio) é separado em módulos **puros** testáveis; os módulos de I/O são verificados manualmente.

**Tech Stack:** Electron, React, TypeScript, electron-vite, Vitest, Supabase JS (`@supabase/supabase-js`).

**Spec de referência:** [docs/superpowers/specs/2026-05-31-isle-buddy-map-design.md](../specs/2026-05-31-isle-buddy-map-design.md)

---

## Estrutura de arquivos

```
isle-buddy-map/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── .env                          # SUPABASE_URL, SUPABASE_ANON_KEY (não commitar)
├── .env.example                  # modelo commitável
├── src/
│   ├── main/
│   │   ├── index.ts              # Electron main: cria janela, inicia ClipboardWatcher
│   │   └── clipboardWatcher.ts   # polling do clipboard, emite texto novo por IPC
│   ├── preload/
│   │   └── index.ts              # contextBridge: expõe onClipboardText() ao renderer
│   └── renderer/
│       ├── index.html
│       └── src/
│           ├── main.tsx          # entrypoint React
│           ├── App.tsx           # shell: JoinScreen <-> MapScreen + status
│           ├── types.ts          # Coordinate, Peer, ParseResult
│           ├── core/
│           │   ├── coordinateParser.ts   # PURO — texto -> ParseResult
│           │   ├── linearFit.ts          # PURO — regressão linear 1D
│           │   ├── mapProjection.ts      # PURO — {lat,long} -> {x,y}
│           │   └── positionTracker.ts    # PURO — dedupe/sticky/throttle de envio
│           ├── net/
│           │   ├── supabaseClient.ts     # cria o client a partir do .env
│           │   └── roomConnection.ts     # Presence: join/track/leave
│           ├── config/
│           │   └── calibration.ts        # pontos de calibração do Gateway
│           ├── components/
│           │   ├── JoinScreen.tsx
│           │   ├── MapView.tsx
│           │   └── PlayerMarker.tsx
│           └── assets/
│               └── gateway-map.png       # imagem do mapa (pendência de dados)
└── src/renderer/src/core/*.test.ts        # testes dos módulos puros (Vitest)
```

**Princípio de teste:** TDD completo nos módulos `core/*` (puros, alto valor). Os módulos `main/`, `net/` e `components/` são verificados manualmente (I/O e UI), com testes de fumaça quando baratos.

---

## Task 0: Scaffold do projeto

**Files:**
- Create: `package.json`, `electron.vite.config.ts`, `tsconfig.json`, `.env.example`, `.gitignore`, estrutura `src/`

- [ ] **Step 1: Scaffold electron-vite (template react-ts)**

Dentro de `C:\Users\Eduardo\Desktop\isle-buddy-map`:

Run: `npm create @quick-start/electron@latest . -- --template react-ts`
- Confirmar continuar mesmo com a pasta não vazia (já existe `docs/`). NÃO apagar `docs/`.
- Pacote: `isle-buddy-map`.

- [ ] **Step 2: Instalar dependências**

Run:
```bash
npm install
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 3: Adicionar script de teste no package.json**

Adicionar em `"scripts"`: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Criar .env.example e ajustar .gitignore**

> **Importante (electron-vite):** o renderer só enxerga vars com o prefixo
> `RENDERER_VITE_` em `import.meta.env`. O prefixo cru `VITE_` **não** é
> carregado. Por isso usamos `RENDERER_VITE_*`.

`.env.example`:
```
RENDERER_VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
RENDERER_VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```
Garantir que `.gitignore` contém `.env`.

- [ ] **Step 5: Garantir declaração de tipos do Vite no renderer**

Confirmar que existe `src/renderer/src/env.d.ts` com:
```ts
/// <reference types="vite/client" />
```
(necessário para `import.meta.env` e para importar `*.png` sem erro de `tsc`).
O template `react-ts` normalmente já cria; se não, criar.

- [ ] **Step 6: Inicializar git e primeiro commit**

Run:
```bash
git init
git add -A
git commit -m "chore: scaffold electron-vite react-ts + vitest + supabase"
```
Expected: repositório criado, commit inicial com o scaffold + docs.

---

## Task 1: Tipos + CoordinateParser (TDD)

Parser puro do texto copiado pelo jogo. Cobre os 3 estados da §5 do spec: coordenada válida, "parece coordenada mas não casa" (avisar), e "não é coordenada" (ignorar).

**Files:**
- Create: `src/renderer/src/types.ts`
- Create: `src/renderer/src/core/coordinateParser.ts`
- Test: `src/renderer/src/core/coordinateParser.test.ts`

- [ ] **Step 1: Definir tipos**

`types.ts`:
```ts
export interface Coordinate { lat: number; long: number; alt?: number }

export type ParseResult =
  | { status: 'ok'; coord: Coordinate }
  | { status: 'malformed' }      // tem "Lat"/"Long" mas não parseou -> avisar
  | { status: 'not-a-coord' }    // texto qualquer -> ignorar em silêncio

export interface Peer {
  id: string
  name: string
  lat: number
  long: number
  alt?: number
  updatedAt: number
}
```

- [ ] **Step 2: Escrever os testes que falham**

`coordinateParser.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { parseCoordinate } from './coordinateParser'

describe('parseCoordinate', () => {
  it('parseia o formato REAL do The Isle (amostra capturada do jogo)', () => {
    // tools/captured-coord.txt — 3 números crus, vírgula=milhar, ponto=decimal,
    // separados por vírgula + espaço(s); note o ESPAÇO DUPLO antes do 3º valor.
    const r = parseCoordinate('-22,105.51, 183,969.164,  22,571.219')
    expect(r).toEqual({
      status: 'ok',
      coord: { lat: -22105.51, long: 183969.164, alt: 22571.219 },
    })
  })

  it('lida com espaço simples e duplo entre valores', () => {
    expect(parseCoordinate('100.5, 200.25,  300.75')).toEqual({
      status: 'ok',
      coord: { lat: 100.5, long: 200.25, alt: 300.75 },
    })
  })

  it('aceita dois valores (sem altitude)', () => {
    expect(parseCoordinate('-22,105.51, 183,969.164')).toEqual({
      status: 'ok',
      coord: { lat: -22105.51, long: 183969.164 },
    })
  })

  it('marca como malformed quando parece coordenada mas não casa', () => {
    // formato com cara de coord (partes numéricas) mas com valor faltando/inválido
    expect(parseCoordinate('12.5, , 30.1').status).toBe('malformed')
    expect(parseCoordinate('10.0, abc, 30.1').status).toBe('malformed')
  })

  it('ignora texto que claramente não é coordenada', () => {
    expect(parseCoordinate('https://google.com').status).toBe('not-a-coord')
    expect(parseCoordinate('').status).toBe('not-a-coord')
    expect(parseCoordinate('oi, tudo bem?').status).toBe('not-a-coord')
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- coordinateParser`
Expected: FAIL ("parseCoordinate is not a function").

- [ ] **Step 4: Implementar**

`coordinateParser.ts`:
```ts
import type { Coordinate, ParseResult } from '../types'

// Formato REAL copiado pelo The Isle (Profile -> Asset Location), confirmado:
//   "-22,105.51, 183,969.164,  22,571.219"
//   3 números crus (SEM rótulos), vírgula = separador de MILHAR, ponto = decimal.
//   Os valores são separados entre si por vírgula + 1+ espaços (a vírgula de
//   milhar NUNCA tem espaço depois — é assim que desfazemos a ambiguidade).
//   nums[0], nums[1] = plano do mapa; nums[2] = altitude. A identidade exata
//   (lat vs long, e qual eixo de pixel) é resolvida na calibração (§8 / Task 9).
const NUM_RE = /^-?[\d,]+(?:\.\d+)?$/

export function parseCoordinate(text: string): ParseResult {
  const parts = text.trim().split(/,\s+/) // separa valores; milhar não casa (sem espaço)
  if (parts.length === 2 || parts.length === 3) {
    if (parts.every((p) => NUM_RE.test(p))) {
      const nums = parts.map((p) => parseFloat(p.replace(/,/g, '')))
      if (nums.slice(0, 2).every(Number.isFinite)) {
        const coord: Coordinate = { lat: nums[0], long: nums[1] }
        if (nums.length === 3 && Number.isFinite(nums[2])) coord.alt = nums[2]
        return { status: 'ok', coord }
      }
    }
    // tem cara de coordenada (2+ partes numéricas) mas não casou -> avisar (§5)
    const numericish = parts.filter((p) => /\d/.test(p) && /[.,]/.test(p)).length
    if (numericish >= 2) return { status: 'malformed' }
  }
  return { status: 'not-a-coord' }
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- coordinateParser`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/renderer/src/types.ts src/renderer/src/core/coordinateParser.ts src/renderer/src/core/coordinateParser.test.ts
git commit -m "feat: coordinate parser with malformed/not-a-coord states"
```

> ✅ **Amostra real do clipboard: OBTIDA** (`tools/captured-coord.txt` =
> `-22,105.51, 183,969.164,  22,571.219`). Parser e testes acima já fixados nesse
> formato real. Se um dia o jogo mudar o formato, atualizar este caso de teste.

---

## Task 2: linearFit + MapProjection (TDD)

Resolve a transformação coordenada→pixel por **regressão linear 1D por eixo** (a partir de 3+ pontos de calibração), captando inversão de sinal naturalmente (slope negativo). Testável com pontos sintéticos, sem depender dos dados reais do Gateway.

**Files:**
- Create: `src/renderer/src/core/linearFit.ts`
- Create: `src/renderer/src/core/mapProjection.ts`
- Test: `src/renderer/src/core/linearFit.test.ts`, `src/renderer/src/core/mapProjection.test.ts`

- [ ] **Step 1: Teste de linearFit (falha)**

`linearFit.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { linearFit } from './linearFit'

describe('linearFit', () => {
  it('recupera slope/intercept de uma reta perfeita', () => {
    // y = 2x + 1
    const f = linearFit([0, 1, 2, 3], [1, 3, 5, 7])
    expect(f.slope).toBeCloseTo(2)
    expect(f.intercept).toBeCloseTo(1)
  })

  it('lida com slope negativo (eixo invertido)', () => {
    // y = -3x + 10
    const f = linearFit([0, 1, 2], [10, 7, 4])
    expect(f.slope).toBeCloseTo(-3)
    expect(f.intercept).toBeCloseTo(10)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- linearFit`
Expected: FAIL.

- [ ] **Step 3: Implementar linearFit**

`linearFit.ts`:
```ts
export interface Fit { slope: number; intercept: number }

// Mínimos quadrados 1D. Requer >= 2 pontos.
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- linearFit`
Expected: PASS.

- [ ] **Step 5: Teste de mapProjection (falha)**

`mapProjection.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createProjection } from './mapProjection'

// Pontos sintéticos: long->x com slope +, lat->y com slope - (Y cresce pra baixo na imagem)
const CALIB = [
  { lat: 0,   long: 0,   x: 50,  y: 950 },
  { lat: 100, long: 100, x: 150, y: 850 },
  { lat: 200, long: 50,  x: 100, y: 750 },
]

describe('mapProjection', () => {
  const proj = createProjection(CALIB)

  it('projeta um ponto de calibração de volta nos seus pixels', () => {
    const p = proj.project({ lat: 100, long: 100 })
    expect(p.x).toBeCloseTo(150, 0)
    expect(p.y).toBeCloseTo(850, 0)
  })

  it('projeta um ponto independente (não usado na calibração) de forma coerente', () => {
    // long=200 deve continuar a reta de x; lat=300 deve continuar a de y (decrescente)
    const p = proj.project({ lat: 300, long: 200 })
    expect(p.x).toBeGreaterThan(150)   // x cresce com long
    expect(p.y).toBeLessThan(750)      // y decresce com lat
  })
})
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npm test -- mapProjection`
Expected: FAIL.

- [ ] **Step 7: Implementar mapProjection**

`mapProjection.ts`:
```ts
import type { Coordinate } from '../types'
import { linearFit } from './linearFit'

export interface CalibPoint { lat: number; long: number; x: number; y: number }
export interface Projection { project(c: Coordinate): { x: number; y: number } }

// Modelo afim por eixo (sem rotação): x = f(long), y = g(lat).
// Inversão de sinal é capturada pelo slope. Para rotação, trocar por afim 2D (v2).
export function createProjection(points: CalibPoint[]): Projection {
  if (points.length < 2) throw new Error('calibração precisa de >= 2 pontos (use 3+)')
  const fx = linearFit(points.map(p => p.long), points.map(p => p.x))
  const fy = linearFit(points.map(p => p.lat), points.map(p => p.y))
  return {
    project: ({ lat, long }) => ({
      x: fx.slope * long + fx.intercept,
      y: fy.slope * lat + fy.intercept,
    }),
  }
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm test -- mapProjection`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/renderer/src/core/linearFit.ts src/renderer/src/core/mapProjection.ts src/renderer/src/core/linearFit.test.ts src/renderer/src/core/mapProjection.test.ts
git commit -m "feat: linear-fit calibration + axis-aware map projection"
```

> **Pendência de dados:** §8/§11 — substituir os pontos sintéticos pelos reais do Gateway em `config/calibration.ts` (Task 9) e confirmar empiricamente se há rotação. Se houver, evoluir para afim 2D.

---

## Task 3: positionTracker (dedupe/sticky) (TDD)

Política pura que decide quando enviar uma nova posição, a partir de uma sequência de `ParseResult`. Implementa dedupe (não reenvia coord igual), sticky (texto não-coord não apaga a última), e sinaliza `malformed` pra UI avisar.

**Files:**
- Create: `src/renderer/src/core/positionTracker.ts`
- Test: `src/renderer/src/core/positionTracker.test.ts`

- [ ] **Step 1: Teste (falha)**

`positionTracker.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { createPositionTracker } from './positionTracker'

describe('positionTracker', () => {
  it('emite na primeira coordenada e dedupe na repetição', () => {
    const t = createPositionTracker()
    const a = t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(a).toEqual({ emit: { lat: 1, long: 2 } })
    const b = t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(b).toEqual({}) // dedupe: nada a emitir
  })

  it('emite de novo quando a coordenada muda', () => {
    const t = createPositionTracker()
    t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    const c = t.consume({ status: 'ok', coord: { lat: 3, long: 4 } })
    expect(c).toEqual({ emit: { lat: 3, long: 4 } })
  })

  it('sticky: texto não-coord não emite e não apaga a última', () => {
    const t = createPositionTracker()
    t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })
    expect(t.consume({ status: 'not-a-coord' })).toEqual({})
    // coordenada igual à última continua sendo dedupe
    expect(t.consume({ status: 'ok', coord: { lat: 1, long: 2 } })).toEqual({})
  })

  it('sinaliza warn em malformed', () => {
    const t = createPositionTracker()
    expect(t.consume({ status: 'malformed' })).toEqual({ warn: true })
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test -- positionTracker`
Expected: FAIL.

- [ ] **Step 3: Implementar**

`positionTracker.ts`:
```ts
import type { Coordinate, ParseResult } from '../types'

export interface TrackerOutput { emit?: Coordinate; warn?: boolean }

export function createPositionTracker() {
  let last: Coordinate | null = null
  return {
    consume(r: ParseResult): TrackerOutput {
      if (r.status === 'malformed') return { warn: true }
      if (r.status === 'not-a-coord') return {}
      const c = r.coord
      if (last && last.lat === c.lat && last.long === c.long) return {}
      last = c
      return { emit: c }
    },
  }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test -- positionTracker`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/core/positionTracker.ts src/renderer/src/core/positionTracker.test.ts
git commit -m "feat: position tracker with dedupe + sticky + malformed warn"
```

> **Nota:** o throttle por tempo (N ms, §6.1) é folgado porque o gatilho é manual; aplicá-lo na borda de envio (Task 8). Decidir se re-copiar a mesma coord força reenvio — padrão atual: não (dedupe). Manter intencional.

---

## Task 4: ClipboardWatcher + preload + IPC (verificação manual)

Processo principal lê o clipboard a cada 500 ms e envia texto novo ao renderer via IPC; o preload expõe um listener seguro.

**Files:**
- Create: `src/main/clipboardWatcher.ts`
- Modify: `src/main/index.ts`
- Modify: `src/preload/index.ts`

- [ ] **Step 1: Implementar ClipboardWatcher**

`clipboardWatcher.ts`:
```ts
import { clipboard } from 'electron'

export function startClipboardWatcher(onText: (text: string) => void, intervalMs = 500) {
  let last = clipboard.readText()
  const id = setInterval(() => {
    const cur = clipboard.readText()
    if (cur !== last) {
      last = cur
      onText(cur)
    }
  }, intervalMs)
  return () => clearInterval(id)
}
```

- [ ] **Step 2: Ligar no main (enviar via webContents)**

Em `src/main/index.ts`, após criar a `mainWindow`:
```ts
import { startClipboardWatcher } from './clipboardWatcher'
// ...
startClipboardWatcher((text) => {
  mainWindow.webContents.send('clipboard-text', text)
})
```

- [ ] **Step 3: Expor no preload**

Em `src/preload/index.ts`, dentro do `contextBridge.exposeInMainWorld('api', { ... })`:
```ts
onClipboardText: (cb: (text: string) => void) => {
  const listener = (_e: unknown, text: string) => cb(text)
  ipcRenderer.on('clipboard-text', listener)
  return () => ipcRenderer.removeListener('clipboard-text', listener)
},
```
Adicionar o tipo correspondente em `src/preload/index.d.ts` (interface `api`).

- [ ] **Step 4: Verificação manual**

Run: `npm run dev`
- Copiar qualquer texto no sistema; confirmar no DevTools (console do renderer, via um `window.api.onClipboardText(console.log)` temporário) que o texto chega.
Expected: cada cópia nova aparece no console uma vez.

- [ ] **Step 5: Commit**

```bash
git add src/main src/preload
git commit -m "feat: clipboard watcher main->renderer over IPC"
```

---

## Task 5: supabaseClient + presenceToPeers + RoomConnection (Presence)

Conexão de sala via Presence: cada cliente faz `track` do seu estado; o estado de
presença (que o cliente embrulha com `presence_ref`) é convertido numa lista de
`Peer` por um módulo **puro** testável.

**Files:**
- Create: `src/renderer/src/net/supabaseClient.ts`
- Create: `src/renderer/src/core/presenceToPeers.ts`
- Test: `src/renderer/src/core/presenceToPeers.test.ts`
- Create: `src/renderer/src/net/roomConnection.ts`

- [ ] **Step 1: Client (env com prefixo correto do electron-vite)**

`supabaseClient.ts`:
```ts
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.RENDERER_VITE_SUPABASE_URL
const key = import.meta.env.RENDERER_VITE_SUPABASE_ANON_KEY
if (!url || !key) {
  throw new Error('Faltam RENDERER_VITE_SUPABASE_URL / RENDERER_VITE_SUPABASE_ANON_KEY no .env')
}

export const supabase = createClient(url, key, {
  realtime: { params: { eventsPerSecond: 5 } },
})
```

- [ ] **Step 2: Teste de presenceToPeers (falha)**

O `presenceState()` do supabase-js retorna `Record<key, meta[]>`, onde cada `meta`
é o payload **mais** um `presence_ref` interno. Precisamos: pegar o último meta de
cada key, mapear pra `Peer`, deduplicar por key e filtrar quem não tem posição
válida.

`presenceToPeers.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { presenceToPeers } from './presenceToPeers'

describe('presenceToPeers', () => {
  it('desembrulha presence_ref e mapeia para Peer', () => {
    const state = {
      'u1': [{ presence_ref: 'r1', id: 'u1', name: 'Edu', lat: 1, long: 2, updatedAt: 10 }],
    }
    expect(presenceToPeers(state)).toEqual([
      { id: 'u1', name: 'Edu', lat: 1, long: 2, alt: undefined, updatedAt: 10 },
    ])
  })

  it('dedupe por key: usa o meta mais recente quando há mais de um', () => {
    const state = {
      'u1': [
        { presence_ref: 'r1', id: 'u1', name: 'Edu', lat: 1, long: 2, updatedAt: 10 },
        { presence_ref: 'r2', id: 'u1', name: 'Edu', lat: 5, long: 6, updatedAt: 20 },
      ],
    }
    expect(presenceToPeers(state)).toHaveLength(1)
    expect(presenceToPeers(state)[0]).toMatchObject({ id: 'u1', lat: 5, long: 6 })
  })

  it('filtra peers sem posição válida', () => {
    const state = {
      'u2': [{ presence_ref: 'r3', id: 'u2', name: 'Sem', lat: NaN, long: NaN, updatedAt: 0 }],
    }
    expect(presenceToPeers(state)).toEqual([])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm test -- presenceToPeers`
Expected: FAIL.

- [ ] **Step 4: Implementar presenceToPeers**

`presenceToPeers.ts`:
```ts
import type { Peer } from '../types'

// Estado bruto do Presence: Record<key, Array<payload & { presence_ref }>>
export function presenceToPeers(state: Record<string, any[]>): Peer[] {
  const peers: Peer[] = []
  for (const metas of Object.values(state)) {
    if (!metas?.length) continue
    const m = metas[metas.length - 1] // meta mais recente dessa key
    peers.push({
      id: m.id, name: m.name, lat: m.lat, long: m.long, alt: m.alt, updatedAt: m.updatedAt,
    })
  }
  return peers.filter(p => Number.isFinite(p.lat) && Number.isFinite(p.long))
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm test -- presenceToPeers`
Expected: PASS.

- [ ] **Step 6: RoomConnection (track só após SUBSCRIBED, com pending)**

`roomConnection.ts`:
```ts
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

  const emitPeers = () => onPeers(presenceToPeers(channel.presenceState()))

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
```

- [ ] **Step 7: Verificação manual (depende da UI — fazer junto da Task 8)**

Abrir dois apps com o mesmo código de sala e confirmar que a posição de um aparece
no outro, inclusive para quem entra depois (snapshot do Presence) e mesmo se a
coordenada for colada **antes** de a sala terminar de subscrever.

- [ ] **Step 8: Commit**

```bash
git add src/renderer/src/net src/renderer/src/core/presenceToPeers.ts src/renderer/src/core/presenceToPeers.test.ts
git commit -m "feat: presence room connection with pure presenceToPeers + subscribe-safe track"
```

---

## Task 6: JoinScreen (verificação manual)

Tela de entrada: nome + código de sala. Gera código de alta entropia ao criar sala (§7.1).

**Files:**
- Create: `src/renderer/src/components/JoinScreen.tsx`

- [ ] **Step 1: Implementar**

`JoinScreen.tsx`:
```tsx
import { useState } from 'react'

function randomCode(): string {
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // sem chars ambíguos
  const bytes = crypto.getRandomValues(new Uint8Array(8)) // CSPRNG (§7.1)
  let s = ''
  for (let i = 0; i < 8; i++) s += a[bytes[i] % a.length]
  return `${s.slice(0, 4)}-${s.slice(4)}`
}

export function JoinScreen({ onJoin }: { onJoin: (name: string, room: string) => void }) {
  const [name, setName] = useState('')
  const [room, setRoom] = useState('')
  return (
    <div className="join">
      <h1>Isle Buddy Map</h1>
      <input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} />
      <input placeholder="Código da sala" value={room} onChange={e => setRoom(e.target.value.toUpperCase())} />
      <button onClick={() => setRoom(randomCode())}>Gerar código</button>
      <button disabled={!name || !room} onClick={() => onJoin(name.trim(), room.trim())}>
        Entrar
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/renderer/src/components/JoinScreen.tsx
git commit -m "feat: join screen with high-entropy room code"
```

---

## Task 7: MapView + PlayerMarker (verificação manual)

Mapa do Gateway com um marcador por peer, posicionado pela projeção. Marcadores esmaecem com o tempo desde `updatedAt`.

**Files:**
- Create: `src/renderer/src/components/MapView.tsx`
- Create: `src/renderer/src/components/PlayerMarker.tsx`
- Create (placeholder): `src/renderer/src/assets/gateway-map.png`

> **Placeholder válido:** usar um PNG **real** (ex.: 1x1 px ou um quadrado
> cinza), não um arquivo vazio — um `.png` de 0 byte quebra o bundler/`<img>`.
> Substituído pela imagem real do Gateway na Task 9. Confirmar que o `env.d.ts`
> da Task 0 Step 5 existe, senão o `import ...png` não tipa.

- [ ] **Step 1: PlayerMarker**

`PlayerMarker.tsx`:
```tsx
import type { Peer } from '../types'

export function PlayerMarker({ peer, x, y }: { peer: Peer; x: number; y: number }) {
  const ageMs = Date.now() - peer.updatedAt
  const stale = ageMs > 60_000
  return (
    <div className="marker" style={{ left: x, top: y, opacity: stale ? 0.4 : 1 }}>
      <span className="dot" />
      <span className="label">{peer.name}{stale ? ` (visto há ${Math.round(ageMs / 1000)}s)` : ''}</span>
    </div>
  )
}
```

- [ ] **Step 2: MapView**

`MapView.tsx`:
```tsx
import type { Peer } from '../types'
import { createProjection } from '../core/mapProjection'
import { GATEWAY_CALIBRATION, MAP_SIZE } from '../config/calibration'
import { PlayerMarker } from './PlayerMarker'
import mapUrl from '../assets/gateway-map.png'

const proj = createProjection(GATEWAY_CALIBRATION)

function clamp(v: number, max: number) { return Math.max(0, Math.min(max, v)) }

export function MapView({ peers }: { peers: Peer[] }) {
  return (
    <div className="map" style={{ width: MAP_SIZE.w, height: MAP_SIZE.h, backgroundImage: `url(${mapUrl})` }}>
      {peers.map(p => {
        const { x, y } = proj.project(p)
        return <PlayerMarker key={p.id} peer={p} x={clamp(x, MAP_SIZE.w)} y={clamp(y, MAP_SIZE.h)} />
      })}
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/components/MapView.tsx src/renderer/src/components/PlayerMarker.tsx src/renderer/src/assets/gateway-map.png
git commit -m "feat: map view with projected, time-decaying markers"
```

---

## Task 8: App wiring + status de conexão (verificação manual)

Junta tudo: clipboard → parser → tracker → roomConnection → mapa. Aplica o throttle de envio na borda.

**Files:**
- Modify: `src/renderer/src/App.tsx`

- [ ] **Step 1: Implementar App**

`App.tsx`:
```tsx
import { useEffect, useRef, useState } from 'react'
import { JoinScreen } from './components/JoinScreen'
import { MapView } from './components/MapView'
import { parseCoordinate } from './core/coordinateParser'
import { createPositionTracker } from './core/positionTracker'
import { joinRoom, type RoomHandle } from './net/roomConnection'
import type { Coordinate, Peer } from './types'

const myId = crypto.randomUUID()
const THROTTLE_MS = 1500

export default function App() {
  const [joined, setJoined] = useState(false)
  const [peers, setPeers] = useState<Peer[]>([])
  const [warn, setWarn] = useState(false)
  const room = useRef<RoomHandle | null>(null)
  const tracker = useRef(createPositionTracker())
  const lastSent = useRef(0)
  const pendingCoord = useRef<Coordinate | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleJoin = (name: string, code: string) => {
    room.current = joinRoom(code, { id: myId, name }, setPeers)
    setJoined(true)
  }

  // Throttle com trailing edge: envia já se passou THROTTLE_MS desde o último,
  // senão agenda o ÚLTIMO valor pendente (não perde a posição final).
  const send = (c: Coordinate) => {
    const since = Date.now() - lastSent.current
    if (since >= THROTTLE_MS) {
      lastSent.current = Date.now()
      room.current?.updatePosition(c)
    } else {
      pendingCoord.current = c
      if (!timer.current) {
        timer.current = setTimeout(() => {
          timer.current = null
          if (pendingCoord.current) {
            lastSent.current = Date.now()
            room.current?.updatePosition(pendingCoord.current)
            pendingCoord.current = null
          }
        }, THROTTLE_MS - since)
      }
    }
  }

  useEffect(() => {
    if (!joined) return
    const off = window.api.onClipboardText((text: string) => {
      const out = tracker.current.consume(parseCoordinate(text))
      if (out.warn) { setWarn(true); return }
      if (out.emit) send(out.emit)
    })
    return () => {
      off?.()
      if (timer.current) clearTimeout(timer.current)
      room.current?.leave()
    }
  }, [joined])

  if (!joined) return <JoinScreen onJoin={handleJoin} />
  return (
    <>
      {warn && <div className="warn" onClick={() => setWarn(false)}>Formato de coordenada não reconhecido — o jogo pode ter mudado. (clique pra fechar)</div>}
      <MapView peers={peers} />
    </>
  )
}
```

- [ ] **Step 2: Verificação manual ponta a ponta**

Run: `npm run dev` (com `.env` preenchido)
- Entrar numa sala. Copiar manualmente um texto `Lat: ... Long: ...` no formato do jogo → seu marcador aparece no mapa.
- Abrir uma segunda instância (ou pedir um amigo) com o mesmo código → os dois se veem; quem entra depois vê o marcador parado do outro (snapshot do Presence).
Expected: posições sincronizam; texto não-coord não mexe no mapa; `malformed` mostra o aviso.

- [ ] **Step 3: Commit**

```bash
git add src/renderer/src/App.tsx
git commit -m "feat: wire clipboard->parse->tracker->room->map with send throttle"
```

---

## Task 9: Calibração real do Gateway + asset do mapa (pendência de dados)

Substitui os placeholders pelos dados reais. **Requer os 3 itens da §11 do spec.**

**Files:**
- Create: `src/renderer/src/config/calibration.ts`
- Replace: `src/renderer/src/assets/gateway-map.png`

- [ ] **Step 1: Obter a imagem do mapa do Gateway** (fonte pública: Vulnona / theisle.ru) e salvar como `gateway-map.png`. Anotar a largura/altura em px.

- [ ] **Step 2: Coletar 3+ pontos de referência no jogo:** ir a marcos reconhecíveis, copiar a coordenada (clipboard) e medir o pixel correspondente na imagem. Registrar `{lat, long, x, y}`.

- [ ] **Step 3: Preencher `calibration.ts`:**
```ts
import type { CalibPoint } from '../core/mapProjection'
export const MAP_SIZE = { w: /* px */ 0, h: /* px */ 0 }
export const GATEWAY_CALIBRATION: CalibPoint[] = [
  // { lat, long, x, y } x3+ — dados reais
]
```

- [ ] **Step 4: Validar com um ponto independente** (não usado na calibração): copiar a coord nesse ponto, conferir se o marcador cai no lugar certo no mapa. Se errar sistematicamente, confirmar se há **rotação** (spec §8) e, se houver, evoluir `mapProjection` para afim 2D.

- [ ] **Step 5: Commit**

```bash
git add src/renderer/src/config/calibration.ts src/renderer/src/assets/gateway-map.png
git commit -m "feat: real gateway map asset + validated calibration"
```

---

## Task 10: Build distribuível

**Files:**
- Modify: `package.json` (config do electron-builder, já incluída pelo template)

- [ ] **Step 1: Gerar instalador**

Run: `npm run build && npm run build:win`
Expected: instalador em `dist/` (NSIS).

- [ ] **Step 2: Smoke test do instalado:** instalar, abrir, entrar numa sala, copiar coord, ver marcador. Distribuir o `.env` ou embutir as chaves no build (anon key é pública por design — §7.1).

- [ ] **Step 3: Commit**

```bash
git add package.json
git commit -m "chore: windows build config"
```

---

## Pendências de setup (antes de executar)

1. **Projeto Supabase:** criar (free), pegar URL + anon key, preencher `.env`. Realtime já vem habilitado.
2. ✅ ~~Amostra real do clipboard~~ — **OBTIDA** (`tools/captured-coord.txt`), parser da Task 1 já fixado no formato real.
3. **Imagem do mapa + 3 pontos de calibração** (Task 9).
