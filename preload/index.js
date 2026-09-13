const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectSourcesDir: () => ipcRenderer.invoke('select-sources-dir'),
  listSources: (dir) => ipcRenderer.invoke('list-sources', dir),
  searchSong: (params) => ipcRenderer.invoke('search-song', params),
  runTest: (params) => ipcRenderer.invoke('run-test', params),
  saveReport: (content) => ipcRenderer.invoke('save-report', content),
  onTestProgress: (cb) => {
    const listener = (e, data) => cb(data)
    ipcRenderer.on('test-progress', listener)
    return () => ipcRenderer.removeListener('test-progress', listener)
  },
})
