import { clipboard } from 'electron'

// Vigia a área de transferência. Quando o texto muda, repassa via callback.
// Polling leve (~500ms) — não há evento de clipboard cross-platform confiável.
// Só LÊ o clipboard: inócuo para o EasyAntiCheat (nunca toca no jogo).
export function startClipboardWatcher(
  onText: (text: string) => void,
  intervalMs = 500,
): () => void {
  let last = clipboard.readText()
  const id = setInterval(() => {
    const cur = clipboard.readText()
    if (cur && cur !== last) {
      last = cur
      onText(cur)
    }
  }, intervalMs)
  return () => clearInterval(id)
}
