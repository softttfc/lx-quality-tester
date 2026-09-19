/**
 * 生成合并后的音源文件
 * @version 1.1.0
 */

const { applyBackendBlacklist } = require('./backendBlocker')

const QUALITY_RANK = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac', 'flac24bit', '320k', '192k', '128k',
]

// ═══════════════════════════════════════════════════════
// 【块 C】受保护域名（防止用户误屏蔽官方 API / 媒体 CDN）
// ═══════════════════════════════════════════════════════
const PROTECTED_HOST_PATTERNS = [
  // 官方 API
  /(^|\.)y\.qq\.com$/,
  /(^|\.)music\.163\.com$/,
  /(^|\.)kugou\.com$/,
  /(^|\.)kuwo\.cn$/,
  /(^|\.)migu\.cn$/,
  /^music-api\.gdstudio\.xyz$/,

  // 媒体 CDN
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

/**
 * 从源文件内容中提取 header 注释块（/*! ... *\/）
 * 用于注入 currentScriptInfo.rawScript，让需要解析 @wy_token 之类的源能正常工作
 * 相比嵌入完整源码，能避免生成文件体积翻倍
 */
function extractHeader(content) {
  if (typeof content !== 'string') return ''
  const m = content.match(/^\/\*![\s\S]*?\*\//)
  return m ? m[0] : ''
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
 * @param {Array} files
 * @param {Object} selection
 * @param {Object|null} report
 * @param {Object} options { blockedHosts: string[] }
 */
function generateMergedCode(files, selection, report, options = {}) {
  // ⭐ 块 C：过滤受保护域名，防止误屏蔽官方 API / 媒体 CDN
  const rawBlockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const blockedHosts = filterProtectedHosts(rawBlockedHosts)

  const scores = computeScores(report)

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

  for (const p of Object.keys(priorityMap)) {
    priorityMap[p].sort((a, b) => {
      const nameA = files[a]?.name || ''
      const nameB = files[b]?.name || ''
      const sa = (scores[nameA] && scores[nameA][p]) || { bestIdx: 99, passCount: 0 }
      const sb = (scores[nameB] && scores[nameB][p]) || { bestIdx: 99, passCount: 0 }
      if (sa.bestIdx !== sb.bestIdx) return sa.bestIdx - sb.bestIdx
      if (sa.passCount !== sb.passCount) return sb.passCount - sa.passCount
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

  let code = `/*!
 * @name 合并音源
 * @description 由以下音源合并生成（平台优先级已按上次测试结果排序）：
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
  return ` *   [${i + 1}] ${f.name}${pStr}${pruneInfo}${scoreInfo}`
}).join('\n')}
 * @version 1.1.0
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
`

  // ⭐ 运行时 request 包装器工厂
  if (blockedHosts.length > 0) {
    code += `
  // ═══════════════════════════════════════════════════════
  // 【第 3 层】后端黑名单（运行时包装 request）
  //   - 不改 globalThis.lx.request（read-only）
  //   - 每个音源在自身 IIFE 里拷贝 lx 后包装
  //   - 拦截时伪造 ENOTFOUND（伪装成 DNS 失败）
  //     让源内部的错误处理逻辑能自然跳过这个后端
  // ═══════════════════════════════════════════════════════
  var __BLOCKED_HOSTS__ = new Set(${JSON.stringify(blockedHosts)})
  function __makeRequestWrapper__(origRequest, lxRef) {
    return function (url, options, cb) {
      var cb2 = (typeof options === 'function') ? options : cb
      try {
        var hostMatch = String(url).match(/^https?:\\/\\/([^/?#]+)/i)
        var host = hostMatch ? hostMatch[1].toLowerCase().replace(/:\\d+$/, '') : null
        if (host && __BLOCKED_HOSTS__.has(host)) {
          var err = new Error('getaddrinfo ENOTFOUND ' + host)
          err.code = 'ENOTFOUND'
          err.errno = -3008
          err.syscall = 'getaddrinfo'
          err.hostname = host
          err.blockedByMerger = true
          if (typeof cb2 === 'function') setImmediate(function () { cb2(err, null, null) })
          return function () {}
        }
      } catch (e) {}
      return origRequest.apply(lxRef || this || __origin_lx, arguments)
    }
  }
`
  }

  code += `
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

    // ⭐ 不再做字符串替换（改由 backendBlocker AST 删除 + 运行时包装兜底）
    let content = file.content
    if (blockedHosts.length > 0) {
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

    // ⭐ 给每个源注入"自己"的 currentScriptInfo
    //    rawScript 只用 header，避免生成文件体积翻倍
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
      // ⭐ 修复：保留 lx 的原型链与不可枚举属性（env / version / utils 等）
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

      // ⭐ 修复：注入本音源自己的 currentScriptInfo（避免读到合并大文件）
      try {
        Object.defineProperty(__lx_proxy__, 'currentScriptInfo', {
          value: ${JSON.stringify(ownScriptInfo)},
          writable: false,
          configurable: true,
        })
      } catch (_) {}

      // ⭐ 修复：包装 request 时绑定 lxRef，避免 this 丢失
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

  // ⭐ 块 A：放宽探测（超时 8s、Range 1KB、最小 4 字节、三态返回）
  // ⭐ 修复：删除 binary:true（LX 的 request 不支持），改用 resp.rawBody
  function __probeUrl__(url) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve(null) }, 8000)
      try {
        __origin_lx.request(url, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-1023' },
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

    // ⭐ 修复：补齐 musicInfo 跨平台 ID 字段
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
      if (!h) continue
      try {
        const result = await h.handler(__innerParams__)
        if (!result) continue

        const actual = await __probeUrl__(result)

        // ⭐ 块 B：三态判定
        if (actual === null) {
          errors.push('[源' + (fileIdx + 1) + '] 探测失败')
          continue
        }
        if (actual === '__UNKNOWN_OK__') {
          return result
        }
        if (__qualityIndex__(actual) <= reqIdx) {
          return result
        }
        errors.push('[源' + (fileIdx + 1) + '] 降级 ' + requested + '→' + actual)
      } catch (e) {
        errors.push('[源' + (fileIdx + 1) + '] ' + (e && e.message ? e.message : String(e)))
      }
    }

    try {
      const firstIdx = priorityList[0]
      const h0 = __handlers__.find(function (x) { return x.fileIdx === firstIdx })
      if (h0) {
        const fallback = await h0.handler(__innerParams__)
        if (fallback) return fallback
      }
    } catch (e) {}

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.slice(0, 8).join(' | '))
  })

  // ⭐ 修复：send(inited) 加 status:true + 3 秒延迟（等异步音源初始化）
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

module.exports = { generateMergedCode }
