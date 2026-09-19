#!/usr/bin/env node
/**
 * fix-merged-source.js
 * 修复 LX Music 合并音源文件（7 处已知问题）
 *
 * 用法：
 *   node fix-merged-source.js <merged-source-xxx.js>
 *   node fix-merged-source.js                # 自动查找当前目录
 */

const fs = require('fs')

// ═══════════════════════════════════════════════════
// 工具函数
// ═══════════════════════════════════════════════════
function replaceAll(haystack, needle, replacement) {
  if (!needle) return { text: haystack, count: 0 }
  const parts = haystack.split(needle)
  return { text: parts.join(replacement), count: parts.length - 1 }
}

function findMatchingBracket(str, startPos, openChar, closeChar) {
  let depth = 0
  let inStr = null
  let inLineCmt = false
  let inBlockCmt = false
  let esc = false

  for (let i = startPos; i < str.length; i++) {
    const c = str[i]
    const n = str[i + 1]

    if (inLineCmt) { if (c === '\n') inLineCmt = false; continue }
    if (inBlockCmt) { if (c === '*' && n === '/') { inBlockCmt = false; i++ } continue }
    if (inStr) {
      if (esc) { esc = false; continue }
      if (c === '\\') { esc = true; continue }
      if (c === inStr) inStr = null
      continue
    }
    if (c === '/' && n === '/') { inLineCmt = true; i++; continue }
    if (c === '/' && n === '*') { inBlockCmt = true; i++; continue }
    if (c === '"' || c === "'" || c === '`') { inStr = c; continue }

    if (c === openChar) depth++
    else if (c === closeChar) {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
}

// ═══════════════════════════════════════════════════
// 1. 确定输入 / 输出文件
// ═══════════════════════════════════════════════════
let input = process.argv[2]

if (!input) {
  const files = fs.readdirSync('.').filter((f) =>
    /^merged-source-.*\.js$/.test(f) && !f.endsWith('.fixed.js')
  )
  if (files.length === 0) {
    console.error('❌ 未找到 merged-source-*.js')
    console.error('   用法：node fix-merged-source.js <文件路径>')
    process.exit(1)
  }
  if (files.length > 1) {
    console.error('❌ 找到多个 merged-source-*.js，请手动指定：')
    files.forEach((f) => console.error('   - ' + f))
    process.exit(1)
  }
  input = files[0]
  console.log('🔍 自动检测到输入文件：' + input)
}

if (!fs.existsSync(input)) {
  console.error('❌ 文件不存在：' + input)
  process.exit(1)
}

const output = input.replace(/\.js$/, '.fixed.js')
let code = fs.readFileSync(input, 'utf8')
const report = []
let total = 0

// ═══════════════════════════════════════════════════
// 修复 1：Object.assign → 保留原型链
// ═══════════════════════════════════════════════════
{
  const needle = 'const __lx_proxy__ = Object.assign({}, __origin_lx)'
  const repl = [
    'const __lx_proxy__ = (function () {',
    '      var p',
    '      try { p = Object.create(Object.getPrototypeOf(__origin_lx) || Object.prototype) } catch (_) { p = {} }',
    '      for (var k in __origin_lx) { try { p[k] = __origin_lx[k] } catch (_) {} }',
    '      return p',
    '    })()',
  ].join('\n')
  const r = replaceAll(code, needle, repl)
  code = r.text
  total += r.count
  report.push(`[1] Object.assign → 保留原型：${r.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 2：隔离 currentScriptInfo
// ═══════════════════════════════════════════════════
{
  const needle = '__lx_proxy__.send = function () {};'
  const repl = '__lx_proxy__.send = function () {};\n' +
    "      try { Object.defineProperty(__lx_proxy__, 'currentScriptInfo', { value: { name: '', version: '', author: '', homepage: '', rawScript: '' }, writable: false, configurable: true }) } catch (_) {}"
  const r = replaceAll(code, needle, repl)
  code = r.text
  total += r.count
  report.push(`[2] currentScriptInfo 隔离：${r.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 3：包装器调用加 lxRef
// ═══════════════════════════════════════════════════
{
  const r = replaceAll(
    code,
    '__makeRequestWrapper__(__lx_proxy__.request)',
    '__makeRequestWrapper__(__lx_proxy__.request, __origin_lx)'
  )
  code = r.text
  total += r.count
  report.push(`[3] 包装器调用加 lxRef：${r.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 4：包装器定义加 lxRef 参数 + this 绑定
// ═══════════════════════════════════════════════════
{
  const r1 = replaceAll(
    code,
    'function __makeRequestWrapper__(origRequest) {',
    'function __makeRequestWrapper__(origRequest, lxRef) {'
  )
  code = r1.text
  total += r1.count
  report.push(`[4a] 包装器定义加 lxRef 参数：${r1.count} 处`)

  const r2 = replaceAll(
    code,
    'return origRequest.apply(this, arguments)',
    'return origRequest.apply(lxRef || this || __origin_lx, arguments)'
  )
  code = r2.text
  total += r2.count
  report.push(`[4b] 包装器 this 绑定：${r2.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 5：__probeUrl__ 去掉 binary:true + rawBody 兜底
// ═══════════════════════════════════════════════════
{
  const r1 = replaceAll(
    code,
    "          headers: { 'Range': 'bytes=0-1023' },\n          timeout: 8000,\n          binary: true,\n        }, function (err, resp) {",
    "          headers: { 'Range': 'bytes=0-1023' },\n          timeout: 8000,\n        }, function (err, resp) {"
  )
  code = r1.text
  total += r1.count
  report.push(`[5a] 删除 binary:true：${r1.count} 处`)

  const r2 = replaceAll(
    code,
    'var buf = __bodyToBuffer__(resp.body)',
    'var __raw__ = (resp.rawBody != null) ? resp.rawBody : resp.body\n          var buf = __bodyToBuffer__(__raw__)'
  )
  code = r2.text
  total += r2.count
  report.push(`[5b] rawBody 兜底：${r2.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 6：分发器补齐 musicInfo ID 字段 + handler 参数
// ═══════════════════════════════════════════════════
{
  const needle = [
    '    const requested = params.info && params.info.type',
    '    const reqIdx = requested ? __qualityIndex__(requested) : 99',
    '    const errors = []',
  ].join('\n')

  const repl = [
    '    const requested = params.info && params.info.type',
    '    const reqIdx = requested ? __qualityIndex__(requested) : 99',
    '    const errors = []',
    '',
    '    // ⭐ 修复：补齐 musicInfo 跨平台 ID 字段',
    '    var __innerParams__ = params',
    '    if (params.info && params.info.musicInfo) {',
    '      var __src__ = params.info.musicInfo',
    '      var __norm__ = Object.assign({}, __src__)',
    "      var __sid__ = __src__.songmid || __src__.hash || __src__.id || __src__.songId || __src__.rid || __src__.musicId || ''",
    '      if (__sid__) {',
    '        if (!__norm__.songmid) __norm__.songmid = __sid__',
    '        if (!__norm__.hash)    __norm__.hash    = __sid__',
    '        if (!__norm__.id)      __norm__.id      = __sid__',
    '        if (!__norm__.songId)  __norm__.songId  = __sid__',
    '        if (!__norm__.rid)     __norm__.rid     = __sid__',
    '      }',
    '      __innerParams__ = Object.assign({}, params, {',
    '        info: Object.assign({}, params.info, { musicInfo: __norm__ })',
    '      })',
    '    }',
  ].join('\n')

  const r1 = replaceAll(code, needle, repl)
  code = r1.text
  total += r1.count
  report.push(`[6a] musicInfo ID 补齐：${r1.count} 处`)

  const r2 = replaceAll(
    code,
    'const result = await h.handler(params)',
    'const result = await h.handler(__innerParams__)'
  )
  code = r2.text
  total += r2.count
  report.push(`[6b] handler 参数替换（主）：${r2.count} 处`)

  const r3 = replaceAll(
    code,
    'const fallback = await h0.handler(params)',
    'const fallback = await h0.handler(__innerParams__)'
  )
  code = r3.text
  total += r3.count
  report.push(`[6c] handler 参数替换（fallback）：${r3.count} 处`)
}

// ═══════════════════════════════════════════════════
// 修复 7：尾部 send(inited) 加 status:true + setTimeout 延迟
// ═══════════════════════════════════════════════════
{
  const marker = '__origin_lx.send(EVENT_NAMES.inited,'
  const lastIdx = code.lastIndexOf(marker)

  if (lastIdx !== -1) {
    const openParenPos = code.indexOf('(', lastIdx + marker.length - 1)
    const closeParenPos = findMatchingBracket(code, openParenPos, '(', ')')

    if (closeParenPos !== -1) {
      let endPos = closeParenPos + 1
      let j = endPos
      while (j < code.length && /\s/.test(code[j])) j++
      if (code[j] === ';') endPos = j + 1

      let sendCall = code.slice(lastIdx, endPos)

      sendCall = sendCall.replace(
        /(__origin_lx\.send\(EVENT_NAMES\.inited,\s*\{)/,
        '$1\n      status: true,'
      )

      const before = code.slice(0, lastIdx)
      const after = code.slice(endPos)

      const wrapped =
        'setTimeout(function () {\n' +
        '    try {\n' +
        sendCall.split('\n').map((line) => '      ' + line).join('\n') + '\n' +
        '    } catch (e) {\n' +
        "      console.error('[合并音源] 发送 inited 失败:', e && e.message ? e.message : e)\n" +
        '    }\n' +
        '  }, 3000)'

      code = before + wrapped + after
      report.push('[7] send(inited) 加 status:true + 3s 延迟：1 处')
      total += 1
    } else {
      report.push('[7] ⚠️ 未找到匹配括号，跳过')
    }
  } else {
    report.push('[7] ⚠️ 未找到 send(inited)，跳过')
  }
}

// ═══════════════════════════════════════════════════
// 输出
// ═══════════════════════════════════════════════════
fs.writeFileSync(output, code, 'utf8')

console.log('\n✅ 修复完成\n')
console.log('修改汇总：')
report.forEach((line) => console.log('  ' + line))
console.log('\n总替换点：' + total)
console.log('输出文件：' + output)
