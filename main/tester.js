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

async function verifyUrl(url, timeout = 8000) {
  if (!url || typeof url !== 'string') return false
  try {
    const r = await axios.head(url, { timeout, validateStatus: () => true, maxRedirects: 5 })
    if (r.status >= 200 && r.status < 400) return true
  } catch (e) {}
  try {
    const r = await axios.get(url, {
      timeout,
      headers: { Range: 'bytes=0-1023' },
      validateStatus: () => true,
      maxRedirects: 5,
      responseType: 'arraybuffer',
    })
    return r.status >= 200 && r.status < 400
  } catch (e) {
    return false
  }
}

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

    const sortedQualities = [...qualitys].sort((a, b) => {
      const ia = QUALITY_RANK.indexOf(a)
      const ib = QUALITY_RANK.indexOf(b)
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
    })

    for (const quality of sortedQualities) {
      onProgress({ type: 'quality-start', file: fileName, platform, quality })
      const t0 = Date.now()
      const r = await requestMusicUrl(handlers, platform, song, quality, options.timeout || 15000)
      const url = r.url
      const urlObtained = !!url
      const urlAccessible = urlObtained && options.verifyUrl !== false
        ? await verifyUrl(url, options.verifyTimeout || 8000)
        : urlObtained

      qualities.push({
        quality,
        declared: true,
        urlObtained,
        urlAccessible,
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
      })

      await new Promise((res) => setTimeout(res, options.delay || 200))
    }

    const passed = qualities.filter((q) => q.urlAccessible)
    const bestQuality = QUALITY_RANK.find((r) =>
      passed.some((q) => q.quality === r)
    ) || null

    platforms.push({
      source: platform,
      name: declared.name || platform,
      available: passed.length > 0,
      bestQuality,
      passedCount: passed.length,
      failedCount: qualities.length - passed.length,
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
      totalPlatforms: results.reduce((s, r) => s + r.platforms.length, 0),
      availablePlatforms: results.reduce(
        (s, r) => s + r.platforms.filter((p) => p.available).length,
        0
      ),
    },
  }
}

module.exports = { testApiSource, verifyUrl, buildMusicInfo }
