const fs = require('fs')
const vm = require('vm')
const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const t = require('@babel/types')

const { createLxSandbox } = require('../lxSandbox')
const { analyzeRisks } = require('../apiLoader')

// ═══════════════════════════════════════════════════════
// ⭐ v2.5：脚本大小上限，超过则跳过 Babel 清理，避免 AST 内存爆炸
// ═══════════════════════════════════════════════════════
const MAX_BABEL_SIZE = 300 * 1024   // 300KB

// ═══════════════════════════════════════════════════════
// Layer 1：模式识别，删除装饰性的初始化请求
// ═══════════════════════════════════════════════════════

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

// ⭐ v2.5：主动 GC 辅助函数
function tryGC() {
  if (typeof global.gc === 'function') {
    try { global.gc() } catch (_) {}
  }
}

function stripDecorativeInitRequests(script) {
  const report = { changed: false, removed: 0, removedItems: [], error: null }
  if (typeof script !== 'string' || !script.trim()) {
    return { code: script, report }
  }

  // ⭐ v2.5：超大脚本直接跳过，避免 AST 内存爆炸
  if (script.length > MAX_BABEL_SIZE) {
    report.error = `脚本超过 ${Math.round(MAX_BABEL_SIZE / 1024)}KB，跳过 Layer 1 清理`
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

  const toRemove = []

  try {
    traverse(ast, {
      ExpressionStatement(path) {
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
  } catch (err) {
    ast = null
    tryGC()
    report.error = `AST 遍历失败: ${err.message}`
    return { code: script, report }
  }

  // ⭐ v2.5：无候选时提前释放 AST
  if (toRemove.length === 0) {
    ast = null
    tryGC()
    return { code: script, report }
  }

  for (const item of toRemove) {
    try {
      item.path.remove()
      report.removed++
      report.removedItems.push(`移除装饰性调用 ${item.name}()`)
    } catch (_) {
      // 忽略单点移除失败
    }
  }

  if (report.removed === 0) {
    ast = null
    tryGC()
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
    ast = null
    tryGC()
    report.error = `代码生成失败: ${err.message}`
    return { code: script, report }
  }

  // ⭐ v2.5：AST 用完立即断开引用 + 主动 GC
  ast = null
  tryGC()

  report.changed = true
  return { code: output, report }
}

// ═══════════════════════════════════════════════════════
// 沙箱执行
// ═══════════════════════════════════════════════════════

/**
 * ⭐ buildSandbox 现在接收受控定时器
 */
function buildSandbox(lx, timers) {
  const t = timers || {}
  const sandbox = {
    lx,
    console: { log: () => {}, error: () => {}, warn: () => {}, info: () => {}, debug: () => {} },
    setTimeout: t.setTimeout || setTimeout,
    clearTimeout: t.clearTimeout || clearTimeout,
    setInterval: t.setInterval || setInterval,
    clearInterval: t.clearInterval || clearInterval,
    setImmediate: t.setImmediate || setImmediate,
    Buffer, Promise, JSON, Date, Math, Object, Array, String, Number, Boolean,
    RegExp, Error, TypeError, RangeError, Symbol, Map, Set, WeakMap, WeakSet,
    encodeURIComponent, decodeURIComponent, encodeURI, decodeURI,
    parseInt, parseFloat, isNaN, isFinite,
    URL, URLSearchParams, TextEncoder, TextDecoder,
    Uint8Array, Int8Array, Uint8ClampedArray, Int16Array, Uint16Array,
    Int32Array, Uint32Array, Float32Array, Float64Array,
    ArrayBuffer, DataView,
  }
  if (t.clearImmediate) sandbox.clearImmediate = t.clearImmediate
  sandbox.globalThis = sandbox
  sandbox.global = sandbox
  return sandbox
}

/**
 * 在沙箱中执行代码并等待 inited
 * ⭐ v2.5：返回 clearScriptInfo 供调用方释放 rawScript
 */
async function runInSandbox(script, scriptPath) {
  const { lx, handlers, getInitRequestLog, timers, cleanup, clearScriptInfo } = createLxSandbox(
    { rawScript: script },
    { logRequests: true }
  )

  const sandbox = buildSandbox(lx, timers)

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 30000, filename: scriptPath })
  } catch (err) {
    return {
      handlers,
      getInitRequestLog,
      cleanup,
      clearScriptInfo,
      error: `执行失败: ${err.message}`,
    }
  }

  const startTime = Date.now()
  while (!handlers.inited && Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!handlers.inited) {
    return {
      handlers,
      getInitRequestLog,
      cleanup,
      clearScriptInfo,
      error: '未触发 inited 事件',
    }
  }

  return { handlers, getInitRequestLog, cleanup, clearScriptInfo, error: null }
}

// ═══════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════

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

  // ⭐ 如果清理后的代码失败，先释放旧沙箱，再回退到原始代码
  if (result.error && cleanedCode !== script) {
    if (typeof result.cleanup === 'function') {
      try { result.cleanup() } catch (_) {}
    }
    if (typeof result.clearScriptInfo === 'function') {
      try { result.clearScriptInfo() } catch (_) {}
    }
    tryGC()
    console.warn(
      `[extractor] Layer 1 清理后代码执行失败，回退到原始代码: ${result.error}`
    )
    result = await runInSandbox(script, scriptPath)
    cleanedCode = script
    cleanReport = {
      changed: false,
      removed: 0,
      removedItems: [],
      error: `Layer 1 清理后失败，已回退: ${result.error}`,
    }
  }

  // ⭐ 所有 return 都走 finally，确保沙箱被释放 + 脚本副本被清空 + 主动 GC
  try {
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
  } finally {
    // ⭐ v2.5：统一释放沙箱资源
    if (typeof result.cleanup === 'function') {
      try { result.cleanup() } catch (_) {}
    }
    if (typeof result.clearScriptInfo === 'function') {
      try { result.clearScriptInfo() } catch (_) {}   // 清空 rawScript
    }
    tryGC()
  }
}

module.exports = { extractSources, stripDecorativeInitRequests }
