/**
 * 生成合并后的音源文件
 *
 * @param {Array<{name, content, sources}>} files - 已裁剪的音源文件数组
 * @param {Object} selection - { fileIdx: ['platform1', ...] }
 * @returns {string}
 */
function generateMergedCode(files, selection) {
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
  for (const p of Object.keys(priorityMap)) {
    priorityMap[p].sort((a, b) => a - b)
  }

  // 2. 计算 mergedSources（每个平台合并所有选中音源的 qualitys，取并集）
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

  // 3. 头部注释
  let code = `/*!
 * @name 合并音源
 * @description 由以下音源合并生成：
${files.map((f, i) => {
  const platforms = selection[i] || []
  const pStr = platforms.length ? ` [${platforms.join(', ')}]` : ' (未使用)'
  const pruneInfo = f.pruneInfo && !f.pruneInfo.error
    ? ` (裁剪: -${f.pruneInfo.removed} 节点)`
    : ''
  return ` *   [${i + 1}] ${f.name}${pStr}${pruneInfo}`
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
  // 平台优先级（生成时静态确定）
  // 每个平台对应一个音源索引列表，按顺序尝试
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
    // 如果一个平台都没选中，跳过整个音源
    if (platforms.length === 0) continue

    // 替换 globalThis.lx → __lx_proxy__
    const replaced = file.content
      .replace(/globalThis\s*\.\s*lx\b/g, '__lx_proxy__')
      .replace(/globalThis\s*\[\s*['"]lx['"]\s*\]/g, '__lx_proxy__')

    code += `
  // ═══════════════════════════════════════════════════════
  // 音源 [${i + 1}]: ${file.name}  (平台: ${platforms.join(', ')})
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = ${i}
    const __lx_proxy__ = Object.assign({}, __origin_lx)

    // 拦截 on：收集 request handler
    __lx_proxy__.on = function (event, handler) {
      if (event === EVENT_NAMES.request) {
        __handlers__.push({ fileIdx: __fileIdx, handler: handler })
      }
    }

    // 拦截 send：忽略所有事件（inited 已静态声明）
    __lx_proxy__.send = function () {}

    // ═════════════ 原始代码开始 ═════════════
${replaced.split('\n').map((line) => '    ' + line).join('\n')}
    // ═════════════ 原始代码结束 ═════════════
  })()
`
  }

  // 5. 统一分发器（带质量验证）
  code += `
  // ═══════════════════════════════════════════════════════
  // 质量探测工具（下载前 16KB 识别文件头）
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

  function __probeUrl__(url) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve(null) }, 5000)
      try {
        __origin_lx.request(url, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-16383' },
          timeout: 5000,
          binary: true,
        }, function (err, resp) {
          clearTimeout(timer)
          if (err || !resp) return resolve(null)
          var body = resp.body
          var buf
          if (body instanceof ArrayBuffer) buf = new Uint8Array(body)
          else if (body instanceof Uint8Array) buf = body
          else if (typeof body === 'string') {
            // 兼容：body 被当作字符串返回时，逐字符取低 8 位
            buf = new Uint8Array(body.length)
            for (var i = 0; i < body.length; i++) buf[i] = body.charCodeAt(i) & 0xFF
          } else return resolve(null)
          resolve(__detectQuality__(buf))
        })
      } catch (e) {
        clearTimeout(timer)
        resolve(null)
      }
    })
  }

  // ═══════════════════════════════════════════════════════
  // 统一分发器：按平台优先级依次尝试，质量不达标就跳过
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

        // ⭐ 有 URL 后，探测实际质量
        const actual = await __probeUrl__(result)

        if (!actual) {
          // 探测失败（CDN 不响应 Range、加密流、格式无法识别等）→ 保守返回，避免误伤
          return result
        }
        if (__qualityIndex__(actual) <= reqIdx) {
          // 质量达标 → 返回
          return result
        }
        // 质量降级 → 记录后继续尝试下一个音源
        errors.push('[源' + (fileIdx + 1) + '] 降级 ' + requested + '→' + actual)
      } catch (e) {
        errors.push('[源' + (fileIdx + 1) + '] ' + (e && e.message ? e.message : String(e)))
      }
    }

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.join(' | '))
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
