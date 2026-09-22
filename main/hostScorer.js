/**
 * 影子测试（Shadow Test）
 *
 * 与 backendTester 的"隔离测试"不同，本模块不做任何请求过滤：
 *   - 在真实运行环境下跑音源，收集每次请求的完整生命周期（耗时、状态码）
 *   - 通过"贡献判定"识别出"最终成功路径上的关键 host"
 *   - 聚合为 hostScores，供合并生成阶段做运行时动态评分
 *
 * 输出结构：
 *   {
 *     _meta: { generatedAt, testSongCount, testFileCount },
 *     'host': { calls, rate, avgMs, avgOrder, contributionRate, contributions }
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
 * ⭐ 与 backendTester.runOnce 不同：不做 allowedHosts 过滤，全放行
 */
async function runOnceForShadow(scriptPath, song, platform, quality, timeout) {
  const loaded = await loadApiSource(scriptPath, {
    logRequests: true,
    initTimeout: 10000,
    scriptTimeout: 20000,
  })

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
 * 贡献判定（折中策略）
 *   - 严格：从后往前找第一条 status='ok' 且非媒体域名的请求
 *   - 宽松（严格失败时）：找 endTime 前 5 秒内所有 status='ok' 的请求
 *
 * 返回：贡献 host 列表
 */
const CONTRIBUTION_WINDOW_MS = 5000

function findContributors(run) {
  const { url, endTime, requestLog } = run
  if (!url || !requestLog || requestLog.length === 0) return []

  const end = endTime || Date.now()

  // 过滤媒体域名
  const relevant = requestLog.filter((e) => e.host && !isMediaHost(e.host))
  if (relevant.length === 0) return []

  // 严格：所有 ok 且 endTime 早于返回时间的请求，按时间倒序
  const okList = relevant
    .filter((e) => e.status === 'ok' && typeof e.endTime === 'number' && e.endTime <= end)
    .sort((a, b) => (b.endTime || 0) - (a.endTime || 0))

  if (okList.length === 0) {
    // 严格失败，降级宽松：找窗口内所有非 fail 的（含 http-error？一般不会）
    // 实际上没有 ok 的记录说明整条链都是 fail，贡献源无
    return []
  }

  // 折中：取时间窗口内所有 ok 的 host，去重
  const windowed = okList.filter((e) => (end - e.endTime) <= CONTRIBUTION_WINDOW_MS)
  const contributors = [...new Set(windowed.map((e) => e.host))]
  return contributors
}

/**
 * 主入口：运行影子测试
 *
 * @param {Array} files  [{ name, path }]
 * @param {Array} songs  [{ name, singer, interval, albumName, ids: {tx: {...}, ...} }]
 * @param {Object} options  { timeout, platforms }
 * @param {Function} onProgress
 * @returns {Object} hostScores
 */
async function runShadowTest(files, songs, options = {}, onProgress = () => {}) {
  const timeout = options.timeout || 15000
  const platforms = options.platforms || ['kw', 'kg', 'tx', 'wy', 'mg']

  // 统计累加器
  const scores = {}

  function ensureHost(host) {
    if (!scores[host]) {
      scores[host] = {
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
    return scores[host]
  }

  // 用于进度上报
  const totalRuns = files.length * platforms.length * songs.length
  let doneRuns = 0

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi]
    const scriptPath = file.path || file

    // 首次加载获取 sources 声明
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
      onProgress({
        type: 'shadow-file-error',
        file: file.name,
        error: firstError,
      })
      // 未跑音源的 platforms × songs 也计入进度
      doneRuns += platforms.length * songs.length
      onProgress({ type: 'shadow-progress', done: doneRuns, total: totalRuns })
      continue
    }

    const toTest = platforms.filter((p) => declaredSources[p])

    for (const platform of toTest) {
      const declared = declaredSources[platform]
      const qualitys = declared.qualitys || []
      // 用声明的最高音质（通常是列表首个）来跑，减少重复
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

        const run = await runOnceForShadow(scriptPath, song, platform, testQuality, timeout)

        // 累加每个 host 的调用统计
        if (run.requestLog && run.requestLog.length > 0) {
          for (const entry of run.requestLog) {
            if (!entry.host) continue
            if (isMediaHost(entry.host)) continue
            const h = ensureHost(entry.host)
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

        // 贡献判定
        if (run.url) {
          const contributors = findContributors(run)
          for (const host of contributors) {
            const h = ensureHost(host)
            h.contributions++
          }
        }

        doneRuns++
        onProgress({
          type: 'shadow-progress',
          done: doneRuns,
          total: totalRuns,
        })
      }
    }

    // 未参与的音源也要推进进度
    const skipped = platforms.length * songs.length - toTest.length * songs.length
    if (skipped > 0) {
      doneRuns += skipped
      onProgress({ type: 'shadow-progress', done: doneRuns, total: totalRuns })
    }
  }

  // 转换为 hostScores 结构
  const hostScores = {
    _meta: {
      generatedAt: Date.now(),
      testSongCount: songs.length,
      testFileCount: files.length,
    },
  }

  for (const [host, s] of Object.entries(scores)) {
    const calls = s.calls || 0
    const blocked = s.blocked || 0
    const effectiveCalls = calls - blocked

    // rate：成功率（排除 blocked，因为它们是被主动屏蔽的，不是真实失败）
    const rate = effectiveCalls > 0 ? (s.ok / effectiveCalls) : 0

    // avgMs：平均耗时（只统计有 duration 的）
    const avgMs = s.durationCount > 0 ? (s.totalMs / s.durationCount) : 0

    // avgOrder：平均第几次被调用
    const avgOrder = s.orderCount > 0 ? (s.orderSum / s.orderCount) : 0

    // contributionRate：贡献率（在成功路径上成为"最后一跳"的比例）
    const contributionRate = calls > 0 ? (s.contributions / calls) : 0

    hostScores[host] = {
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

  onProgress({
    type: 'shadow-done',
    hostCount: Object.keys(hostScores).length - 1, // 排除 _meta
  })

  return hostScores
}

module.exports = {
  runShadowTest,
  isMediaHost,
}
