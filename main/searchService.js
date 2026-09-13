const axios = require('axios')
const crypto = require('crypto')

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

// ============ QQ 音乐（zzcSign 签名 + 官方 Mobile 接口） ============
const QQ_PART_1_INDEXES = [23, 14, 6, 36, 16, 40, 7, 19]
const QQ_PART_2_INDEXES = [16, 1, 32, 12, 19, 27, 8, 5]
const QQ_SCRAMBLE_VALUES = [
  89, 39, 179, 150, 218, 82, 58, 252, 177, 52,
  186, 123, 120, 64, 242, 133, 143, 161, 121, 179,
]

function qqPickHashByIdx(hash, indexes) {
  return indexes.map((idx) => hash[idx]).join('')
}

function zzcSign(text) {
  const hash = crypto.createHash('sha1').update(text).digest('hex')
  const part1 = qqPickHashByIdx(hash, QQ_PART_1_INDEXES)
  const part2 = qqPickHashByIdx(hash, QQ_PART_2_INDEXES)
  const part3 = QQ_SCRAMBLE_VALUES.map(
    (value, i) => value ^ parseInt(hash.slice(i * 2, i * 2 + 2), 16)
  )
  const b64Part = Buffer.from(part3).toString('base64').replace(/[\\/+=]/g, '')
  return `zzc${part1}${b64Part}${part2}`.toLowerCase()
}

async function searchQQ(keyword, limit = 20) {
  try {
    const body = {
      comm: {
        ct: '11',
        cv: '14090508',
        v: '14090508',
        tmeAppID: 'qqmusic',
        phonetype: 'EBG-AN10',
        deviceScore: '553.47',
        devicelevel: '50',
        newdevicelevel: '20',
        rom: 'HuaWei/EMOTION/EmotionUI_14.2.0',
        os_ver: '12',
        OpenUDID: '0',
        OpenUDID2: '0',
        QIMEI36: '0',
        udid: '0',
        chid: '0',
        aid: '0',
        oaid: '0',
        taid: '0',
        tid: '0',
        wid: '0',
        uid: '0',
        sid: '0',
        modeSwitch: '6',
        teenMode: '0',
        ui_mode: '2',
        nettype: '1020',
        v4ip: '',
      },
      req: {
        module: 'music.search.SearchCgiService',
        method: 'DoSearchForQQMusicMobile',
        param: {
          search_type: 0,
          searchid: Math.random().toString().slice(2),
          query: keyword,
          page_num: 1,
          num_per_page: limit,
          highlight: 0,
          nqc_flag: 0,
          multi_zhida: 0,
          cat: 2,
          grp: 1,
          sin: 0,
          sem: 0,
        },
      },
    }

    const sign = zzcSign(JSON.stringify(body))
    const { data } = await axios.post(
      `https://u.y.qq.com/cgi-bin/musics.fcg?sign=${sign}`,
      body,
      {
        headers: {
          'User-Agent': 'QQMusic 14090508(android 12)',
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    )

    if (!data || data.code !== 0 || !data.req || data.req.code !== 0) {
      console.error(
        '[searchQQ] 接口返回异常:',
        data && data.code,
        data && data.req && data.req.code
      )
      return []
    }

    const songs =
      data.req.data && data.req.data.body && data.req.data.body.item_song
    if (!Array.isArray(songs)) {
      console.error('[searchQQ] item_song 不是数组:', typeof songs)
      return []
    }

    return songs
      .filter((s) => s && s.file && s.file.media_mid)
      .map((s) => ({
        source: 'tx',
        name: s.title,
        singer: (s.singer || []).map((x) => x.name).join('、'),
        albumName: s.album ? s.album.name : '',
        interval: formatInterval(s.interval),
        songmid: s.mid,
        songId: String(s.id),
        strMediaMid: s.file.media_mid,
        albumMid: s.album ? s.album.mid : '',
      }))
  } catch (e) {
    console.error('[searchQQ]', e.message)
    return []
  }
}

// ============ 网易云 ============
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

// ============ 酷我 ============
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
      try {
        body = JSON.parse(body)
      } catch (e) {
        return []
      }
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
        songmid: String(s.MUSICRID).replace('MUSIC_', ''),
        id: String(s.MUSICRID).replace('MUSIC_', ''),
        rid: String(s.MUSICRID).replace('MUSIC_', ''),
      }))
  } catch (e) {
    console.error('[searchKw]', e.message)
    return []
  }
}

// ============ 酷狗 ============
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

// ============ 咪咕（v3 接口 + 签名，对齐 LX Music） ============
function createMgSignature(time, text) {
  const deviceId = '963B7AA0D21511ED807EE5846EC87D20'
  const signatureMd5 = '6cdc72a439cef99a3418d2a78aa28c73'
  const prefix = 'yyapp2d16148780a1dcc7408e06336b98cfd50'
  const signStr = `${text}${signatureMd5}${prefix}${deviceId}${time}`
  const sign = crypto.createHash('md5').update(signStr).digest('hex')
  return { sign, deviceId }
}

async function searchMg(keyword, limit = 20) {
  try {
    const time = Date.now().toString()
    const { sign, deviceId } = createMgSignature(time, keyword)
    const searchSwitch = encodeURIComponent(
      JSON.stringify({
        song: 1,
        album: 0,
        singer: 0,
        tagSong: 1,
        mvSong: 0,
        bestShow: 1,
        songlist: 0,
        lyricSong: 0,
      })
    )
    const url =
      `https://jadeite.migu.cn/music_search/v3/search/searchAll` +
      `?isCorrect=0&isCopyright=1&searchSwitch=${searchSwitch}` +
      `&pageSize=${limit}&text=${encodeURIComponent(keyword)}` +
      `&pageNo=1&sort=0&sid=USS`

    const { data } = await axios.get(url, {
      headers: {
        uiVersion: 'A_music_3.6.1',
        deviceId,
        timestamp: time,
        sign,
        channel: '0146921',
        'User-Agent':
          'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30',
      },
      timeout: 10000,
    })

    if (!data || data.code !== '000000') {
      console.error('[searchMg] 接口返回异常：', data && data.code, data && data.info)
      return []
    }

    const resultData = data.songResultData || { resultList: [] }
    const rawList = resultData.resultList || []
    const list = []
    const seen = new Set()

    for (const group of rawList) {
      const items = Array.isArray(group) ? group : [group]
      for (const item of items) {
        if (!item.songId || !item.copyrightId) continue
        if (seen.has(item.copyrightId)) continue
        seen.add(item.copyrightId)

        const singers = item.singerList || []
        const singer = Array.isArray(singers)
          ? singers.map((x) => x.name).filter(Boolean).join('、')
          : ''

        list.push({
          source: 'mg',
          name: item.name || '',
          singer,
          albumName: item.album || '',
          interval: formatInterval(item.duration ? Math.floor(item.duration / 1000) : 0),
          songmid: item.songId,
          copyrightId: item.copyrightId,
          id: item.copyrightId,
        })
      }
    }

    console.log(`[searchMg] v3 接口返回 ${list.length} 条结果`)
    return list
  } catch (e) {
    console.error('[searchMg] v3 接口失败：', e.message)
    return []
  }
}

// ============ 匹配与排序工具 ============
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

// ============ 统一入口 ============
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
    counts: {
      tx: tx.length,
      wy: wy.length,
      kw: kw.length,
      kg: kg.length,
      mg: mg.length,
    },
  }
}

module.exports = { searchAllPlatforms }
