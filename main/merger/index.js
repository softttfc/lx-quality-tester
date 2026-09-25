const fs = require('fs')
const { extractSources } = require('./extractor')
const { generateMergedCode } = require('./generator')
const { pruneScript } = require('./pruner')

function emptyRisk() {
  return { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} }
}

async function analyzeSources(files) {
  const results = []
  for (const file of files) {
    let content = ''
    try {
      content = fs.readFileSync(file.path, 'utf8')
    } catch (err) {
      results.push({
        name: file.name, path: file.path, content: '',
        sources: {}, risk: emptyRisk(),
        error: `读取失败: ${err.message}`,
        hasInitRequests: false,
        initRequests: [],
        cleanReport: { changed: false, removed: 0, removedItems: [], error: null },
      })
      continue
    }
    const r = await extractSources(file.path)
    results.push({
      name: file.name,
      path: file.path,
      content: r.cleanedCode || content,
      sources: r.sources || {},
      risk: r.risk || emptyRisk(),
      error: r.error || null,
      hasInitRequests: r.hasInitRequests || false,
      initRequests: r.initRequests || [],
      cleanReport: r.cleanReport || { changed: false, removed: 0, removedItems: [], error: null },
    })
  }
  return results
}

/**
 * ⭐ v2.2：options 支持按 (file, platform) 的 shadowKeep / shadowDrop
 *   - shadowKeep / shadowDrop 可为：
 *     - 数组（旧格式，全局 host 列表）→ generator 会转成 global
 *     - 对象（新格式，{ fileName: { platform: [host] } }）→ generator 保留分维度
 *   - 本函数不做 Array.isArray 强转，原样透传给 generator
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
function mergeSources(files, selection, report, options = {}) {
  const blockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const backendMode = options.backendMode === 'score' ? 'score' : 'blacklist'
  const hostScores = (options.hostScores && typeof options.hostScores === 'object')
    ? options.hostScores
    : {}
  // ⭐ v2.2：不做 Array.isArray 强转，保留对象格式（数组格式由 generator 的 normalizeKeepDrop 兼容）
  const shadowKeep = options.shadowKeep || []
  const shadowDrop = options.shadowDrop || []

  const prunedFiles = files.map((file, idx) => {
    const keepPlatforms = selection[idx] || []
    if (keepPlatforms.length === 0) {
      return { ...file, content: file.content, pruneInfo: null }
    }
    const r = pruneScript(file.content, keepPlatforms)
    console.log(`[pruner] ${file.name}: 删除 ${r.removed} 个节点，保留 ${r.kept} 个`)
    if (r.error) {
      console.warn(`[pruner] ${file.name} 裁剪失败: ${r.error}，使用原代码`)
      return { ...file, content: file.content, pruneInfo: { error: r.error } }
    }
    return { ...file, content: r.code, pruneInfo: { removed: r.removed, kept: r.kept } }
  })

  return generateMergedCode(prunedFiles, selection, report, {
    backendMode,
    blockedHosts,
    hostScores,
    shadowKeep,
    shadowDrop,
  })
}

module.exports = { analyzeSources, mergeSources }
