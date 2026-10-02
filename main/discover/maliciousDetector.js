/**
 * 恶意音源静态检测
 * ⚠️ 纯函数，零依赖，只做正则匹配，不执行脚本
 *
 * 返回结构：
 *   {
 *     malicious: boolean,           // 是否恶意（有 high/medium 命中）
 *     severity: 'clean' | 'low' | 'medium' | 'high',
 *     matches: [{ id, severity, reason }]
 *   }
 *
 * 严重级别：
 *   - high:   几乎只有恶意代码会用，UI 标红 + 默认不勾选 + 下载二次确认
 *   - medium: 可疑，可能误判，UI 标黄
 *   - low:    仅记录，UI 不显示
 */

const RULES = [
  // ═══════════════════════════════════════════════════════
  // A. OOM / 内存炸弹（high）
  // ═══════════════════════════════════════════════════════
  {
    id: 'oom-rawscript-repeat',
    severity: 'high',
    re: /currentScriptInfo\s*\.\s*rawScript\s*\.\s*repeat\s*\(/,
    reason: '对 rawScript 做 repeat，疑似 OOM 攻击',
  },
  {
    id: 'oom-rawscript-index',
    severity: 'high',
    re: /currentScriptInfo\s*\[\s*['"]rawScript['"]\s*\]\s*\.\s*repeat\s*\(/,
    reason: '对 currentScriptInfo["rawScript"] 做 repeat，疑似 OOM 攻击',
  },
  {
    id: 'oom-large-repeat',
    severity: 'high',
    re: /\.repeat\s*\(\s*[1-9]\d{3,}\s*\)/,
    reason: '大数字 repeat，疑似 OOM 攻击',
  },
  {
    id: 'oom-large-array',
    severity: 'high',
    re: /new\s+Array\s*\(\s*[1-9]\d{6,}\s*\)/,
    reason: '创建超大数组，疑似 OOM 攻击',
  },
  {
    id: 'oom-while-true-push',
    severity: 'high',
    re: /while\s*\(\s*true\s*\)\s*\{[^}]{0,500}?\.push\s*\(/s,
    reason: 'while(true) 中 push，疑似 OOM 攻击',
  },
  {
    id: 'oom-while-array-push',
    severity: 'high',
    re: /while\s*\(\s*!!\s*\[\s*\]\s*\)\s*\{[^}]{0,500}?\.push\s*\(/s,
    reason: 'while(!![]) 中 push，疑似 OOM 攻击',
  },
  {
    id: 'oom-for-empty-push',
    severity: 'high',
    re: /for\s*\(\s*;\s*;\s*\)\s*\{[^}]{0,500}?\.push\s*\(/s,
    reason: 'for(;;) 中 push，疑似 OOM 攻击',
  },
  {
    id: 'oom-large-repeat-concat',
    severity: 'high',
    re: /['"][^'"]{100,}['"]\s*\.\s*repeat\s*\(\s*[1-9]\d{2,}\s*\)/,
    reason: '长字符串大数 repeat，疑似 OOM 攻击',
  },

  // ═══════════════════════════════════════════════════════
  // B. 防改名 / 防盗版自毁（high）
  // ═══════════════════════════════════════════════════════
  {
    id: 'anti-rename-check',
    severity: 'high',
    re: /currentScriptInfo\s*\.\s*(?:name|description)[\s\S]{0,300}?(?:md5|sha|hash)\s*\(/i,
    reason: '检测 name/description 并做哈希校验，疑似防改名保护',
  },
  {
    id: 'anti-rename-msg',
    severity: 'high',
    re: /illegal\s+name\s+change/i,
    reason: '包含防改名提示语',
  },
  {
    id: 'anti-rename-loop',
    severity: 'high',
    re: /(?:md5|sha1|sha256|hash)[\s\S]{0,500}?while\s*\(\s*true\s*\)/s,
    reason: '哈希校验后进入死循环，疑似自毁',
  },

  // ═══════════════════════════════════════════════════════
  // C. 宿主环境破坏（high）
  // ═══════════════════════════════════════════════════════
  {
    id: 'prototype-pollute',
    severity: 'high',
    re: /(?:Object|Array|Function|String|Number|Boolean)\.prototype\s*\.\s*[A-Za-z_$][\w$]*\s*=(?!=)/,
    reason: '修改内置原型，可能污染宿主环境',
  },
  {
    id: 'process-kill',
    severity: 'high',
    re: /process\s*\.\s*(?:exit|kill|abort)\s*\(/,
    reason: '调用 process 退出/杀进程，可能使宿主崩溃',
  },
  {
    id: 'overwrite-global-lx',
    severity: 'high',
    re: /globalThis\s*\.\s*lx\s*=(?!=)/,
    reason: '覆盖 globalThis.lx，可能替换宿主 API',
  },
  {
    id: 'overwrite-global-lx-bracket',
    severity: 'high',
    re: /globalThis\s*\[\s*['"]lx['"]\s*\]\s*=(?!=)/,
    reason: '通过下标覆盖 globalThis["lx"]，可能替换宿主 API',
  },

  // ═══════════════════════════════════════════════════════
  // D. 动态执行（medium，需组合判断）
  // ═══════════════════════════════════════════════════════
  {
    id: 'eval-atob',
    severity: 'medium',
    re: /eval\s*\(\s*(?:atob|decodeURIComponent)\s*\(/,
    reason: 'eval + atob 组合，疑似混淆执行',
  },
  {
    id: 'function-atob',
    severity: 'medium',
    re: /new\s+Function\s*\(\s*(?:atob|decodeURIComponent)\s*\(/,
    reason: 'new Function + atob 组合，疑似混淆执行',
  },
  {
    id: 'eval-base64',
    severity: 'medium',
    re: /eval\s*\(\s*[\w+/]{200,}={0,2}\s*\)/,
    reason: 'eval + 超长 base64，疑似混淆执行',
  },

  // ═══════════════════════════════════════════════════════
  // E. 文件系统 / 子进程访问（medium）
  // ═══════════════════════════════════════════════════════
  {
    id: 'require-dangerous-module',
    severity: 'medium',
    re: /require\s*\(\s*['"](?:child_process|fs|vm|os|net|dgram)['"]\s*\)/,
    reason: '引入文件系统/子进程/网络模块，音源不该使用',
  },

  // ═══════════════════════════════════════════════════════
  // F. 死循环（low，仅记录）
  // ═══════════════════════════════════════════════════════
  {
    id: 'bare-while-true',
    severity: 'low',
    re: /while\s*\(\s*true\s*\)\s*\{/,
    reason: '包含 while(true) 死循环',
  },
  {
    id: 'bare-for-empty',
    severity: 'low',
    re: /for\s*\(\s*;\s*;\s*\)\s*\{/,
    reason: '包含 for(;;) 死循环',
  },
]

function detectMalicious(script) {
  if (typeof script !== 'string' || !script) {
    return { malicious: false, severity: 'clean', matches: [] }
  }

  const matches = []
  let severity = 'clean'

  for (const rule of RULES) {
    try {
      if (rule.re.test(script)) {
        matches.push({ id: rule.id, severity: rule.severity, reason: rule.reason })
        if (rule.severity === 'high') {
          severity = 'high'
        } else if (rule.severity === 'medium' && severity !== 'high') {
          severity = 'medium'
        } else if (rule.severity === 'low' && severity === 'clean') {
          severity = 'low'
        }
      }
    } catch (_) {
      // 单个规则异常不影响其他规则
    }
  }

  return {
    malicious: severity === 'high' || severity === 'medium',
    severity,
    matches,
  }
}

module.exports = { detectMalicious }
