const reposStore = require('./reposStore')
const githubClient = require('./githubClient')
const scanner = require('./scanner')
const dedupe = require('./dedupe')
const downloader = require('./downloader')

const stopFlag = { cancelled: false }

function clampInt(value, min, max, def) {
  const n = parseInt(value, 10)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function clampNum(value, min, max, def) {
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function loadConfig() {
  return reposStore.loadConfig()
}

function saveConfig(config) {
  return reposStore.saveConfig(config)
}

function parseRepo(text) {
  return reposStore.parseRepoInput(text)
}

function resetRepos() {
  return reposStore.resetRepos()
}

async function scan(params, onProgress) {
  stopFlag.cancelled = false
  githubClient.resetCounters()
  if (params.token) githubClient.setToken(params.token)
  else githubClient.setToken('')

  const repos = Array.isArray(params.repos) && params.repos.length
    ? reposStore.normalizeRepos(params.repos)
    : loadConfig().repos

  const options = {
    repoWorkers: clampInt(params.repoWorkers, 1, 32, 6),
    fileWorkers: clampInt(params.fileWorkers, 1, 32, 8),
    limit: clampInt(params.limit, 1, 200, 40),
    timeout: clampNum(params.timeout, 3, 180, 8),
  }

  onProgress && onProgress({ type: 'scan-start', repos: repos.length, options })

  const { records, messages } = await scanner.scanRepos(repos, options, onProgress, stopFlag)

  const noDedupe = params.noDedupe === true
  const merged = noDedupe
    ? dedupe.annotateRecords(records.map((r) => ({ ...r })))
    : dedupe.dedupeRecords(records)

  const summary = noDedupe
    ? `已关闭去重：共显示 ${merged.length} 条结果`
    : dedupe.dedupeSummary(records, merged)

  onProgress && onProgress({
    type: 'scan-done',
    found: records.length,
    shown: merged.length,
    apiCalls: githubClient.getApiCalls(),
  })

  return {
    repos: repos.length,
    found: records.length,
    shown: merged.length,
    dedupe: !noDedupe,
    messages,
    apiCalls: githubClient.getApiCalls(),
    summary,
    records: merged,
  }
}

function cancel() {
  stopFlag.cancelled = true
  return { ok: true }
}

async function download(params, onProgress) {
  const target = params.targetDir || loadConfig().downloadDir
  if (!target) return { ok: false, error: '未指定下载目录' }
  const timeout = clampNum(params.timeout, 3, 180, 8)
  const stats = await downloader.downloadRecords(
    params.records || [],
    target,
    { timeout, forceFailed: params.forceFailed === true },
    onProgress,
    stopFlag,
  )
  return { ok: true, stats }
}

module.exports = {
  loadConfig,
  saveConfig,
  parseRepo,
  resetRepos,
  scan,
  cancel,
  download,
}
