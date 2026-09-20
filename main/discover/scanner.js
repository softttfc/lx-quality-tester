const path = require('path')
const crypto = require('crypto')
const { asyncPool } = require('./concurrency')
const githubClient = require('./githubClient')
const { bodyFingerprint } = require('./fingerprint')

const EXCLUDE_DIRS = new Set([
  '.github', '.git', '.vscode', '.idea', 'node_modules', 'docs', 'doc',
  'test', 'tests', 'assets', 'images', 'img', 'screenshots', 'website',
])

const EXCLUDE_NAMES = new Set([
  'webpack.config.js', 'gulpfile.js', 'rollup.config.js', 'vite.config.js',
  'package.json', 'tsconfig.json', 'eslint.config.js', '.eslintrc.js',
  'postcss.config.js', 'tailwind.config.js', 'service-worker.js', 'sw.js',
  'commitlint.config.js', 'babel.config.js', 'jest.config.js',
])

const HEADER_BLOCK_RE = /^\/\*![\s\S]*?\*\//

function parseScriptHeader(script) {
  const meta = { name: '', version: '', author: '', homepage: '', description: '' }
  if (!script) return meta
  const head = script.slice(0, 16384)
  const m = head.match(HEADER_BLOCK_RE)
  const block = m ? m[0] : head
  const get = (key) => {
    const re = new RegExp(`@${key}\\s*[:：]?\\s*([^\\r\\n*]+)`, 'i')
    const mm = block.match(re)
    return mm ? mm[1].trim() : ''
  }
  meta.name = get('name')
  meta.version = get('version')
  meta.author = get('author')
  meta.homepage = get('homepage')
  meta.description = get('description')
  if (meta.version) {
    const vm = meta.version.match(/^\s*([vV]?\d+(?:\.\d+)*)\s*$/) ||
               meta.version.match(/^\s*([vV]?\d+(?:\.\d+)*)/)
    if (vm) meta.version = vm[1]
  }
  return meta
}

function isLxSourceScript(text) {
  if (!text) return false
  if (parseScriptHeader(text).name) return true
  for (const marker of ['EVENT_NAMES.inited', 'lx.send', 'globalThis.lx', 'lx.on(']) {
    if (text.includes(marker)) return true
  }
  return false
}

function isCandidateJs(filePath) {
  const low = String(filePath || '').toLowerCase()
  if (!low.endsWith('.js')) return false
  const parts = low.split('/')
  if (parts.length > 5) return false
  for (let i = 0; i < parts.length - 1; i++) {
    if (EXCLUDE_DIRS.has(parts[i])) return false
  }
  const base = parts[parts.length - 1]
  if (EXCLUDE_NAMES.has(base) || base.startsWith('.')) return false
  return true
}

function candidateRank(p) {
  const base = String(p).split('/').pop().toLowerCase()
  if (base === 'latest.js') return 0
  if (base.endsWith('latest.js')) return 1
  if (base.includes('source') || base.includes('音源')) return 2
  if (base.includes('music') || base.startsWith('lx')) return 3
  return 4
}

function dedupeKey(p) {
  const base = String(p).split('/').pop().toLowerCase()
  if (base === 'latest.js' && p.includes('/')) {
    return String(p).slice(0, p.lastIndexOf('/')).toLowerCase()
  }
  return base
}

function pickCandidatePaths(paths, limit) {
  const lim = Math.max(1, parseInt(limit, 10) || 40)
  const feasible = (paths || []).filter(isCandidateJs)
  feasible.sort((a, b) => {
    const ra = candidateRank(a), rb = candidateRank(b)
    if (ra !== rb) return ra - rb
    const ca = (a.match(/\//g) || []).length
    const cb = (b.match(/\//g) || []).length
    if (ca !== cb) return ca - cb
    if (a.length !== b.length) return a.length - b.length
    return a.localeCompare(b)
  })
  const picked = []
  const seen = new Set()
  for (const p of feasible) {
    const k = dedupeKey(p)
    if (seen.has(k)) continue
    seen.add(k)
    picked.push(p)
    if (picked.length >= lim) break
  }
  return picked
}

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex')
}

async function scanRepo(repo, options, onProgress, stopFlag) {
  const fullName = repo.full_name
  const branch = repo.branch || 'main'
  const timeout = options.timeout || 8
  const limit = options.limit || 40
  const fileWorkers = options.fileWorkers || 8

  onProgress && onProgress({ type: 'repo-start', repo: fullName, branch })

  let treeResult
  try {
    treeResult = await githubClient.fetchRepoTree(fullName, branch, timeout, (msg) => {
      onProgress && onProgress({ type: 'notice', repo: fullName, message: `[${fullName}] ${msg}` })
    })
  } catch (err) {
    const message = `获取文件树失败: ${err.message || err}`
    onProgress && onProgress({ type: 'repo-error', repo: fullName, error: message })
    return { full_name: fullName, branch, records: [], error: message }
  }

  if (treeResult.error) {
    onProgress && onProgress({ type: 'repo-error', repo: fullName, error: treeResult.error })
    return { full_name: fullName, branch, records: [], error: treeResult.error }
  }

  const candidates = pickCandidatePaths(treeResult.paths || [], limit)
  onProgress && onProgress({
    type: 'repo-tree',
    repo: fullName,
    totalFiles: (treeResult.paths || []).length,
    candidates: candidates.length,
  })

  if (!candidates.length) {
    return { full_name: fullName, branch, records: [], error: '未发现候选音源脚本' }
  }

  const records = []
  let done = 0
  const tasks = candidates.map((p) => ({ path: p }))

  await asyncPool(fileWorkers, tasks, async (task) => {
    if (stopFlag && stopFlag.cancelled) return null
    const p = task.path
    const rawUrl = githubClient.repoRawUrl(fullName, branch, p)
    let res
    try {
      res = await githubClient.fetchScriptWithMirrors(rawUrl, timeout, 4)
    } catch (err) {
      res = { text: null, url: null, error: err.message || String(err) }
    }
    done++

    let record
    if (!res.text) {
      record = {
        repo: fullName, branch, path: p, raw_url: rawUrl, used_url: '',
        name: path.basename(p), version: '', author: '', homepage: '', description: '',
        size: 0, sha256: '', body_fp: '',
        status: '抓取失败',
        error: res.error || '抓取失败',
      }
      onProgress && onProgress({ type: 'file-progress', repo: fullName, current: done, total: candidates.length, path: p, status: 'fail' })
      records.push(record)
      return record
    }

    if (!isLxSourceScript(res.text)) {
      record = {
        repo: fullName, branch, path: p, raw_url: rawUrl, used_url: res.url || rawUrl,
        name: path.basename(p), version: '', author: '', homepage: '', description: '',
        size: Buffer.byteLength(res.text, 'utf8'), sha256: '', body_fp: '',
        status: '抓取失败',
        error: '返回内容非音源脚本',
      }
      onProgress && onProgress({ type: 'file-progress', repo: fullName, current: done, total: candidates.length, path: p, status: 'skip' })
      records.push(record)
      return record
    }

    const meta = parseScriptHeader(res.text)
    if (!meta.name) {
      record = {
        repo: fullName, branch, path: p, raw_url: rawUrl, used_url: res.url || rawUrl,
        name: path.basename(p), version: '', author: '', homepage: '', description: '',
        size: Buffer.byteLength(res.text, 'utf8'), sha256: '', body_fp: '',
        status: '抓取失败',
        error: '头部缺少 @name',
      }
      onProgress && onProgress({ type: 'file-progress', repo: fullName, current: done, total: candidates.length, path: p, status: 'fail' })
      records.push(record)
      return record
    }

    record = {
      repo: fullName, branch, path: p, raw_url: rawUrl, used_url: res.url || rawUrl,
      name: meta.name || path.basename(p),
      version: meta.version || '',
      author: meta.author || '',
      homepage: meta.homepage || '',
      description: meta.description || '',
      size: Buffer.byteLength(res.text, 'utf8'),
      sha256: sha256(res.text),
      body_fp: bodyFingerprint(res.text),
      status: '已扫描',
      error: null,
    }
    onProgress && onProgress({ type: 'file-progress', repo: fullName, current: done, total: candidates.length, path: p, status: 'ok' })
    records.push(record)
    return record
  }, { stopFlag })

  records.sort((a, b) => a.path.localeCompare(b.path))
  onProgress && onProgress({ type: 'repo-done', repo: fullName, count: records.length })
  return { full_name: fullName, branch, records, error: null }
}

async function scanRepos(repos, options, onProgress, stopFlag) {
  const repoWorkers = options.repoWorkers || 6
  const fileWorkers = options.fileWorkers || 8
  const timeout = options.timeout || 8
  const limit = options.limit || 40

  const allRecords = []
  const messages = []
  const started = Date.now()

  await asyncPool(repoWorkers, repos, async (repo) => {
    if (stopFlag && stopFlag.cancelled) return null
    try {
      const r = await scanRepo(repo, { timeout, limit, fileWorkers }, onProgress, stopFlag)
      for (const rec of r.records) allRecords.push(rec)
      if (r.error) {
        messages.push(`${r.full_name}：${r.error}`)
      } else {
        messages.push(`${r.full_name}：发现 ${r.records.length} 个脚本`)
      }
    } catch (err) {
      messages.push(`${repo.full_name}：${err.message || err}`)
    }
    return null
  }, { stopFlag })

  const elapsed = ((Date.now() - started) / 1000).toFixed(1)
  messages.push(`扫描总耗时 ${elapsed}s（${repos.length} 个仓库，仓库并发 ${repoWorkers} / 文件并发 ${fileWorkers}）`)
  if (githubClient.isRateLimited()) {
    messages.push('检测到 GitHub API 限流，已自动降级到 jsDelivr / zipball 兜底')
  }
  messages.push(`本次 GitHub API 调用次数：${githubClient.getApiCalls()}`)
  if (stopFlag && stopFlag.cancelled) {
    messages.push('扫描已被用户取消，已保留完成部分')
  }

  return { records: allRecords, messages }
}

module.exports = { scanRepo, scanRepos, parseScriptHeader, isLxSourceScript, pickCandidatePaths }
