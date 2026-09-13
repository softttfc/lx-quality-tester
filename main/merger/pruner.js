const parser = require('@babel/parser')
const traverse = require('@babel/traverse').default
const generate = require('@babel/generator').default
const t = require('@babel/types')

// 各平台的关键词——函数名、属性名含这些词就认为是该平台的代码
const PLATFORM_KEYWORDS = {
  wy: ['wy', 'wangyi', 'netease', '163'],
  tx: ['tx', 'qq', 'tencent'],
  kw: ['kw', 'kuwo'],
  kg: ['kg', 'kugou'],
  mg: ['mg', 'migu'],
}

/**
 * 检查标识符是否匹配被删平台
 */
function matchesRemove(name, removeKeywords) {
  if (!name || typeof name !== 'string') return false
  const lower = name.toLowerCase()
  for (const kw of removeKeywords) {
    if (lower === kw) return true
    // 前缀匹配：wyUrl、getWyUrl、wyHandler
    if (lower.startsWith(kw) && /^[A-Z_]/.test(name.slice(kw.length))) return true
    // 后缀匹配：UrlWy、HandlerWy
    if (lower.endsWith(kw) && /[a-z_]$/.test(name.slice(0, -kw.length))) return true
  }
  return false
}

/**
 * 检查对象 key 是否匹配
 */
function keyMatches(keyNode, removeKeywords) {
  if (t.isIdentifier(keyNode)) return matchesRemove(keyNode.name, removeKeywords)
  if (t.isStringLiteral(keyNode)) return removeKeywords.has(keyNode.value.toLowerCase())
  return false
}

/**
 * 裁剪音源脚本：删除被删平台的专属代码
 *
 * @param {string} script - 音源原始代码
 * @param {string[]} keepPlatforms - 要保留的平台，如 ['kw', 'tx']
 * @returns {{ code: string, removed: number, kept: number, error?: string }}
 */
function pruneScript(script, keepPlatforms) {
  const allPlatforms = ['wy', 'tx', 'kw', 'kg', 'mg']
  const removePlatforms = allPlatforms.filter((p) => !keepPlatforms.includes(p))

  if (removePlatforms.length === 0) {
    return { code: script, removed: 0, kept: 0 }
  }

  // 收集所有被删平台的关键词
  const removeKeywords = new Set()
  for (const p of removePlatforms) {
    for (const kw of PLATFORM_KEYWORDS[p]) {
      removeKeywords.add(kw.toLowerCase())
    }
  }

  // 1. 解析 AST
  let ast
  try {
    ast = parser.parse(script, {
      sourceType: 'script',
      allowReturnOutsideFunction: true,
      plugins: ['dynamicImport', 'optionalChaining', 'nullishCoalescingOperator'],
    })
  } catch (err) {
    return { code: script, removed: 0, kept: 0, error: `AST 解析失败: ${err.message}` }
  }

  // 2. 收集所有"保留代码引用的标识符"和字符串字面量
  const keptIdentifiers = new Set()
  const keptStringLiterals = new Set()

  traverse(ast, {
    Identifier(path) {
      if (path.parent.type === 'ObjectProperty' && path.parent.key === path.node) return
      if (path.parent.type === 'ObjectMethod' && path.parent.key === path.node) return
      if (path.parent.type === 'FunctionDeclaration' && path.parent.id === path.node) return
      if (path.parent.type === 'VariableDeclarator' && path.parent.id === path.node) return
      keptIdentifiers.add(path.node.name)
    },
    StringLiteral(path) {
      keptStringLiterals.add(path.node.value)
    },
  })

  // 3. 找出候选删除节点
  const candidates = []

  traverse(ast, {
    FunctionDeclaration(path) {
      if (path.parent.type !== 'Program') return
      if (matchesRemove(path.node.id?.name, removeKeywords)) {
        candidates.push({ path, type: 'function', name: path.node.id?.name })
      }
    },
    VariableDeclaration(path) {
      if (path.parent.type !== 'Program') return
      const toRemove = []
      for (const decl of path.node.declarations) {
        if (t.isIdentifier(decl.id) && matchesRemove(decl.id.name, removeKeywords)) {
          toRemove.push(decl)
        }
      }
      if (toRemove.length > 0) {
        candidates.push({ path, type: 'variable', names: toRemove.map((d) => d.id.name) })
      }
    },
    ObjectProperty(path) {
      if (keyMatches(path.node.key, removeKeywords)) {
        const keyName = t.isIdentifier(path.node.key) ? path.node.key.name : path.node.key.value
        candidates.push({ path, type: 'objectProperty', key: keyName })
      }
    },
    ObjectMethod(path) {
      if (keyMatches(path.node.key, removeKeywords)) {
        const keyName = t.isIdentifier(path.node.key) ? path.node.key.name : path.node.key.value
        candidates.push({ path, type: 'objectMethod', key: keyName })
      }
    },
    SwitchCase(path) {
      if (t.isStringLiteral(path.node.test) && removeKeywords.has(path.node.test.value.toLowerCase())) {
        candidates.push({ path, type: 'switchCase', key: path.node.test.value })
      }
    },
  })

  // 4. 过滤候选：只删除"没有被保留代码引用"的
  const toRemove = []
  for (const c of candidates) {
    let isReferenced = false

    if (c.type === 'function' && c.name) {
      // 检查该函数名是否在其他地方被引用
      let count = 0
      traverse(ast, {
        Identifier(p) {
          if (p.node.name === c.name) count++
        },
      })
      // 声明本身算一次，所以 count > 1 说明有引用
      isReferenced = count > 1
    } else if (c.type === 'variable' && c.names) {
      isReferenced = false
      for (const name of c.names) {
        let count = 0
        traverse(ast, {
          Identifier(p) {
            if (p.node.name === name) count++
          },
        })
        if (count > 1) {
          isReferenced = true
          break
        }
      }
    } else if (c.type === 'objectProperty' || c.type === 'objectMethod') {
      // 检查是否存在动态访问
      let hasDynamicAccess = false
      traverse(ast, {
        MemberExpression(p) {
          if (p.node.computed) hasDynamicAccess = true
        },
      })
      if (hasDynamicAccess) {
        // 有动态访问，检查 key 是否被字符串引用
        if (keptStringLiterals.has(c.key)) isReferenced = true
      }
    }

    if (!isReferenced) {
      toRemove.push(c)
    }
  }

  // 5. 执行删除
  let removedCount = 0
  for (const c of toRemove) {
    try {
      if (c.type === 'function') {
        c.path.remove()
        removedCount++
      } else if (c.type === 'variable') {
        const decls = c.path.node.declarations
        const remaining = decls.filter((d) => !c.names.includes(d.id.name))
        if (remaining.length === 0) {
          c.path.remove()
        } else {
          c.path.node.declarations = remaining
        }
        removedCount++
      } else if (c.type === 'objectProperty' || c.type === 'objectMethod') {
        c.path.remove()
        removedCount++
      } else if (c.type === 'switchCase') {
        c.path.remove()
        removedCount++
      }
    } catch (err) {
      console.error('[pruner] 删除失败:', err.message)
    }
  }

  // 6. 生成代码
  let output
  try {
    output = generate(ast, {
      retainLines: false,
      compact: false,
      comments: true,
      jsescOption: { minimal: true },
    }, script).code
  } catch (err) {
    return { code: script, removed: 0, kept: 0, error: `代码生成失败: ${err.message}` }
  }

  return {
    code: output,
    removed: removedCount,
    kept: candidates.length - removedCount,
  }
}

module.exports = { pruneScript }
