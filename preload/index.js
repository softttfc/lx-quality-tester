const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
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
})
