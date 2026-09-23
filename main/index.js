const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')

// ═══════════════════════════════════════════════════════
// ⭐ 主进程兜底：任何未处理的 rejection / 异常都不会让 App 静默退出
// ═══════════════════════════════════════════════════════
process.on('unhandledRejection', (reason) => {
  console.error('[main] unhandledRejection（已拦截，防止主进程退出）:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[main] uncaughtException（已拦截，防止主进程退出）:', err)
})

const { testApiSource } = require('./tester')
const { searchAllPlatforms } = require('./searchService')
const { analyzeSources, mergeSources } = require('./merger')
const { testBackends } = require('./backendTester')
const { runShadowTest } = require('./hostScorer')
const discover = require('./discover')

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

// ═══════════════════════════════════════════════════════
// 原有 IPC（音质检测 / 后端检测 / 合并）
// ═══════════════════════════════════════════════════════

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

ipcMain.handle('analyze-sources', async (event, files) => {
  try {
    return await analyzeSources(files)
  } catch (err) {
    return { error: err.message || String(err) }
  }
})

// ⭐ v1.6：后端检测
ipcMain.handle('test-backends', async (event, { files, song, options }) => {
  try {
    const results = []
    for (let i = 0; i < files.length; i++) {
      const f = files[i]
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('backend-progress', {
          type: 'file-progress',
          current: i + 1,
          total: files.length,
          file: f.name,
        })
      }
      const r = await testBackends(f.path, song, options || {}, (p) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('backend-progress', p)
        }
      })
      results.push(r)
    }
    return { ok: true, results }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})

// ⭐ v2.0：影子测试
ipcMain.handle('run-shadow-test', async (event, { files, songs, options }) => {
  try {
    if (!Array.isArray(files) || files.length === 0) {
      return { ok: false, error: '音源列表为空' }
    }
    if (!Array.isArray(songs) || songs.length === 0) {
      return { ok: false, error: '测试歌曲列表为空' }
    }

    const hostScores = await runShadowTest(files, songs, options || {}, (p) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('shadow-progress', p)
      }
    })

    return { ok: true, hostScores }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})

// ⭐ v2.0：merge-sources 接受 backendMode 和 hostScores
ipcMain.handle('merge-sources', async (event, {
  files,
  selection,
  report,
  blockedHosts,
  backendMode,
  hostScores,
}) => {
  try {
    const code = mergeSources(files, selection, report, {
      backendMode: backendMode === 'score' ? 'score' : 'blacklist',
      blockedHosts: blockedHosts || [],
      hostScores: hostScores || {},
    })
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

// ⭐ v1.3.0：共享后端检测（供 UI 提前提示）
ipcMain.handle('detect-shared-hosts', async (event, { files, selection }) => {
  try {
    const { detectSharedHosts } = require('./merger/generator')
    return { hosts: detectSharedHosts(files || [], selection || {}) }
  } catch (err) {
    return { hosts: [], error: err.message || String(err) }
  }
})

// ═══════════════════════════════════════════════════════
// 音源检索 IPC
// ═══════════════════════════════════════════════════════

ipcMain.handle('discover-load-repos', async () => {
  try {
    return discover.loadConfig()
  } catch (err) {
    return {
      repos: [],
      downloadDir: '',
      repoWorkers: 6,
      fileWorkers: 8,
      limit: 40,
      timeout: 8,
    }
  }
})

ipcMain.handle('discover-save-repos', async (event, config) => {
  try {
    const file = discover.saveConfig(config || {})
    return { ok: true, path: file }
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})

ipcMain.handle('discover-parse-repo', async (event, text) => {
  try {
    return discover.parseRepo(text)
  } catch (_) {
    return null
  }
})

ipcMain.handle('discover-reset-repos', async () => {
  try {
    return discover.resetRepos()
  } catch (err) {
    return { repos: [], error: err.message || String(err) }
  }
})

ipcMain.handle('discover-scan', async (event, params) => {
  return await discover.scan(params || {}, (p) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('discover-progress', p)
    }
  })
})

ipcMain.handle('discover-cancel', async () => {
  try {
    return discover.cancel()
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})

ipcMain.handle('discover-download', async (event, params) => {
  try {
    return await discover.download(params || {}, (p) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('discover-progress', p)
      }
    })
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})

ipcMain.handle('discover-export-json', async (event, content) => {
  try {
    const r = await dialog.showSaveDialog({
      title: '导出检索结果',
      defaultPath: `lx-discover-${Date.now()}.json`,
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
  } catch (err) {
    return { ok: false, error: err.message || String(err) }
  }
})
