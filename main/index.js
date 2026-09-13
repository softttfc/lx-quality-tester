const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const { testApiSource } = require('./tester')
const { searchAllPlatforms } = require('./searchService')
const { analyzeSources, mergeSources } = require('./merger')

let mainWindow = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })
  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  mainWindow.setMenuBarVisibility(false)

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'F12') {
      mainWindow.webContents.toggleDevTools()
    }
  })
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

ipcMain.handle('search-song', async (event, { name, singer }) => {
  if (!name) return { error: '缺少歌曲名' }
  try {
    return await searchAllPlatforms(name, singer)
  } catch (e) {
    return { error: e.message || String(e) }
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
    title: '保存测试报告',
    defaultPath: `lx-test-${Date.now()}.json`,
    filters: [
      { name: 'JSON', extensions: ['json'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  })
  if (r.filePath) {
    fs.writeFileSync(r.filePath, content, 'utf8')
    return { ok: true, path: r.filePath }
  }
  return { ok: false }
})

// ⭐ 分析音源
ipcMain.handle('analyze-sources', async (event, files) => {
  try {
    return await analyzeSources(files)
  } catch (err) {
    return { error: err.message || String(err) }
  }
})

// ⭐ 生成合并音源
ipcMain.handle('merge-sources', async (event, { files, selection }) => {
  try {
    const code = mergeSources(files, selection)
    const r = await dialog.showSaveDialog({
      title: '保存合并音源',
      defaultPath: `merged-source-${Date.now()}.js`,
      filters: [{ name: 'JavaScript', extensions: ['js'] }],
    })
    if (r.filePath) {
      fs.writeFileSync(r.filePath, code, 'utf8')
      return { ok: true, path: r.filePath }
    }
    return { ok: false }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})
