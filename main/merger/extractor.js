const fs = require('fs')
const vm = require('vm')
const { createLxSandbox } = require('../lxSandbox')

/**
 * 预跑一个音源，提取它的 sources 声明
 */
async function extractSources(scriptPath) {
  let script
  try {
    script = fs.readFileSync(scriptPath, 'utf8')
  } catch (err) {
    return { sources: {}, error: `读取失败: ${err.message}` }
  }

  const { lx, handlers } = createLxSandbox({ rawScript: script })

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

  try {
    vm.createContext(sandbox)
    vm.runInContext(script, sandbox, { timeout: 30000, filename: scriptPath })
  } catch (err) {
    return { sources: {}, error: `执行失败: ${err.message}` }
  }

  // 等待 inited 事件（异步音源需要）
  const startTime = Date.now()
  while (!handlers.inited && Date.now() - startTime < 15000) {
    await new Promise((r) => setTimeout(r, 100))
  }

  if (!handlers.inited) {
    return { sources: {}, error: '未触发 inited 事件' }
  }

  const initData = handlers.inited
  if (!initData || !initData.sources || typeof initData.sources !== 'object') {
    return { sources: {}, error: 'inited 未声明 sources' }
  }

  return { sources: initData.sources, error: null }
}

module.exports = { extractSources }
