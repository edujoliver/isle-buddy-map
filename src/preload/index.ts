import { contextBridge, ipcRenderer } from 'electron'

// API segura exposta ao renderer. O ClipboardWatcher (Task 4) envia 'clipboard-text'.
const api = {
  onClipboardText: (cb: (text: string) => void): (() => void) => {
    const listener = (_e: unknown, text: string): void => cb(text)
    ipcRenderer.on('clipboard-text', listener)
    return () => ipcRenderer.removeListener('clipboard-text', listener)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (fallback sem contextIsolation)
  window.api = api
}
