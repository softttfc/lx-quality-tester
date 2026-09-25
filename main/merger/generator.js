/**
 * 生成合并后的音源文件
 * @version 1.6.0
 * @changelog
 *   v1.6.0:
 *     - [1] 新增按 (file, platform) 维度的评分注入（sanitizeHostScoresByFilePlatform）
 *     - [2] 新增 __HOST_SCORES_BY_FILE_PLATFORM__ / __FORCE_KEEP_BY_FILE_PLATFORM__ / __FORCE_DROP_BY_FILE_PLATFORM__
 *     - [3] 新增 __FILE_IDX_TO_NAME__、__CURRENT_FILE_IDX__ / __CURRENT_PLATFORM__ 上下文
 *     - [4] __interceptRequest__ 按 (file, platform) 优先判定、全局回退；keep → drop 顺序不变
 *     - [5] normalizeKeepDrop 兼容数组（旧）和对象（新）两种 keep/drop 结构
 *   v1.5.0:
 *     - [1] 评分公式改为 rate*0.9 + speed*0.06 + order*0.04
 *     - [2] 拦截条件改为 calls >= 5 && score < 0.15 && rate < 0.1
 *     - [3] 新增官方 API 白名单（后缀匹配）
 *     - [4] 新增用户勾选覆盖 __FORCE_KEEP__ / __FORCE_DROP__
 *     - [5] sanitizeHostScores 从 hostScores.global 提取运行时评分
 *   v1.4.0:
 *     - [1] 共享后端从"完全串行"改为"有界并发"（__MAX_CONCURRENT__=3）
 *     - [2] guard 超时 30s → 15s
 *     - [3] dispatch 每源软超时 4s + 失败日志
 *     - [4] countBackends 遍历所有 BACKENDS 数组，统计更准确
 *     - [5] 文件头每个源后追加 (后端: N)
 */

const { applyBackendBlacklist } = require('./backendBlocker')

const QUALITY_RANK = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac', 'flac24bit', '320k', '192k', '128k',
]

// ⭐ v1.4.0：每源软超时（毫秒）
const PER_SOURCE_TIMEOUT = 4000

// ⭐ v1.4.0：共享后端每 host 最大并发数
const MAX_CONCURRENT_PER_HOST = 3

// ⭐ v1.5.0：评分模式运行时白名单后缀（官方 API / 媒体 CDN）
const RUNTIME_PROTECTED_SUFFIXES = [
  'y.qq.com',
  'qqmusic.qq.com',
  'stream.qqmusic.qq.com',
  'music.163.com',
  'music.126.net',
  'kugou.com',
  'kuwo.cn',
  'migu.cn',
  'c.nf',
  'gdstudio.xyz',
  'lxmusic.xn--fiqs8s',
]

// ═══════════════════════════════════════════════════════
// 【块 C】受保护域名（防止用户误屏蔽官方 API / 媒体 CDN）
// ═══════════════════════════════════════════════════════
const PROTECTED_HOST_PATTERNS = [
  /(^|\.)y\.qq\.com$/,
  /(^|\.)music\.163\.com$/,
  /(^|\.)kugou\.com$/,
  /(^|\.)kuwo\.cn$/,
  /(^|\.)migu\.cn$/,
  /^music-api\.gdstudio\.xyz$/,
  /(^|\.)m[^.]*\.music\.126\.net$/,
  /^dl\.stream\.qqmusic\.qq\.com$/,
  /(^|\.)kw-[^.]+\.kuwo\.cn$/,
]

function isProtectedHost(host) {
  if (!host) return false
  return PROTECTED_HOST_PATTERNS.some((re) => re.test(host))
}

function filterProtectedHosts(hosts) {
  const input = Array.isArray(hosts) ? hosts : []
  const kept = []
  const removed = []

  for (const host of input) {
    if (isProtectedHost(host)) removed.push(host)
    else kept.push(host)
  }

  if (removed.length > 0) {
    console.warn(
      '[generator] 以下受保护域名已被忽略，不会写入黑名单：' +
      removed.join(', ')
    )
  }

  return kept
}

function extractHeader(content) {
  if (typeof content !== 'string') return ''
  const m = content.match(/^\/\*![\s\S]*?\*\//)
  return m ? m[0] : ''
}

// ═══════════════════════════════════════════════════════
// ⭐ v1.3.0 新增：从脚本源码中抽取 host（用于共享后端检测）
// ═══════════════════════════════════════════════════════
function extractHosts(script) {
  const hosts = new Set()
  if (typeof script !== 'string' || !script) return hosts

  // 匹配显式 URL：https?://hostname
  const re1 = /https?:\/\/([a-zA-Z0-9.\-]+)/g
  let m
  while ((m = re1.exec(script)) !== null) {
    const h = m[1].toLowerCase()
    if (h && h.includes('.')) hosts.add(h)
  }

  // 匹配字符串字面量中的裸域名：'api.foo.com'
  const re2 = /['"]((?:[a-zA-Z0-9\-]+\.)+[a-zA-Z]{2,}(?::\d+)?)['"]/g
  while ((m = re2.exec(script)) !== null) {
    const h = m[1].toLowerCase().replace(/:\d+$/, '')
    if (/\.(js|json|css|png|jpg|jpeg|gif|svg|woff|woff2|ttf|ico|mp3|flac|m4a|mp4|webp)$/i.test(h)) continue
    if (h.length < 6) continue
    hosts.add(h)
  }

  return hosts
}

// ═══════════════════════════════════════════════════════
// ⭐ v1.3.0 新增：找出被 ≥2 个子源共用的 host
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// ⭐ v1.3.0 新增：参数规范度评分（供排序 tiebreaker 用）
// ═══════════════════════════════════════════════════════
function computeParamScore(script) {
  if (typeof script !== 'string' || !script) return 0
  const KEYWORDS = [
    { field: 'singer',       weight: 10 },
    { field: 'songname',     weight: 8 },
    { field: 'songName',     weight: 8 },
    { field: 'albumName',    weight: 8 },
    { field: 'hash',         weight: 8 },
    { field: 'songmid',      weight: 8 },
    { field: 'albumId',      weight: 5 },
    { field: 'rid',          weight: 5 },
    { field: 'copyrightId',  weight: 5 },
    { field: 'strMediaMid',  weight: 3 },
    { field: 'mediaMid',     weight: 3 },
    { field: 'duration',     weight: 3 },
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

// ═══════════════════════════════════════════════════════
// ⭐ v1.4.0 重构：统计子源内部所有 BACKENDS 数组的总后端数
// ═══════════════════════════════════════════════════════
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

// ═══════════════════════════════════════════════════════
// ⭐ v1.3.0 新增：对外暴露的共享后端检测接口（供 UI 调用）
// ═══════════════════════════════════════════════════════
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

/**
 * ⭐ v1.5.0：从 hostScores.global 提取运行时评分数据（全局回退用）
 *   - 兼容旧结构（直接传入扁平 host->score 的 hostScores）
 *   - 只保留数值字段，防止 JSON 注入
 */
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

/**
 * ⭐ v1.6.0：从 hostScores.byFile[fileName].byPlatform[platform][host] 提取分维度评分
 *   返回结构：{ fileName: { platform: { host: stats } } }
 */
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

/**
 * ⭐ v1.6.0：归一化 keep/drop
 *   兼容旧格式（数组：全局 host 列表）和新格式（对象：{ fileName: { platform: [host] } }）
 */
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

/**
 * 生成合并后的音源文件
 *
 * @param {Array} files
 * @param {Object} selection
 * @param {Object|null} report
 * @param {Object} options
 *   {
 *     backendMode: 'blacklist' | 'score',
 *     blockedHosts: string[],
 *     hostScores: Object,
 *     shadowKeep: string[] | Object,
 *     shadowDrop: string[] | Object,
 *   }
 */
function generateMergedCode(files, selection, report, options = {}) {
  const backendMode = options.backendMode === 'score' ? 'score' : 'blacklist'
  const rawBlockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const hostScores = options.hostScores && typeof options.hostScores === 'object' ? options.hostScores : {}

  // ⭐ v1.6.0：keep / drop 归一化（不做剔除，保持运行时 keep → drop 顺序）
  const keepNorm = normalizeKeepDrop(options.shadowKeep)
  const dropNorm = normalizeKeepDrop(options.shadowDrop)

  // ⭐ blacklist 模式：走原有保护过滤
  // ⭐ score 模式：完全不使用 blockedHosts
  const blockedHosts = backendMode === 'blacklist'
    ? filterProtectedHosts(rawBlockedHosts)
    : []

  const sanitizedScores = backendMode === 'score'
    ? sanitizeHostScores(hostScores)
    : {}

  // ⭐ v1.6.0：分维度评分数据
  const sanitizedScoresByFilePlatform = backendMode === 'score'
    ? sanitizeHostScoresByFilePlatform(hostScores)
    : {}

  const scores = computeScores(report)

  // ⭐ v1.3.0：自动检测共享后端
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

  // ⭐ v1.6.0：fileIdx → fileName 映射（供运行时根据 fileIdx 反查文件名）
  const fileIdxToName = {}
  for (const idxStr of Object.keys(selection)) {
    const idx = Number(idxStr)
    if (files[idx] && files[idx].name) fileIdxToName[idx] = files[idx].name
  }

  // ⭐ v1.3.0：排序规则增加 tiebreaker（参数规范度、后端数量）
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

  // 生成文件头注释，标注模式
  const modeLabel = backendMode === 'score'
    ? '后端优化：影子评分（按平台）'
    : (blockedHosts.length > 0 ? '后端优化：黑名单' : '后端优化：无')

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
 * @version 1.6.0
 * @generated ${new Date().toISOString()}
 */

;(function () {
  'use strict'

  const __origin_lx = globalThis.lx
  if (!__origin_lx) throw new Error('本音源必须在 LX Music 环境中运行')

  const EVENT_NAMES = __origin_lx.EVENT_NAMES

  // ═══════════════════════════════════════════════════════
  // 【方案 B】异步错误记录器（防 LX 因 unhandledRejection 判初始化失败）
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
  // 【共享后端有界并发】被多个子源共用的 host 限制最大并发数
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

  // ⭐ 黑名单模式
  if (backendMode === 'blacklist' && blockedHosts.length > 0) {
    code += `
  // ═══════════════════════════════════════════════════════
  // 【后端黑名单】拦截器
  // ═══════════════════════════════════════════════════════
  var __BLOCKED_HOSTS__ = new Set(${JSON.stringify(blockedHosts)})

  function __interceptRequest__(host) {
    if (host && __BLOCKED_HOSTS__.has(host)) {
      var err = new Error('getaddrinfo ENOTFOUND ' + host)
      err.code = 'ENOTFOUND'
      err.errno = -3008
      err.syscall = 'getaddrinfo'
      err.hostname = host
      err.blockedByMerger = true
      return err
    }
    return null
  }
`
  }

  // ⭐ 评分模式（v1.6.0）：按 (file, platform) 优先，回退全局；keep → drop 顺序完全不变
  if (backendMode === 'score' && Object.keys(sanitizedScores).length > 0) {
    const protectedSuffixesJson = JSON.stringify(RUNTIME_PROTECTED_SUFFIXES)
    const keepGlobalJson = JSON.stringify(keepNorm.global)
    const dropGlobalJson = JSON.stringify(dropNorm.global)
    const keepByFilePlatformJson = JSON.stringify(keepNorm.byFilePlatform)
    const dropByFilePlatformJson = JSON.stringify(dropNorm.byFilePlatform)
    const scoresByFilePlatformJson = JSON.stringify(sanitizedScoresByFilePlatform)
    const fileIdxToNameJson = JSON.stringify(fileIdxToName)

    code += `
  // ═══════════════════════════════════════════════════════
  // 【影子评分 v3】按 (file, platform) 维度动态限制低质量后端
  //   - 公式：score = rate*0.9 + speedScore*0.06 + orderScore*0.04
  //   - 拦截条件：calls >= 5 && score < 0.15 && rate < 0.1
  //   - 官方 API 白名单：后缀匹配，永不拦截
  //   - 判定顺序（与旧版一致，keep 先于 drop，顺序未修改）：
  //       protected
  //         → (file,platform) keep → (file,platform) drop → (file,platform) 评分
  //         → 全局 keep → 全局 drop → 全局评分
  // ═══════════════════════════════════════════════════════
  var __HOST_SCORES__ = ${JSON.stringify(sanitizedScores)}
  var __HOST_SCORES_BY_FILE_PLATFORM__ = ${scoresByFilePlatformJson}
  var __FILE_IDX_TO_NAME__ = ${fileIdxToNameJson}
  var __FORCE_KEEP__ = new Set(${keepGlobalJson})
  var __FORCE_DROP__ = new Set(${dropGlobalJson})
  var __FORCE_KEEP_BY_FILE_PLATFORM__ = ${keepByFilePlatformJson}
  var __FORCE_DROP_BY_FILE_PLATFORM__ = ${dropByFilePlatformJson}
  var __PROTECTED_SUFFIXES__ = ${protectedSuffixesJson}

  // ⭐ v1.6.0：上下文变量，由分发层在调用 handler 前设置
  var __CURRENT_FILE_IDX__ = -1
  var __CURRENT_PLATFORM__ = null

  function __isProtectedHost__(host) {
    if (!host) return false
    for (var i = 0; i < __PROTECTED_SUFFIXES__.length; i++) {
      var s = __PROTECTED_SUFFIXES__[i]
      if (host === s || host.endsWith('.' + s)) return true
    }
    return false
  }

  function __scoreHostStats__(s) {
    if (!s) return 1.0
    var rateScore = (typeof s.rate === 'number') ? s.rate : 1.0
    var speedScore = Math.max(0, 1 - (s.avgMs || 0) / 5000)
    var orderScore = Math.max(0, 1 - (s.avgOrder || 0) / 10)
    return rateScore * 0.9 + speedScore * 0.06 + orderScore * 0.04
  }

  function __makeBlockErr__(host) {
    var err = new Error('getaddrinfo ENOTFOUND ' + host)
    err.code = 'ENOTFOUND'
    err.errno = -3008
    err.syscall = 'getaddrinfo'
    err.hostname = host
    err.blockedByScorer = true
    return err
  }

  function __checkScoreBlock__(s, host) {
    if (!s) return null
    var calls = s.calls || 0
    if (calls < 5) return null
    var rate = (typeof s.rate === 'number') ? s.rate : 1.0
    var score = __scoreHostStats__(s)
    if (score < 0.15 && rate < 0.1) return __makeBlockErr__(host)
    return null
  }

  function __interceptRequest__(host) {
    if (!host) return null

    // 0. 官方 API 白名单：永不拦截
    if (__isProtectedHost__(host)) return null

    var fileIdx = __CURRENT_FILE_IDX__
    var platform = __CURRENT_PLATFORM__
    var fileName = (fileIdx >= 0 && __FILE_IDX_TO_NAME__[fileIdx]) ? __FILE_IDX_TO_NAME__[fileIdx] : null

    // 1. 按 (file, platform) 判定，顺序保持 keep → drop（未修改）
    if (fileName && platform) {
      var fk = __FORCE_KEEP_BY_FILE_PLATFORM__[fileName]
      if (fk && fk[platform] && fk[platform].indexOf(host) >= 0) return null

      var fd = __FORCE_DROP_BY_FILE_PLATFORM__[fileName]
      if (fd && fd[platform] && fd[platform].indexOf(host) >= 0) return __makeBlockErr__(host)

      var fs = __HOST_SCORES_BY_FILE_PLATFORM__[fileName]
      if (fs && fs[platform] && fs[platform][host]) {
        return __checkScoreBlock__(fs[platform][host], host)
      }
    }

    // 2. 回退到全局，顺序保持 keep → drop（未修改）
    if (__FORCE_KEEP__.has(host)) return null
    if (__FORCE_DROP__.has(host)) return __makeBlockErr__(host)

    var gs = __HOST_SCORES__[host]
    if (gs) return __checkScoreBlock__(gs, host)

    return null
  }
`
  }

  // ⭐ 统一 wrapper（拦截 + 有界并发）
  code += `
  // ═══════════════════════════════════════════════════════
  // 【统一 request wrapper】先拦截，再走有界并发队列
  // ═══════════════════════════════════════════════════════
  function __makeRequestWrapper__(origRequest, lxRef) {
    if (origRequest.__hywWrapped__) return origRequest

    var wrapped = function (url, options, cb) {
      var cb2 = (typeof options === 'function') ? options : cb
      var host = null
      try {
        var m = String(url).match(/^https?:\\/\\/([^/?#]+)/i)
        host = m ? m[1].toLowerCase().replace(/:\\d+$/, '') : null
      } catch (e) {}

      // 1. 拦截检查（黑名单 / 评分）
      if (typeof __interceptRequest__ === 'function') {
        var intErr = null
        try { intErr = __interceptRequest__(host) } catch (e) {}
        if (intErr) {
          if (typeof cb2 === 'function') setImmediate(function () { cb2(intErr, null, null) })
          return function () {}
        }
      }

      // 2. 有界并发队列（仅共享后端）
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

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const platforms = selection[i] || []
    if (platforms.length === 0) continue

    let content = file.content

    // AST 黑名单删除（仅 blacklist 模式且非空时执行）
    if (backendMode === 'blacklist' && blockedHosts.length > 0) {
      const r = applyBackendBlacklist(content, blockedHosts)
      if (!r.report.error) {
        content = r.code
        console.log(
          `[backendBlocker] ${file.name}: AST 删 ${r.report.ast} 个, ` +
          `跳过 ${r.report.skipped.length} 个, 漏 ${r.report.missed.length}`
        )
      }
    }

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

  code += `
  // ═══════════════════════════════════════════════════════
  // 质量探测工具
  // ═══════════════════════════════════════════════════════
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

      // ⭐ v1.6.0：设置当前上下文，供 __interceptRequest__ 按 (file, platform) 判定
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
