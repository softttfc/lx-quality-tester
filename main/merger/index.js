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
      // ⭐ v1.7：优先使用 Layer 1 清理后的代码
      content: r.cleanedCode || content,
      sources: r.sources || {},
      risk: r.risk || emptyRisk(),
      error: r.error || null,
      // ⭐ v1.7：传递给 UI 与合并阶段的标记
      hasInitRequests: r.hasInitRequests || false,
      initRequests: r.initRequests || [],
      cleanReport: r.cleanReport || { changed: false, removed: 0, removedItems: [], error: null },
    })
  }
  return results
}

/**
 * @param {Array} files
 * @param {Object} selection
 * @param {Object|null} report
 * @param {Object} options { blockedHosts: string[] }
 */
function mergeSources(files, selection, report, options = {}) {
  const blockedHosts = Array.isArray(options.blockedHosts) ? options.blockedHosts : []

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

  return generateMergedCode(prunedFiles, selection, report, { blockedHosts })
}

module.exports = { analyzeSources, mergeSources }
