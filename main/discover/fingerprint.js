const crypto = require('crypto')

// 名称中的 emoji / 装饰符号（不含 CJK 区间）
const EMOJI_RE = /[\u2190-\u21FF\u2300-\u23FF\u2460-\u24FF\u25A0-\u25FF\u2600-\u27BF\u2B00-\u2BFF\u200D\u20E3\uFE0E\uFE0F\u{1F000}-\u{1FAFF}]+/gu

// 名称中的版本号
const NAME_VERSION_RE = /(?<![a-z0-9])v?\d+(?:\.\d+)*(?![a-z0-9])/gi

// 营销 / 版本后缀噪声词
const NAME_NOISE_TOKENS = [
  '特供版', '特供', '需自行配置', '自行配置', '无需配置', '自备配置', '需配置',
  '测试版', '测试', '试用版', '体验版', '预览版', 'beta', 'alpha', 'rc版', 'rc',
  '稳定版', '稳定', '正式版', '最新版', '最新', '修复版', '修复', '修正版', '修正',
  '内部版', '内部', '破解版', '绿色版', '纯净版', '无广告', '免广告', '去广告',
  '精简版', '完整版', '增强版', '加强版', '优化版', '修改版', '重制版', '重制',
  '自用版', '可用版', '免费版', '未加密', '解密版', '整合版', '聚合版', '纯净',
  '高音质', '高音质版',
]

function stripNameNoise(value) {
  let text = String(value || '')
  text = text.replace(EMOJI_RE, '')
  text = text.replace(NAME_VERSION_RE, '')
  let low = text.toLowerCase()
  for (const tok of NAME_NOISE_TOKENS) {
    if (tok && low.includes(tok)) {
      low = low.split(tok).join('')
    }
  }
  return low
}

function normalizeSourceName(value) {
  let text = stripNameNoise(value)
  text = text.replace(/[\s\u3000]+/g, '')
  text = text.replace(/[《》〈〉\[\]【】()（）{}<>"'`·、,，。.:：;；!！?？\-_—–~+/\\|@#$%^&*=×✕✖☆★♪♫]+/g, '')
  return text
}

function fileStem(p) {
  const base = String(p || '').split('/').pop() || ''
  const idx = base.lastIndexOf('.')
  return idx === -1 ? base : base.slice(0, idx)
}

function recordNameKey(record) {
  if (!record) return ''
  const key = normalizeSourceName(record.name)
  return key || normalizeSourceName(fileStem(record.path))
}

// 主体指纹：剔除注释与版本串后取 SHA-256
const BLOCK_COMMENT_RE = /\/\*[\s\S]*?\*\//g
const LINE_COMMENT_RE = /\/\/[^\r\n]*/g
const VERSION_FIELD_RE = /["']?version["']?\s*[:=]\s*["'][^"']*["']/gi
const VERSION_LITERAL_RE = /(?<![a-z0-9_$])v?\d+(?:\.\d+){1,3}(?![a-z0-9_$])/gi

function bodyFingerprint(text) {
  if (!text) return ''
  let body = String(text)
  body = body.replace(BLOCK_COMMENT_RE, '')
  body = body.replace(VERSION_FIELD_RE, '')
  body = body.replace(LINE_COMMENT_RE, '')
  body = body.replace(VERSION_LITERAL_RE, '')
  body = body.replace(/\s+/g, '')
  if (body.length < 40) return ''
  return crypto.createHash('sha256').update(body, 'utf8').digest('hex')
}

module.exports = { stripNameNoise, normalizeSourceName, recordNameKey, bodyFingerprint, fileStem }
