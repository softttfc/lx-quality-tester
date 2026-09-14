const path = require('path')
const axios = require('axios')
const { execFile } = require('child_process')
const { promisify } = require('util')
const { loadApiSource } = require('./apiLoader')

const execFileAsync = promisify(execFile)

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

// 模拟 LX Music 播放器发起的请求头：
// - wy 平台 CDN 需要空 UA（参考 download.ts 的 WY_MEDIA_HEADERS）
// - 其他平台需要标准移动端 UA
const PLAYER_UA_DEFAULT =
  'Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/107.0.0.0 Mobile Safari/537.36'
const PLAYER_UA_WY = ''

function getPlayerUserAgent(source) {
  return source === 'wy' ? PLAYER_UA_WY : PLAYER_UA_DEFAULT
}

// ==================== 音频格式解析 ====================

/**
 * 从 URL 拉取前 N 字节并检测实际音质
 * @param {string} url
 * @param {string} source - 'kw' | 'kg' | 'tx' | 'wy' | 'mg'
 * @param {number} bytes
 * @param {number} timeout
 */
async function fetchAndDetect(url, source, bytes = 16384, timeout = 8000) {
  const result = { accessible: false, quality: null, contentType: null, size: null }
  try {
    const headers = {
      Range: `bytes=0-${bytes - 1}`,
      'User-Agent': getPlayerUserAgent(source),
    }
    const res = await axios.get(url, {
      headers,
      responseType: 'stream',
      timeout,
      validateStatus: () => true,
      maxRedirects: 5,
    })

    if (res.status < 200 || res.status >= 400) return result

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
        resolve(Buffer.concat(chunks))
      }
      res.data.on('data', (chunk) => {
        chunks.push(chunk)
        total += chunk.length
        if (total >= bytes) {
          res.data.destroy()
          finish()
        }
      })
      res.data.on('end', finish)
      res.data.on('error', finish)
      res.data.on('close', finish)
    })

    result.quality = detectQualityFromBuffer(buffer)
  } catch (e) {
    // 忽略错误
  }
  return result
}

/**
 * 用 ffmpeg 解码前 3 秒，验证 URL 是否真的能播放
 * 更接近 LX Music 播放器行为（完整建立连接 + 解码）
 */
async function checkPlayableWithFfmpeg(url, source, timeout = 15000) {
  const args = ['-v', 'error', '-nostdin']

  // 非 wy 平台传标准 UA；wy 平台不传（让 ffmpeg 用默认 UA）
  if (source !== 'wy') {
    args.push('-user_agent', PLAYER_UA_DEFAULT)
  }

  args.push('-i', url, '-t', '3', '-f', 'null', '-')

  try {
    await execFileAsync('ffmpeg', args, {
      timeout,
      maxBuffer: 1024 * 1024,
    })
    return { playable: true, error: null }
  } catch (e) {
    const errMsg =
      e && (e.stderr || e.message)
        ? String(e.stderr || e.message).slice(0, 300)
        : 'ffmpeg failed'
    return { playable: false, error: errMsg }
  }
}

/**
 * 从 buffer 检测音频格式与音质
 */
function detectQualityFromBuffer(buf) {
  if (!buf || buf.length < 12) return null

  // ---- FLAC ----
  if (buf.slice(0, 4).toString('ascii') === 'fLaC') {
    const info = parseFlacStreamInfo(buf)
    if (info) {
      return mapFlacToQuality(info.sampleRate, info.bitDepth)
    }
    return 'flac'
  }

  // ---- MP3 (ID3v2 header) ----
  if (buf.slice(0, 3).toString('ascii') === 'ID3') {
    const bitrate = parseMp3Bitrate(buf)
    return mapMp3ToQuality(bitrate)
  }

  // ---- MP3 (frame sync) ----
  if (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0) {
    const bitrate = parseMp3Bitrate(buf)
    return mapMp3ToQuality(bitrate)
  }

  // ---- M4A / AAC ----
  if (buf.slice(4, 8).toString('ascii') === 'ftyp') {
    return '128k'  // 简化：M4A 通常是 AAC，按 128k 处理
  }

  // ---- OGG ----
  if (buf.slice(0, 4).toString('ascii') === 'OggS') {
    return 'flac'  // OGG 通常是 Vorbis/Opus，暂按 flac 处理
  }

  // ---- WAV ----
  if (buf.slice(0, 4).toString('ascii') === 'RIFF') {
    return 'flac'  // WAV 通常是无损
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
  const fallbackId = p.id || p.songmid || p.songId || p.hash || p.rid || ''
  return {
    id: fallbackId,
    songmid: p.songmid || fallbackId,
    songId: p.songId || '',
    hash: p.hash || '',
    rid: p.rid || '',
    mid: p.songmid || '',
    strMediaMid: p.strMediaMid || '',
    albumMid: p.albumMid || '',
    albumId: p.albumId || '',
    copyrightId: p.copyrightId || '',
    mediaId: p.strMediaMid || '',
    name: song.name || '',
    singer: song.singer || '',
    albumName: song.albumName || '',
    interval: song.interval || '04:30',
    meta: {},
  }
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
        // 1. 拉前 16KB 探测文件头（模拟播放器请求头）
        const detected = await fetchAndDetect(
          url,
          platform,
          16384,
          options.verifyTimeout || 8000
        )
        urlAccessible = detected.accessible
        actualQuality = detected.quality

        // 2. ffmpeg 验证能否实际解码（默认开启）
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

      // ⭐ 只有"可访问 + 可播放 + 不降级"才算通过
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

    // 统计
    const passed = qualities.filter((q) => q.passes)
    const downgraded = qualities.filter((q) => q.downgrade)
    const unplayable = qualities.filter(
      (q) => q.urlAccessible && q.playable === false
    )
    const failed = qualities.filter((q) => !q.urlAccessible)

    // 实际最高音质：只从"可访问 + 可播放"的里取
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
}

async function testApiSource({ sourcesDir, files, song, options, onProgress }) {
  const results = []
  const opts = options || {}
  for (let i = 0; i < files.length; i++) {
    const f = files[i]
    onProgress({ type: 'file-progress', current: i + 1, total: files.length, file: f.name })
    try {
      const filePath = f.path || path.join(sourcesDir, f)
      const r = await testSingleFile(filePath, song, opts, onProgress)
      results.push(r)
    } catch (err) {
      results.push({
        file: f.name,
        error: (err && err.message) || String(err),
        platforms: [],
      })
    }
  }

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
