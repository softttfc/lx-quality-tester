const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { testApiSource } = require('./tester')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  mainWindow.setMenuBarVisibility(false)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

ipcMain.handle('select-sources-dir', async () => {
  const r = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: '选择音源目录',
  })
  return r.filePaths[0] || null
})

ipcMain.handle('list-sources', async (event, dir) => {
  try {
    if (!dir || !fs.existsSync(dir)) return []
    return fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.js'))
      .map((f) => ({ name: f, path: path.join(dir, f) }))
  } catch (e) {
    return []
  }
})

ipcMain.handle('run-test', async (event, params) => {
  return await testApiSource({
    ...params,
    onProgress: (p) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('test-progress', p)
      }
    },
  })
})

ipcMain.handle('save-report', async (event, content) => {
  const r = await dialog.showSaveDialog({
    title: '保存报告',
    defaultPath: `lx-test-${Date.now()}.json`,
    filters: [{ name: 'JSON', extensions: ['json'] }],
  })
  if (r.filePath) {
    fs.writeFileSync(r.filePath, content, 'utf8')
    return true
  }
  return false
})
