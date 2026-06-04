# Isle Buddy Map — Design (Spec)

**Data:** 2026-05-31
**Status:** Aprovado para planejamento
**Autor:** Eduardo (com Claude)

> Nome "Isle Buddy Map" é provisório — pode ser renomeado.

## 1. Problema

Em *The Isle* (Evrima), encontrar os amigos no mapa é difícil. A coordenada
(latitude/longitude) só aparece na tela quando o jogador abre o Character Screen
(TAB). Hoje o fluxo é manual e chato: copiar a coordenada e colar num site de
mapa (ex.: Vulnona), repetindo toda vez que alguém se move. Não há uma visão
compartilhada e ao vivo de onde cada amigo está.

## 2. Objetivo

Um app desktop que mostra, num mapa do Gateway, a posição ao vivo de cada amigo
de um grupo, atualizando sozinho conforme cada um atualiza a própria
coordenada — sem copiar/colar em sites, sem risco de banimento.

### Sucesso é
- O jogador entra numa sala com um código simples e vê os amigos no mapa.
- Ao clicar em "Asset Location" no jogo, sua posição atualiza no mapa de todos
  em segundos.
- Funciona em qualquer servidor (oficial ou privado).
- Zero risco de EAC: o app nunca toca no processo do jogo.

### Fora de escopo (v1)
- RCON / modo servidor privado (leitura de posição via RCON é inconsistente
  entre versões; os devs evitam expô-la).
- OCR automático da tela (o clipboard já resolve de forma robusta).
- Pings, chat ou marcadores no mapa (a base de Realtime suporta; fica para v2).
- Login, contas, histórico persistido.
- **Recalibração interativa no app** (clicar pontos no mapa). O v1 usa
  calibração padrão embutida; a recalibração manual fica para v1.1, por ser
  uma tela/fluxo não-trivial que não é necessária para o sucesso descrito.

## 3. Restrição crítica: EasyAntiCheat

*The Isle* roda com EasyAntiCheat e arquivos `.pak` assinados. Qualquer um destes
**bane a conta**: ler a memória do processo, injetar input/overlay no jogo,
modificar arquivos do jogo.

**O app é seguro porque só faz duas coisas inócuas:** lê a área de transferência
do sistema operacional e fala com a internet. Nunca lê memória, nunca injeta
nada, nunca modifica arquivos. É a mesma categoria de qualquer app que lê o
clipboard.

## 4. Fluxo principal

```
Jogador (no jogo) → TAB → clica "Asset Location" → coordenada vai pro clipboard
        ↓
ClipboardWatcher detecta texto novo → CoordinateParser extrai {lat, long, alt}
        ↓
RoomConnection envia via Supabase Realtime (Presence) → amigos recebem na hora
        ↓
MapProjection converte lat/long → pixel (convenção de eixos calibrada, §8)
        ↓
MapView desenha o marcador atualizado
```

## 5. Formato da coordenada (CONFIRMADO com amostra real — 2026-06-04)

Amostra real capturada do jogo (`tools/captured-coord.txt`):

```
-22,105.51, 183,969.164,  22,571.219
```

Características **confirmadas** (substituem a suposição anterior com rótulos
`Lat:`/`Long:`, que estava ERRADA):

- **Três números crus, SEM rótulos.** ⚠️ A TELA mostra "Lat/Long/Alt", mas o que
  é COPIADO pro clipboard são só os números.
- **Vírgula = separador de milhar; ponto = decimal** (`-22,105.51` = -22105.51).
- Valores podem ser **negativos**.
- Os três valores são **separados entre si por vírgula + 1 ou mais espaços** (o
  jogo insere espaço extra de alinhamento — ex.: `,  ` com dois espaços antes do
  3º valor).
- **Ambiguidade da vírgula resolvida:** a vírgula de milhar **nunca** é seguida de
  espaço; o separador de valor **sempre** é. → `split(/,\s+/)`, depois remover
  vírgulas e `parseFloat`.
- Os **dois primeiros** valores são o plano do mapa; o **terceiro é a altitude**.
  A identidade (qual é lat, qual é long, e qual mapeia para qual eixo de pixel) é
  confirmada na **calibração (§8 / Task 9)** via regressão — não precisa ser
  decidida aqui.

**Quebra silenciosa (importante):** Evrima é early access e pode mudar o formato.
Se o clipboard contém algo que *parece* coordenada (2-3 partes numéricas
separadas por vírgula+espaço) mas não casa com o parser, o app deve **avisar o
usuário** ("formato de coordenada não reconhecido — o jogo pode ter mudado") em
vez de ignorar em silêncio. Texto que claramente não é coordenada continua sendo
ignorado sem ruído.

✅ **Pendência de amostra do clipboard: RESOLVIDA.** Parser fixado e coberto por
testes com esta amostra.

## 6. Componentes

Cada unidade tem um propósito único e é testável de forma isolada.

### 6.1 ClipboardWatcher (Electron — processo principal)
- **Faz:** observa a área de transferência; quando o conteúdo muda, repassa o
  texto para validação.
- **Interface:** emite evento `clipboard-changed(text: string)`.
- **Depende de:** API de clipboard do Electron. Electron não tem evento nativo
  de clipboard confiável cross-platform, então **polling leve (~500 ms)** é a
  escolha correta.
- **Regras de envio (evitar spam ao Realtime):**
  - **Dedupe:** se a coordenada lida é igual à última *enviada*, não reenvia.
  - **Sticky:** copiar um texto que não é coordenada **não apaga** a última
    posição conhecida — ela permanece no mapa.
  - **Throttle:** no máximo 1 envio a cada N ms (N a definir no plano; folga
    sobra porque o gatilho é um clique manual, não um stream).
- **Cuidado:** texto que não é coordenada é ignorado sem ruído (ver §5 para o
  caso "parece coordenada mas não casa").

### 6.2 CoordinateParser (puro)
- **Faz:** `string → { lat: number, long: number, alt?: number } | null`.
- **Interface:** `parse(text): Coordinate | null`.
- **Depende de:** nada. Função pura — alvo principal de testes unitários.

### 6.3 RoomConnection (React)
- **Faz:** entrar/sair de uma sala (canal Supabase por código); publicar minha
  posição; receber a posição dos outros via Presence.
- **Interface:**
  - `join(roomCode: string, displayName: string)`
  - `updatePosition(coord: Coordinate)`
  - evento `peers-changed(peers: Peer[])`
  - `leave()`
- **Depende de:** Supabase JS client (anon key) + Realtime Presence.
- **Estado por jogador na sala:** `{ id, name, lat, long, alt?, updatedAt }`.

### 6.4 MapProjection (puro)
- **Faz:** converte `{lat, long}` em pixel `{x, y}` na imagem do mapa.
- **Interface:** `project(coord): { x, y }`.
- **Modelo:** transformação afim com a convenção de eixos fixada na §8 (permite
  inversão de sinal por eixo; matriz 2D completa se houver rotação). **Não**
  assumir que +lat = cima nem que lat→Y sem confirmar.
- **Depende de:** parâmetros de calibração embutidos (ver §8).

### 6.5 MapView (React)
- **Faz:** desenha a imagem do mapa do Gateway e, sobre ela, um marcador por
  jogador com nome e indicador de "visto há Xs".
- **Depende de:** MapProjection + lista de peers da RoomConnection.

### 6.6 App shell (React)
- **Faz:** tela de entrada (nome + código da sala) → tela do mapa. Mostra status
  de conexão.

## 7. Backend: Supabase Realtime

- Usa **apenas** o Realtime — sem tabelas, sem auth, sem storage.
- **Por que Presence funciona aqui (e o snapshot ao entrar):** o gatilho de
  atualização é um **clique manual** ("Asset Location"), então a frequência é
  baixa (atualizações esparsas, não um stream por frame). Nesse regime, manter a
  posição no estado de Presence via `track()` é adequado **e** resolve de graça
  o problema do "snapshot ao entrar": quando um amigo abre o app, o Presence já
  entrega o último estado de todos — incluindo quem está parado. Com Broadcast
  puro, quem entra depois não veria um peer parado até ele se mover.
- **Divisão de responsabilidades no payload de Presence:**
  `{ id, name, lat, long, alt?, updatedAt }` por jogador.
- **Evolução (v2):** se algum dia o stream virar alta frequência (ex.: OCR
  automático contínuo), migrar o *stream* de posição para **Broadcast** e deixar
  o Presence só com o roster + último snapshot. No v1 isso é desnecessário.
- **Custo (estimativa):** grupo de ~6 amigos, atualização manual a cada ~30 s,
  ~2 h de sessão ≈ algumas centenas de mensagens por sessão por pessoa. Muito
  abaixo dos limites do plano gratuito do Supabase Realtime. Reavaliar só se o
  modelo virar stream contínuo.

## 7.1 Modelo de ameaça / privacidade da sala

Decisão consciente (não suposição): a anon key do Supabase fica embutida no app
e é trivialmente extraível; sem auth/RLS, não há controle de acesso *real* a um
canal. Portanto:

- **A posição no The Isle não é dado sensível** (é um jogo; a coordenada some
  quando você sai). O risco aceito é: um terceiro que descubra o código da sala
  pode ver/forjar posições. Para um grupo de amigos, **risco aceitável**.
- **Mitigação contra adivinhação/bruteforce:** o código da sala **não** é
  trivial — deve ter alta entropia (ex.: 8+ caracteres aleatórios, tipo
  `K7M2-QX9P`), não algo curto e sequencial.
- **Evolução, se necessário:** habilitar Realtime Authorization (RLS em
  `realtime.messages`) com token de sala — fora do escopo do v1.

## 8. Mapa e calibração (ponto técnico mais delicado)

- **Fundo:** imagem do mapa do Gateway em boa resolução (fonte pública —
  Vulnona / theisle.ru).
- **Convenção de eixos (precisa ser fixada, não assumida):** no The Isle o eixo
  de coordenada do mundo pode estar **invertido e/ou rotacionado** em relação à
  imagem do mapa (o norte da imagem não é necessariamente +lat). O modelo
  "linear independente por eixo" só é válido se **não houver rotação** — isso
  precisa ser **confirmado empiricamente** antes de fixar o modelo. A calibração
  deve permitir **inversão de sinal por eixo** e deixar explícito qual
  coordenada vira X e qual vira Y.
- **Modelo:** se confirmado sem rotação, transformação afim por eixo
  (`x = a*long + b`, `y = c*lat + d`, com `a`/`c` podendo ser negativos). Se
  houver rotação, usar transformação afim 2D completa (matriz 2x2 + translação).
- **Calibração e validação:** coletar **3+ pontos de referência** conhecidos
  (não 2), resolver a transformação, e **validar com um ponto de teste fora**
  dos usados na calibração. Calibrar só com 2 pontos "parece" certo nesses 2 e
  erra no resto do mapa.
- **Padrão embutido (v1):** valores de calibração já fixados para o Gateway,
  derivados desses pontos e validados.

**Pendência de implementação (bloqueante para precisão):**
1. Obter a imagem do mapa do Gateway.
2. Coletar 3+ pares (coordenada copiada ↔ pixel) em marcos conhecidos.
3. Confirmar empiricamente se há rotação/inversão e fixar a convenção de eixos.
4. Validar com um ponto de teste independente.

## 9. Tratamento de erros e ciclo de vida dos peers

- Texto do clipboard que não é coordenada → ignorado em silêncio. Exceção: o
  caso "parece coordenada mas não casa" → avisa o usuário (§5).
- Sem conexão com o Supabase → status "offline" na UI + reconexão automática.
  No reconnect, o Presence reentrega o estado da sala (posições não se perdem).
- Coordenada fora dos limites do mapa → marcador fixado na borda + aviso visual
  (ajuda a flagrar calibração errada).
- **Peer parado (não some):** quem entra na sala vê os amigos parados via
  snapshot do Presence (§7). Marcador de peer sem atualizar há muito tempo fica
  esmaecido com "visto há Xs".
- **Peer saiu:** ao fechar o app/desconectar, o Presence emite `leave` e o
  marcador é removido do mapa.

## 10. Testes

- **CoordinateParser:** testes unitários cobrindo formatos válidos, negativos,
  separadores, lixo, o caso "parece coordenada mas não casa", e a amostra real.
- **MapProjection:** testes com os pontos de calibração conhecidos **e** com um
  ponto de teste independente (fora da calibração) para detectar erro de
  eixo/rotação. Cobrir sinais invertidos.
- **RoomConnection:** entrar/sair, publicar e receber posição (Supabase mockado).
- **Integração leve:** clipboard simulado → posição refletida no estado da sala.

## 11. Pendências antes de codar (não bloqueiam o design)

1. Amostra real do texto copiado pelo jogo (para fixar o parser).
2. Imagem do mapa do Gateway em boa resolução.
3. Valores de calibração padrão para o Gateway.

## 12. Stack

- **App:** Electron + React
- **Backend:** Supabase Realtime (Presence), anon key
- **Linguagem:** TypeScript
