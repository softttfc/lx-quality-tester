const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const githubClient = require('./githubClient')
const { ensureDir } = require('./paths')

function sanitizeFilename(name) {
  const illegal = new Set(['<', '>', ':', '"', '/', '|', '?', '*', '\\'])
  let out = ''
  for (const ch of String(name || '')) {
    const code = ch.charCodeAt(0)
    if (illegal.has(ch) || code < 32) out += '_'
    else out += ch
  }
  out = out.replace(/^\.+|\.+$/g, '').trim()
  return out || 'source.js'
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex')
}

function uniqueName(stem, suffix, avoid) {
  let candidate = `${stem}${suffix}`
  let counter = 1
  while (avoid.has(candidate.toLowerCase())) {
    counter++
    candidate = `${stem}_${counter}${suffix}`
  }
  return candidate
}

async function downloadRecords(records, targetDir, options, onProgress, stopFlag) {
  const target = path.resolve(targetDir)
  ensureDir(target)

  const timeout = options.timeout || 8
  const forceFailed = options.forceFailed === true

  const preexisting = new Map()
  try {
    for (const name of fs.readdirSync(target)) {
      const full = path.join(target, name)
      try {
        if (fs.statSync(full).isFile()) preexisting.set(name.toLowerCase(), full)
      } catch (_) {}
    }
  } catch (_) {}

  const writtenNames = new Set()
  const seenHashes = new Map()

  let ok = 0, failed = 0, skipped = 0, duplicate = 0, conflict = 0, deadSkipped = 0
  const details = []
  const total = records.length
  let done = 0

  for (const record of records) {
    if (stopFlag && stopFlag.cancelled) break
    done++

    const label = (record.name || '').trim() || (record.path || '').split('/').pop() || 'source'
    let filename = label.toLowerCase().endsWith('.js') ? label : label + '.js'
    filename = sanitizeFilename(filename.slice(0, 80))
    const ext = path.extname(filename) || '.js'
    const stem = filename.slice(0, filename.length - ext.length)

    // 抓取失败项默认跳过，可强制下载
    if (record.status === '抓取失败' && !forceFailed) {
      deadSkipped++
      details.push({ name: label, file: filename, status: 'skipped-failed', note: '抓取失败，已跳过' })
      onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'skipped' })
      continue
    }

    // 下载内容
    let buf = null
    try {
      const url = record.used_url || record.raw_url
      const res = await githubClient.fetchScriptWithMirrors(url, timeout, 4)
      if (res.text) buf = Buffer.from(res.text, 'utf8')
    } catch (_) {}

    if (!buf) {
      failed++
      details.push({ name: label, file: filename, status: 'failed', note: '下载失败' })
      onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'failed' })
      continue
    }

    const digest = sha256(buf)

    // 本批次内同内容只落盘一次
    if (seenHashes.has(digest)) {
      duplicate++
      details.push({ name: label, file: filename, status: 'duplicate', note: `与 ${seenHashes.get(digest)} 内容相同` })
      onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'duplicate' })
      continue
    }

    const lower = filename.toLowerCase()
    if (preexisting.has(lower) && !writtenNames.has(lower)) {
      const existingPath = preexisting.get(lower)
      let existingBuf = null
      try { existingBuf = fs.readFileSync(existingPath) } catch (_) {}
      if (existingBuf && sha256(existingBuf) === digest) {
        skipped++
        seenHashes.set(digest, path.basename(existingPath))
        details.push({ name: label, file: path.basename(existingPath), status: 'skipped', note: '同名同内容，已跳过' })
        onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'skipped' })
        continue
      }
      conflict++
      const conflictName = uniqueName(stem + '_冲突', ext, new Set([...writtenNames, ...preexisting.keys()]))
      try {
        fs.writeFileSync(path.join(target, conflictName), buf)
        writtenNames.add(conflictName.toLowerCase())
        preexisting.set(conflictName.toLowerCase(), path.join(target, conflictName))
        seenHashes.set(digest, conflictName)
        details.push({ name: label, file: conflictName, status: 'conflict', note: `与 ${filename} 同名不同内容，已另存` })
        onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'conflict' })
      } catch (err) {
        failed++
        details.push({ name: label, file: conflictName, status: 'failed', note: `写入失败: ${err.message}` })
        onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'failed' })
      }
      continue
    }

    const finalName = uniqueName(stem, ext, new Set([...writtenNames, ...preexisting.keys()]))
    try {
      fs.writeFileSync(path.join(target, finalName), buf)
      writtenNames.add(finalName.toLowerCase())
      preexisting.set(finalName.toLowerCase(), path.join(target, finalName))
      seenHashes.set(digest, finalName)
      ok++
      details.push({ name: label, file: finalName, status: 'ok', note: '已保存' })
      record.downloaded = true
      record.downloaded_file = finalName
      onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'ok' })
    } catch (err) {
      failed++
      details.push({ name: label, file: finalName, status: 'failed', note: `写入失败: ${err.message}` })
      onProgress && onProgress({ type: 'download-progress', current: done, total, name: label, status: 'failed' })
    }
  }

  return {
    dir: target,
    ok, failed, skipped, duplicate, conflict,
    deadSkipped,
    total,
    details,
  }
}

module.exports = { downloadRecords, sanitizeFilename }
