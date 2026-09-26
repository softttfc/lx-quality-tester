/**
 * 生成合并后的音源文件
 * @version 1.8.0
 * @changelog
 *   v1.8.0:
 *     - [1] 评分公式改为 rate*0.45 + smoothedContrib*0.35 + speed*0.12 + order*0.08
 *     - [2] 引入平滑贡献率 smoothedContrib = (contributions + 1) / (calls + 10)
 *     - [3] 拦截条件改为：score < 0.20 && rate < 0.15（条件 A）
 *                        或 contributions === 0 && rate < 0.30（条件 B）
 *     - [4] UI 默认勾选规则同步更新，与运行时一致
 *   v1.7.0:
 *     - [1] P4：统一受保护域名配置（merger/protectedHosts.js），黑名单过滤与评分拦截共用
 *     - [2] P5：移除 AST 删除（applyBackendBlacklist），只保留运行时拦截
 *     - [3] P10：黑名单模式支持 (file, platform) 维度，保留全局回退
 *     - [4] 黑名单/评分模式均注入 __isProtectedHost__ / __FILE_IDX_TO_NAME__ / __makeBlockErr__
 *   v1.6.1:
 *     - [1] 支持三态 backendMode: 'none' | 'blacklist' | 'score'
 *     - [2] __CURRENT_FILE_IDX__ / __CURRENT_PLATFORM__ 无条件声明
 *     - [3] 黑名单模式 blockedHosts 为空时自动降级为 'none'
 *     - [4] modeLabel 支持三种模式
 */

const {
  PROTECTED_SUFFIXES,
  PROTECTED_REGEXPS,
  isProtectedHost,
} = require('./protectedHosts')

const QUALITY_RANK = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac', 'flac24bit', '320k', '192k', '128k',
]

const PER_SOURCE_TIMEOUT = 4000
const MAX_CONCURRENT_PER_HOST = 3

// ═══════════════════════════════════════════════════════
// 受保护域名过滤（Node 侧）
// ═══════════════════════════════════════════════════════

function filterProtectedHosts(hosts) {
  const input = Array.isArray(hosts) ? hosts : []
  const kept = []
  const removed = []
  for (const host of input) {
    if (isProtectedHost(host)) removed.push(host)
    else kept.push(host)
  }
  if (removed.length > 0) {
    console.warn('[generator] 以下受保护域名已被忽略，不会写入黑名单：' + removed.join(', '))
  }
  return kept
}

function filterProtectedHostsByFilePlatform(input) {
  const out = {}
  if (!input || typeof input !== 'object') return out
  for (const [file, platforms] of Object.entries(input)) {
    if (!platforms || typeof platforms !== 'object') continue
    for (const [platform, hosts] of Object.entries(platforms)) {
      if (!Array.isArray(hosts) || hosts.length === 0) continue
      const kept = hosts.filter((h) => typeof h === 'string' && h && !isProtectedHost(h))
      if (kept.length === 0) continue
      if (!out[file]) out[file] = {}
      out[file][platform] = kept
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════
// 工具
// ═══════════════════════════════════════════════════════

function extractHeader(content) {
  if (typeof content !== 'string') return ''
  const m = content.match(/^\/\*![\s\S]*?\*\//)
  return m ? m[0] : ''
}

function extractHosts(script) {
  const hosts = new Set()
  if (typeof script !== 'string' || !script) return hosts
  const re1 = /https?:\/\/([a-zA-Z0-9.\-]+)/g
  let m
  while ((m = re1.exec(script)) !== null) {
    const h = m[1].toLowerCase()
    if (h && h.includes('.')) hosts.add(h)
  }
  const re2 = /['"]((?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(?::\d+)?)['"]/g
  while ((m = re2.exec(script)) !== null) {
    const h = m[1].toLowerCase().replace(/:\d+$/, '')
    if (/\.(js|json|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|mp3|flac|m4a|mp4|webp)$/i.test(h)) continue
    if (h.length < 6) continue
    hosts.add(h)
  }
  return hosts
}

function findSharedHosts(files, selection) {
  const hostToFileIdxs = new Map()
  for (const [idxStr, platforms] of Object.entries(selection || {})) {
    if (!Array.isArray(platforms) || platforms.length === 0) continue
    const idx = Number(idxStr)
    const file = files[idx]
    if (!file || !file.content) continue
    const hosts = extractHosts(file.content)
    for (const h of hosts) {
      if (!hostToFileIdxs.has(h)) hostToFileIdxs.set(h, new Set())
      hostToFileIdxs.get(h).add(idx)
    }
  }
  const shared = []
  for (const [host, idxs] of hostToFileIdxs) {
    if (idxs.size >= 2) shared.push(host)
  }
  return shared.sort()
}

function computeParamScore(script) {
  if (typeof script !== 'string' || !script) return 0
  const KEYWORDS = [
    { field: 'singer', weight: 10 },
    { field: 'songname', weight: 8 },
    { field: 'songName', weight: 8 },
    { field: 'albumName', weight: 8 },
    { field: 'hash', weight: 8 },
    { field: 'songmid', weight: 8 },
    { field: 'albumId', weight: 5 },
    { field: 'rid', weight: 5 },
    { field: 'copyrightId', weight: 5 },
    { field: 'strMediaMid', weight: 3 },
    { field: 'mediaMid', weight: 3 },
    { field: 'duration', weight: 3 },
    { field: 'albumAudioId', weight: 3 },
  ]
  let score = 0
  for (const { field, weight } of KEYWORDS) {
    const patterns = [
      new RegExp(`\\bmusicInfo\\.${field}\\b`),
      new RegExp(`\\binfo\\.${field}\\b`),
      new RegExp(`\\{[^{}]*\\b${field}\\b[^{}]*\\}`),
    ]
    if (patterns.some((re) => re.test(script))) score += weight
  }
  return score
}

function countBackends(script) {
  if (typeof script !== 'string' || !script) return 0
  const re = /BACKENDS?\s*=\s*\[/gi
  let total = 0
  let m
  while ((m = re.exec(script)) !== null) {
    const openIdx = m.index + m[0].length - 1
    let depth = 0
    let closeIdx = -1
    for (let i = openIdx; i < script.length; i++) {
      const ch = script[i]
      if (ch === '[') depth++
      else if (ch === ']') {
        depth--
        if (depth === 0) { closeIdx = i; break }
      }
    }
    if (closeIdx === -1) continue
    const body = script.slice(openIdx + 1, closeIdx)
    total += (body.match(/\{\s*name\s*:/g) || []).length
    re.lastIndex = closeIdx + 1
  }
  return total
}

function detectSharedHosts(files, selection) {
  return findSharedHosts(files, selection)
}

function computeScores(report) {
  const scores = {}
  if (!report || !Array.isArray(report.results)) return scores
  for (const r of report.results) {
    const perPlatform = {}
    for (const p of (r.platforms || [])) {
      let bestIdx = 99
      let passCount = 0
      for (const q of (p.qualities || [])) {
        if (!q.passes) continue
        passCount++
        const idx = QUALITY_RANK.indexOf(q.actualQuality || q.quality)
        if (idx !== -1 && idx < bestIdx) bestIdx = idx
      }
      perPlatform[p.source] = { bestIdx, passCount }
    }
    scores[r.file] = perPlatform
  }
  return scores
}

function sanitizeHostScores(hostScores) {
  const out = {}
  if (!hostScores || typeof hostScores !== 'object') return out
  const source = (hostScores.global && typeof hostScores.global === 'object')
    ? hostScores.global
    : hostScores
  const NUMERIC_FIELDS = ['calls', 'ok', 'fail', 'blocked', 'httpError',
                          'contributions', 'rate', 'avgMs', 'avgOrder', 'contributionRate']
  for (const [host, v] of Object.entries(source)) {
    if (host === '_meta' || host === 'global' || host === 'byFile') continue
    if (!v || typeof v !== 'object') continue
    const cleaned = {}
    for (const f of NUMERIC_FIELDS) {
      if (typeof v[f] === 'number' && isFinite(v[f])) cleaned[f] = v[f]
    }
    if (Object.keys(cleaned).length > 0) out[host] = cleaned
  }
  return out
}

function sanitizeHostScoresByFilePlatform(hostScores) {
  const out = {}
  if (!hostScores || typeof hostScores !== 'object') return out
  const byFile = hostScores.byFile || {}
  if (!byFile || typeof byFile !== 'object') return out
  const NUMERIC_FIELDS = ['calls', 'ok', 'fail', 'blocked', 'httpError',
                          'contributions', 'rate', 'avgMs', 'avgOrder', 'contributionRate']
  for (const [fileName, fileData] of Object.entries(byFile)) {
    if (!fileData || typeof fileData !== 'object') continue
    const byPlatform = fileData.byPlatform || {}
    for (const [platform, scope] of Object.entries(byPlatform)) {
      if (!scope || typeof scope !== 'object') continue
      for (const [host, v] of Object.entries(scope)) {
        if (!v || typeof v !== 'object') continue
        const cleaned = {}
        for (const f of NUMERIC_FIELDS) {
          if (typeof v[f] === 'number' && isFinite(v[f])) cleaned[f] = v[f]
        }
        if (Object.keys(cleaned).length === 0) continue
        if (!out[fileName]) out[fileName] = {}
        if (!out[fileName][platform]) out[fileName][platform] = {}
        out[fileName][platform][host] = cleaned
      }
    }
  }
  return out
}

function normalizeKeepDrop(input) {
  const EMPTY = { global: [], byFilePlatform: {} }
  if (!input) return EMPTY
  if (Array.isArray(input)) {
    const cleaned = input.filter((h) => typeof h === 'string' && h)
    return { global: cleaned, byFilePlatform: {} }
  }
  if (typeof input !== 'object') return EMPTY
  const byFilePlatform = {}
  for (const [file, platforms] of Object.entries(input)) {
    if (!platforms || typeof platforms !== 'object') continue
    for (const [platform, list] of Object.entries(platforms)) {
      if (!Array.isArray(list) || list.length === 0) continue
      const cleaned = list.filter((h) => typeof h === 'string' && h)
      if (cleaned.length === 0) continue
      if (!byFilePlatform[file]) byFilePlatform[file] = {}
      byFilePlatform[file][platform] = cleaned
    }
  }
  return { global: [], byFilePlatform }
}

// ═══════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════

function generateMergedCode(files, selection, report, options = {}) {
  let backendMode = options.backendMode
  if (backendMode !== 'none' && backendMode !== 'blacklist' && backendMode !== 'score') {
    backendMode = 'blacklist'
  }

  const rawBlockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const rawBlockedByFP = options.blockedHostsByFilePlatform && typeof options.blockedHostsByFilePlatform === 'object'
    ? options.blockedHostsByFilePlatform
    : {}

  const hostScores = options.hostScores && typeof options.hostScores === 'object' ? options.hostScores : {}

  const keepNorm = normalizeKeepDrop(options.shadowKeep)
  const dropNorm = normalizeKeepDrop(options.shadowDrop)

  // P4：过滤受保护域名
  const blockedHosts = backendMode === 'blacklist'
    ? filterProtectedHosts(rawBlockedHosts)
    : []
  const blockedHostsByFilePlatform = backendMode === 'blacklist'
    ? filterProtectedHostsByFilePlatform(rawBlockedByFP)
    : {}

  const hasGlobalBlocked = blockedHosts.length > 0
  const hasFilePlatformBlocked = Object.keys(blockedHostsByFilePlatform).length > 0

  // 黑名单模式下没有任何要屏蔽的 host → 降级为 none
  const effectiveMode = (backendMode === 'blacklist' && !hasGlobalBlocked && !hasFilePlatformBlocked)
    ? 'none'
    : backendMode

  const sanitizedScores = effectiveMode === 'score'
    ? sanitizeHostScores(hostScores)
    : {}

  const sanitizedScoresByFilePlatform = effectiveMode === 'score'
    ? sanitizeHostScoresByFilePlatform(hostScores)
    : {}

  const scores = computeScores(report)
  const sharedHosts = findSharedHosts(files, selection)

  const priorityMap = {}
  for (const [fileIdxStr, platforms] of Object.entries(selection)) {
    const fileIdx = Number(fileIdxStr)
    for (const p of platforms) {
      if (!priorityMap[p]) priorityMap[p] = []
      if (!priorityMap[p].includes(fileIdx)) {
        priorityMap[p].push(fileIdx)
      }
    }
  }

  const fileIdxToName = {}
  for (const idxStr of Object.keys(selection)) {
    const idx = Number(idxStr)
    if (files[idx] && files[idx].name) fileIdxToName[idx] = files[idx].name
  }

  for (const p of Object.keys(priorityMap)) {
    priorityMap[p].sort((a, b) => {
      const nameA = files[a]?.name || ''
      const nameB = files[b]?.name || ''
      const sa = (scores[nameA] && scores[nameA][p]) || { bestIdx: 99, passCount: 0 }
      const sb = (scores[nameB] && scores[nameB][p]) || { bestIdx: 99, passCount: 0 }
      if (sa.bestIdx !== sb.bestIdx) return sa.bestIdx - sb.bestIdx
      if (sa.passCount !== sb.passCount) return sb.passCount - sa.passCount
      const pa = computeParamScore(files[a]?.content || '')
      const pb = computeParamScore(files[b]?.content || '')
      if (pa !== pb) return pb - pa
      const ba = countBackends(files[a]?.content || '')
      const bb = countBackends(files[b]?.content || '')
      if (ba !== bb) return ba - bb
      return a - b
    })
  }

  const mergedSources = {}
  for (const [platform, priorityList] of Object.entries(priorityMap)) {
    let mergedQualitys = new Set()
    let name = platform
    for (const fileIdx of priorityList) {
      const file = files[fileIdx]
      if (file.sources && file.sources[platform]) {
        const src = file.sources[platform]
        if (src.name) name = src.name
        if (Array.isArray(src.qualitys)) {
          for (const q of src.qualitys) mergedQualitys.add(q)
        }
      }
    }
    if (mergedQualitys.size > 0) {
      mergedSources[platform] = {
        name,
        type: 'music',
        actions: ['musicUrl'],
        qualitys: Array.from(mergedQualitys),
      }
    }
  }

  let modeLabel
  if (effectiveMode === 'score') {
    modeLabel = '后端优化：影子评分（按平台）'
  } else if (effectiveMode === 'blacklist') {
    modeLabel = '后端优化：黑名单（按文件+平台）'
  } else {
    modeLabel = '后端优化：无'
  }

  const sharedInfo = sharedHosts.length > 0
    ? `\n * 检测到共享后端（已启用有界并发保护，每 host 最多 ${MAX_CONCURRENT_PER_HOST} 个并发）：\n${sharedHosts.map((h) => ' *   - ' + h).join('\n')}`
    : ''

  let code = `/*!
 * @name 合并音源
 * @description 由以下音源合并生成（平台优先级已按上次测试结果排序；${modeLabel}）：${sharedInfo}
${files.map((f, i) => {
  const platforms = selection[i] || []
  const pStr = platforms.length ? ` [${platforms.join(', ')}]` : ' (未使用)'
  const pruneInfo = f.pruneInfo && !f.pruneInfo.error
    ? ` (裁剪: -${f.pruneInfo.removed} 节点)`
    : ''
  const scoreInfo = platforms.length
    ? ' { ' + platforms.map((p) => {
        const s = (scores[f.name] && scores[f.name][p]) || { bestIdx: 99, passCount: 0 }
        const q = s.bestIdx === 99 ? '无' : QUALITY_RANK[s.bestIdx]
        return `${p}: ${q}/${s.passCount}`
      }).join(', ') + ' }'
    : ''
  const backendCount = countBackends(f.content || '')
  const backendInfo = backendCount > 0 ? ` (后端: ${backendCount})` : ''
  return ` *   [${i + 1}] ${f.name}${pStr}${pruneInfo}${scoreInfo}${backendInfo}`
}).join('\n')}
 * @version 1.8.0
 * @generated ${new Date().toISOString()}
 */

;(function () {
  'use strict'

  const __origin_lx = globalThis.lx
  if (!__origin_lx) throw new Error('本音源必须在 LX Music 环境中运行')

  const EVENT_NAMES = __origin_lx.EVENT_NAMES

  // ═══════════════════════════════════════════════════════
  // 【方案 B】异步错误记录器
  // ═══════════════════════════════════════════════════════
  ;(function () {
    var __onUnhandled__ = function (e) {
      try {
        var msg = (e && e.reason && e.reason.message) || (e && e.message) || String(e)
        console.warn('[合并音源] 捕获到未处理的异步错误（不阻止宿主处理）:', msg)
      } catch (_) {}
    }
    try {
      if (typeof process !== 'undefined' && typeof process.on === 'function') {
        process.on('unhandledRejection', __onUnhandled__)
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('unhandledrejection', __onUnhandled__)
      }
    } catch (_) {}
  })()

  // ═══════════════════════════════════════════════════════
  // 【共享后端有界并发】
  // ═══════════════════════════════════════════════════════
  var __SHARED_HOSTS__ = new Set(${JSON.stringify(sharedHosts)})
  var __MAX_CONCURRENT__ = ${MAX_CONCURRENT_PER_HOST}
  var __HOST_INFLIGHT__ = Object.create(null)
  var __HOST_QUEUE__ = Object.create(null)

  function __enqueueByHost__(host, run) {
    if (!host || !__SHARED_HOSTS__.has(host)) return run()

    return new Promise(function (resolve, reject) {
      var execute = function () {
        __HOST_INFLIGHT__[host] = (__HOST_INFLIGHT__[host] || 0) + 1
        Promise.resolve()
          .then(run)
          .then(resolve, reject)
          .then(function () {
            __HOST_INFLIGHT__[host] = (__HOST_INFLIGHT__[host] || 1) - 1
            var q = __HOST_QUEUE__[host]
            if (q && q.length > 0) {
              var next = q.shift()
              next()
            }
          })
      }

      var inflight = __HOST_INFLIGHT__[host] || 0
      if (inflight < __MAX_CONCURRENT__) {
        execute()
      } else {
        if (!__HOST_QUEUE__[host]) __HOST_QUEUE__[host] = []
        __HOST_QUEUE__[host].push(execute)
      }
    })
  }
`

  // ═══════════════════════════════════════════════════════
  // 受保护域名 + 拦截器（黑名单 / 评分共用的部分）
  // ═══════════════════════════════════════════════════════
  if (effectiveMode !== 'none') {
    const protectedSuffixesJson = JSON.stringify(PROTECTED_SUFFIXES)
    const protectedRegexpsJson = JSON.stringify(PROTECTED_REGEXPS.map(r => r.source))
    const fileIdxToNameJson = JSON.stringify(fileIdxToName)

    code += `
  // ═══════════════════════════════════════════════════════
  // 【受保护域名】黑名单/评分共用
  // ═══════════════════════════════════════════════════════
  var __PROTECTED_SUFFIXES__ = ${protectedSuffixesJson}
  var __PROTECTED_REGEXPS__ = ${protectedRegexpsJson}
  var __FILE_IDX_TO_NAME__ = ${fileIdxToNameJson}

  function __normalizeHost__(host) {
    if (!host) return ''
    var h = String(host).toLowerCase()
    var idx = h.indexOf(':')
    if (idx !== -1) h = h.slice(0, idx)
    return h
  }

  function __isProtectedHost__(host) {
    var h = __normalizeHost__(host)
    if (!h) return false
    for (var i = 0; i < __PROTECTED_SUFFIXES__.length; i++) {
      var s = __PROTECTED_SUFFIXES__[i]
      if (h === s || h.endsWith('.' + s)) return true
    }
    for (var j = 0; j < __PROTECTED_REGEXPS__.length; j++) {
      if (new RegExp(__PROTECTED_REGEXPS__[j]).test(h)) return true
    }
    return false
  }

  function __makeBlockErr__(host, tag) {
    var err = new Error('getaddrinfo ENOTFOUND ' + host)
    err.code = 'ENOTFOUND'
    err.errno = -3008
    err.syscall = 'getaddrinfo'
    err.hostname = host
    err.blockedByMerger = true
    if (tag) err.blockedByTag = tag
    return err
  }
`
  }

  // ═══════════════════════════════════════════════════════
  // 黑名单模式拦截器（P10：按 (file, platform) + 全局回退）
  // ═══════════════════════════════════════════════════════
  if (effectiveMode === 'blacklist') {
    const blockedByFPJson = JSON.stringify(blockedHostsByFilePlatform)
    const blockedGlobalJson = JSON.stringify(blockedHosts)

    code += `
  // ═══════════════════════════════════════════════════════
  // 【后端黑名单 v2】按 (file, platform) + 全局回退
  // ═══════════════════════════════════════════════════════
  var __BLOCKED_HOSTS_BY_FILE_PLATFORM__ = ${blockedByFPJson}
  var __BLOCKED_HOSTS__ = new Set(${blockedGlobalJson})

  function __interceptRequest__(host) {
    if (!host) return null
    if (__isProtectedHost__(host)) return null

    var fileIdx = __CURRENT_FILE_IDX__
    var platform = __CURRENT_PLATFORM__
    var fileName = (fileIdx >= 0 && __FILE_IDX_TO_NAME__[fileIdx])
      ? __FILE_IDX_TO_NAME__[fileIdx]
      : null

    // 1. 按 (file, platform) 查
    if (fileName && platform) {
      var fb = __BLOCKED_HOSTS_BY_FILE_PLATFORM__[fileName]
      if (fb && fb[platform] && fb[platform].indexOf(host) >= 0) {
        return __makeBlockErr__(host, 'blacklist')
      }
    }

    // 2. 回退全局
    if (__BLOCKED_HOSTS__.has(host)) return __makeBlockErr__(host, 'blacklist-global')

    return null
  }
`
  }

  // ═══════════════════════════════════════════════════════
  // 评分模式拦截器
  // ═══════════════════════════════════════════════════════
  if (effectiveMode === 'score' && Object.keys(sanitizedScores).length > 0) {
    const keepGlobalJson = JSON.stringify(keepNorm.global)
    const dropGlobalJson = JSON.stringify(dropNorm.global)
    const keepByFilePlatformJson = JSON.stringify(keepNorm.byFilePlatform)
    const dropByFilePlatformJson = JSON.stringify(dropNorm.byFilePlatform)
    const scoresByFilePlatformJson = JSON.stringify(sanitizedScoresByFilePlatform)

    code += `
  // ═══════════════════════════════════════════════════════
  // 【影子评分 v4】按 (file, platform) 维度动态限制低质量后端
  //   - 公式：score = rate*0.45 + smoothedContrib*0.35 + speedScore*0.12 + orderScore*0.04
  //          smoothedContrib = (contributions + 1) / (calls + 10)
  //   - 拦截条件 A：calls >= 5 && score < 0.20 && rate < 0.15
  //   - 拦截条件 B：calls >= 10 && contributions === 0 && rate < 0.30
  //   - 官方 API 白名单：后缀匹配，永不拦截
  //   - 判定顺序：
  //       protected
  //         → (file,platform) keep → (file,platform) drop → (file,platform) 评分
  //         → 全局 keep → 全局 drop → 全局评分
  // ═══════════════════════════════════════════════════════
  var __HOST_SCORES__ = ${JSON.stringify(sanitizedScores)}
  var __HOST_SCORES_BY_FILE_PLATFORM__ = ${scoresByFilePlatformJson}
  var __FORCE_KEEP__ = new Set(${keepGlobalJson})
  var __FORCE_DROP__ = new Set(${dropGlobalJson})
  var __FORCE_KEEP_BY_FILE_PLATFORM__ = ${keepByFilePlatformJson}
  var __FORCE_DROP_BY_FILE_PLATFORM__ = ${dropByFilePlatformJson}

  function __scoreHostStats__(s) {
    if (!s) return 1.0
    var rateScore = (typeof s.rate === 'number') ? s.rate : 1.0
    var calls = s.calls || 0
    var contributions = s.contributions || 0
    var smoothedContrib = (contributions + 1) / (calls + 10)
    var speedScore = Math.max(0, 1 - (s.avgMs || 0) / 5000)
    var orderScore = Math.max(0, 1 - (s.avgOrder || 0) / 10)
    return rateScore * 0.45 + smoothedContrib * 0.35 + speedScore * 0.12 + orderScore * 0.08
  }

  function __checkScoreBlock__(s, host) {
    if (!s) return null
    var calls = s.calls || 0
    if (calls < 5) return null
    var rate = (typeof s.rate === 'number') ? s.rate : 1.0
    var contributions = s.contributions || 0
    var score = __scoreHostStats__(s)

    // 条件 A：低分 + 低成功率
    if (score < 0.20 && rate < 0.15) return __makeBlockErr__(host, 'score-low')
    // 条件 B：有调用但从不产出 URL
    if (calls >= 10 && contributions === 0 && rate < 0.30) return __makeBlockErr__(host, 'score-zero-contrib')

    return null
  }

  function __interceptRequest__(host) {
    if (!host) return null
    if (__isProtectedHost__(host)) return null

    var fileIdx = __CURRENT_FILE_IDX__
    var platform = __CURRENT_PLATFORM__
    var fileName = (fileIdx >= 0 && __FILE_IDX_TO_NAME__[fileIdx])
      ? __FILE_IDX_TO_NAME__[fileIdx]
      : null

    // 1. 按 (file, platform) 判定，keep → drop → score
    if (fileName && platform) {
      var fk = __FORCE_KEEP_BY_FILE_PLATFORM__[fileName]
      if (fk && fk[platform] && fk[platform].indexOf(host) >= 0) return null

      var fd = __FORCE_DROP_BY_FILE_PLATFORM__[fileName]
      if (fd && fd[platform] && fd[platform].indexOf(host) >= 0) {
        return __makeBlockErr__(host, 'shadow-drop')
      }

      var fs = __HOST_SCORES_BY_FILE_PLATFORM__[fileName]
      if (fs && fs[platform] && fs[platform][host]) {
        return __checkScoreBlock__(fs[platform][host], host)
      }
    }

    // 2. 回退全局，keep → drop → score
    if (__FORCE_KEEP__.has(host)) return null
    if (__FORCE_DROP__.has(host)) return __makeBlockErr__(host, 'shadow-drop-global')

    var gs = __HOST_SCORES__[host]
    if (gs) return __checkScoreBlock__(gs, host)

    return null
  }
`
  }

  // ═══════════════════════════════════════════════════════
  // 上下文变量 + 统一 request wrapper
  // ═══════════════════════════════════════════════════════
  code += `
  var __CURRENT_FILE_IDX__ = -1
  var __CURRENT_PLATFORM__ = null

  function __makeRequestWrapper__(origRequest, lxRef) {
    if (origRequest.__hywWrapped__) return origRequest

    var wrapped = function (url, options, cb) {
      var cb2 = (typeof options === 'function') ? options : cb
      var host = null
      try {
        var m = String(url).match(/^https?:\\/\\/([^/?#]+)/i)
        host = m ? m[1].toLowerCase().replace(/:\\d+$/, '') : null
      } catch (e) {}

      // 1. 拦截检查
      if (typeof __interceptRequest__ === 'function') {
        var intErr = null
        try { intErr = __interceptRequest__(host) } catch (e) {}
        if (intErr) {
          if (typeof cb2 === 'function') setImmediate(function () { cb2(intErr, null, null) })
          return function () {}
        }
      }

      // 2. 有界并发队列
      return __enqueueByHost__(host, function () {
        return new Promise(function (resolve) {
          var done = false
          var release = function () {
            if (done) return
            done = true
            resolve()
          }
          var guard = setTimeout(function () {
            console.log('[有界并发] host=' + host + ' 15s 超时释放')
            release()
          }, 15000)
          try {
            origRequest.call(lxRef || __origin_lx, url, options, function (err, resp, body) {
              clearTimeout(guard)
              try {
                if (typeof cb2 === 'function') cb2(err, resp, body)
              } finally {
                release()
              }
            })
          } catch (e) {
            clearTimeout(guard)
            try {
              if (typeof cb2 === 'function') cb2(e, null, null)
            } finally {
              release()
            }
          }
        })
      })
    }
    wrapped.__hywWrapped__ = true
    return wrapped
  }

  // ═══════════════════════════════════════════════════════
  // 平台优先级
  // ═══════════════════════════════════════════════════════
  const PLATFORM_PRIORITY = ${JSON.stringify(priorityMap, null, 2)}

  const __handlers__ = []
`

  // ═══════════════════════════════════════════════════════
  // P5：移除 AST 删除，直接注入原始代码
  // ═══════════════════════════════════════════════════════
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const platforms = selection[i] || []
    if (platforms.length === 0) continue

    const content = file.content

    const replaced = content
      .replace(/globalThis\s*\.\s*lx\b/g, '__lx_proxy__')
      .replace(/globalThis\s*\[\s*['"]lx['"]\s*\]/g, '__lx_proxy__')

    const ownScriptInfo = {
      name: (file.info && file.info.name) || file.name,
      description: (file.info && file.info.description) || '',
      version: (file.info && file.info.version) || '',
      author: (file.info && file.info.author) || '',
      homepage: (file.info && file.info.homepage) || '',
      rawScript: extractHeader(content),
    }

    code += `
  // ═══════════════════════════════════════════════════════
  // 音源 [${i + 1}]: ${file.name}  (平台: ${platforms.join(', ')})
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = ${i}
    try {
      const __lx_proxy__ = (function () {
        var p
        try { p = Object.create(Object.getPrototypeOf(__origin_lx) || Object.prototype) } catch (_) { p = {} }
        try {
          var names = Object.getOwnPropertyNames(__origin_lx)
          for (var i = 0; i < names.length; i++) {
            try { p[names[i]] = __origin_lx[names[i]] } catch (_) {}
          }
        } catch (_) {
          try {
            for (var k in __origin_lx) { try { p[k] = __origin_lx[k] } catch (_) {} }
          } catch (_) {}
        }
        return p
      })()

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {}

      try {
        Object.defineProperty(__lx_proxy__, 'currentScriptInfo', {
          value: ${JSON.stringify(ownScriptInfo)},
          writable: false,
          configurable: true,
        })
      } catch (_) {}

      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request, __origin_lx)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
${replaced.split('\n').map((line) => '      ' + line).join('\n')}
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()
`
  }

  // ═══════════════════════════════════════════════════════
  // 质量探测 + 分发层
  // ═══════════════════════════════════════════════════════
  code += `
  var __QUALITY_RANK__ = ['master','atmos_plus','atmos','hires','flac','flac24bit','320k','192k','128k']
  function __qualityIndex__(q) {
    var i = __QUALITY_RANK__.indexOf(q)
    return i === -1 ? 99 : i
  }

  function __detectQuality__(buf) {
    if (!buf || buf.length < 4) return null
    if (buf[0]===0x66 && buf[1]===0x4C && buf[2]===0x61 && buf[3]===0x43) {
      if (buf.length < 42) return 'flac'
      var si = 8
      var b18 = buf[si+10], b19 = buf[si+11], b20 = buf[si+12], b21 = buf[si+13]
      var sr = (b18<<12) | (b19<<4) | ((b20>>4)&0x0f)
      var bd = (((b20&0x01)<<4) | ((b21>>4)&0x0f)) + 1
      if (sr >= 192000) return 'master'
      if (sr >= 96000 || bd >= 24) return 'hires'
      return 'flac'
    }
    if ((buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) ||
        (buf[0]===0xFF && (buf[1]&0xE0)===0xE0)) {
      var bitrateTableV1L3 = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0]
      var bitrateTableV2L3 = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0]
      var offset = 0
      if (buf[0]===0x49 && buf.length >= 10) {
        offset = 10 + (((buf[6]&0x7f)<<21)|((buf[7]&0x7f)<<14)|((buf[8]&0x7f)<<7)|(buf[9]&0x7f))
      }
      for (var i = offset; i < buf.length-4; i++) {
        if (buf[i]===0xFF && (buf[i+1]&0xE0)===0xE0) {
          var vBits = (buf[i+1]>>3)&0x03
          var lBits = (buf[i+1]>>1)&0x03
          var brIdx = (buf[i+2]>>4)&0x0f
          if (lBits !== 0x01) continue
          var table = vBits===0x03 ? bitrateTableV1L3 : bitrateTableV2L3
          var br = table[brIdx]
          if (br >= 320) return '320k'
          if (br >= 192) return '192k'
          if (br > 0) return '128k'
        }
      }
      return null
    }
    if (buf[4]===0x66 && buf[5]===0x74 && buf[6]===0x79 && buf[7]===0x70) return '128k'
    if (buf[0]===0x4F && buf[1]===0x67 && buf[2]===0x67 && buf[3]===0x53) return 'flac'
    if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46) return 'flac'
    return null
  }

  function __bodyToBuffer__(body) {
    if (!body) return null
    if (body instanceof ArrayBuffer) return new Uint8Array(body)
    if (body instanceof Uint8Array) return body
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    if (body && body.type === 'Buffer' && Array.isArray(body.data)) {
      return new Uint8Array(body.data)
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(body)) {
      return new Uint8Array(body)
    }
    if (typeof body === 'string') {
      var arr = new Uint8Array(body.length)
      for (var i = 0; i < body.length; i++) arr[i] = body.charCodeAt(i) & 0xFF
      return arr
    }
    return null
  }

  function __probeUrl__(url) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve(null) }, 8000)
      try {
        __origin_lx.request(url, {
          method: 'GET',
          headers: {
            'Range': 'bytes=0-1023',
            'User-Agent': 'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36'
          },
          timeout: 8000,
        }, function (err, resp) {
          clearTimeout(timer)

          if (err || !resp) return resolve(null)
          if (resp.statusCode < 200 || resp.statusCode >= 400) return resolve(null)

          var __raw__ = (resp.rawBody != null) ? resp.rawBody : resp.body
          var buf = __bodyToBuffer__(__raw__)

          if (!buf || buf.length < 4) return resolve('__UNKNOWN_OK__')

          var q = __detectQuality__(buf)
          if (!q) return resolve('__UNKNOWN_OK__')
          return resolve(q)
        })
      } catch (e) {
        clearTimeout(timer)
        resolve(null)
      }
    })
  }

  __origin_lx.on(EVENT_NAMES.request, async function (params) {
    const source = params.source
    const priorityList = PLATFORM_PRIORITY[source]
    if (!priorityList || !priorityList.length) {
      throw new Error('不支持的平台: ' + source)
    }

    const requested = params.info && params.info.type
    const reqIdx = requested ? __qualityIndex__(requested) : 99
    const errors = []

    const __PER_SOURCE_TIMEOUT__ = ${PER_SOURCE_TIMEOUT}

    var __innerParams__ = params
    if (params.info && params.info.musicInfo) {
      var __src__ = params.info.musicInfo
      var __norm__ = Object.assign({}, __src__)
      var __sid__ = __src__.songmid || __src__.hash || __src__.id || __src__.songId || __src__.rid || __src__.musicId || ''
      if (__sid__) {
        if (!__norm__.songmid) __norm__.songmid = __sid__
        if (!__norm__.hash)    __norm__.hash    = __sid__
        if (!__norm__.id)      __norm__.id      = __sid__
        if (!__norm__.songId)  __norm__.songId  = __sid__
        if (!__norm__.rid)     __norm__.rid     = __sid__
      }
      __innerParams__ = Object.assign({}, params, {
        info: Object.assign({}, params.info, { musicInfo: __norm__ })
      })
    }

    for (const fileIdx of priorityList) {
      const h = __handlers__.find(function (x) { return x.fileIdx === fileIdx })
      if (!h) {
        console.log('[分发] 源' + (fileIdx + 1) + ' 未注册，跳过')
        continue
      }

      __CURRENT_FILE_IDX__ = fileIdx
      __CURRENT_PLATFORM__ = source

      try {
        const result = await Promise.race([
          h.handler(__innerParams__),
          new Promise(function (_, reject) {
            setTimeout(function () {
              reject(new Error('超时(' + __PER_SOURCE_TIMEOUT__ + 'ms)'))
            }, __PER_SOURCE_TIMEOUT__)
          })
        ])
        if (!result) {
          console.log('[分发] 源' + (fileIdx + 1) + ' 返回空，跳过')
          continue
        }

        const actual = await __probeUrl__(result)
        console.log('[分发] 源' + (fileIdx + 1) + ' 探测结果:', actual, '| URL前80:', String(result).slice(0, 80))

        if (actual === null || actual === '__UNKNOWN_OK__') {
          console.log('[分发] 源' + (fileIdx + 1) + ' 探测失败/未知，放行')
          return result
        }
        if (__qualityIndex__(actual) > reqIdx) {
          console.log('[分发] 源' + (fileIdx + 1) + ' 降级 ' + requested + '→' + actual + '，放行')
        }
        return result
      } catch (e) {
        var __errMsg__ = (e && e.message) ? e.message : String(e)
        console.log('[分发] 源' + (fileIdx + 1) + ' 失败:', __errMsg__)
        errors.push('[源' + (fileIdx + 1) + '] ' + __errMsg__)
      }
    }

    try {
      const firstIdx = priorityList[0]
      const h0 = __handlers__.find(function (x) { return x.fileIdx === firstIdx })
      if (h0) {
        __CURRENT_FILE_IDX__ = firstIdx
        __CURRENT_PLATFORM__ = source
        const fallback = await h0.handler(__innerParams__)
        if (fallback) return fallback
      }
    } catch (e) {}

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.slice(0, 8).join(' | '))
  })

  setTimeout(function () {
    try {
      __origin_lx.send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: false,
        sources: ${JSON.stringify(mergedSources, null, 6)}
      })
    } catch (e) {
      console.error('[合并音源] 发送 inited 失败:', e && e.message ? e.message : e)
    }
  }, 3000)
})()
`

  return code
}

module.exports = { generateMergedCode, detectSharedHosts }
