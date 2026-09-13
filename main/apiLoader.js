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
    version: ex('version'),
    author: ex('author'),
    homepage: ex('homepage'),
  }
}

function loadApiSource(scriptPath) {
  let script
  try {
    script = fs.readFileSync(scriptPath, 'utf8')
  } catch (err) {
    return { error: `读取失败: ${err.message}` }
  }

  const info = parseScriptHeader(script)
  const { lx, handlers } = createLxSandbox(info)

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
  }
  sandbox.globalThis = sandbox
  sandbox.global = sandbox

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 30000, filename: scriptPath })
  } catch (err) {
    return { error: `执行失败: ${err.message}`, info }
  }

  if (!handlers.inited) return { error: '未触发 inited 事件', info }
  if (!handlers.inited.status) return { error: handlers.inited.message || '初始化失败', info }

  return { lx, handlers, info, initData: handlers.inited }
}

module.exports = { loadApiSource, parseScriptHeader }
