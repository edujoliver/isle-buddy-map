export interface IpcApi {
  /** Registra callback para texto novo do clipboard. Retorna função de unsubscribe. */
  onClipboardText: (cb: (text: string) => void) => () => void
}

declare global {
  interface Window {
    api: IpcApi
  }
}
