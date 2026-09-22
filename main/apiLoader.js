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

function detectPlainSource(script) {
  if (typeof script !== 'string' || !script.trim()) {
    return { plain: false, plainReason: '空文件', plainKind: 'strong', weakScore: 0 }
  }

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
      return { plain: false, plainReason: reason, plainKind: 'strong', weakScore: 0 }
    }
  }

  let score = 0
  const reasons = []
  const add = (s, reason) => { if (s > 0) { score += s; reasons.push(reason) } }

  const hexIds = script.match(/_0x[a-f0-9]{3,}/gi) || []
  add(Math.min(hexIds.length, 6), `_0x 标识符 ×${hexIds.length}`)

  if (/while\s*\(\s*!!\s*\[\s*\]\s*\)/.test(script)) {
    add(4, 'while(!![]) 旋转循环')
  }
  if (/\[\s*['"]push['"]\s*\]\s*\(\s*[A-Za-z_$][\w$]*\s*\[\s*['"]shift['"]\s*\]/.test(script)) {
    add(4, '字符串数组旋转')
  }
  const hexLits = script.match(/0x[0-9a-fA-F]{2,}/g) || []
  const hexRatio = hexLits.length / Math.max(script.length / 500, 1)
  add(Math.min(Math.floor(hexRatio), 4), `十六进制字面量 ×${hexLits.length}`)

  const proxyFns = script.match(
    /['"][A-Za-z]{4,8}['"]\s*:\s*function\s*\(\s*\w+\s*\)\s*\{\s*return\s+\w+\s*[+\-*/]\s*\w+/
  )
  if (proxyFns) add(3, '代理函数表')

  if (score >= 5) {
    return {
      plain: false,
      plainReason: `疑似混淆（评分 ${score}）：${reasons.join('、')}`,
      plainKind: 'weak',
      weakScore: score,
    }
  }

  return { plain: true, plainReason: '', plainKind: 'plain', weakScore: score }
}

// ═══════════════════════════════════════════════════════
// 风险分析
// ═══════════════════════════════════════════════════════

const TRUSTED_HOST_PATTERNS = [
  /(^|\.)qq\.com$/,
  /(^|\.)music\.163\.com$/,
  /(^|\.)163\.com$/,
  /(^|\.)kuwo\.cn$/,
  /(^|\.)kugou\.com$/,
  /(^|\.)migu\.cn$/,
  /(^|\.)githubusercontent\.com$/,
  /(^|\.)github\.com$/,
  /(^|\.)jsdelivr\.net$/,
  /(^|\.)gdstudio\.xyz$/,
  /88\.lxmusic\.xn--fiqs8s$/,
]

const KNOWN_PUBLIC_SECRETS = new Set([
  'e82ckenh8dichen8',
  'Hm_Iuvt_cdb524f42f0ce19b169a8071123a4700',
  'lxmusic',
  'JaJ?a7Nwk_Fgj?2o:znAkst',
  '1888f9865338afe6d5534b35171c61a4',
])

function analyzeRisks(script) {
  const cleanResult = { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} }
  if (typeof script !== 'string' || !script.trim()) return cleanResult

  const categories = {}
  const reasons = []
  let score = 0

  const secretRe = /(?:api[_-]?key|secret|token|ckey|passwd|password|apikey|card[_-]?key)\s*[:=]\s*['"]([^'"]{8,})['"]/gi
  const secrets = []
  const seenPreview = new Set()
  let m
  while ((m = secretRe.exec(script)) !== null) {
    const val = m[1]
    if (KNOWN_PUBLIC_SECRETS.has(val)) continue
    const preview = m[0].replace(/\s+/g, ' ').slice(0, 80)
    if (!seenPreview.has(preview)) {
      seenPreview.add(preview)
      secrets.push(preview)
    }
  }
  if (secrets.length) {
    categories.hardcodedSecrets = { count: secrets.length, samples: secrets.slice(0, 8) }
    score += Math.min(secrets.length * 5, 20)
    reasons.push(`硬编码密钥 ×${secrets.length}`)
  }

  const credRe = /@(tx|wy|qq|kg|kw|mg)_(cookie|token)\b/g
  const credFields = []
  let cm
  while ((cm = credRe.exec(script)) !== null) {
    const field = `@${cm[1]}_${cm[2]}`
    if (!credFields.includes(field)) credFields.push(field)
  }
  if (credFields.length) {
    categories.readsUserCredentials = { fields: credFields }
    score += 4
    reasons.push(`读取头部凭据 ×${credFields.length}`)
  }

  const hostRe = /(https?):\/\/([a-zA-Z0-9.\-]+)/g
  const httpHosts = new Set()
  const httpsHosts = new Set()
  let hm
  while ((hm = hostRe.exec(script)) !== null) {
    const proto = hm[1]
    const host = hm[2].toLowerCase().replace(/^www\./, '')
    if (proto === 'http') httpHosts.add(host)
    else httpsHosts.add(host)
  }

  const isTrusted = (host) => TRUSTED_HOST_PATTERNS.some((re) => re.test(host))

  const untrustedHttp = [...httpHosts].filter((h) => !isTrusted(h))
  const untrustedHttps = [...httpsHosts].filter((h) => !isTrusted(h) && !httpHosts.has(h))

  if (untrustedHttp.length) {
    categories.httpHosts = { count: untrustedHttp.length, list: untrustedHttp }
    score += Math.min(untrustedHttp.length * 3, 10)
    reasons.push(`非官方 HTTP 域名 ×${untrustedHttp.length}`)
  }
  if (untrustedHttps.length) {
    categories.untrustedHosts = { count: untrustedHttps.length, list: untrustedHttps }
    score += Math.min(untrustedHttps.length, 15)
    reasons.push(`非官方 HTTPS 域名 ×${untrustedHttps.length}`)
  }

  const exploitKwRe = /(越权|exploit|crack|破解|伪造)/gi
  const exploitKeywords = []
  let em
  while ((em = exploitKwRe.exec(script)) !== null) {
    const kw = em[0]
    if (!exploitKeywords.includes(kw)) exploitKeywords.push(kw)
  }
  const fakeCookieRe = /(qm_keyst|qqmusic_key|psrf_qqaccess_token)\s*[:=]\s*['"]/
  const hasFakeCookie = fakeCookieRe.test(script)
  const hasExploit = exploitKeywords.length > 0 || hasFakeCookie

  if (hasExploit) {
    const kws = [...exploitKeywords]
    if (hasFakeCookie) kws.push('伪造 Cookie 特征')
    categories.containsExploit = { keywords: kws }
    score += 8
    reasons.push('含越权/破解逻辑')
  }

  let level = 'clean'
  if (score >= 15) level = 'high'
  else if (score >= 5) level = 'medium'
  else if (score > 0) level = 'low'

  return { level, score, reasons, hasExploit, categories }
}

async function loadApiSource(scriptPath, options = {}) {
  const {
    initTimeout = 15000,
    scriptTimeout = 30000,
    requestFilter = null,
    logRequests = false,
  } = options

  let script
  try {
    script = fs.readFileSync(scriptPath, 'utf8')
  } catch (err) {
    return {
      error: `读取失败: ${err.message}`,
      info: {
        plain: false,
        plainReason: '读取失败',
        plainKind: 'strong',
        weakScore: 0,
        risk: { level: 'clean', score: 0, reasons: [], hasExploit: false, categories: {} },
      },
      getRequestLog: () => [],
      getInitRequestLog: () => [],
      cleanup: () => {},
    }
  }

  const headerInfo = parseScriptHeader(script)
  const plainInfo = detectPlainSource(script)
  const riskInfo = analyzeRisks(script)
  const info = { ...headerInfo, ...plainInfo, risk: riskInfo }

  // ⭐ 取出受控定时器与 cleanup
  const { lx, handlers, getRequestLog, getInitRequestLog, timers, cleanup } = createLxSandbox(
    { ...info, rawScript: script },
    { requestFilter, logRequests }
  )

  const sandbox = {
    lx,
    console: {
      log: (...a) => console.log('[音源]', ...a),
      error: (...a) => console.error('[音源]', ...a),
      warn: (...a) => console.warn('[音源]', ...a),
      info: (...a) => console.info('[音源]', ...a),
      debug: () => {},
    },
    // ⭐ 使用受控定时器，测试完可统一清理
    setTimeout: timers.setTimeout,
    clearTimeout: timers.clearTimeout,
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
    setImmediate: timers.setImmediate,
    clearImmediate: timers.clearImmediate,
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
    return { error: `执行失败: ${err.message}`, info, getRequestLog, getInitRequestLog, cleanup }
  }

  const startTime = Date.now()
  while (!handlers.inited && Date.now() - startTime < initTimeout) {
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  if (!handlers.inited) {
    return {
      error: `未触发 inited 事件（等待 ${initTimeout}ms 超时，可能音源内部抛异常）`,
      info,
      getRequestLog,
      getInitRequestLog,
      cleanup,
    }
  }
  const initData = handlers.inited
  if (!initData.sources || typeof initData.sources !== 'object') {
    return { error: 'inited 事件未声明 sources', info, getRequestLog, getInitRequestLog, cleanup }
  }
  const sourceCount = Object.keys(initData.sources).length
  if (sourceCount === 0) {
    return { error: 'inited 事件声明的 sources 为空', info, getRequestLog, getInitRequestLog, cleanup }
  }

  return { lx, handlers, info, initData, getRequestLog, getInitRequestLog, cleanup }
}

module.exports = { loadApiSource, parseScriptHeader, detectPlainSource, analyzeRisks }
