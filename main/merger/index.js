const fs = require('fs')
const { extractSources, stripDecorativeInitRequests } = require('./extractor')
const { generateMergedCode } = require('./generator')
const { pruneScript } = require('./pruner')

// ⭐ v2.5：主进程堆内存熔断阈值（超过则中止分析，返回已分析结果）
const MAX_HEAP_MB = 800

// ⭐ 新增：改造后代码缓存
//   用途：测试阶段（analyzeSources）算好的 cleanedCode → 合并阶段（mergeSources）复用
//   好处：合并时无需重跑 Layer 1，直接使用与测试阶段严格一致的改造结果
//   key = 音源文件绝对路径，value = Layer 1 清理后的源码
const transformedCodeCache = new Map()

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

    // ⭐ 新增：把测试阶段算好的改造后代码存入缓存
    //   无论 hasInitRequests 是 true/false 都缓存：
    //     - false（可改造）：合并时直接用它 → 无更新检查调用
    //     - true（不可改造）：会被 app.js 排除，缓存无害
    if (r.cleanedCode) {
      transformedCodeCache.set(file.path, r.cleanedCode)
    }

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
 * v2.6：合并时优先复用 analyzeSources 缓存的改造后代码（cleanedCode），
 *       让"可改造"的源（小熊猫 / Free listen / ikun 等）以改造后代码进入合并，
 *       避免其初始化更新检查被保留而在 LX Music 运行时触发未捕获 rejection。
 *       兜底只对 cleanReport.changed === true 的文件重做 Layer 1。
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
    // ⭐ v2.6：合并阶段优先复用测试阶段缓存好的改造后代码
    let content = file.content

    if (!content && file.path) {
      // ① 优先从缓存读"测试阶段算好的改造后代码"
      content = transformedCodeCache.get(file.path)

      // ② 兜底：缓存 miss 时
      //    只对"需要改造"的文件重做 Layer 1，纯净源直接用原始代码
      if (!content) {
        try {
          content = fs.readFileSync(file.path, 'utf8')

          // ⭐ 判断依据：测试阶段 cleanReport.changed
          //    - true：Layer 1 曾删过东西（小熊猫 / Free listen / ikun / 星海）→ 需重做
          //    - false：Layer 1 未做修改（纯净源）→ 直接用原始代码
          if (file.cleanReport && file.cleanReport.changed === true) {
            const cleaned = stripDecorativeInitRequests(content)
            if (cleaned.report.changed && !cleaned.report.error) {
              content = cleaned.code
            }
          }
        } catch (_) {
          content = ''
        }
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
