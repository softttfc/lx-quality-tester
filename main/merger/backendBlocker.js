const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const t = require('@babel/types')

/**
 * 后端黑名单：只做 AST 层"安全的删除"，不做字符串替换。
 *
 * 为什么去掉字符串替换：
 *   字符串替换会把 init.conf / version.php 等初始化 URL 也一并改写，
 *   导致源初始化直接失败（UnhandledPromiseRejection）。
 *
 * 字符串替换的职能改由 generator.js 注入的运行时 request 包装承担。
 *
 * 删除前做 3 重安全校验：
 *   1. name 字段是否被其他代码以字符串形式引用？是 → 跳过
 *   2. 数组删空后是否还有 >= 1 个元素？否 → 跳过整个数组的删除
 *   3. 只处理 VariableDeclarator 里 /BACKENDS?$/i 的数组
 */

function applyBackendBlacklist(script, blockedHosts) {
  const report = { ast: 0, string: 0, skipped: [], missed: [], error: null }
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

  // 预扫：收集所有字符串字面量，用于第 1 重安全校验
  const allStringLiterals = new Set()
  traverse(ast, {
    StringLiteral(path) {
      allStringLiterals.add(path.node.value)
    },
  })

  // ═══ 第 1 层（唯一保留层）：AST 精准删除 ═══
  traverse(ast, {
    VariableDeclarator(path) {
      const { id, init } = path.node
      if (!t.isIdentifier(id)) return
      if (!/BACKENDS?$/i.test(id.name)) return
      if (!t.isArrayExpression(init)) return

      const arr = init.elements
      const toDelete = new Set()

      for (let idx = 0; idx < arr.length; idx++) {
        const el = arr[idx]
        if (!t.isObjectExpression(el)) continue

        const urls = collectStringsFromNode(el)
        let hitHost = null
        for (const u of urls) {
          const host = extractHostFromUrl(u)
          if (host && blockedSet.has(host)) {
            hitHost = host
            break
          }
        }
        if (!hitHost) continue

        // 安全校验 1：name 字段是否被别处引用为字符串
        const nameVal = pickNameField(el)
        if (nameVal && allStringLiterals.has(nameVal) && !isOnlyInsideThisElement(nameVal, el)) {
          report.skipped.push({
            host: hitHost,
            reason: `name="${nameVal}" 被其他代码引用，删除可能破坏引用链`,
          })
          continue
        }

        toDelete.add(idx)
        hitHosts.add(hitHost)
      }

      // 安全校验 2：不能把数组删空
      if (toDelete.size >= arr.length && arr.length > 0) {
        report.skipped.push({
          host: '[all]',
          reason: `数组 ${id.name} 全部元素都在黑名单，删空会导致源无可用后端`,
        })
        return
      }

      if (toDelete.size === 0) return

      init.elements = arr.filter((_, idx) => !toDelete.has(idx))
      report.ast += toDelete.size
    },
  })

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

/**
 * 从 ObjectExpression 里挑出 name 字段的字符串值（若有）
 */
function pickNameField(objExpr) {
  for (const prop of objExpr.properties) {
    if (!t.isObjectProperty(prop)) continue
    const key = prop.key
    const keyName =
      t.isIdentifier(key) ? key.name : (t.isStringLiteral(key) ? key.value : null)
    if (keyName === 'name' && t.isStringLiteral(prop.value)) {
      return prop.value.value
    }
  }
  return null
}

/**
 * 判断某个字符串是否只在这个元素里出现（其它元素、其它代码都不用）
 * 简化：只要这个字符串在元素内出现次数 >= 1，且 allStringLiterals 里的引用
 * 无法确认是不是同一个元素外的，则保守视为"可能被引用"。
 * 这里为了减少误删，只要 name 值在源码里出现，就保守跳过删除。
 */
function isOnlyInsideThisElement(nameVal, el) {
  // 保守：无法可靠判断，返回 false 表示"可能被引用"，即不删
  return false
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

module.exports = { applyBackendBlacklist }
