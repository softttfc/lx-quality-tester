const axios = require('axios')

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
}

function formatInterval(sec) {
  if (!sec || isNaN(sec)) return '00:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

async function searchQQ(keyword, limit = 20) {
  try {
    const { data } = await axios.get('https://c.y.qq.com/soso/fcgi-bin/client_search_cp', {
      params: { w: keyword, format: 'json', p: 1, n: limit, cr: 1, aggr: 1, lossless: 0, flag_qc: 0 },
      headers: { ...HEADERS, Referer: 'https://y.qq.com/' },
      timeout: 10000,
    })
    const list = (data && data.data && data.data.song && data.data.song.list) || []
    return list.map((s) => ({
      source: 'tx',
      name: s.songname,
      singer: (s.singer || []).map((x) => x.name).join('、'),
      albumName: s.albumname,
      interval: formatInterval(s.interval),
      songmid: s.songmid,
      songId: s.songid,
      strMediaMid: s.strMediaMid || s.media_mid,
      albumMid: s.albummid,
    }))
  } catch (e) {
    console.error('[searchQQ]', e.message)
    return []
  }
}

async function searchWy(keyword, limit = 20) {
  try {
    const { data } = await axios.post(
      'https://music.163.com/api/search/get/web',
      `s=${encodeURIComponent(keyword)}&type=1&limit=${limit}&offset=0`,
      {
        headers: {
          ...HEADERS,
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'https://music.163.com/',
          Cookie: 'appver=2.0.2',
        },
        timeout: 10000,
      }
    )
    const list = (data && data.result && data.result.songs) || []
    return list.map((s) => ({
      source: 'wy',
      name: s.name,
      singer: (s.artists || s.ar || []).map((x) => x.name).join('、'),
      albumName: (s.album && s.album.name) || (s.al && s.al.name) || '',
      interval: formatInterval(Math.floor((s.duration || s.dt || 0) / 1000)),
      songmid: String(s.id),
      id: String(s.id),
    }))
  } catch (e) {
    console.error('[searchWy]', e.message)
    return []
  }
}

async function searchKw(keyword, limit = 20) {
  try {
    const { data } = await axios.get('http://search.kuwo.cn/r.s', {
      params: {
        all: keyword,
        ft: 'music',
        itemset: 'web_2013',
        client: 'kt',
        pn: 0,
        rn: limit,
        rformat: 'json',
        encoding: 'utf8',
      },
      headers: { ...HEADERS, Referer: 'http://www.kuwo.cn/' },
      timeout: 10000,
    })
    let body = data
    if (typeof body === 'string') {
      body = body.replace(/'/g, '"')
      try { body = JSON.parse(body) } catch (e) { return [] }
    }
    const list = body.abslist || body.list || []
    return list
      .filter((s) => s.MUSICRID)
      .map((s) => ({
        source: 'kw',
        name: s.SONGNAME || s.NAME,
        singer: s.ARTIST || s.ARTISTNAME,
        albumName: s.ALBUM || '',
        interval: s.DURATION || '00:00',
        songmid: s.MUSICRID.replace('MUSIC_', ''),
        id: s.MUSICRID.replace('MUSIC_', ''),
        rid: s.MUSICRID.replace('MUSIC_', ''),
      }))
  } catch (e) {
    console.error('[searchKw]', e.message)
    return []
  }
}

async function searchKg(keyword, limit = 20) {
  try {
    const { data } = await axios.get('https://songsearch.kugou.com/song_search_v2', {
      params: {
        keyword,
        page: 1,
        pagesize: limit,
        platform: 'WebFilter',
        tag: 'em',
        filter: 2,
        iscorrection: 1,
      },
      headers: { ...HEADERS, Referer: 'https://www.kugou.com/' },
      timeout: 10000,
    })
    const list = (data && data.data && data.data.lists) || []
    return list.map((s) => ({
      source: 'kg',
      name: s.SongName,
      singer: s.SingerName,
      albumName: s.AlbumName,
      interval: formatInterval(s.Duration),
      hash: s.FileHash,
      songmid: s.FileHash,
      albumId: s.AlbumID,
      audioId: s.Audioid,
    }))
  } catch (e) {
    console.error('[searchKg]', e.message)
    return []
  }
}

async function searchMg(keyword, limit = 20) {
  try {
    const { data } = await axios.get('https://m.music.migu.cn/migu/remoting/scr_search_tag', {
      params: { keyword, type: 2, rows: limit, pgc: 1 },
      headers: { ...HEADERS, Referer: 'https://m.music.migu.cn/' },
      timeout: 10000,
    })
    const list = (data && data.musics) || []
    return list.map((s) => ({
      source: 'mg',
      name: s.songName,
      singer: s.singerName,
      albumName: s.albumName || '',
      interval: s.length ? formatInterval(Math.floor(s.length / 1000)) : '00:00',
      songmid: s.copyrightId,
      id: s.copyrightId,
      copyrightId: s.copyrightId,
    }))
  } catch (e) {
    console.error('[searchMg]', e.message)
    return []
  }
}

function normalize(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\s'.,，&"、()（）`~\-<>|[\]!！]/g, '')
}

function pickBest(results, songName, singer) {
  if (!results || !results.length) return null
  const fn = normalize(songName)
  const fs = normalize(singer)
  let best = null
  let bestScore = -1
  for (const r of results) {
    let score = 0
    const rn = normalize(r.name)
    const rs = normalize(r.singer)
    if (rn === fn) score += 100
    else if (rn.includes(fn) || fn.includes(rn)) score += 50
    if (fs) {
      if (rs === fs) score += 100
      else if (rs.includes(fs) || fs.includes(rs)) score += 30
    }
    if (score > bestScore) {
      bestScore = score
      best = r
    }
  }
  return best
}

async function searchAllPlatforms(songName, singer) {
  const keyword = `${songName} ${singer || ''}`.trim()
  const [tx, wy, kw, kg, mg] = await Promise.all([
    searchQQ(keyword),
    searchWy(keyword),
    searchKw(keyword),
    searchKg(keyword),
    searchMg(keyword),
  ])

  const result = {}
  const bestTx = pickBest(tx, songName, singer)
  const bestWy = pickBest(wy, songName, singer)
  const bestKw = pickBest(kw, songName, singer)
  const bestKg = pickBest(kg, songName, singer)
  const bestMg = pickBest(mg, songName, singer)

  if (bestTx) result.tx = bestTx
  if (bestWy) result.wy = bestWy
  if (bestKw) result.kw = bestKw
  if (bestKg) result.kg = bestKg
  if (bestMg) result.mg = bestMg

  return {
    matched: result,
    raw: { tx, wy, kw, kg, mg },
    counts: { tx: tx.length, wy: wy.length, kw: kw.length, kg: kg.length, mg: mg.length },
  }
}

module.exports = { searchAllPlatforms }
