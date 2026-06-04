import { app, shell, BrowserWindow } from 'electron'
import { join } from 'path'
import { autoUpdater } from 'electron-updater'
import { startClipboardWatcher } from './clipboardWatcher'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1100,
    height: 750,
    show: false,
    autoHideMenuBar: true,
    title: 'Isle Buddy Map',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      // O app vive em segundo plano enquanto o jogo está na frente: sem isto, o
      // Chromium pausa timers/WebSocket em background (marcadores e "visto há Xs"
      // congelam, posições dos amigos atrasam).
      backgroundThrottling: false,
    },
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Vigia o clipboard e repassa ao renderer — este é o gatilho do tracking.
  const stopWatcher = startClipboardWatcher((text) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('clipboard-text', text)
    }
  })
  mainWindow.on('closed', () => stopWatcher())

  if (process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  createWindow()
  // auto-update via GitHub Releases (só no app instalado, não em dev)
  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => console.error('update check:', e))
  }
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
