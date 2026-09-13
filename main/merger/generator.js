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

  // 2. 计算 mergedSources（每个平台取优先级最高的源声明）
  const mergedSources = {}
  for (const [platform, priorityList] of Object.entries(priorityMap)) {
    for (const fileIdx of priorityList) {
      const file = files[fileIdx]
      if (file.sources && file.sources[platform]) {
        mergedSources[platform] = file.sources[platform]
        break
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

  // 5. 统一分发器
  code += `
  // ═══════════════════════════════════════════════════════
  // 统一分发器：按平台优先级依次尝试各音源
  // ═══════════════════════════════════════════════════════
  __origin_lx.on(EVENT_NAMES.request, async function (params) {
    const source = params.source
    const priorityList = PLATFORM_PRIORITY[source]
    if (!priorityList || !priorityList.length) {
      throw new Error('不支持的平台: ' + source)
    }

    const errors = []
    for (const fileIdx of priorityList) {
      const h = __handlers__.find(function (x) { return x.fileIdx === fileIdx })
      if (!h) continue
      try {
        const result = await h.handler(params)
        if (result) return result
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
