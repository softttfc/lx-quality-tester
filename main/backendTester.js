const path = require('path')
const { loadApiSource } = require('./apiLoader')

// 媒体域名：返回的 URL 指向这些域名属于正常结果，不算"后端"
const MEDIA_HOST_PATTERNS = [
  /(^|\.)qqmusic\.qq\.com$/,
  /(^|\.)music\.163\.com$/,
  /(^|\.)kuwo\.cn$/,
  /(^|\.)kugou\.com$/,
  /(^|\.)migu\.cn$/,
  /(^|\.)jsdelivr\.net$/,
  /(^|\.)githubusercontent\.com$/,
  /(^|\.)github\.com$/,
  /(^|\.)lxmusic\.xn--fiqs8s$/,
]

// 官方 API 域名白名单
const OFFICIAL_API_PATTERNS = [
  /^(mobi|nmobi|search|www|m)\.kuwo\.cn$/,
  /^(u|ut|c|y|i|music)\.y\.qq\.com$/,
  /^(u|ut|c|y|i|music)\.qq\.com$/,
  /^(interface|interface3|music)\.music\.163\.com$/,
  /^(interface|interface3|music)\.163\.com$/,
  /^(wwwapi|songsearch|m|www)\.kugou\.com$/,
  /^(app\.c\.nf|jadeite|music)\.migu\.cn$/,
]

const ALWAYS_ALLOW_PATTERNS = [
  /(^|\.)github\.com$/,
  /(^|\.)githubusercontent\.com$/,
  /(^|\.)jsdelivr\.net$/,
]

function extractHost(url) {
  try {
    const m = String(url).match(/^https?:\/\/([^/?#]+)/i)
    return m ? m[1].toLowerCase().replace(/:\d+$/, '') : null
  } catch (_) {
    return null
  }
}

function isMediaHost(host) {
  if (!host) return false
  if (OFFICIAL_API_PATTERNS.some((re) => re.test(host))) return false
  return MEDIA_HOST_PATTERNS.some((re) => re.test(host))
}

function isAlwaysAllow(host) {
  if (!host) return false
  return ALWAYS_ALLOW_PATTERNS.some((re) => re.test(host))
}

function qualityIndex(q) {
  const RANK = ['master', 'atmos_plus', 'atmos', 'hires', 'flac', 'flac24bit', '320k', '192k', '128k']
  const i = RANK.indexOf(q)
  return i === -1 ? 99 : i
}

/**
 * 一次带日志记录/过滤的单次请求
 * ⭐ 使用 try/finally 释放沙箱定时器（此函数调用次数极多，泄漏最严重）
 */
async function runOnce(scriptPath, song, platform, quality, allowedHosts, timeout) {
  const loaded = await loadApiSource(scriptPath, {
    logRequests: true,
    requestFilter: allowedHosts ? { allowedHosts } : null,
    initTimeout: 10000,
    scriptTimeout: 20000,
  })

  try {
    if (loaded.error) {
      return { error: loaded.error, url: null, requestHosts: [] }
    }
    const { handlers, getRequestLog } = loaded
    if (!handlers.request) return { error: '无 request 处理器', url: null, requestHosts: [] }

    const r = await new Promise((resolve) => {
      let done = false
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve({ error: '超时' }) }
      }, timeout)
      try {
        const info = { musicInfo: buildMusicInfo(song, platform), type: quality }
        const ret = handlers.request({ source: platform, action: 'musicUrl', info })
        if (ret && typeof ret.then === 'function') {
          ret.then((u) => {
            if (!done) {
              done = true; clearTimeout(timer)
              resolve({ url: typeof u === 'string' ? u : (u && u.url) || null })
            }
          }).catch((e) => {
            if (!done) { done = true; clearTimeout(timer); resolve({ error: (e && e.message) || String(e) }) }
          })
        } else {
          if (!done) { done = true; clearTimeout(timer); resolve({ url: typeof ret === 'string' ? ret : (ret && ret.url) || null }) }
        }
      } catch (e) {
        if (!done) { done = true; clearTimeout(timer); resolve({ error: (e && e.message) || String(e) }) }
      }
    })

    const requestHosts = getRequestLog ? getRequestLog().map((x) => x.host).filter(Boolean) : []
    return { ...r, requestHosts }
  } finally {
    // ⭐ 释放沙箱定时器
    if (typeof loaded.cleanup === 'function') {
      try { loaded.cleanup() } catch (_) {}
    }
  }
}

/**
 * 构建 musicInfo（与 tester.js 的 buildMusicInfo 保持一致）
 */
function buildMusicInfo(song, platform) {
  const p = (song.ids && song.ids[platform]) || {}
  const primaryId = p.songmid || p.hash || p.songId || p.rid || ''
  const info = {
    name: song.name || '',
    singer: song.singer || '',
    source: platform,
    interval: song.interval || null,
    albumName: song.albumName || '',
    img: '',
    typeUrl: {},
    types: [],
    _types: {},
  }
  if (primaryId) info.songmid = primaryId
  if (p.albumId) info.albumId = p.albumId
  switch (platform) {
    case 'kg':
      if (p.hash) info.hash = p.hash
      break
    case 'tx':
      if (p.strMediaMid) info.strMediaMid = p.strMediaMid
      if (p.albumMid) info.albumMid = p.albumMid
      if (p.songId) info.songId = p.songId
      break
    case 'mg':
      if (p.copyrightId) info.copyrightId = p.copyrightId
      break
  }
  return info
}

/**
 * 探测 URL 的实际音质
 */
async function detectActualQuality(url, platform, timeout) {
  if (!url) return null
  try {
    const axios = require('axios')
    const res = await axios.get(url, {
      headers: {
        Range: 'bytes=0-16383',
        'User-Agent': platform === 'wy'
          ? ''
          : 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 Chrome/107.0.0.0 Mobile Safari/537.36',
      },
      responseType: 'arraybuffer',
      timeout: timeout || 8000,
      validateStatus: () => true,
      maxRedirects: 5,
    })
    if (res.status < 200 || res.status >= 400) return null
    const buf = Buffer.from(res.data)
    if (!buf || buf.length < 12) return null
    if (buf.slice(0, 4).toString('ascii') === 'fLaC') {
      if (buf.length < 42) return 'flac'
      const si = 8
      const b18 = buf[si + 10], b19 = buf[si + 11], b20 = buf[si + 12], b21 = buf[si + 13]
      const sr = (b18 << 12) | (b19 << 4) | ((b20 >> 4) & 0x0f)
      const bd = (((b20 & 0x01) << 4) | ((b21 >> 4) & 0x0f)) + 1
      if (sr >= 192000) return 'master'
      if (sr >= 96000 || bd >= 24) return 'hires'
      return 'flac'
    }
    if (buf.slice(0, 3).toString('ascii') === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) {
      const tables = {
        v1l3: [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0],
        v2l3: [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0],
      }
      let offset = 0
      if (buf.slice(0, 3).toString('ascii') === 'ID3' && buf.length >= 10) {
        const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f)
        offset = 10 + size
      }
      for (let i = offset; i < buf.length - 4; i++) {
        if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
          const vBits = (buf[i + 1] >> 3) & 0x03
          const lBits = (buf[i + 1] >> 1) & 0x03
          const brIdx = (buf[i + 2] >> 4) & 0x0f
          if (lBits !== 0x01) continue
          const br = (vBits === 0x03 ? tables.v1l3 : tables.v2l3)[brIdx]
          if (br >= 320) return '320k'
          if (br >= 192) return '192k'
          if (br > 0) return '128k'
        }
      }
      return null
    }
    if (buf.slice(4, 8).toString('ascii') === 'ftyp') return '128k'
    if (buf.slice(0, 4).toString('ascii') === 'OggS') return 'flac'
    if (buf.slice(0, 4).toString('ascii') === 'RIFF') return 'flac'
    return null
  } catch (_) {
    return null
  }
}

/**
 * 主入口：检测一个音源文件所有平台的后端
 */
async function testBackends(scriptPath, song, options = {}, onProgress = () => {}) {
  const file = path.basename(scriptPath)
  const timeout = options.timeout || 15000
  const platforms = options.platforms || ['kw', 'kg', 'tx', 'wy', 'mg']

  onProgress({ type: 'backend-file-start', file })

  // ⭐ 首次探测：读取 sources 声明，用完立即释放
  const first = await loadApiSource(scriptPath, { logRequests: true })
  let declaredSources = {}
  let firstError = null
  try {
    if (first.error) {
      firstError = first.error
    } else {
      declaredSources = (first.initData && first.initData.sources) || {}
    }
  } finally {
    if (typeof first.cleanup === 'function') {
      try { first.cleanup() } catch (_) {}
    }
  }

  if (firstError) {
    onProgress({ type: 'backend-file-error', file, error: firstError })
    return { file, error: firstError, platforms: {} }
  }

  const toTest = platforms.filter((p) => declaredSources[p])
  const result = {}

  for (const platform of toTest) {
    onProgress({ type: 'backend-platform-start', file, platform })
    const declared = declaredSources[platform]
    const qualitys = declared.qualitys || []
    const sortedQ = [...qualitys].sort((a, b) => qualityIndex(a) - qualityIndex(b))

    const probeQualities = sortedQ

    console.log(`[backendTester] ${file} / ${platform}: 扫描 ${probeQualities.length} 个音质 (${probeQualities.join(', ')})`)

    const hostMap = new Map()

    // Phase 1：正常跑，收集请求主机
    for (const quality of probeQualities) {
      onProgress({ type: 'backend-scan', file, platform, quality })
      const normal = await runOnce(scriptPath, song, platform, quality, null, timeout)
      for (const host of (normal.requestHosts || [])) {
        if (isMediaHost(host)) continue
        if (!hostMap.has(host)) {
          hostMap.set(host, { host, qualities: new Set(), usable: null, quality: null, url: null, error: null })
        }
        hostMap.get(host).qualities.add(quality)
      }
    }

    // Phase 2：对每个主机做隔离测试
    const hostList = [...hostMap.values()]
    for (let i = 0; i < hostList.length; i++) {
      const entry = hostList[i]
      const testQuality = [...entry.qualities].sort((a, b) => qualityIndex(a) - qualityIndex(b))[0]
      onProgress({ type: 'backend-host-test', file, platform, host: entry.host, quality: testQuality })

      const allowed = [entry.host]
      const isolated = await runOnce(scriptPath, song, platform, testQuality, allowed, timeout)

      if (!isolated.url) {
        entry.usable = false
        entry.error = isolated.error || '未返回URL'
      } else {
        const detected = await detectActualQuality(isolated.url, platform, 8000)
        entry.usable = true
        entry.url = isolated.url
        entry.quality = detected || testQuality
      }
    }

    result[platform] = hostList.map((e) => ({
      host: e.host,
      qualities: [...e.qualities].sort((a, b) => qualityIndex(a) - qualityIndex(b)),
      usable: e.usable === true,
      quality: e.quality,
      url: e.url,
      error: e.error,
    }))
  }

  onProgress({ type: 'backend-file-done', file })
  return { file, platforms: result, error: null }
}

module.exports = { testBackends, isMediaHost, extractHost }
