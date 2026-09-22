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
 * ⭐ v2.0：options 新增 backendMode、hostScores
 *
 * @param {Array} files
 * @param {Object} selection
 * @param {Object|null} report
 * @param {Object} options
 *   {
 *     backendMode: 'blacklist' | 'score',   // 默认 'blacklist'
 *     blockedHosts: string[],               // blacklist 模式使用
 *     hostScores: Object,                   // score 模式使用
 *   }
 */
function mergeSources(files, selection, report, options = {}) {
  const blockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []
  const backendMode = options.backendMode === 'score' ? 'score' : 'blacklist'
  const hostScores = (options.hostScores && typeof options.hostScores === 'object')
    ? options.hostScores
    : {}

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
  })
}

module.exports = { analyzeSources, mergeSources }
