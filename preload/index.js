const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  // ═══════════════ 原有 API（音质检测） ═══════════════
  selectSourcesDir: () => ipcRenderer.invoke('select-sources-dir'),
  listSources: (dir) => ipcRenderer.invoke('list-sources', dir),
  searchSong: (params) => ipcRenderer.invoke('search-song', params),
  runTest: (params) => ipcRenderer.invoke('run-test', params),
  saveReport: (content) => ipcRenderer.invoke('save-report', content),
  analyzeSources: (files) => ipcRenderer.invoke('analyze-sources', files),
  mergeSources: (params) => ipcRenderer.invoke('merge-sources', params),
  testBackends: (params) => ipcRenderer.invoke('test-backends', params),  // ⭐ v1.6
  onTestProgress: (cb) => {
    const listener = (e, data) => cb(data)
    ipcRenderer.on('test-progress', listener)
    return () => ipcRenderer.removeListener('test-progress', listener)
  },
  onBackendProgress: (cb) => {  // ⭐ v1.6
    const listener = (e, data) => cb(data)
    ipcRenderer.on('backend-progress', listener)
    return () => ipcRenderer.removeListener('backend-progress', listener)
  },

  // ═══════════════ 新增：音源检索 ═══════════════
  discoverLoadRepos: () => ipcRenderer.invoke('discover-load-repos'),
  discoverSaveRepos: (config) => ipcRenderer.invoke('discover-save-repos', config),
  discoverParseRepo: (text) => ipcRenderer.invoke('discover-parse-repo', text),
  discoverResetRepos: () => ipcRenderer.invoke('discover-reset-repos'),
  discoverScan: (params) => ipcRenderer.invoke('discover-scan', params),
  discoverCancel: () => ipcRenderer.invoke('discover-cancel'),
  discoverDownload: (params) => ipcRenderer.invoke('discover-download', params),
  discoverExportJson: (content) => ipcRenderer.invoke('discover-export-json', content),
  onDiscoverProgress: (cb) => {
    const listener = (e, data) => cb(data)
    ipcRenderer.on('discover-progress', listener)
    return () => ipcRenderer.removeListener('discover-progress', listener)
  },
})
