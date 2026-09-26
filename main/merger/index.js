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
 * v2.4：options 支持三态 backendMode: 'none' | 'blacklist' | 'score'
 *   - blockedHosts: 全局黑名单（兼容旧调用）
 *   - blockedHostsByFilePlatform: { [file]: { [platform]: [hosts] } } 新增
 *   - shadowKeep / shadowDrop 兼容数组（旧）和对象（新）
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
    blockedHostsByFilePlatform,
    hostScores,
    shadowKeep,
    shadowDrop,
  })
}

module.exports = { analyzeSources, mergeSources }
