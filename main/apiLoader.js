const fs = require('fs')
const vm = require('vm')
const { createLxSandbox } = require('./lxSandbox')

function parseScriptHeader(script) {
  const match = script.match(/^\/\*![\s\S]*?\*\//)
  if (!match) return {}
  const h = match[0]
  const ex = (key) => {
    const m = h.match(new RegExp(`@${key}\\s+(.+)`))
    return m ? m[1].trim() : ''
  }
  return {
    name: ex('name'),
    description: ex('description'),
    version: ex('version'),
    author: ex('author'),
    homepage: ex('homepage'),
  }
}

/**
 * 判定音源脚本是否采用明文
 * - 命中 eval / Function 构造 / atob / fromCharCode / 超长 base64 / 十六进制混淆 → 非明文
 * - 否则视为明文
 */
function detectPlainSource(script) {
  if (typeof script !== 'string' || !script.trim()) {
    return { plain: false, plainReason: '空文件' }
  }
  const suspicious = [
    { re: /\beval\s*\(/,              reason: '包含 eval 动态执行' },
    { re: /\bnew\s+Function\s*\(/,    reason: '包含 Function 构造' },
    { re: /\batob\s*\(/,              reason: '包含 atob 解码' },
    { re: /fromCharCode/,             reason: '包含 fromCharCode 拼接' },
    { re: /[\w+/]{500,}={0,2}/,       reason: '疑似超长 base64 串' },
    { re: /(\\x[0-9a-fA-F]{2}){30,}/, reason: '疑似十六进制混淆' },
  ]
  for (const { re, reason } of suspicious) {
    if (re.test(script)) return { plain: false, plainReason: reason }
  }
  return { plain: true, plainReason: '' }
}

async function loadApiSource(scriptPath, options = {}) {
  const {
    initTimeout = 15000,      // 等待 inited 事件的超时（ms）
    scriptTimeout = 30000,    // vm 执行脚本的超时（ms）
  } = options

  let script
  try {
    script = fs.readFileSync(scriptPath, 'utf8')
  } catch (err) {
    return {
      error: `读取失败: ${err.message}`,
      info: { plain: false, plainReason: '读取失败' },
    }
  }

  const headerInfo = parseScriptHeader(script)
  const plainInfo = detectPlainSource(script)
  const info = { ...headerInfo, ...plainInfo }
  const { lx, handlers } = createLxSandbox({ ...info, rawScript: script })

  const sandbox = {
    lx,
    console: {
      log: (...a) => console.log('[音源]', ...a),
      error: (...a) => console.error('[音源]', ...a),
      warn: (...a) => console.warn('[音源]', ...a),
      info: (...a) => console.info('[音源]', ...a),
      debug: () => {},
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    setImmediate,
    Buffer,
    Promise,
    JSON,
    Date,
    Math,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    Symbol,
    Map,
    Set,
    WeakMap,
    WeakSet,
    encodeURIComponent,
    decodeURIComponent,
    encodeURI,
    decodeURI,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Int8Array,
    Uint8ClampedArray,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array,
    ArrayBuffer,
    DataView,
  }
  sandbox.globalThis = sandbox
  sandbox.global = sandbox

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: scriptTimeout, filename: scriptPath })
  } catch (err) {
    return { error: `执行失败: ${err.message}`, info }
  }

  // ⭐ 关键修正：异步等待 inited 事件（有些音源的 send(inited) 在异步回调中）
  const startTime = Date.now()
  while (!handlers.inited && Date.now() - startTime < initTimeout) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  if (!handlers.inited) {
    return {
      error: `未触发 inited 事件（等待 ${initTimeout}ms 超时，可能音源内部抛异常）`,
      info,
    }
  }
  const initData = handlers.inited
  if (!initData.sources || typeof initData.sources !== 'object') {
    return { error: 'inited 事件未声明 sources', info }
  }
  const sourceCount = Object.keys(initData.sources).length
  if (sourceCount === 0) {
    return { error: 'inited 事件声明的 sources 为空（可能音源只声明了不支持的平台）', info }
  }

  return { lx, handlers, info, initData }
}

module.exports = { loadApiSource, parseScriptHeader }
