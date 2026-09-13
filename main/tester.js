const path = require('path')
const axios = require('axios')
const { loadApiSource } = require('./apiLoader')

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

// ==================== 音频格式解析 ====================

/**
 * 从 URL 拉取前 N 字节并检测实际音质
 */
async function fetchAndDetect(url, bytes = 16384, timeout = 8000) {
  const result = { accessible: false, quality: null, contentType: null, size: null }
  try {
    const res = await axios.get(url, {
      headers: { Range: `bytes=0-${bytes - 1}` },
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

/**
 * 解析 FLAC 的 STREAMINFO 元数据块
 */
function parseFlacStreamInfo(buf) {
  // fLaC (4) + METADATA_BLOCK_HEADER (4) + STREAMINFO (34)
  if (buf.length < 42) return null

  // STREAMINFO 从 byte 8 开始
  const si = 8
  // 跳过：min block size (2) + max block size (2) + min frame size (3) + max frame size (3) = 10 字节
  // sample rate 从 si + 10 = byte 18 开始
  const b18 = buf[si + 10]
  const b19 = buf[si + 11]
  const b20 = buf[si + 12]
  const b21 = buf[si + 13]

  // 20 bits sample rate
  const sampleRate = (b18 << 12) | (b19 << 4) | ((b20 >> 4) & 0x0f)
  // 3 bits channels - 1
  const channels = ((b20 >> 1) & 0x07) + 1
  // 5 bits bits-per-sample - 1
  const bitDepth = (((b20 & 0x01) << 4) | ((b21 >> 4) & 0x0f)) + 1

  if (sampleRate < 8000 || sampleRate > 768000) return null
  if (bitDepth < 8 || bitDepth > 32) return null

  return { sampleRate, channels, bitDepth }
}

/**
 * 根据 FLAC 的采样率和位深，映射到标准音质名称
 */
function mapFlacToQuality(sampleRate, bitDepth) {
  // 高采样率或高比特深度
  if (sampleRate >= 192000) return 'master'
  if (sampleRate >= 96000 || bitDepth >= 24) return 'hires'
  if (sampleRate >= 48000) return 'flac'
  return 'flac'  // 44.1kHz / 16bit
}

/**
 * 解析 MP3 帧头比特率
 */
function parseMp3Bitrate(buf) {
  const bitrateTableV1L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0]
  const bitrateTableV2L3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0]

  let offset = 0
  // 跳过 ID3v2 header
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
      const versionBits = (buf[i + 1] >> 3) & 0x03  // 00=MPEG2.5, 10=MPEG2, 11=MPEG1
      const layerBits = (buf[i + 1] >> 1) & 0x03    // 01=Layer3, 10=Layer2, 11=Layer1
      const bitrateIndex = (buf[i + 2] >> 4) & 0x0f

      if (layerBits !== 0x01) continue  // 只处理 Layer3

      const table = versionBits === 0x03 ? bitrateTableV1L3 : bitrateTableV2L3
      const bitrate = table[bitrateIndex]
      if (bitrate > 0) return bitrate
    }
  }
  return null
}

/**
 * MP3 比特率 → 音质名称
 */
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

/**
 * 判断是否降级：
 *   actual 音质 < requested 音质 → 降级
 *   actual 音质 >= requested 音质 → 通过
 */
function isDowngrade(requested, actual) {
  if (!actual) return false  // 无法判断，不算降级
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

  const loaded = loadApiSource(scriptPath)
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
      if (urlObtained) {
        const detected = await fetchAndDetect(url, 16384, options.verifyTimeout || 8000)
        urlAccessible = detected.accessible
        actualQuality = detected.quality
      }

      const downgrade = urlAccessible && isDowngrade(quality, actualQuality)

      qualities.push({
        quality,
        declared: true,
        urlObtained,
        urlAccessible,
        actualQuality,
        downgrade,
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
        actualQuality,
        downgrade,
      })

      await new Promise((res) => setTimeout(res, options.delay || 200))
    }

    // 统计
    const passed = qualities.filter((q) => q.urlAccessible && !q.downgrade)
    const downgraded = qualities.filter((q) => q.urlAccessible && q.downgrade)
    const failed = qualities.filter((q) => !q.urlAccessible)

    // 实际最高音质：在所有"可访问"的结果里，取 actualQuality 最高
    const accessibleQualities = qualities.filter((q) => q.urlAccessible)
    let bestQuality = null
    for (const q of accessibleQualities) {
      const candidate = q.actualQuality || q.quality
      if (!bestQuality || qualityIndex(candidate) < qualityIndex(bestQuality)) {
        bestQuality = candidate
      }
    }

    platforms.push({
      source: platform,
      name: declared.name || platform,
      available: accessibleQualities.length > 0,
      bestQuality,
      passedCount: passed.length,
      downgradedCount: downgraded.length,
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
      availableApis: results.filter((r) => r.platforms.some((p) => p.available)).length,
      totalQualities: allQ.length,
      availableQualities: allQ.filter((q) => q.urlAccessible).length,
      downgradedQualities: allQ.filter((q) => q.downgrade).length,
      totalPlatforms: results.reduce((s, r) => s + r.platforms.length, 0),
      availablePlatforms: results.reduce(
        (s, r) => s + r.platforms.filter((p) => p.available).length,
        0
      ),
    },
  }
}

module.exports = { testApiSource, fetchAndDetect, buildMusicInfo }
