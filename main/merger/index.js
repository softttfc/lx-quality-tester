const fs = require('fs')
const { extractSources } = require('./extractor')
const { generateMergedCode } = require('./generator')
const { pruneScript } = require('./pruner')

/**
 * 批量分析音源文件，提取各自的 sources 声明
 */
async function analyzeSources(files) {
  const results = []
  for (const file of files) {
    let content = ''
    try {
      content = fs.readFileSync(file.path, 'utf8')
    } catch (err) {
      results.push({
        name: file.name,
        path: file.path,
        content: '',
        sources: {},
        error: `读取失败: ${err.message}`,
      })
      continue
    }

    const r = await extractSources(file.path)
    results.push({
      name: file.name,
      path: file.path,
      content,
      sources: r.sources || {},
      risk: r.risk || { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} },
      error: r.error || null,
    })
  }
  return results
}

/**
 * 生成合并音源代码（含裁剪 + 按 report 排序）
 *
 * @param {Array} files - analyzeSources 的结果
 * @param {Object} selection - { fileIdx: ['platform', ...] }
 * @param {Object|null} report - 上次测试的 report，用于静态排序
 */
function mergeSources(files, selection, report) {
  // 1. 对每个文件做裁剪
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

    return {
      ...file,
      content: r.code,
      pruneInfo: { removed: r.removed, kept: r.kept },
    }
  })

  // 2. 生成合并代码（透传 report）
  return generateMergedCode(prunedFiles, selection, report)
}

module.exports = { analyzeSources, mergeSources }
