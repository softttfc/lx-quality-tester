const fs = require('fs')
const { extractSources } = require('./extractor')
const { generateMergedCode } = require('./generator')
const { pruneScript } = require('./pruner')

// ⭐ v2.5：主进程堆内存熔断阈值（超过则中止分析，返回已分析结果）
const MAX_HEAP_MB = 800

function emptyRisk() {
  return { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} }
}

function tryGC() {
  if (typeof global.gc === 'function') {
    try { global.gc() } catch (_) {}
  }
}

async function analyzeSources(files) {
  const results = []
  for (const file of files) {
    // ⭐ v2.5：内存熔断：超过阈值主动中止
    const heapMB = process.memoryUsage().heapUsed / 1048576
    if (heapMB > MAX_HEAP_MB) {
      console.warn(`[analyzeSources] 主进程内存 ${heapMB.toFixed(0)}MB 超过 ${MAX_HEAP_MB}MB，中止分析`)
      results.push({
        name: file.name,
        path: file.path,
        sources: {},
        risk: emptyRisk(),
        error: `主进程内存过高（${heapMB.toFixed(0)}MB），已中止分析`,
        hasInitRequests: false,
        initRequestCount: 0,
        cleanReport: { changed: false, removed: 0, removedItems: [], error: null },
      })
      break
    }

    // 快速检查文件可读性（content 不再返回给渲染进程）
    try {
      fs.accessSync(file.path, fs.constants.R_OK)
    } catch (err) {
      results.push({
        name: file.name,
        path: file.path,
        sources: {},
        risk: emptyRisk(),
        error: `读取失败: ${err.message}`,
        hasInitRequests: false,
        initRequestCount: 0,
        cleanReport: { changed: false, removed: 0, removedItems: [], error: null },
      })
      continue
    }

    const r = await extractSources(file.path)

    results.push({
      name: file.name,
      path: file.path,
      // ⭐ v2.5：不再返回 content（关键改动）
      sources: r.sources || {},
      risk: r.risk || emptyRisk(),
      error: r.error || null,
      hasInitRequests: r.hasInitRequests || false,
      initRequestCount: (r.initRequests || []).length,   // ⭐ 只回数量
      cleanReport: r.cleanReport || { changed: false, removed: 0, removedItems: [], error: null },
    })

    // ⭐ v2.5：每处理完一个文件主动 GC
    tryGC()
  }
  return results
}

/**
 * v2.4：options 支持三态 backendMode: 'none' | 'blacklist' | 'score'
 *   - blockedHosts: 全局黑名单（兼容旧调用）
 *   - blockedHostsByFilePlatform: { [file]: { [platform]: [hosts] } } 新增
 *   - shadowKeep / shadowDrop 兼容数组（旧）和对象（新）
 *
 * v2.5：content 从 file.path 重新读取（analyzeSources 不再返回 content）
 *
 * @param {Array} files
 * @param {Object} selection
 * @param {Object|null} report
 * @param {Object} options
 */
function mergeSources(files, selection, report, options = {}) {
  const blockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const blockedHostsByFilePlatform = (options.blockedHostsByFilePlatform && typeof options.blockedHostsByFilePlatform === 'object')
    ? options.blockedHostsByFilePlatform
    : {}

  let backendMode = options.backendMode
  if (backendMode !== 'none' && backendMode !== 'blacklist' && backendMode !== 'score') {
    backendMode = 'blacklist'
  }

  const hostScores = (options.hostScores && typeof options.hostScores === 'object')
    ? options.hostScores
    : {}
  const shadowKeep = options.shadowKeep || []
  const shadowDrop = options.shadowDrop || []

  const prunedFiles = files.map((file, idx) => {
    // ⭐ v2.5：content 优先用已有的；没有就从 path 重新读
    let content = file.content
    if (!content && file.path) {
      try {
        content = fs.readFileSync(file.path, 'utf8')
      } catch (_) {
        content = ''
      }
    }

    const keepPlatforms = selection[idx] || []
    if (keepPlatforms.length === 0) {
      return { ...file, content, pruneInfo: null }
    }
    const r = pruneScript(content, keepPlatforms)
    console.log(`[pruner] ${file.name}: 删除 ${r.removed} 个节点，保留 ${r.kept} 个`)
    if (r.error) {
      console.warn(`[pruner] ${file.name} 裁剪失败: ${r.error}，使用原代码`)
      return { ...file, content, pruneInfo: { error: r.error } }
    }
    return { ...file, content: r.code, pruneInfo: { removed: r.removed, kept: r.kept } }
  })

  return generateMergedCode(prunedFiles, selection, report, {
    backendMode,
    blockedHosts,
    blockedHostsByFilePlatform,
    hostScores,
    shadowKeep,
    shadowDrop,
  })
}

module.exports = { analyzeSources, mergeSources }
