const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const t = require('@babel/types')

const BLOCKED_DOMAIN = '__blocked__.invalid'

/**
 * 三层混合过滤：
 *  第 1 层：AST 精准删除 BACKENDS 数组元素（仅对规整结构有效）
 *  第 2 层：字符串替换黑名单域名为 __blocked__.invalid
 *  （第 3 层运行时 hook 在 generator.js 注入）
 */
function applyBackendBlacklist(script, blockedHosts) {
  const report = { ast: 0, string: 0, missed: [], error: null }
  if (!Array.isArray(blockedHosts) || blockedHosts.length === 0) {
    return { code: script, report }
  }

  const blockedSet = new Set(blockedHosts)
  const hitHosts = new Set()

  let ast
  try {
    ast = parser.parse(script, {
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      plugins: ['dynamicImport', 'optionalChaining', 'nullishCoalescingOperator'],
    })
  } catch (err) {
    report.error = `AST 解析失败: ${err.message}`
    return { code: script, report }
  }

  // ═══ 第 1 层：AST 精准删除 ═══
  // 处理 const XXX_BACKENDS = [{ name, fetch }, ...] 结构
  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node
      if (!t.isIdentifier(id)) return
      if (!/BACKENDS?$/i.test(id.name)) return
      if (!t.isArrayExpression(init)) return

      const before = init.elements.length
      init.elements = init.elements.filter((el) => {
        if (!t.isObjectExpression(el)) return true
        // 收集该元素里出现的所有字符串
        const urls = collectStringsFromNode(el)
        for (const u of urls) {
          const host = extractHostFromUrl(u)
          if (host && blockedSet.has(host)) {
            hitHosts.add(host)
            return false  // 删掉这个元素
          }
        }
        return true
      })
      report.ast += before - init.elements.length
    },
  })

  // ═══ 第 2 层：字符串替换 ═══
  traverse(ast, {
    StringLiteral(path) {
      const val = path.node.value
      for (const host of blockedSet) {
        if (val.includes(host)) {
          path.node.value = val.split(host).join(BLOCKED_DOMAIN)
          hitHosts.add(host)
          report.string++
          break
        }
      }
    },
    TemplateElement(path) {
      const val = path.node.value.raw
      for (const host of blockedSet) {
        if (val.includes(host)) {
          const newVal = val.split(host).join(BLOCKED_DOMAIN)
          path.node.value.raw = newVal
          path.node.value.cooked = newVal
          hitHosts.add(host)
          report.string++
          break
        }
      }
    },
  })

  // ═══ 生成代码 ═══
  let code
  try {
    code = generate(ast, {
      retainLines: false,
      compact: false,
      comments: true,
      jsescOption: { minimal: true },
    }, script).code
  } catch (err) {
    report.error = `代码生成失败: ${err.message}`
    return { code: script, report }
  }

  report.missed = [...blockedSet].filter((h) => !hitHosts.has(h))
  return { code, report }
}

function collectStringsFromNode(node) {
  const out = []
  function walk(n) {
    if (!n || typeof n !== 'object') return
    if (t.isStringLiteral(n)) { out.push(n.value); return }
    if (t.isTemplateLiteral(n)) {
      for (const q of n.quasis) out.push(q.value.raw)
      return
    }
    for (const key of Object.keys(n)) {
      const child = n[key]
      if (Array.isArray(child)) child.forEach(walk)
      else if (child && typeof child === 'object' && child.type) walk(child)
    }
  }
  walk(node)
  return out
}

function extractHostFromUrl(url) {
  try {
    const m = String(url).match(/^https?:\/\/([^/?#\s]+)/i)
    return m ? m[1].toLowerCase().replace(/:\d+$/, '') : null
  } catch (_) {
    return null
  }
}

module.exports = { applyBackendBlacklist, BLOCKED_DOMAIN }
