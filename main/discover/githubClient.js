const axios = require('axios')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { execFile } = require('child_process')
const { promisify } = require('util')

const execFileAsync = promisify(execFile)

const GITHUB_API = 'https://api.github.com'
const RAW_HOST = 'https://raw.githubusercontent.com'

const MIRRORS = [
  '',
  'https://ghproxy.net/',
  'https://gh.llkk.cc/',
  'https://github.moeyy.xyz/',
  'https://ghproxy.cn/',
  'https://gh.api.99988866.xyz/',
  'https://ghp.ci/',
  'https://gh-proxy.org/',
]

const USER_AGENT = 'lx-discover/1.0 (electron)'

const state = {
  apiCalls: 0,
  rateLimited: false,
  token: '',
}

function setToken(token) {
  state.token = String(token || '').trim()
}

function getToken() {
  return state.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || ''
}

function resetCounters() {
  state.apiCalls = 0
  state.rateLimited = false
}

function getApiCalls() {
  return state.apiCalls
}

function isRateLimited() {
  return state.rateLimited
}

function apiHeaders() {
  const headers = {
    'User-Agent': USER_AGENT,
    Accept: 'application/vnd.github+json',
  }
  const token = getToken()
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

async function fetchRepoTree(fullName, branch, timeout, onNotice) {
  // 1) GitHub API
  let apiErr = ''
  try {
    const url = `${GITHUB_API}/repos/${fullName}/git/trees/${encodeURIComponent(branch)}?recursive=1`
    state.apiCalls++
    const res = await axios.get(url, {
      headers: apiHeaders(),
      timeout: Math.max(3, timeout) * 1000,
      validateStatus: () => true,
    })
    if (res.status === 403 || res.status === 429) {
      state.rateLimited = true
      apiErr = `GitHub API 限流 HTTP ${res.status}`
    } else if (res.status >= 200 && res.status < 300 && res.data && Array.isArray(res.data.tree)) {
      const paths = res.data.tree
        .filter((x) => x && x.path && x.type !== 'tree')
        .map((x) => x.path)
      return { treeSha: String(res.data.sha || ''), paths, source: 'api', error: null }
    } else {
      apiErr = `GitHub API HTTP ${res.status}`
    }
  } catch (err) {
    apiErr = `GitHub API 失败: ${err.message || err}`
  }

  if (onNotice) onNotice(`${apiErr}，尝试 jsDelivr 兜底`)

  // 2) jsDelivr
  try {
    const url = `https://data.jsdelivr.com/v1/packages/gh/${fullName}@${encodeURIComponent(branch)}?structure=flat`
    const res = await axios.get(url, {
      headers: { 'User-Agent': USER_AGENT },
      timeout: Math.max(5, timeout) * 1000,
      validateStatus: () => true,
    })
    if (res.status >= 200 && res.status < 300 && res.data && Array.isArray(res.data.files)) {
      const paths = []
      for (const item of res.data.files) {
        if (!item || !item.name) continue
        if (String(item.type || '').toLowerCase() === 'directory') continue
        paths.push(String(item.name).replace(/^\/+/, ''))
      }
      if (paths.length) {
        if (onNotice) onNotice(`jsDelivr 兜底成功，共 ${paths.length} 个文件`)
        return { treeSha: '', paths, source: 'jsdelivr', error: null }
      }
    }
  } catch (err) {
    if (onNotice) onNotice(`jsDelivr 兜底失败: ${err.message || err}`)
  }

  // 3) zipball
  try {
    const r = await fetchRepoPathsZip(fullName, branch, timeout)
    if (r.paths.length) {
      if (onNotice) onNotice(`zipball 兜底成功，共 ${r.paths.length} 个文件`)
      return { treeSha: '', paths: r.paths, source: 'zipball', error: null }
    }
    if (onNotice) onNotice(`zipball 兜底失败: ${r.error}`)
  } catch (err) {
    if (onNotice) onNotice(`zipball 兜底异常: ${err.message || err}`)
  }

  return { treeSha: '', paths: [], source: '', error: `读取仓库文件树失败：${apiErr}` }
}

async function fetchRepoPathsZip(fullName, branch, timeout, maxBytes = 80 * 1024 * 1024) {
  const target = `https://codeload.github.com/${fullName}/zip/refs/heads/${encodeURIComponent(branch)}`
  const urls = [target, 'https://ghproxy.net/' + target, 'https://gh.llkk.cc/' + target]
  let lastErr = '未尝试'

  for (const url of urls) {
    let tmpFile = ''
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT },
        responseType: 'arraybuffer',
        timeout: Math.max(15, timeout) * 1000,
        maxContentLength: maxBytes,
        maxBodyLength: maxBytes,
        validateStatus: () => true,
      })
      if (res.status < 200 || res.status >= 400) {
        lastErr = `HTTP ${res.status}`
        continue
      }
      const buf = Buffer.from(res.data)
      if (buf.length > maxBytes) {
        lastErr = `压缩包超过 ${Math.round(maxBytes / 1048576)}MB`
        continue
      }
      tmpFile = path.join(os.tmpdir(), `lx-tree-${Date.now()}-${Math.random().toString(36).slice(2)}.zip`)
      fs.writeFileSync(tmpFile, buf)
      const paths = await listZipEntries(tmpFile)
      if (paths.length) return { paths, error: null }
      lastErr = '压缩包内无有效文件'
    } catch (err) {
      lastErr = `${err.code || err.name || 'Error'}: ${err.message || err}`
    } finally {
      if (tmpFile) {
        try { fs.unlinkSync(tmpFile) } catch (_) {}
      }
    }
  }
  return { paths: [], error: lastErr }
}

async function listZipEntries(zipPath) {
  try {
    const { stdout } = await execFileAsync('tar', ['-tf', zipPath], {
      maxBuffer: 32 * 1024 * 1024,
      timeout: 60000,
    })
    const lines = String(stdout || '').split(/\r?\n/)
    const paths = []
    for (const line of lines) {
      const name = line.trim()
      if (!name || name.endsWith('/')) continue
      const idx = name.indexOf('/')
      if (idx === -1) continue
      const rel = name.slice(idx + 1)
      if (rel) paths.push(rel)
    }
    return paths
  } catch (_) {
    return []
  }
}

async function fetchScriptWithMirrors(rawUrl, timeout, maxMirrorTry) {
  const list = []
  for (const prefix of MIRRORS) {
    const u = prefix ? prefix + rawUrl : rawUrl
    if (!list.includes(u)) list.push(u)
  }
  if (!list.includes(rawUrl)) list.push(rawUrl)
  const limit = maxMirrorTry && maxMirrorTry > 0 ? maxMirrorTry : list.length
  const tried = list.slice(0, limit)

  for (const url of tried) {
    try {
      const res = await axios.get(url, {
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
        responseType: 'text',
        transformResponse: [(d) => d],
        timeout: Math.max(3, timeout) * 1000,
        validateStatus: () => true,
        maxRedirects: 5,
      })
      if (res.status < 200 || res.status >= 400) continue
      const text = typeof res.data === 'string' ? res.data : String(res.data || '')
      if (!text) continue
      return { text, url, error: null }
    } catch (_) {
      // 试下一个镜像
    }
  }
  return { text: null, url: null, error: '所有镜像均抓取失败' }
}

function repoRawUrl(fullName, branch, filePath) {
  return `${RAW_HOST}/${fullName}/${branch}/${filePath}`
}

module.exports = {
  MIRRORS,
  setToken,
  getToken,
  resetCounters,
  getApiCalls,
  isRateLimited,
  fetchRepoTree,
  fetchScriptWithMirrors,
  repoRawUrl,
}
