/**
 * 明文音源判读（纯函数，零依赖）
 *
 * ⚠️ 约束：本模块不得 require 任何项目内模块，
 *         尤其不得 require('./apiLoader')，否则会与 apiLoader.js 形成循环依赖。
 *
 * 判读规则（与历史版本一致，不得修改）：
 *   1. 强特征一票否决：eval / new Function / atob / fromCharCode /
 *      超长 base64 / 连续十六进制转义 → plainKind='strong'
 *   2. 弱特征累计评分：_0x 标识符 / while(!![]) / 字符串数组旋转 /
 *      十六进制字面量 / 代理函数表，score >= 5 → plainKind='weak'
 *   3. 否则 → plainKind='plain'，plain=true
 *
 * 返回结构：
 *   {
 *     plain: boolean,         // 是否明文
 *     plainReason: string,    // 非明文原因（明文时为空）
 *     plainKind: 'plain' | 'weak' | 'strong',
 *     weakScore: number
 *   }
 */

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

module.exports = { detectPlainSource }
