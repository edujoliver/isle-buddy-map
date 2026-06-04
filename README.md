# Isle Buddy Map 🦕🗺️

Mapa ao vivo de amigos no **The Isle (Evrima)**. App desktop (Electron) que lê sua
coordenada do clipboard (TAB → Asset Location) e mostra a posição dos amigos da
sala num mapa do Gateway — com marcações de comando estilo Squad, desenho
compartilhado estilo Dota, grid tático e camadas.

**Seguro pro EasyAntiCheat:** o app só lê a área de transferência e fala com a
internet. Nunca lê a memória do jogo, nunca injeta nada, nunca modifica arquivos.

## 📥 Baixar (para jogar)

Pegue o instalador na última release:
**https://github.com/edujoliver/isle-buddy-map/releases/latest**

Instale, abra, digite o **mesmo código de sala** que seus amigos. O app se
atualiza sozinho quando sai uma versão nova.

## 🛠️ Desenvolvimento

```bash
npm install
npm run dev      # roda o app
npm test         # testes (Vitest)
npm run typecheck
```

Requer um `.env` (não versionado):

```
RENDERER_VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
RENDERER_VITE_SUPABASE_ANON_KEY=sb_publishable_xxx
```

## 🚀 Lançar uma atualização (auto-update)

```powershell
# 1. sobe a versão (0.1.0 -> 0.1.1)
npm version patch

# 2. publica no GitHub Releases (o auto-updater dos apps instalados pega sozinho)
$env:GH_TOKEN = (gh auth token)
npm run release
```

Pronto — todo mundo com o app instalado recebe a atualização na próxima vez que
abrir.

## Stack

Electron + React + TypeScript (electron-vite) · Supabase Realtime (Presence +
Broadcast, sem banco) · electron-updater · Vitest.
