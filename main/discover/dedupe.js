const { recordNameKey } = require('./fingerprint')

function normalizeVersion(v) {
  if (v == null) return []
  const m = String(v).match(/\d+/g)
  return m ? m.map((n) => parseInt(n, 10)) : []
}

function compareVersions(a, b) {
  const ta = normalizeVersion(a)
  const tb = normalizeVersion(b)
  if (!ta.length && !tb.length) return 0
  if (!ta.length) return -1
  if (!tb.length) return 1
  const len = Math.max(ta.length, tb.length)
  for (let i = 0; i < len; i++) {
    const x = ta[i] || 0
    const y = tb[i] || 0
    if (x > y) return 1
    if (x < y) return -1
  }
  return 0
}

// ⭐ 修改：优先选非恶意的版本
function pickBest(items) {
  // 优先从非恶意的里挑
  const safe = items.filter((x) => !x.malicious)
  const pool = safe.length > 0 ? safe : items

  let best = pool[0]
  for (let i = 1; i < pool.length; i++) {
    const item = pool[i]
    const cmp = compareVersions(item.version, best.version)
    if (cmp > 0) best = item
    else if (cmp === 0 && (item.size || 0) > (best.size || 0)) best = item
  }
  return best
}

function otherVersions(best, others) {
  const seen = new Set()
  const out = []
  const bv = String(best.version || '').trim()
  for (const item of others) {
    const v = String(item.version || '').trim()
    if (!v || v === bv || seen.has(v)) continue
    seen.add(v)
    out.push(v)
  }
  out.sort((a, b) => compareVersions(b, a))
  return out
}

function buildNote(record) {
  const parts = []
  const repos = record.merged_repos || []
  if (repos.length > 1) parts.push(`收录 ${repos.length} 仓`)
  const version = String(record.version || '').trim()
  if (version) parts.push(`保留版本 ${version}`)
  const versions = record.other_versions || []
  if (versions.length) {
    const shown = versions.slice(0, 4).join('、')
    const more = versions.length > 4 ? ` 等 ${versions.length} 个` : ''
    parts.push(`其他版本：${shown}${more}`)
  }
  return parts.join('；')
}

function mergeEntry(items) {
  const best = pickBest(items)
  const entry = { ...best }
  const others = items.filter((x) => x !== best)
  entry.duplicate_count = others.length
  entry.duplicate_repos = [...new Set(others.map((x) => x.repo))].filter(Boolean).sort()
  entry.merged_repos = [...new Set(items.map((x) => x.repo))].filter(Boolean).sort()
  entry.repo_count = entry.merged_repos.length
  entry.other_versions = otherVersions(entry, others)
  entry.merged_items = items.length
  // ⭐ 备注里追加是否有恶意版本
  const maliciousCount = items.filter((x) => x.malicious).length
  entry.malicious_versions = maliciousCount
  entry.note = buildNote(entry)
  if (maliciousCount > 0 && !entry.malicious) {
    entry.note = (entry.note ? entry.note + '；' : '') + `${maliciousCount} 个恶意版本已忽略`
  }
  return entry
}

function dedupeRecords(records) {
  if (!records || !records.length) return []
  const n = records.length
  const parent = Array.from({ length: n }, (_, i) => i)

  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]]
      i = parent[i]
    }
    return i
  }

  function union(a, b) {
    const ra = find(a), rb = find(b)
    if (ra === rb) return false
    parent[rb] = ra
    return true
  }

  const buckets = { name: new Map(), sha: new Map(), fp: new Map() }
  for (let i = 0; i < n; i++) {
    const r = records[i]
    const nameKey = recordNameKey(r)
    const sha = String(r.sha256 || '')
    const fp = String(r.body_fp || '')
    if (nameKey) {
      if (buckets.name.has(nameKey)) union(buckets.name.get(nameKey), i)
      else buckets.name.set(nameKey, i)
    }
    if (sha) {
      if (buckets.sha.has(sha)) union(buckets.sha.get(sha), i)
      else buckets.sha.set(sha, i)
    }
    if (fp) {
      if (buckets.fp.has(fp)) union(buckets.fp.get(fp), i)
      else buckets.fp.set(fp, i)
    }
  }

  const groups = new Map()
  const order = []
  for (let i = 0; i < n; i++) {
    const root = find(i)
    if (!groups.has(root)) {
      groups.set(root, [])
      order.push(root)
    }
    groups.get(root).push(records[i])
  }

  return order.map((root) => mergeEntry(groups.get(root)))
}

function annotateRecords(records) {
  if (!records || !records.length) return []
  const groups = new Map()
  for (const r of records) {
    const k = recordNameKey(r)
    if (!groups.has(k)) groups.set(k, [])
    groups.get(k).push(r)
  }
  for (const items of groups.values()) {
    for (const r of items) {
      const others = items.filter((x) => x !== r)
      r.duplicate_count = others.length
      r.duplicate_repos = [...new Set(others.map((x) => x.repo))].filter(Boolean).sort()
      r.merged_repos = [...new Set(items.map((x) => x.repo))].filter(Boolean).sort()
      r.repo_count = r.merged_repos.length
      r.other_versions = otherVersions(r, others)
      r.note = buildNote(r)
    }
  }
  return records
}

function dedupeSummary(original, merged) {
  const dupItems = merged.reduce((s, r) => s + (r.duplicate_count || 0), 0)
  const dupRows = merged.filter((r) => r.duplicate_count > 0).length
  const malCount = merged.filter((r) => r.malicious).length
  let summary = `去重后 ${merged.length} 条（原始 ${original.length} 条）：合并重复音源 ${dupItems} 项、涉及 ${dupRows} 条结果。`
  if (malCount > 0) {
    summary += ` ⚠️ 其中 ${malCount} 条被标记为可疑/恶意。`
  }
  return summary
}

module.exports = { dedupeRecords, annotateRecords, dedupeSummary, compareVersions }
