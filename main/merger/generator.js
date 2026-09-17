/**
 * 生成合并后的音源文件
 *
 * @param {Array<{name, content, sources}>} files - 已裁剪的音源文件数组
 * @param {Object} selection - { fileIdx: ['platform1', ...] }
 * @param {Object|null} report - 上次测试的 report（用于静态排序）
 * @returns {string}
 */

const QUALITY_RANK = [
  'master', 'atmos_plus', 'atmos', 'hires',
  'flac', 'flac24bit', '320k', '192k', '128k',
]

/**
 * 从 report 里计算每个音源对每个平台的得分
 * 返回 { fileName: { platform: { bestIdx, passCount } } }
 *   - bestIdx: 通过音质里最高的（数字越小越高），无通过 = 99
 *   - passCount: 通过的音质数量
 */
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

function generateMergedCode(files, selection, report) {
  // 0. 计算每个音源的得分
  const scores = computeScores(report)

  // 1. 计算 PLATFORM_PRIORITY（平台 → 优先音源索引列表）
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

  // ⭐ 按测试报告排序：优先音质高 → 通过数多 → 原索引
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

  // 2. 计算 mergedSources（qualitys 取并集）
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

  // 3. 头部注释（把排序信息也写进去，方便追溯）
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
  //   - 目的：让音源内部产生的 unhandledRejection（例如某音源末尾
  //     直接 checkLatestVersion().then(...) 而没有 .catch()）在控制台
  //     可见，便于排查。
  //   - 注意：这里**不调用** e.preventDefault()，不阻止宿主（LX Music）
  //     自身对 unhandledRejection 的处理逻辑。是否弹窗、是否视为
  //     音源加载失败，仍然由 LX Music 客户端自行决定。
  // ═══════════════════════════════════════════════════════
  ;(function () {
    var __onUnhandled__ = function (e) {
      try {
        var msg = (e && e.reason && e.reason.message) || (e && e.message) || String(e)
        console.warn('[合并音源] 捕获到未处理的异步错误（不阻止宿主处理）:', msg)
      } catch (_) {}
      // ⚠️ 不调用 e.preventDefault()，让 LX Music 客户端保持原有行为
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
  // 平台优先级（已按上次测试结果静态排序）
  // ═══════════════════════════════════════════════════════
  const PLATFORM_PRIORITY = ${JSON.stringify(priorityMap, null, 2)}

  // ═══════════════════════════════════════════════════════
  // Handler 收集器
  // ═══════════════════════════════════════════════════════
  const __handlers__ = []
`

  // 4. 每个音源包进 IIFE
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const platforms = selection[i] || []
    if (platforms.length === 0) continue

    const replaced = file.content
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

      // ⭐ 关键修复（改动 1）：这里必须带分号
      // 否则若原始代码以 '(' / '[' / '+' / '-' 开头（webpack 打包产物常见），
      // 会触发 ASI 陷阱，把两段代码合并成一个调用表达式，
      // 导致音源内部拿到的是真实的 lx.send，从而提前/重复发 inited 事件。
      __lx_proxy__.send = function () {};

      // ═════════════ 原始代码开始 ═════════════
${replaced.split('\n').map((line) => '      ' + line).join('\n')}
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      // 改动 2：单个音源的同步加载异常不应炸掉整个合并文件
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

  // 5. 分发器（质量探测 + 静态排序兜底）
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
    // FLAC
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
    // MP3
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
    // M4A/AAC
    if (buf[4]===0x66 && buf[5]===0x74 && buf[6]===0x79 && buf[7]===0x70) return '128k'
    // OGG
    if (buf[0]===0x4F && buf[1]===0x67 && buf[2]===0x67 && buf[3]===0x53) return 'flac'
    // WAV
    if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46) return 'flac'
    return null
  }

  // ⭐ 把各种可能的 body 类型转为 Uint8Array
  function __bodyToBuffer__(body) {
    if (!body) return null
    // ArrayBuffer
    if (body instanceof ArrayBuffer) return new Uint8Array(body)
    // Uint8Array / 其他 TypedArray
    if (body instanceof Uint8Array) return body
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    // ⭐ LX native 序列化后的 {type:'Buffer', data:[...]}
    if (body && body.type === 'Buffer' && Array.isArray(body.data)) {
      return new Uint8Array(body.data)
    }
    // Buffer（Node 环境模拟）
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(body)) {
      return new Uint8Array(body)
    }
    // 字符串（最后兜底）
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

  // ═══════════════════════════════════════════════════════
  // 统一分发器：按静态优先级尝试，运行时探测兜底
  // ═══════════════════════════════════════════════════════
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

        // ⭐ 探测失败 → 继续尝试下一个音源（选项 B）
        if (!actual) {
          errors.push('[源' + (fileIdx + 1) + '] 探测失败')
          continue
        }
        // ⭐ 质量达标 → 返回
        if (__qualityIndex__(actual) <= reqIdx) {
          return result
        }
        // ⭐ 降级 → 继续尝试
        errors.push('[源' + (fileIdx + 1) + '] 降级 ' + requested + '→' + actual)
      } catch (e) {
        errors.push('[源' + (fileIdx + 1) + '] ' + (e && e.message ? e.message : String(e)))
      }
    }

    // ⭐ 全部失败 → 回退到"静态排序第一个音源"的结果（避免完全不可用）
    try {
      const firstIdx = priorityList[0]
      const h0 = __handlers__.find(function (x) { return x.fileIdx === firstIdx })
      if (h0) {
        const fallback = await h0.handler(params)
        if (fallback) return fallback
      }
    } catch (e) {
      // ignore
    }

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.slice(0, 8).join(' | '))
  })

  // ═══════════════════════════════════════════════════════
  // 声明 inited（静态）
  // ═══════════════════════════════════════════════════════
  __origin_lx.send(EVENT_NAMES.inited, {
    openDevTools: false,
    sources: ${JSON.stringify(mergedSources, null, 6)}
  })
})()
`

  return code
}

module.exports = { generateMergedCode }
