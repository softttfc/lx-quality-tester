const fs = require('fs')
const { configFile } = require('./paths')

// 内置候选仓库（沿用参考程序列表）
const BUILTIN_REPOS = [
  { full_name: 'pdone/lx-music-source', branch: 'main', note: '洛雪音乐源集合（推荐）', tag: '推荐' },
  { full_name: 'Macrohard0001/lx-ikun-music-sources', branch: 'main', note: 'ikun 音源合集', tag: '社区' },
  { full_name: 'ZxwyWebSite/lx-source', branch: 'main', note: 'Zxwy 音源', tag: '社区' },
  { full_name: 'lyswhut/lx-music-source', branch: 'master', note: '官方示例音源', tag: '推荐' },
  { full_name: 'cdyUuu/lx-music-xinghai-source', branch: 'main', note: '星海音源', tag: '社区' },
  { full_name: 'hwxlikemi/lxs', branch: 'main', note: 'lxs 音源合集', tag: '社区' },
  { full_name: 'cc2415/lx-custom-music-source', branch: 'main', note: '六音音源', tag: '社区' },
  { full_name: 'Qian-Ning/LX-Music-Source', branch: 'main', note: 'LX 音源合集', tag: '社区' },
  { full_name: 'guoyue2010/lxmusic-', branch: 'main', note: '全网最新最全音源', tag: '社区' },
  { full_name: 'wzh15802/lxmusic', branch: 'main', note: '含星海/独家v5/聚合', tag: '社区' },
  { full_name: 'LuoXiaohei-2025/LX-music-collection', branch: 'main', note: '音源合辑', tag: '社区' },
  { full_name: 'kayee0212/lx-music-yinyuan', branch: 'main', note: '含独家v4/聚合', tag: '社区' },
  { full_name: 'LXJ-George666/LXMusic-Yinyuan', branch: 'main', note: '含至尊源/monster', tag: '社区' },
  { full_name: 'a97083435/lxmusic-source', branch: 'main', note: '含废材公社内部源', tag: '社区' },
  { full_name: 'wangxanshen/lx-music-source', branch: 'main', note: 'gdstudio', tag: '社区' },
  { full_name: 'ycquah00/lx-music-source-v5', branch: 'main', note: '独家音源v5镜像', tag: '社区' },
  { full_name: 'ryan159115/lxmusic-source', branch: 'main', note: '含墨澜聚合/HYW/K×H', tag: '社区' },
]

function clampInt(v, min, max, def) {
  const n = parseInt(v, 10)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function clampNum(v, min, max, def) {
  const n = parseFloat(v)
  if (!Number.isFinite(n)) return def
  return Math.max(min, Math.min(max, n))
}

function parseRepoInput(text) {
  let s = String(text || '').trim()
  if (!s) return null

  // 完整 URL -> owner/repo
  const m = s.match(/github\.com\/([^/\s#@]+)\/([^/\s#@]+?)(?:\.git)?(?:[/#?].*)?$/i)
  if (m) s = `${m[1]}/${m[2]}`

  let branch = 'main'
  const hash = s.indexOf('#')
  const at = s.indexOf('@')
  if (hash !== -1) {
    branch = s.slice(hash + 1).trim() || 'main'
    s = s.slice(0, hash).trim()
  } else if (at !== -1 && s.indexOf('://') === -1) {
    branch = s.slice(at + 1).trim() || 'main'
    s = s.slice(0, at).trim()
  }

  s = s.replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '')
  if (!s.includes('/')) return null
  const [owner, repo] = s.split('/')
  if (!owner || !repo) return null
  return { full_name: `${owner}/${repo}`, branch, note: '手动添加', tag: '' }
}

function normalizeRepos(repos) {
  const out = []
  const seen = new Set()
  for (const item of (repos || [])) {
    let entry = null
    if (typeof item === 'string') {
      entry = parseRepoInput(item)
      if (entry) entry.note = '手动添加'
    } else if (item && typeof item === 'object') {
      const full = String(item.full_name || item.repo || '').trim().replace(/^\/+|\/+$/g, '').replace(/\.git$/i, '')
      if (!full || !full.includes('/')) continue
      entry = {
        full_name: full,
        branch: String(item.branch || 'main').trim() || 'main',
        note: String(item.note || ''),
        tag: String(item.tag || ''),
      }
    }
    if (!entry) continue
    const key = entry.full_name.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(entry)
  }
  return out
}

function loadConfig() {
  let data = {}
  try {
    const file = configFile()
    if (fs.existsSync(file)) {
      data = JSON.parse(fs.readFileSync(file, 'utf-8'))
    }
  } catch (_) {
    data = {}
  }
  const repos = normalizeRepos(Array.isArray(data.repos) && data.repos.length ? data.repos : BUILTIN_REPOS)
  return {
    repos,
    downloadDir: String(data.downloadDir || ''),
    repoWorkers: clampInt(data.repoWorkers, 1, 32, 6),
    fileWorkers: clampInt(data.fileWorkers, 1, 32, 8),
    limit: clampInt(data.limit, 1, 200, 40),
    timeout: clampNum(data.timeout, 3, 180, 8),
    // ⭐ 代理配置
    proxyEnabled: data.proxyEnabled === true,
    proxyUrl: String(data.proxyUrl || '').trim(),
  }
}

function saveConfig(config) {
  const payload = {
    repos: normalizeRepos(config.repos),
    downloadDir: String(config.downloadDir || ''),
    repoWorkers: clampInt(config.repoWorkers, 1, 32, 6),
    fileWorkers: clampInt(config.fileWorkers, 1, 32, 8),
    limit: clampInt(config.limit, 1, 200, 40),
    timeout: clampNum(config.timeout, 3, 180, 8),
    // ⭐ 代理配置
    proxyEnabled: config.proxyEnabled === true,
    proxyUrl: String(config.proxyUrl || '').trim(),
  }
  const file = configFile()
  fs.writeFileSync(file, JSON.stringify(payload, null, 2), 'utf-8')
  return file
}

function resetRepos() {
  return { repos: BUILTIN_REPOS.map((r) => ({ ...r })) }
}

module.exports = {
  BUILTIN_REPOS,
  loadConfig,
  saveConfig,
  parseRepoInput,
  normalizeRepos,
  resetRepos,
}
