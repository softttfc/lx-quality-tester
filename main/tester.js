const path = require('path')
const axios = require('axios')
const { spawn } = require('child_process')
const { loadApiSource } = require('./apiLoader')
const { asyncPool } = require('./concurrency')

const QUALITY_RANK = [
  'master',
  'atmos_plus',
  'atmos',
  'hires',
  'flac',
  'flac24bit',
  '320k',
  '192k',
  '128k',
]

// ==================== 播放器请求头模拟 ====================

const PLAYER_UA_DEFAULT =
  'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36'
const PLAYER_UA_WY = ''

function getPlayerUserAgent(source) {
  return source === 'wy' ? PLAYER_UA_WY : PLAYER_UA_DEFAULT
}

// ==================== 音频格式解析 ====================

/**
 * 从 URL 拉取前 N 字节并检测实际音质
 * ⭐ v2.2：使用 AbortController 真取消，避免 socket 半关闭堆积
 */
async function fetchAndDetect(url, source, bytes = 16384, timeout = 8000) {
  const result = { accessible: false, quality: null, contentType: null, size: null }

  const controller = new AbortController()
  const abortTimer = setTimeout(() => {
    try { controller.abort() } catch (_) {}
  }, timeout)

  try {
    const headers = {
      Range: `bytes=0-${bytes - 1}`,
      'User-Agent': getPlayerUserAgent(source),
    }
    const res = await axios.get(url, {
      headers,
      responseType: 'stream',
      signal: controller.signal,
      timeout,
      validateStatus: () => true,
      maxRedirects: 5,
    })

    if (res.status < 200 || res.status >= 400) {
      try {
        if (res.data && typeof res.data.destroy === 'function') res.data.destroy()
      } catch (_) {}
      return result
    }

    result.accessible = true
    result.contentType = res.headers['content-type'] || null
    const contentLength = res.headers['content-length']
    if (contentLength) result.size = parseInt(contentLength, 10)

    const buffer = await new Promise((resolve) => {
      const chunks = []
      let total = 0
      let resolved = false
      const finish = () => {
        if (resolved) return
        resolved = true
        // ⭐ 主动销毁流 + abort，避免服务器还在推数据
        try {
          if (res.data && typeof res.data.destroy === 'function') res.data.destroy()
        } catch (_) {}
        try { controller.abort() } catch (_) {}
        resolve(Buffer.concat(chunks))
      }
      res.data.on('data', (chunk) => {
        chunks.push(chunk)
        total += chunk.length
        if (total >= bytes) {
          finish()
        }
      })
      res.data.on('end', finish)
      res.data.on('error', finish)
      res.data.on('close', finish)
    })

    result.quality = detectQualityFromBuffer(buffer)
  } catch (e) {
    // abort 或网络错误，忽略
  } finally {
    clearTimeout(abortTimer)
  }
  return result
}

/**
 * 用 ffmpeg 解码前 3 秒，验证 URL 是否真的能播放
 * ⭐ v2.2：改用 spawn，超时后杀进程树，避免僵尸进程堆积
 */
function checkPlayableWithFfmpeg(url, source, timeout = 15000) {
  return new Promise((resolve) => {
    const args = ['-v', 'error', '-nostdin']
    if (source !== 'wy') {
      args.push('-user_agent', PLAYER_UA_DEFAULT)
    }
    args.push('-i', url, '-t', '3', '-f', 'null', '-')

    let child
    try {
      child = spawn('ffmpeg', args, {
        windowsHide: true,
        // Unix 下用独立进程组，方便整组 kill
        detached: process.platform !== 'win32',
      })
    } catch (e) {
      return resolve({ playable: false, error: 'ffmpeg spawn failed' })
    }

    let stderr = ''
    let settled = false
    let killTimer = null

    const settle = (v) => {
      if (settled) return
      settled = true
      if (killTimer) clearTimeout(killTimer)
      resolve(v)
    }

    killTimer = setTimeout(() => {
      try {
        if (process.platform === 'win32') {
          // Windows: 用 taskkill 杀整棵进程树
          try {
            spawn('taskkill', ['/F', '/T', '/PID', String(child.pid)], { windowsHide: true })
          } catch (_) {}
        } else {
          // Unix: 杀整个进程组
          try { process.kill(-child.pid, 'SIGKILL') }
          catch (_) { try { child.kill('SIGKILL') } catch (_) {} }
        }
      } catch (_) {}
      // 给 OS 一点时间回收
      setTimeout(() => settle({ playable: false, error: 'ffmpeg timeout' }), 300)
    }, timeout)

    child.stderr.on('data', (d) => {
      if (stderr.length < 2000) stderr += d.toString()
    })
    child.on('error', (e) => {
      settle({ playable: false, error: String(e.message || e) })
    })
    child.on('close', (code) => {
      if (code === 0) settle({ playable: true, error: null })
      else settle({ playable: false, error: stderr.slice(0, 300) || `exit ${code}` })
    })
  })
}

/**
 * 从 buffer 检测音频格式与音质
 */
function detectQualityFromBuffer(buf) {
  if (!buf || buf.length < 12) return null

  if (buf.slice(0, 4).toString('ascii') === 'fLaC') {
    const info = parseFlacStreamInfo(buf)
    if (info) {
      return mapFlacToQuality(info.sampleRate, info.bitDepth)
    }
    return 'flac'
  }

  if (buf.slice(0, 3).toString('ascii') === 'ID3') {
    const bitrate = parseMp3Bitrate(buf)
    return mapMp3ToQuality(bitrate)
  }

  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    const bitrate = parseMp3Bitrate(buf)
    return mapMp3ToQuality(bitrate)
  }

  if (buf.slice(4, 8).toString('ascii') === 'ftyp') {
    return '128k'
  }

  if (buf.slice(0, 4).toString('ascii') === 'OggS') {
    return 'flac'
  }

  if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
    return 'flac'
  }

  return null
}

function parseFlacStreamInfo(buf) {
  if (buf.length < 42) return null

  const si = 8
  const b18 = buf[si + 10]
  const b19 = buf[si + 11]
  const b20 = buf[si + 12]
  const b21 = buf[si + 13]

  const sampleRate = (b18 << 12) | (b19 << 4) | ((b20 >> 4) & 0x0f)
  const channels = ((b20 >> 1) & 0x07) + 1
  const bitDepth = (((b20 & 0x01) << 4) | ((b21 >> 4) & 0x0f)) + 1

  if (sampleRate < 8000 || sampleRate > 768000) return null
  if (bitDepth < 8 || bitDepth > 32) return null

  return { sampleRate, channels, bitDepth }
}

function mapFlacToQuality(sampleRate, bitDepth) {
  if (sampleRate >= 192000) return 'master'
  if (sampleRate >= 96000 || bitDepth >= 24) return 'hires'
  if (sampleRate >= 48000) return 'flac'
  return 'flac'
}

function parseMp3Bitrate(buf) {
  const bitrateTableV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  const bitrateTableV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]

  let offset = 0
  if (buf.slice(0, 3).toString('ascii') === 'ID3' && buf.length >= 10) {
    const size =
      ((buf[6] & 0x7f) << 21) |
      ((buf[7] & 0x7f) << 14) |
      ((buf[8] & 0x7f) << 7) |
      (buf[9] & 0x7f)
    offset = 10 + size
  }

  for (let i = offset; i < buf.length - 4; i++) {
    if (buf[i] === 0xff && (buf[i + 1] & 0xe0) === 0xe0) {
      const versionBits = (buf[i + 1] >> 3) & 0x03
      const layerBits = (buf[i + 1] >> 1) & 0x03
      const bitrateIndex = (buf[i + 2] >> 4) & 0x0f

      if (layerBits !== 0x01) continue

      const table = versionBits === 0x03 ? bitrateTableV1L3 : bitrateTableV2L3
      const bitrate = table[bitrateIndex]
      if (bitrate > 0) return bitrate
    }
  }
  return null
}

function mapMp3ToQuality(bitrate) {
  if (!bitrate) return null
  if (bitrate >= 320) return '320k'
  if (bitrate >= 192) return '192k'
  return '128k'
}

// ==================== 音质对比与降级判断 ====================

function qualityIndex(q) {
  const idx = QUALITY_RANK.indexOf(q)
  return idx === -1 ? 99 : idx
}

function isDowngrade(requested, actual) {
  if (!actual) return false
  return qualityIndex(actual) > qualityIndex(requested)
}

// ==================== 音源测试逻辑 ====================

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
      if (p.lrcUrl) info.lrcUrl = p.lrcUrl
      if (p.mrcUrl) info.mrcUrl = p.mrcUrl
      if (p.trcUrl) info.trcUrl = p.trcUrl
      break
  }

  return info
}

function requestMusicUrl(handlers, source, song, quality, timeout = 15000) {
  return new Promise((resolve) => {
    const handler = handlers.request
    if (!handler) return resolve({ error: '无 request 处理器' })

    let done = false
    const timer = setTimeout(() => {
      if (!done) {
        done = true
        resolve({ error: '超时' })
      }
    }, timeout)

    const info = { musicInfo: buildMusicInfo(song, source), type: quality }

    try {
      const r = handler({ source, action: 'musicUrl', info })
      if (r && typeof r.then === 'function') {
        r.then((url) => {
          if (!done) {
            done = true
            clearTimeout(timer)
            resolve({ url: typeof url === 'string' ? url : (url && url.url) || null })
          }
        }).catch((e) => {
          if (!done) {
            done = true
            clearTimeout(timer)
            resolve({ error: (e && e.message) || String(e) })
          }
        })
      } else {
        if (!done) {
          done = true
          clearTimeout(timer)
          resolve({ url: typeof r === 'string' ? r : (r && r.url) || null })
        }
      }
    } catch (e) {
      if (!done) {
        done = true
        clearTimeout(timer)
        resolve({ error: (e && e.message) || String(e) })
      }
    }
  })
}

async function testSingleFile(scriptPath, song, options, onProgress) {
  const fileName = path.basename(scriptPath)
  onProgress({ type: 'api-start', file: fileName })

  const loaded = await loadApiSource(scriptPath)

  // ⭐ 无论走到哪一步，finally 里都会释放沙箱定时器 + abort 请求 + 清理 scriptInfo
  try {
    if (loaded.error) {
      onProgress({ type: 'api-error', file: fileName, error: loaded.error })
      return { file: fileName, info: loaded.info || {}, error: loaded.error, platforms: [] }
    }

    const { handlers, initData, info: scriptInfo } = loaded
    const declaredSources = initData.sources || {}
    const toTest = options.platforms && options.platforms.length
      ? options.platforms.filter((p) => declaredSources[p])
      : Object.keys(declaredSources)

    const platforms = []
    for (const platform of toTest) {
      const declared = declaredSources[platform]
      if (!declared) continue

      onProgress({ type: 'platform-start', file: fileName, platform, name: declared.name })
      const qualities = []
      const qualitys = declared.qualitys || []

      const sortedQualities = [...qualitys].sort((a, b) => qualityIndex(a) - qualityIndex(b))

      for (const quality of sortedQualities) {
        onProgress({ type: 'quality-start', file: fileName, platform, quality })
        const t0 = Date.now()
        const r = await requestMusicUrl(handlers, platform, song, quality, options.timeout || 15000)
        const url = r.url
        const urlObtained = !!url

        let urlAccessible = false
        let actualQuality = null
        let playable = null
        let playableError = null

        if (urlObtained) {
          const detected = await fetchAndDetect(
            url,
            platform,
            16384,
            options.verifyTimeout || 8000
          )
          urlAccessible = detected.accessible
          actualQuality = detected.quality

          if (options.enableFfmpegCheck !== false && urlAccessible) {
            const ff = await checkPlayableWithFfmpeg(
              url,
              platform,
              options.ffmpegTimeout || 15000
            )
            playable = ff.playable
            playableError = ff.error
          }
        }

        const passes = urlAccessible && playable !== false && !isDowngrade(quality, actualQuality)
        const downgrade = urlAccessible && isDowngrade(quality, actualQuality)

        qualities.push({
          quality,
          declared: true,
          urlObtained,
          urlAccessible,
          playable,
          playableError,
          actualQuality,
          downgrade,
          passes,
          url: url || null,
          error: r.error || null,
          duration: Date.now() - t0,
        })

        onProgress({
          type: 'quality-done',
          file: fileName,
          platform,
          quality,
          urlObtained,
          urlAccessible,
          playable,
          actualQuality,
          downgrade,
        })

        await new Promise((res) => setTimeout(res, options.delay || 200))
      }

      const passed = qualities.filter((q) => q.passes)
      const downgraded = qualities.filter((q) => q.downgrade)
      const unplayable = qualities.filter(
        (q) => q.urlAccessible && q.playable === false
      )
      const failed = qualities.filter((q) => !q.urlAccessible)

      const usableQualities = qualities.filter(
        (q) => q.urlAccessible && q.playable !== false
      )
      let bestQuality = null
      for (const q of usableQualities) {
        const candidate = q.actualQuality || q.quality
        if (!bestQuality || qualityIndex(candidate) < qualityIndex(bestQuality)) {
          bestQuality = candidate
        }
      }

      platforms.push({
        source: platform,
        name: declared.name || platform,
        available: usableQualities.length > 0,
        bestQuality,
        passedCount: passed.length,
        downgradedCount: downgraded.length,
        unplayableCount: unplayable.length,
        failedCount: failed.length,
        qualities,
      })
    }

    return { file: fileName, info: scriptInfo, platforms, error: null }
  } finally {
    // ⭐ 释放沙箱定时器 + abort 请求 + 清空 rawScript
    if (typeof loaded.cleanup === 'function') {
      try { loaded.cleanup() } catch (_) {}
    }
    if (typeof loaded.clearScriptInfo === 'function') {
      try { loaded.clearScriptInfo() } catch (_) {}
    }
  }
}

/**
 * ⭐ v2.3：文件级并发
 *   - 每个文件独立沙箱，无共享状态，业务结果不变
 *   - 新增 `file-start` 事件：仅更新 UI 文本，不改进度条
 *   - `file-progress` 的 `current` 语义改为"已完成文件数"，进度条严格单调递增
 *   - 内存检查改为"每完成 10 个文件触发一次"
 */
async function testApiSource({ sourcesDir, files, song, options, onProgress }) {
  const opts = options || {}
  const MEM_WARN_RATIO = 0.85
  const concurrency = Math.max(1, Math.min(opts.concurrency || 3, 8))

  let doneCount = 0

  const results = await asyncPool(concurrency, files, async (f) => {
    // ⭐ 通知 UI：开始处理（只更新文本，不改进度条）
    onProgress({ type: 'file-start', file: f.name, total: files.length })

    let r
    try {
      const filePath = f.path || path.join(sourcesDir, f)
      r = await testSingleFile(filePath, song, opts, onProgress)
    } catch (err) {
      r = {
        file: f.name,
        error: (err && err.message) || String(err),
        platforms: [],
      }
    }

    // ⭐ 完成计数 + 上报（进度条在此更新）
    doneCount++
    onProgress({
      type: 'file-progress',
      current: doneCount,
      total: files.length,
      file: f.name,
    })

    // ⭐ 每完成 10 个文件检查一次内存
    if (doneCount % 10 === 0) {
      try {
        const mu = process.memoryUsage()
        const ratio = mu.heapUsed / Math.max(mu.heapTotal, 1)
        if (ratio > MEM_WARN_RATIO) {
          onProgress({
            type: 'memory-warning',
            heapUsed: mu.heapUsed,
            heapTotal: mu.heapTotal,
            ratio: +ratio.toFixed(3),
          })
          if (typeof global.gc === 'function') {
            try { global.gc() } catch (_) {}
          }
        }
      } catch (_) {}
    }

    return r
  })

  const allQ = results.flatMap((r) => r.platforms.flatMap((p) => p.qualities))
  return {
    song,
    timestamp: new Date().toISOString(),
    results,
    summary: {
      totalApis: results.length,
      availableApis: results.filter((r) =>
        r.platforms.some((p) => p.available)
      ).length,
      totalQualities: allQ.length,
      availableQualities: allQ.filter((q) => q.passes).length,
      downgradedQualities: allQ.filter((q) => q.downgrade).length,
      unplayableQualities: allQ.filter(
        (q) => q.urlAccessible && q.playable === false
      ).length,
      totalPlatforms: results.reduce((s, r) => s + r.platforms.length, 0),
      availablePlatforms: results.reduce(
        (s, r) => s + r.platforms.filter((p) => p.available).length,
        0
      ),
    },
  }
}

module.exports = { testApiSource, fetchAndDetect, buildMusicInfo }
