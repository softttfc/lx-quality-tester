/**
 * 统一受保护域名/后缀配置
 *
 * 用途：
 *   - merger/generator.js 黑名单过滤（filterProtectedHosts / filterProtectedHostsByFilePlatform）
 *   - 生成文件的运行时评分/黑名单拦截（__isProtectedHost__）
 *
 * 规则：
 *   - PROTECTED_SUFFIXES：后缀匹配，host === suffix 或 host.endsWith('.' + suffix)
 *   - PROTECTED_REGEXPS：正则匹配，用于后缀无法表达的复杂规则（当前为空）
 *
 * 维护建议：
 *   - 优先用后缀表达；确实需要通配或复杂规则时才加正则
 *   - 正则保持简单，避免复杂量词导致 ReDoS
 */

const PROTECTED_SUFFIXES = [
  // QQ 音乐
  'y.qq.com',
  'qqmusic.qq.com',
  'stream.qqmusic.qq.com',
  // 网易云
  'music.163.com',
  'music.126.net',
  // 酷狗
  'kugou.com',
  // 酷我
  'kuwo.cn',
  // 咪咕
  'migu.cn',
  'c.nf',
  // 其他官方/受保护
  'gdstudio.xyz',
  'lxmusic.xn--fiqs8s',
]

const PROTECTED_REGEXPS = []

function normalizeHost(host) {
  if (!host) return ''
  let h = String(host).toLowerCase()
  // 去掉端口
  const idx = h.indexOf(':')
  if (idx !== -1) h = h.slice(0, idx)
  return h
}

function isProtectedHost(host) {
  const h = normalizeHost(host)
  if (!h) return false
  for (const s of PROTECTED_SUFFIXES) {
    if (h === s || h.endsWith('.' + s)) return true
  }
  for (const re of PROTECTED_REGEXPS) {
    if (re.test(h)) return true
  }
  return false
}

module.exports = {
  PROTECTED_SUFFIXES,
  PROTECTED_REGEXPS,
  isProtectedHost,
  normalizeHost,
}
