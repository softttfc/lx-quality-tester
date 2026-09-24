/**
 * 影子测试（Shadow Test）
 *
 * 两种模式：
 *   - 单轮模式（fullCoverage=false）：真实跑音源，只记录实际被调用的 host
 *   - 多轮模式（fullCoverage=true）：每轮把"成功返回 URL 的 host"加入临时黑名单，
 *     强制音源继续 fallback，直到没有新 host 成功，覆盖整条 fallback 链
 *
 * 输出结构：
 *   {
 *     _meta: { generatedAt, testSongCount, testFileCount, fullCoverage, rounds, roundSummaries },
 *     global: { 'host': { calls, rate, avgMs, avgOrder, contributionRate, contributions } },
 *     byFile: {
 *       'file.js': {
 *         byPlatform: {
 *           kw: { 'host': { calls, rate, ... } },
 *           ...
 *         }
 *       }
 *     }
 *   }
 */

const path = require('path')
const { loadApiSource } = require('./apiLoader')

// ═══════════════════════════════════════════════════════
// 媒体域名判断（与 backendTester 保持一致，独立复制一份避免耦合）
// ═══════════════════════════════════════════════════════
const MEDIA_HOST_PATTERNS = [
  /(^|\.)qqmusic\.qq\.com$/,
  /(^|\.)music\.163\.com$/,
  /(^|\.)kuwo\.cn$/,
  /(^|\.)kugou\.com$/,
  /(^|\.)migu\.cn$/,
  /(^|\.)jsdelivr\.net$/,
  /(^|\.)githubusercontent\.com$/,
  /(^|\.)github\.com$/,
  /(^|\.)lxmusic\.xn--fiqs8s$/,
]

const OFFICIAL_API_PATTERNS = [
  /^(mobi|nmobi|search|www|m)\.kuwo\.cn$/,
  /^(u|ut|c|y|i|music)\.y\.qq\.com$/,
  /^(u|ut|c|y|i|music)\.qq\.com$/,
  /^(interface|interface3|music)\.music\.163\.com$/,
  /^(interface|interface3|music)\.163\.com$/,
  /^(wwwapi|songsearch|m|www)\.kugou\.com$/,
  /^(app\.c\.nf|jadeite|music)\.migu\.cn$/,
]

function isMediaHost(host) {
  if (!host) return false
  if (OFFICIAL_API_PATTERNS.some((re) => re.test(host))) return false
  return MEDIA_HOST_PATTERNS.some((re) => re.test(host))
}

/**
 * 构建 musicInfo（与 backendTester / tester 保持一致）
 */
function buildMusicInfo(song, platform) {
  const p = (song.ids && song.ids[platform]) || {}
  const primaryId = p.songmid || p.hash || p.songId || p.rid || ''
  const info = {
    name: song.name || '',
    singer: song.singer || '',
    source: platform,
    interval: song.interval || null,
    albumName: song.albumName || '',
    img: '',
    typeUrl: {},
    types: [],
    _types: {},
  }
  if (primaryId) info.songmid = primaryId
  if (p.albumId) info.albumId = p.albumId
  switch (platform) {
    case 'kg':
      if (p.hash) info.hash = p.hash
      break
    case 'tx':
      if (p.strMediaMid) info.strMediaMid = p.strMediaMid
      if (p.albumMid) info.albumMid = p.albumMid
      if (p.songId) info.songId = p.songId
      break
    case 'mg':
      if (p.copyrightId) info.copyrightId = p.copyrightId
      break
  }
  return info
}

/**
 * 单次运行：加载音源 → 调 request → 等待 URL → 返回带 requestLog 的结果
 *
 * @param {Array<string>} blockedHosts 多轮影子测试的临时黑名单
 */
async function runOnceForShadow(scriptPath, song, platform, quality, timeout, blockedHosts) {
  const loadOptions = {
    logRequests: true,
    initTimeout: 10000,
    scriptTimeout: 20000,
  }
  if (Array.isArray(blockedHosts) && blockedHosts.length > 0) {
    loadOptions.requestFilter = { blockedHosts }
  }

  const loaded = await loadApiSource(scriptPath, loadOptions)

  try {
    if (loaded.error) {
      return { error: loaded.error, url: null, requestLog: [], endTime: null }
    }
    const { handlers, getRequestLog } = loaded
    if (!handlers.request) {
      return { error: '无 request 处理器', url: null, requestLog: [], endTime: null }
    }

    const r = await new Promise((resolve) => {
      let done = false
      const timer = setTimeout(() => {
        if (!done) { done = true; resolve({ error: '超时', url: null, endTime: Date.now() }) }
      }, timeout)
      try {
        const info = { musicInfo: buildMusicInfo(song, platform), type: quality }
        const ret = handlers.request({ source: platform, action: 'musicUrl', info })
        if (ret && typeof ret.then === 'function') {
          ret.then((u) => {
            if (!done) {
              done = true
              clearTimeout(timer)
              resolve({ url: typeof u === 'string' ? u : (u && u.url) || null, endTime: Date.now() })
            }
          }).catch((e) => {
            if (!done) { done = true; clearTimeout(timer); resolve({ error: (e && e.message) || String(e), url: null, endTime: Date.now() }) }
          })
        } else {
          if (!done) {
            done = true
            clearTimeout(timer)
            resolve({ url: typeof ret === 'string' ? ret : (ret && ret.url) || null, endTime: Date.now() })
          }
        }
      } catch (e) {
        if (!done) { done = true; clearTimeout(timer); resolve({ error: (e && e.message) || String(e), url: null, endTime: Date.now() }) }
      }
    })

    const requestLog = getRequestLog ? getRequestLog() : []
    return { ...r, requestLog }
  } finally {
    if (typeof loaded.cleanup === 'function') {
      try { loaded.cleanup() } catch (_) {}
    }
  }
}

/**
 * 贡献判定
 *   - 取最终返回 URL 前 5 秒内所有 status='ok' 的非媒体 host，去重
 */
const CONTRIBUTION_WINDOW_MS = 5000

function findContributors(run) {
  const { url, endTime, requestLog } = run
  if (!url || !requestLog || requestLog.length === 0) return []

  const end = endTime || Date.now()
  const relevant = requestLog.filter((e) => e.host && !isMediaHost(e.host))
  if (relevant.length === 0) return []

  const okList = relevant
    .filter((e) => e.status === 'ok' && typeof e.endTime === 'number' && e.endTime <= end)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))

  if (okList.length === 0) return []

  const windowed = okList.filter((e) => (end - e.endTime) <= CONTRIBUTION_WINDOW_MS)
  return [...new Set(windowed.map((e) => e.host))]
}

// ═══════════════════════════════════════════════════════
// 单轮统计辅助
// ═══════════════════════════════════════════════════════

function ensureRawHost(scope, host) {
  if (!scope[host]) {
    scope[host] = {
      host,
      calls: 0,
      ok: 0,
      fail: 0,
      blocked: 0,
      httpError: 0,
      totalMs: 0,
      durationCount: 0,
      contributions: 0,
      orderSum: 0,
      orderCount: 0,
    }
  }
  return scope[host]
}

function addRawStats(target, src) {
  target.calls += src.calls || 0
  target.ok += src.ok || 0
  target.fail += src.fail || 0
  target.blocked += src.blocked || 0
  target.httpError += src.httpError || 0
  target.totalMs += src.totalMs || 0
  target.durationCount += src.durationCount || 0
  target.contributions += src.contributions || 0
  target.orderSum += src.orderSum || 0
  target.orderCount += src.orderCount || 0
}

function mergeRawStats(aggregated, rawStats) {
  for (const [host, s] of Object.entries(rawStats.global || {})) {
    addRawStats(ensureRawHost(aggregated.global, host), s)
  }
  for (const [fileName, data] of Object.entries(rawStats.byFile || {})) {
    if (!aggregated.byFile[fileName]) aggregated.byFile[fileName] = { byPlatform: {} }
    for (const [platform, scope] of Object.entries(data.byPlatform || {})) {
      if (!aggregated.byFile[fileName].byPlatform[platform]) {
        aggregated.byFile[fileName].byPlatform[platform] = {}
      }
      const target = aggregated.byFile[fileName].byPlatform[platform]
      for (const [host, s] of Object.entries(scope)) {
        addRawStats(ensureRawHost(target, host), s)
      }
    }
  }
}

function finalizeScope(scope) {
  const out = {}
  for (const [host, s] of Object.entries(scope)) {
    const calls = s.calls || 0
    const blocked = s.blocked || 0
    const effectiveCalls = calls - blocked

    const rate = effectiveCalls > 0 ? (s.ok / effectiveCalls) : 0
    const avgMs = s.durationCount > 0 ? (s.totalMs / s.durationCount) : 0
    const avgOrder = s.orderCount > 0 ? (s.orderSum / s.orderCount) : 0
    const contributionRate = calls > 0 ? (s.contributions / calls) : 0

    out[host] = {
      calls,
      ok: s.ok,
      fail: s.fail,
      blocked,
      httpError: s.httpError,
      contributions: s.contributions,
      rate: +rate.toFixed(4),
      avgMs: Math.round(avgMs),
      avgOrder: +avgOrder.toFixed(2),
      contributionRate: +contributionRate.toFixed(4),
    }
  }
  return out
}

function finalizeRawStats(rawStats, songCount, fileCount, roundSummaries) {
  const hostScores = {
    _meta: {
      generatedAt: Date.now(),
      testSongCount: songCount,
      testFileCount: fileCount,
      fullCoverage: roundSummaries.length > 0,
      rounds: roundSummaries.length,
      roundSummaries,
    },
    global: finalizeScope(rawStats.global),
    byFile: {},
  }
  for (const [fileName, data] of Object.entries(rawStats.byFile)) {
    hostScores.byFile[fileName] = { byPlatform: {} }
    for (const [platform, scope] of Object.entries(data.byPlatform)) {
      hostScores.byFile[fileName].byPlatform[platform] = finalizeScope(scope)
    }
  }
  return hostScores
}

// ═══════════════════════════════════════════════════════
// 单轮影子测试
// ═══════════════════════════════════════════════════════

/**
 * @param {Set<string>} blockedHosts 本轮生效的临时黑名单
 * @returns {{ rawStats: { global, byFile }, newSuccessHosts: string[] }}
 */
async function runShadowTestSingleRound(files, songs, options, onProgress, blockedHosts) {
  const timeout = options.timeout || 15000
  const platforms = options.platforms || ['kw', 'kg', 'tx', 'wy', 'mg']
  const blockedArr = blockedHosts instanceof Set ? [...blockedHosts] : (blockedHosts || [])

  const rawStats = { global: {}, byFile: {} }
  const newSuccessHosts = new Set()

  function ensureFilePlatform(fileName, platform) {
    if (!rawStats.byFile[fileName]) rawStats.byFile[fileName] = { byPlatform: {} }
    if (!rawStats.byFile[fileName].byPlatform[platform]) {
      rawStats.byFile[fileName].byPlatform[platform] = {}
    }
    return rawStats.byFile[fileName].byPlatform[platform]
  }

  const totalRuns = files.length * platforms.length * songs.length
  let doneRuns = 0

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi]
    const scriptPath = file.path || file

    const first = await loadApiSource(scriptPath, { logRequests: false })
    let declaredSources = {}
    let firstError = null
    try {
      if (first.error) firstError = first.error
      else declaredSources = (first.initData && first.initData.sources) || {}
    } finally {
      if (typeof first.cleanup === 'function') {
        try { first.cleanup() } catch (_) {}
      }
    }

    if (firstError) {
      onProgress({ type: 'shadow-file-error', file: file.name, error: firstError })
      doneRuns += platforms.length * songs.length
      onProgress({ type: 'shadow-progress', done: doneRuns, total: totalRuns })
      continue
    }

    const toTest = platforms.filter((p) => declaredSources[p])

    for (const platform of toTest) {
      const declared = declaredSources[platform]
      const qualitys = declared.qualitys || []
      const testQuality = qualitys[0] || '320k'

      for (let si = 0; si < songs.length; si++) {
        const song = songs[si]
        onProgress({
          type: 'shadow-run',
          file: file.name,
          platform,
          song: song.name,
          current: si + 1,
          songTotal: songs.length,
          done: doneRuns,
          total: totalRuns,
        })

        const run = await runOnceForShadow(scriptPath, song, platform, testQuality, timeout, blockedArr)

        if (run.requestLog && run.requestLog.length > 0) {
          const platformScope = ensureFilePlatform(file.name, platform)
          for (const entry of run.requestLog) {
            if (!entry.host) continue
            if (isMediaHost(entry.host)) continue

            const g = ensureRawHost(rawStats.global, entry.host)
            const f = ensureRawHost(platformScope, entry.host)

            for (const h of [g, f]) {
              h.calls++
              if (entry.status === 'ok') h.ok++
              else if (entry.status === 'fail') h.fail++
              else if (entry.status === 'blocked') h.blocked++
              else if (entry.status === 'http-error') h.httpError++
              if (typeof entry.duration === 'number' && entry.duration > 0) {
                h.totalMs += entry.duration
                h.durationCount++
              }
              if (typeof entry.sequence === 'number' && entry.sequence > 0) {
                h.orderSum += entry.sequence
                h.orderCount++
              }
            }
          }
        }

        if (run.url) {
          const contributors = findContributors(run)
          const platformScope = ensureFilePlatform(file.name, platform)
          for (const host of contributors) {
            const g = ensureRawHost(rawStats.global, host)
            const f = ensureRawHost(platformScope, host)
            g.contributions++
            f.contributions++
            // 只把"本轮未被黑名单拦截"的 host 记为成功
            if (!blockedHosts.has(host)) {
              newSuccessHosts.add(host)
            }
          }
        }

        doneRuns++
        onProgress({ type: 'shadow-progress', done: doneRuns, total: totalRuns })
      }
    }

    const skipped = platforms.length * songs.length - toTest.length * songs.length
    if (skipped > 0) {
      doneRuns += skipped
      onProgress({ type: 'shadow-progress', done: doneRuns, total: totalRuns })
    }
  }

  return { rawStats, newSuccessHosts: [...newSuccessHosts] }
}

// ═══════════════════════════════════════════════════════
// 主入口
// ═══════════════════════════════════════════════════════

/**
 * @param {Array} files  [{ name, path }]
 * @param {Array} songs  [{ name, singer, interval, albumName, ids: {tx: {...}, ...} }]
 * @param {Object} options  { timeout, platforms, fullCoverage, maxRounds }
 * @param {Function} onProgress
 * @returns {Object} hostScores
 */
async function runShadowTest(files, songs, options = {}, onProgress = () => {}) {
  const fullCoverage = options.fullCoverage === true
  const maxRounds = Math.max(1, Math.min(options.maxRounds || 10, 30))

  // ─── 单轮模式 ───
  if (!fullCoverage) {
    const single = await runShadowTestSingleRound(files, songs, options, onProgress, new Set())
    const hostScores = finalizeRawStats(single.rawStats, songs.length, files.length, [])
    onProgress({ type: 'shadow-done', hostCount: Object.keys(hostScores.global).length })
    return hostScores
  }

  // ─── 多轮模式：每轮把成功 host 加入临时黑名单，强制 fallback ───
  const blockedHosts = new Set()
  const successfulHosts = new Set()
  const aggregated = { global: {}, byFile: {} }
  const roundSummaries = []

  for (let round = 0; round < maxRounds; round++) {
    onProgress({
      type: 'shadow-round-start',
      round: round + 1,
      maxRounds,
      blockedCount: blockedHosts.size,
      blockedHosts: [...blockedHosts],
    })

    const roundResult = await runShadowTestSingleRound(
      files,
      songs,
      { ...options, blockedHosts: [...blockedHosts] },
      onProgress,
      blockedHosts,
    )

    mergeRawStats(aggregated, roundResult.rawStats)

    const newlySucceeded = roundResult.newSuccessHosts.filter((h) => !successfulHosts.has(h))
    for (const h of newlySucceeded) {
      successfulHosts.add(h)
      blockedHosts.add(h)
    }

    roundSummaries.push({
      round: round + 1,
      newlySucceeded,
      totalSuccess: successfulHosts.size,
    })

    onProgress({
      type: 'shadow-round-done',
      round: round + 1,
      newlySucceeded,
      totalSuccess: successfulHosts.size,
      totalBlocked: blockedHosts.size,
    })

    // 没有新 host 成功 → 覆盖完毕
    if (newlySucceeded.length === 0) break
  }

  const hostScores = finalizeRawStats(aggregated, songs.length, files.length, roundSummaries)
  onProgress({ type: 'shadow-done', hostCount: Object.keys(hostScores.global).length })
  return hostScores
}

module.exports = {
  runShadowTest,
  isMediaHost,
}
