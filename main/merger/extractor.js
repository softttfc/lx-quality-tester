const fs = require('fs')
const vm = require('vm')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const t = require('@babel/types')

const { createLxSandbox } = require('../lxSandbox')
const { analyzeRisks } = require('../apiLoader')

// ═══════════════════════════════════════════════════════
// Layer 1：模式识别，删除装饰性的初始化请求
// ═══════════════════════════════════════════════════════

/**
 * 需要识别的装饰性初始化函数名（顶层调用）
 * 这些函数的返回值在顶层表达式语句中被丢弃，删除后不影响 inited 流程
 */
const DECORATIVE_FN_NAMES = [
  /^checkUpdate$/i,
  /^checkLatestVersion$/i,
  /^checkVersion$/i,
  /^checkNewVersion$/i,
]

function isDecorativeFnName(name) {
  if (!name || typeof name !== 'string') return false
  return DECORATIVE_FN_NAMES.some((re) => re.test(name))
}

/**
 * 找到调用链的根标识符
 * 例如：checkUpdate().then(...) 的根是 Identifier "checkUpdate"
 *       checkUpdate().catch(...) 的根是 Identifier "checkUpdate"
 *       await checkUpdate() 的根是 Identifier "checkUpdate"
 */
function getCallChainRoot(node) {
  let cur = node
  let guard = 0
  while (cur && guard++ < 32) {
    if (t.isCallExpression(cur)) {
      cur = cur.callee
    } else if (t.isMemberExpression(cur)) {
      cur = cur.object
    } else if (t.isAwaitExpression(cur)) {
      cur = cur.argument
    } else if (t.isParenthesizedExpression && t.isParenthesizedExpression(cur)) {
      cur = cur.expression
    } else if (t.isTSAsExpression && t.isTSAsExpression(cur)) {
      cur = cur.expression
    } else {
      break
    }
  }
  return cur
}

/**
 * Layer 1：删除顶层的装饰性初始化调用
 * @param {string} script
 * @returns {{ code: string, report: { changed: boolean, removed: number, removedItems: string[], error: string|null } }}
 */
function stripDecorativeInitRequests(script) {
  const report = { changed: false, removed: 0, removedItems: [], error: null }
  if (typeof script !== 'string' || !script.trim()) {
    return { code: script, report }
  }

  let ast
  try {
    ast = parser.parse(script, {
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      plugins: [
        'dynamicImport',
        'optionalChaining',
        'nullishCoalescingOperator',
      ],
    })
  } catch (err) {
    report.error = `AST 解析失败: ${err.message}`
    return { code: script, report }
  }

  // 收集所有"顶层 ExpressionStatement"中匹配装饰性函数名的调用
  const toRemove = []

  traverse(ast, {
    ExpressionStatement(path) {
      // 只处理顶层（Program 的直接子节点）
      if (!path.parent || path.parent.type !== 'Program') return
      const expr = path.node.expression
      const root = getCallChainRoot(expr)
      if (!root || !t.isIdentifier(root)) return
      if (!isDecorativeFnName(root.name)) return

      toRemove.push({
        path,
        name: root.name,
      })
    },
  })

  if (toRemove.length === 0) {
    return { code: script, report }
  }

  for (const item of toRemove) {
    try {
      item.path.remove()
      report.removed++
      report.removedItems.push(`移除顶层调用 ${item.name}()`)
    } catch (_) {
      // 忽略单点移除失败
    }
  }

  if (report.removed === 0) {
    return { code: script, report }
  }

  let output
  try {
    output = generate(ast, {
      retainLines: false,
      compact: false,
      comments: true,
      jsescOption: { minimal: true },
    }, script).code
  } catch (err) {
    report.error = `代码生成失败: ${err.message}`
    return { code: script, report }
  }

  report.changed = true
  return { code: output, report }
}

// ═══════════════════════════════════════════════════════
// 沙箱执行
// ═══════════════════════════════════════════════════════

function buildSandbox(lx) {
  const sandbox = {
    lx,
    console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
    setTimeout, clearTimeout, setInterval, clearInterval, setImmediate,
    Buffer, Promise, JSON, Date, Math, Object, Array, String, Number, Boolean,
    RegExp, Error, TypeError, RangeError, Symbol, Map, Set, WeakMap, WeakSet,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    parseInt, parseFloat, isNaN, isFinite,
    URL, URLSearchParams, TextEncoder, TextDecoder,
    Uint8Array, Int8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, Float32Array, Float64Array,
    ArrayBuffer, DataView,
  }
  sandbox.globalThis = sandbox
  sandbox.global = sandbox
  return sandbox
}

/**
 * 在沙箱中执行代码并等待 inited
 * @returns {{ handlers, getInitRequestLog, error: string|null }}
 */
async function runInSandbox(script, scriptPath) {
  const { lx, handlers, getInitRequestLog } = createLxSandbox(
    { rawScript: script },
    { logRequests: true }
  )

  const sandbox = buildSandbox(lx)

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 30000, filename: scriptPath })
  } catch (err) {
    return { handlers, getInitRequestLog, error: `执行失败: ${err.message}` }
  }

  // 等待 inited 事件（异步音源需要）
  const startTime = Date.now()
  while (!handlers.inited && Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!handlers.inited) {
    return { handlers, getInitRequestLog, error: '未触发 inited 事件' }
  }

  return { handlers, getInitRequestLog, error: null }
}

// ═══════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════

/**
 * 预跑一个音源，提取它的 sources 声明
 *
 * 返回：
 *   {
 *     sources, risk, error,
 *     cleanedCode,       // Layer 1 清理后的代码（失败时回退到原始）
 *     hasInitRequests,   // 清理后仍存在 inited 之前发出的请求
 *     initRequests,      // 具体请求列表 [{ url, host, beforeInited }]
 *     cleanReport,       // Layer 1 的清理报告
 *   }
 */
async function extractSources(scriptPath) {
  const emptyRisk = { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} }

  let script
  try {
    script = fs.readFileSync(scriptPath, 'utf8')
  } catch (err) {
    return {
      sources: {},
      risk: emptyRisk,
      error: `读取失败: ${err.message}`,
      cleanedCode: '',
      hasInitRequests: false,
      initRequests: [],
      cleanReport: { changed: false, removed: 0, removedItems: [], error: null },
    }
  }

  // 风险分析（静态扫描，与沙箱无关）
  const risk = analyzeRisks(script)

  // Layer 1：删除装饰性初始化调用
  let cleanedCode = script
  let cleanReport = { changed: false, removed: 0, removedItems: [], error: null }
  try {
    const r = stripDecorativeInitRequests(script)
    if (r.report.changed && !r.report.error) {
      cleanedCode = r.code
      cleanReport = r.report
    } else {
      cleanReport = r.report
    }
  } catch (err) {
    cleanReport = {
      changed: false,
      removed: 0,
      removedItems: [],
      error: `Layer 1 异常: ${err.message}`,
    }
  }

  // 在清理后的代码上跑沙箱
  let result = await runInSandbox(cleanedCode, scriptPath)

  // 如果清理后的代码失败，回退到原始代码
  if (result.error && cleanedCode !== script) {
    console.warn(
      `[extractor] Layer 1 清理后代码执行失败，回退到原始代码: ${result.error}`
    )
    result = await runInSandbox(script, scriptPath)
    cleanedCode = script // 回退：不输出清理后的代码
    cleanReport = {
      changed: false,
      removed: 0,
      removedItems: [],
      error: `Layer 1 清理后失败，已回退: ${result.error}`,
    }
  }

  if (result.error) {
    return {
      sources: {},
      risk,
      error: result.error,
      cleanedCode,
      hasInitRequests: false,
      initRequests: [],
      cleanReport,
    }
  }

  // 收集 inited 之前发出的请求
  const initRequests = result.getInitRequestLog ? result.getInitRequestLog() : []
  const hasInitRequests = initRequests.length > 0

  const initData = result.handlers.inited
  if (!initData || !initData.sources || typeof initData.sources !== 'object') {
    return {
      sources: {},
      risk,
      error: 'inited 未声明 sources',
      cleanedCode,
      hasInitRequests,
      initRequests,
      cleanReport,
    }
  }

  return {
    sources: initData.sources,
    risk,
    error: null,
    cleanedCode,
    hasInitRequests,
    initRequests,
    cleanReport,
  }
}

module.exports = { extractSources, stripDecorativeInitRequests }
