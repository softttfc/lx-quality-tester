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
 *
 * 分三层：
 *  1. 强规则：命中任意一条，直接判"非明文"（plainKind: 'strong'）
 *     —— 这些特征几乎不会出现在正常明文源码里，命中即高置信度
 *  2. 弱规则：加权累计评分，超过阈值判"疑似混淆"（plainKind: 'weak'）
 *     —— 特征本身可能有正当用途（打包产物、压缩变量名等），需多项叠加才认定
 *  3. 未命中任何规则 → 明文（plainKind: 'plain'）
 *
 * 返回：{ plain, plainReason, plainKind, weakScore }
 */
function detectPlainSource(script) {
  if (typeof script !== 'string' || !script.trim()) {
    return {
      plain: false,
      plainReason: '空文件',
      plainKind: 'strong',
      weakScore: 0,
    }
  }

  // ============ 1. 强规则（命中即判非明文） ============
  const strongRules = [
    { re: /\beval\s*\(/,              reason: '包含 eval 动态执行' },
    { re: /\bnew\s+Function\s*\(/,    reason: '包含 Function 构造' },
    { re: /\batob\s*\(/,              reason: '包含 atob 解码' },
    { re: /fromCharCode/,             reason: '包含 fromCharCode 拼接' },
    { re: /[\w+/]{500,}={0,2}/,       reason: '疑似超长 base64 串' },
    { re: /(\\x[0-9a-fA-F]{2}){30,}/, reason: '疑似十六进制转义混淆' },
  ]
  for (const { re, reason } of strongRules) {
    if (re.test(script)) {
      return {
        plain: false,
        plainReason: reason,
        plainKind: 'strong',
        weakScore: 0,
      }
    }
  }

  // ============ 2. 弱规则（加权评分） ============
  let score = 0
  const reasons = []
  const add = (s, reason) => {
    if (s > 0) { score += s; reasons.push(reason) }
  }

  // 2.1 _0x 混淆标识符密度（常见于 obfuscator.io 输出）
  const hexIds = script.match(/_0x[a-f0-9]{3,}/gi) || []
  add(Math.min(hexIds.length, 6), `_0x 标识符 ×${hexIds.length}`)

  // 2.2 while(!![]) 字符串数组旋转
  if (/while\s*\(\s*!!\s*\[\s*\]\s*\)/.test(script)) {
    add(4, 'while(!![]) 旋转循环')
  }

  // 2.3 push/shift 数组轮转
  if (/\[\s*['"]push['"]\s*\]\s*\(\s*[A-Za-z_$][\w$]*\s*\[\s*['"]shift['"]\s*\]/.test(script)) {
    add(4, '字符串数组旋转')
  }

  // 2.4 十六进制字面量密度（相对脚本长度归一化）
  const hexLits = script.match(/0x[0-9a-fA-F]{2,}/g) || []
  const hexRatio = hexLits.length / Math.max(script.length / 500, 1)
  add(Math.min(Math.floor(hexRatio), 4), `十六进制字面量 ×${hexLits.length}`)

  // 2.5 代理函数表（函数体仅由二元运算构成）
  const proxyFns = script.match(
    /['"][A-Za-z]{4,8}['"]\s*:\s*function\s*\(\s*\w+\s*\)\s*\{\s*return\s+\w+\s*[+\-*/]\s*\w+/
  )
  if (proxyFns) add(3, '代理函数表')

  // 阈值：≥5 分认为疑似混淆
  if (score >= 5) {
    return {
      plain: false,
      plainReason: `疑似混淆（评分 ${score}）：${reasons.join('、')}`,
      plainKind: 'weak',
      weakScore: score,
    }
  }

  // ============ 3. 明文 ============
  return {
    plain: true,
    plainReason: '',
    plainKind: 'plain',
    weakScore: score,
  }
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
      info: { plain: false, plainReason: '读取失败', plainKind: 'strong', weakScore: 0 },
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

module.exports = { loadApiSource, parseScriptHeader, detectPlainSource }
