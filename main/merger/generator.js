/**
 * 生成合并后的音源文件
 */

const { applyBackendBlacklist } = require('./backendBlocker')

const QUALITY_RANK = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac', 'flac24bit', '320k', '192k', '128k',
]

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
 * @param {Object} options ⭐ v1.6 新增：{ blockedHosts: string[] }
 */
function generateMergedCode(files, selection, report, options = {}) {
  const blockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
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
 * @version 1.0.0
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
`

  // ⭐ v1.6 新增：运行时黑名单 hook（第 3 层）
  if (blockedHosts.length > 0) {
    code += `
  // ═══════════════════════════════════════════════════════
  // 【第 3 层】运行时 hook：拦截黑名单域名的请求
  // ═══════════════════════════════════════════════════════
  ;(function () {
    var __BLOCKED_HOSTS__ = new Set(${JSON.stringify(blockedHosts)})
    var __origin_request = __origin_lx.request
    __origin_lx.request = function (url, options, cb) {
      var cb2 = (typeof options === 'function') ? options : cb
      try {
        var hostMatch = String(url).match(/^https?:\\/\\/([^/?#]+)/i)
        var host = hostMatch ? hostMatch[1].toLowerCase().replace(/:\\d+$/, '') : null
        if (host && __BLOCKED_HOSTS__.has(host)) {
          var err = new Error('backend blacklisted (by merger)')
          err.code = 'EBACKEND_BLOCKED'
          if (typeof cb2 === 'function') setImmediate(function () { cb2(err, null, null) })
          return function () {}
        }
      } catch (e) {}
      return __origin_request.apply(this, arguments)
    }
  })()
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

    let content = file.content
    if (blockedHosts.length > 0) {
      const r = applyBackendBlacklist(content, blockedHosts)
      if (!r.report.error) {
        content = r.code
        console.log(`[backendBlocker] ${file.name}: AST 删 ${r.report.ast} 个，字符串替换 ${r.report.string} 处，漏 ${r.report.missed.length}`)
      }
    }

    const replaced = content
      .replace(/globalThis\s*\.\s*lx\b/g, '__lx_proxy__')
      .replace(/globalThis\s*\[\s*['"]lx['"]\s*\]/g, '__lx_proxy__')

    code += `
  // ═══════════════════════════════════════════════════════
  // 音源 [${i + 1}]: ${file.name}  (平台: ${platforms.join(', ')})
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = ${i}
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

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
    if (!buf || buf.length < 12) return null
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
      var timer = setTimeout(function () { resolve(null) }, 3000)
      try {
        __origin_lx.request(url, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-16383' },
          timeout: 3000,
          binary: true,
        }, function (err, resp) {
          clearTimeout(timer)
          if (err || !resp) return resolve(null)
          var buf = __bodyToBuffer__(resp.body)
          if (!buf || buf.length < 12) return resolve(null)
          resolve(__detectQuality__(buf))
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

    for (const fileIdx of priorityList) {
      const h = __handlers__.find(function (x) { return x.fileIdx === fileIdx })
      if (!h) continue
      try {
        const result = await h.handler(params)
        if (!result) continue

        const actual = await __probeUrl__(result)

        if (!actual) {
          errors.push('[源' + (fileIdx + 1) + '] 探测失败')
          continue
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
        const fallback = await h0.handler(params)
        if (fallback) return fallback
      }
    } catch (e) {}

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.slice(0, 8).join(' | '))
  })

  __origin_lx.send(EVENT_NAMES.inited, {
    openDevTools: false,
    sources: ${JSON.stringify(mergedSources, null, 6)}
  })
})()
`

  return code
}

module.exports = { generateMergedCode }
