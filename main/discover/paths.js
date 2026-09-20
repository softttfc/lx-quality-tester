const path = require('path')
const fs = require('fs')

function userDataDir() {
  try {
    const { app } = require('electron')
    return app.getPath('userData')
  } catch (_) {
    return path.join(process.cwd(), 'userData')
  }
}

function configFile() {
  return path.join(userDataDir(), 'discover_config.json')
}

function defaultDownloadDir() {
  try {
    const { app } = require('electron')
    return path.join(app.getPath('downloads'), 'lx-discovered')
  } catch (_) {
    return path.join(userDataDir(), 'discovered')
  }
}

function ensureDir(dir) {
  if (!dir) return
  try {
    fs.mkdirSync(dir, { recursive: true })
  } catch (_) {}
}

module.exports = { userDataDir, configFile, defaultDownloadDir, ensureDir }
