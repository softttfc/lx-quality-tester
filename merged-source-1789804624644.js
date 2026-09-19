/*!
 * @name 合并音源
 * @description 由以下音源合并生成（平台优先级已按上次测试结果排序）：
 *   [1] (推荐)裤佬SVIP音源（酷狗挂了）.js (未使用)
 *   [2] Ciallo~.js [wy] (裁剪: -1 节点) { wy: 320k/2 }
 *   [3] fish-music音源.js (未使用)
 *   [4] FreeListen-需自备网易云VIP密钥.js [wy] (裁剪: -4 节点) { wy: 128k/1 }
 *   [5] gdstudio音乐源 v1.0.1（仅支持网易）.js [kg, wy, mg] (裁剪: -0 节点) { kg: 320k/2, wy: 320k/2, mg: 320k/2 }
 *   [6] Hei Music1.3.1 (1).js (未使用)
 *   [7] HUIBQ音源.js (未使用)
 *   [8] HYWmusic_beta_公益测试.js [kw, kg, tx, wy] (裁剪: -0 节点) { kw: flac/1, kg: flac/3, tx: hires/2, wy: 128k/1 }
 *   [9] KE-DES.js (未使用)
 *   [10] K×H测试 v1.7.17.js (未使用)
 *   [11] stellarwave-v3.2.0.js (未使用)
 *   [12] xinghai-music-sourcev2.3.7.js [wy] (裁剪: -8 节点) { wy: 320k/2 }
 *   [13] yibai酷我流式V4.js (未使用)
 *   [14] 全豆要-聚合音源 v9.7 97特供版 DeepSeek优化并修复版本.js [kw, kg, tx, wy, mg] (裁剪: -0 节点) { kw: 128k/1, kg: 无/0, tx: 无/0, wy: 无/0, mg: 无/0 }
 *   [15] 墨澜聚合音源 v2.0.0.js [kw, kg, wy, mg] (裁剪: -2 节点) { kw: 128k/1, kg: 320k/2, wy: 320k/2, mg: flac/3 }
 *   [16] 墨澜音乐源v2.3.0.js [kw, kg, wy, mg] (裁剪: -2 节点) { kw: 128k/1, kg: hires/4, wy: 320k/2, mg: flac/3 }
 *   [17] 幻音音源 v3.js (未使用)
 *   [18] 忆音音源_v1.js [wy] (裁剪: -1 节点) { wy: 320k/1 }
 *   [19] 惜缘 v1.js (未使用)
 *   [20] 收集の聚合接口.js [wy] (裁剪: -2 节点) { wy: 320k/2 }
 *   [21] 星海音源V2.3.5.js [wy] (裁剪: -2 节点) { wy: 320k/2 }
 *   [22] 星澜.js [kw, kg, wy, mg] (裁剪: -2 节点) { kw: 128k/1, kg: hires/4, wy: 320k/2, mg: flac/3 }
 *   [23] 春日影-单平台128k.js (未使用)
 *   [24] 溯音音源_v1.js [kw, wy] (裁剪: -3 节点) { kw: flac/2, wy: 128k/1 }
 *   [25] 独家音源V5.js (未使用)
 *   [26] 稳定版音源 v1.0.3.js [tx] (裁剪: -0 节点) { tx: 128k/1 }
 *   [27] 统一音乐源.js [wy] (裁剪: -0 节点) { wy: 320k/2 }
 *   [28] 聚合API.js [kw, tx] (裁剪: -0 节点) { kw: 128k/1, tx: 128k/1 }
 *   [29] 西瓜聚合.js [kw, tx, wy] (裁剪: -0 节点) { kw: flac/3, tx: 128k/1, wy: 128k/1 }
 *   [30] 非常刀 v5.js [kw, wy] (裁剪: -2 节点) { kw: flac/3, wy: 128k/1 }
 *   [31] 𝖧౿ᥣᥣ𝗈 Ԝ𝗈𝗋ᥣᑯ260809.js [tx, wy, mg] (裁剪: -0 节点) { tx: master/4, wy: 320k/2, mg: flac/3 }
 * @version 1.0.0
 * @generated 2026-09-19T07:57:04.189Z
 */

;(function () {
  'use strict'

  const __origin_lx = globalThis.lx
  if (!__origin_lx) throw new Error('本音源必须在 LX Music 环境中运行')

  const EVENT_NAMES = __origin_lx.EVENT_NAMES

  // ═══════════════════════════════════════════════════════
  // 【方案 B】异步错误记录器
  // ═══════════════════════════════════════════════════════
  ;(function () {
    var __onUnhandled__ = function (e) {
      try {
        var msg = (e && e.reason && e.reason.message) || (e && e.message) || String(e)
        console.warn('[合并音源] 捕获到未处理的异步错误（不阻止宿主处理）:', msg)
      } catch (_) {}
    }
    try {
      if (typeof process !== 'undefined' && typeof process.on === 'function') {
        process.on('unhandledRejection', __onUnhandled__)
      }
    } catch (_) {}
    try {
      if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
        window.addEventListener('unhandledrejection', __onUnhandled__)
      }
    } catch (_) {}
  })()

  // ═══════════════════════════════════════════════════════
  // 【第 3 层】后端黑名单（在每个音源内部包装 request）
  //   - 不直接改 globalThis.lx.request（真机上是 read-only 属性）
  //   - 而是定义一个包装器工厂，由每个音源 IIFE 独立调用
  // ═══════════════════════════════════════════════════════
  var __BLOCKED_HOSTS__ = new Set(["m-api.ceseet.me","127.0.0.1","yy.zddyr.top","api.gdstudio.cn","wy.nianxinapi.cn","api.linglan.icu","api.317ak.com","api.ipify.org","api.music.lerd.dpdns.org","api.xinghai-backend.cn","api.2bi.cn","cdyzr.dpdns.org","lxmusicapi.onrender.com","103.79.184.97","api.ygking.top","cyapi.top","oiapi.net","ffapi.cn","api.yaohud.cn","api-v2.yuafeng.cn","171.80.3.149","music.bxa241d4.shop","api.xcvts.cn","zrcdy.dpdns.org","zrs.xn--rhyr4ib67a.top","183.66.27.22","kwdec.942240.xyz","175.27.166.236","music.nxinxz.com","source.shiqianjiang.cn","yunzhiapi.cn","kw-api.cenguigui.cn","api.cenguigui.cn","musicapi.haitangw.net","api.ygking.cn","itapi.top","api.injahow.cn","music.haitangw.cc","music-dl.sayqz.com","yy.fangqihang.cn","a.aa.cab"])
  function __makeRequestWrapper__(origRequest) {
    return function (url, options, cb) {
      var cb2 = (typeof options === 'function') ? options : cb
      try {
        var hostMatch = String(url).match(/^https?:\/\/([^/?#]+)/i)
        var host = hostMatch ? hostMatch[1].toLowerCase().replace(/:\d+$/, '') : null
        if (host && __BLOCKED_HOSTS__.has(host)) {
          var err = new Error('backend blacklisted (by merger)')
          err.code = 'EBACKEND_BLOCKED'
          if (typeof cb2 === 'function') setImmediate(function () { cb2(err, null, null) })
          return function () {}
        }
      } catch (e) {}
      return origRequest.apply(this, arguments)
    }
  }

  // ═══════════════════════════════════════════════════════
  // 平台优先级
  // ═══════════════════════════════════════════════════════
  const PLATFORM_PRIORITY = {
  "wy": [
    1,
    4,
    11,
    14,
    15,
    19,
    20,
    21,
    26,
    30,
    17,
    3,
    7,
    23,
    28,
    29,
    13
  ],
  "kg": [
    15,
    21,
    7,
    4,
    14,
    13
  ],
  "mg": [
    14,
    15,
    21,
    30,
    4,
    13
  ],
  "kw": [
    28,
    29,
    23,
    7,
    13,
    14,
    15,
    21,
    27
  ],
  "tx": [
    30,
    7,
    25,
    27,
    28,
    13
  ]
}

  const __handlers__ = []

  // ═══════════════════════════════════════════════════════
  // 音源 [2]: Ciallo~.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 1
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name Ciallo～(∠・ω< )⌒☆
       * @description 仅支持网易，理论支持全音质
       * @version 0721 opt
       * @author 玥然OvO
       */
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      const API_BASE = 'https://api.s0o1.com/API/wyy_music';
      const QUALITY_MAP = {
        '128k': '1',
        '320k': '2',
        'flac': '3',
        'flac24bit': '4',
        'hires': '5',
        'atmos': '6',
        'master': '7'
      };
      const QUALITY_NAMES = {
        '128k': '128K',
        '320k': '320K',
        'flac': 'FLAC',
        'flac24bit': '24Bit',
        'hires': 'Hi-Res',
        'atmos': 'Atmos',
        'master': 'Master'
      };
      const getAudioUrl = (musicInfo, quality = '128k') => {
        return new Promise((resolve, reject) => {
          const id = musicInfo.songmid || musicInfo.id || musicInfo.mid;
          if (!id) {
            return reject(new Error('缺少歌曲ID'));
          }
          const yz = QUALITY_MAP[quality] || '1';
          const apiUrl = `${API_BASE}?id=${id}&yz=${yz}`;
          request(apiUrl, {
            method: 'GET',
            timeout: 8000
          }, (err, resp) => {
            if (err) {
              return reject(new Error('网络请求失败'));
            }
            try {
              let data = resp.body;
              if (typeof data === 'string') {
                data = JSON.parse(data.trim());
              }
              if (data.status !== 200 || !data.success || !data.data || !data.data.url) {
                return reject(new Error('获取音频地址失败'));
              }
              resolve(data.data.url);
            } catch (error) {
              reject(new Error('解析响应数据失败'));
            }
          });
        });
      };
      const searchMusic = (keyword, limit = 10) => {
        return new Promise(resolve => {
          const apiUrl = `${API_BASE}?msg=${encodeURIComponent(keyword)}&sm=${limit}`;
          request(apiUrl, {
            method: 'GET',
            timeout: 5000
          }, (err, resp) => {
            if (err) {
              return resolve([]);
            }
            try {
              let data = resp.body;
              if (typeof data === 'string') {
                data = JSON.parse(data.trim());
              }
              if (data.status !== 200 || !data.success || !data.data) {
                return resolve([]);
              }
              const results = [];
              if (data.data.id) {
                results.push({
                  songmid: data.data.id.toString(),
                  id: data.data.id.toString(),
                  name: data.data.name || keyword,
                  singer: data.data.artists || '未知',
                  albumName: data.data.album || '',
                  source: 'wy',
                  interval: '03:00'
                });
              }
              resolve(results);
            } catch (error) {
              resolve([]);
            }
          });
        });
      };
      on(EVENT_NAMES.request, ({
        source,
        action,
        info
      }) => {
        switch (action) {
          case 'musicUrl':
            return new Promise((resolve, reject) => {
              if (!info?.musicInfo) {
                return reject(new Error('缺少音乐信息'));
              }
              getAudioUrl(info.musicInfo, info.type || '128k').then(resolve).catch(reject);
            });
          case 'search':
            return new Promise(resolve => {
              if (!info?.keyword) {
                return resolve({
                  list: [],
                  total: 0,
                  page: 1,
                  limit: 10,
                  source: 'wy',
                  allPage: 1
                });
              }
              const {
                keyword,
                page = 1,
                limit = 10
              } = info;
              searchMusic(keyword, limit).then(results => {
                resolve({
                  list: results,
                  total: results.length,
                  page,
                  limit,
                  source: 'wy',
                  allPage: Math.max(1, Math.ceil(results.length / limit))
                });
              }).catch(() => {
                resolve({
                  list: [],
                  total: 0,
                  page,
                  limit,
                  source: 'wy',
                  allPage: 1
                });
              });
            });
          default:
            return Promise.reject(new Error('不支持的操作'));
        }
      });
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources: {
          wy: {
            name: '网易云解析',
            type: 'music',
            actions: ['musicUrl', 'search'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit', 'hires', 'atmos', 'master'],
            qualityName: QUALITY_NAMES,
            maxSearchCount: 20,
            hotSearchable: true,
            importable: true,
            supportBitRateTest: false
          }
        }
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [4]: FreeListen-需自备网易云VIP密钥.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 3
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name Free listen
       * @description A lx-music source
       * @version v1.1.1
       * @wy_token null
       * @wy_token_desc 如果你有网易音乐的会员，可启用vip歌曲、更高音质的支持，将上面 @wy_token null 中的 null 改为你的token即可，token获取方式看常见问题歌单导入
       * @wy_token_desc 需要注意的是，自定义 token 存在导致账号被封禁的风险，token是账号的临时秘钥，注意不要随意分享
       */
      /******/(() => {
        // webpackBootstrap
        /******/
        "use strict";
      
        var __webpack_exports__ = {};
        ; // CONCATENATED MODULE: ./src/lx.js
        const {
          EVENT_NAMES: lx_EVENT_NAMES,
          on,
          send: lx_send,
          request,
          utils: lxUtils,
          version,
          currentScriptInfo
        } = __lx_proxy__;
        // console.log(__lx_proxy__)
      
        // https://github.com/lyswhut/lx-music-desktop/blob/master/FAQ.md#windowlxutils
        const utils = {
          buffer: {
            from: lxUtils.buffer.from,
            bufToString: lxUtils.buffer.bufToString
          },
          crypto: {
            aesEncrypt: lxUtils.crypto.aesEncrypt,
            md5: lxUtils.crypto.md5,
            randomBytes: lxUtils.crypto.randomBytes,
            rsaEncrypt: lxUtils.crypto.rsaEncrypt
          }
        };
        const currentScript = currentScriptInfo ? currentScriptInfo.rawScript : document.getElementsByTagName('script')[0].innerText; // CONCATENATED MODULE: ./src/apis/kw.js
      
        const qualitys = {
          '128k': '128kmp3',
          '320k': '320kmp3'
          // ape: 'ape',
          // flac: 'flac',
        };
        let token = '';
        let cookie = '';
        let key = '';
        function encrypt(str, pwd) {
          if (pwd == null || pwd.length <= 0) {
            console.log('Please enter a password with which to encrypt the message.');
            return null;
          }
          let prand = '';
          for (let i = 0; i < pwd.length; i++) {
            prand += pwd.charCodeAt(i).toString();
          }
          let sPos = Math.floor(prand.length / 5);
          let mult = parseInt(prand.charAt(sPos) + prand.charAt(sPos * 2) + prand.charAt(sPos * 3) + prand.charAt(sPos * 4) + prand.charAt(sPos * 5));
          let incr = Math.ceil(pwd.length / 2);
          let modu = Math.pow(2, 31) - 1;
          if (mult < 2) {
            console.log('Algorithm cannot find a suitable hash. Please choose a different password. \nPossible considerations are to choose a more complex or longer password.');
            return null;
          }
          let salt = Math.round(Math.random() * 1000000000) % 100000000;
          prand += salt;
          while (prand.length > 10) {
            prand = (parseInt(prand.substring(0, 10)) + parseInt(prand.substring(10, prand.length))).toString();
          }
          prand = (mult * prand + incr) % modu;
          let enc_chr = '';
          let enc_str = '';
          for (let i = 0; i < str.length; i++) {
            enc_chr = parseInt(str.charCodeAt(i) ^ Math.floor(prand / modu * 255));
            if (enc_chr < 16) {
              enc_str += '0' + enc_chr.toString(16);
            } else enc_str += enc_chr.toString(16);
            prand = (mult * prand + incr) % modu;
          }
          salt = salt.toString(16);
          while (salt.length < 8) salt = '0' + salt;
          enc_str += salt;
          return enc_str;
        }
        const createToken = (cookieToken, currentKey) => {
          if (currentKey && key != currentKey) key = currentKey;
          return encrypt(cookieToken, key);
        };
        const parseCookieToken = cookies => {
          if (!cookies) return '';
          let cookieToken = Array.isArray(cookies) ? cookies.find(str => str.startsWith('Hm_Iuvt_')) : cookies.match(/Hm_Iuvt_\w+=\w+;/)?.[0];
          if (!cookieToken) return '';
          cookieToken = cookieToken.split(';')[0];
          cookie = cookieToken;
          cookieToken = cookieToken.split('=')[1];
          return cookieToken;
        };
        const getToken = () => new Promise((resolve, reject) => {
          let defaultKey = 'Hm_Iuvt_cdb524f42f0ce19b169a8071123a4700';
          request('http://www.kuwo.cn/', {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
              Referer: 'http://www.kuwo.cn/'
            }
          }, function (error, response) {
            if (error) return reject(new Error('failed'));
            const token = parseCookieToken(response.headers['set-cookie']);
            if (!token) return reject(new Error('Invalid cookie'));
            const result = response.body.match(/app\.\w+\.js/);
            if (result) {
              request(`https://h5static.kuwo.cn/www/kw-www/${result[0]}`, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
                  Referer: 'http://www.kuwo.cn/'
                }
              }, function (error, response) {
                if (error) return resolve(createToken(token, defaultKey));
                const result = response.body.match(/Hm_Iuvt_(\w+)/);
                if (result) {
                  resolve(createToken(token, result[0]));
                } else resolve(createToken(token, defaultKey));
              });
            } else {
              resolve(createToken(token, defaultKey));
            }
          });
        });
      
        /* harmony default export */
        const kw = {
          info: {
            name: '酷我音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k']
          },
          async musicUrl({
            songmid
          }, quality) {
            quality = qualitys[quality];
            const target_url = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${songmid}&type=music&br=${quality}`;
            // const target_url = `http://www.kuwo.cn/api/v1/www/music/playUrl?mid=${songmid}&type=convert_url3&br=${quality}`
            /* const target_url = 'https://www.kuwo.cn/url?'
              + `format=mp3&rid=${song_id}&response=url&type=convert_url3&br=128kmp3&from=web`;
            https://m.kuwo.cn/newh5app/api/mobile/v1/music/src/${song_id} */
      
            if (!token) token = await getToken();
            return new Promise((resolve, reject) => {
              // console.log(songmid, quality)
              request(target_url, {
                method: 'GET',
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:82.0) Gecko/20100101 Firefox/82.0',
                  Referer: 'http://kuwo.cn/',
                  Secret: token,
                  cookie
                }
              }, (err, resp) => {
                console.log(resp.body);
                if (err) return reject(err);
                if (resp.body.code != 200) return reject(new Error('failed'));
                resolve(resp.body.data.url);
              });
            });
          }
        };
        ; // CONCATENATED MODULE: ./src/apis/kg.js
      
        // const qualitys = {
        //   '128k': 'PQ',
        //   '320k': 'HQ',
        //   flac: 'SQ',
        //   flac32bit: 'ZQ',
        // }
      
        // https://github.com/listen1/listen1_chrome_extension/blob/master/js/provider/kugou.js
        /* harmony default export */
        const kg = {
          info: {
            name: '酷狗音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k']
          },
          musicUrl({
            hash,
            albumId
          }, quality) {
            // quality = qualitys[quality]
            let target_url = `https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=${hash}&platid=4&album_id=${albumId}&mid=00000000000000000000000000000000`;
            return new Promise((resolve, reject) => {
              console.log(hash, quality);
              request(target_url, {
                method: 'GET'
              }, (err, resp) => {
                console.log(resp.body);
                if (err) return reject(err);
                const data = resp.body;
                if (data.status !== 1) return reject(new Error(data.err_code));
                if (data.data.privilege > 9) return reject(new Error('failed'));
                resolve(resp.body.data.play_backup_url);
              });
            });
          }
        };
        ; // CONCATENATED MODULE: ./src/apis/tx.js
      
        const fileConfig = {
          '128k': {
            s: 'M500',
            e: '.mp3',
            bitrate: '128kbps'
          },
          '320k': {
            s: 'M800',
            e: '.mp3',
            bitrate: '320kbps'
          },
          flac: {
            s: 'F000',
            e: '.flac',
            bitrate: 'FLAC'
          }
        };
      
        // https://github.com/listen1/listen1_chrome_extension/blob/master/js/provider/qq.js
        /* harmony default export */
        const tx = {
          info: {
            name: '企鹅音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k']
          },
          musicUrl({
            songmid,
            strMediaMid
          }, quality) {
            const target_url = 'https://u.y.qq.com/cgi-bin/musicu.fcg';
            // thanks to https://github.com/Rain120/qq-music-api/blob/2b9cb811934888a532545fbd0bf4e4ab2aea5dbe/routers/context/getMusicPlay.js
            const guid = '10000';
            const songmidList = [songmid];
            const uin = '0';
            const fileInfo = fileConfig[quality];
            const file = `${fileInfo.s}${strMediaMid}${fileInfo.e}`;
            /* songmidList.length === 1 &&
            `${fileInfo.s}${songmid}${songmid}${fileInfo.e}`*/
      
            const reqData = {
              req_0: {
                module: 'vkey.GetVkeyServer',
                method: 'CgiGetVkey',
                param: {
                  filename: file ? [file] : [],
                  guid,
                  songmid: songmidList,
                  songtype: [0],
                  uin,
                  loginflag: 1,
                  platform: '20'
                }
              },
              loginUin: uin,
              comm: {
                uin,
                format: 'json',
                ct: 24,
                cv: 0
              }
            };
            return new Promise((resolve, reject) => {
              console.log(songmid, quality);
              request(`${target_url}?format=json&data=${JSON.stringify(reqData)}`, {
                method: 'GET',
                headers: {
                  channel: '0146951',
                  uid: 1234
                }
              }, (err, resp) => {
                console.log(resp.body);
                if (err) return reject(err);
                const data = resp.body;
                const {
                  purl
                } = data.req_0.data.midurlinfo[0];
      
                // vip
                if (purl === '') return reject(new Error('failed'));
                const url = data.req_0.data.sip[0] + purl;
                resolve(url);
              });
            });
          }
        };
        ; // CONCATENATED MODULE: ./src/utils.js
      
        const buf2hex = buffer => {
          // buffer is an ArrayBuffer
          return version ? utils.buffer.bufToString(buffer, 'hex') : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
        };
        const aesEncrypt = (data, eapiKey, iv, mode) => {
          if (!version) {
            mode = mode.split('-').pop();
          }
          return utils.crypto.aesEncrypt(data, mode, eapiKey, iv);
        };
        const md5 = str => utils.crypto.md5(str);
        const showUpdateAlert = () => {
          send(EVENT_NAMES.updateAlert, {
            log: 'hello world',
            updateUrl: 'https://xxx.com'
          });
        };
      
        // https://stackoverflow.com/a/53387532
        const compareVersions = ((prep, l, i, r) => (a, b) => {
          a = prep(a);
          b = prep(b);
          l = Math.max(a.length, b.length);
          i = 0;
          r = i;
          // convert into integer, uncluding undefined values
          while (!r && i < l) r = ~~a[i] - ~~b[i++];
          return r < 0 ? -1 : r ? 1 : 0;
        })(t => ('' + t
        // treat non-numerical characters as lower version
        // replacing them with a negative number based on charcode of first character
        ).replace(/[^\d.]+/g, c => '.' + (c.replace(/[\W_]+/, '').toUpperCase().charCodeAt(0) - 65536) + '.')
        // remove trailing "." and "0" if followed by non-numerical characters (1.0.0b);
        .replace(/(?:\.0+)*(\.-\d+(?:\.\d+)?)\.*$/g, '$1')
        // return array
        .split('.')); // CONCATENATED MODULE: ./src/apis/wy.js
      
        const parse = str => {
          let comment = /^\/\*(?:.|\n)+?\*\//.exec(str)?.[0];
          if (!comment) return '';
          let token = /\*\s*@wy_token\s+(.+)/.exec(comment)?.[1]?.trim();
          return !token || token == 'null' ? '' : token;
        };
        const wy_token = parse(currentScript);
        const wy_qualitys = {
          '128k': 128000,
          '320k': 320000,
          flac: 999000
        };
        const eapi = (url, object) => {
          const eapiKey = 'e82ckenh8dichen8';
          const text = typeof object === 'object' ? JSON.stringify(object) : object;
          const message = `nobody${url}use${text}md5forencrypt`;
          const digest = md5(message);
          const data = `${url}-36cd479b6b5-${text}-36cd479b6b5-${digest}`;
          return {
            params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase()
          };
        };
        let wy_cookie = 'os=pc';
        if (wy_token) wy_cookie = `MUSIC_U=${wy_token}; ` + wy_cookie;
      
        // https://github.com/listen1/listen1_chrome_extension/blob/master/js/provider/netease.js
        /* harmony default export */
        const wy = {
          info: {
            name: '网易音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: wy_token ? ['128k', '320k', 'flac'] : ['128k']
          },
          musicUrl({
            songmid
          }, quality) {
            quality = wy_qualitys[quality];
            const target_url = 'https://interface3.music.163.com/eapi/song/enhance/player/url';
            const eapiUrl = '/api/song/enhance/player/url';
            const d = {
              ids: `[${songmid}]`,
              br: quality
            };
            const data = eapi(eapiUrl, d);
            return new Promise((resolve, reject) => {
              console.log(songmid, quality);
              request(target_url, {
                method: 'POST',
                form: data,
                headers: {
                  cookie: wy_cookie
                }
              }, (err, resp) => {
                console.log(resp.body);
                if (err) return reject(err);
                if (resp.headers.cookie) wy_cookie = resp.headers.cookie;
                let res_data = resp.body;
                const {
                  url,
                  freeTrialInfo
                } = res_data.data[0];
                if (!url || freeTrialInfo) return reject(new Error('failed'));
                resolve(url);
              });
            });
          }
        };
        ; // CONCATENATED MODULE: ./src/apis/mg.js
      
        const mg_qualitys = {
          '128k': 'PQ',
          '320k': 'HQ',
          flac: 'SQ',
          flac24bit: 'ZQ'
        };
      
        // https://github.com/listen1/listen1_chrome_extension/blob/master/js/provider/migu.js
        /* harmony default export */
        const mg = {
          info: {
            name: '咪咕音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k']
          },
          musicUrl({
            songmid
          }, quality) {
            quality = mg_qualitys[quality];
            /*
            const copyrightId = track.id.slice('mgtrack_'.length);
            const type = 1;
            // NOTICE：howler flac support is not ready for production.
            // Sometimes network keep pending forever and block later music.
            // So use normal quality.
            // switch (track.quality) {
            //   case '110000':
            //     type = 2;
            //     break;
            //   case '111100':
            //     type = 3;
            //     break;
            //   case '111111':
            //     type = 4;
            //     break;
            //   default:
            //     type = 1;
            // }
            const k =
              '4ea5c508a6566e76240543f8feb06fd457777be39549c4016436afda65d2330e';
            // type parameter for music quality: 1: normal, 2: hq, 3: sq, 4: zq, 5: z3d
            const plain = forge.util.createBuffer(
              `{"copyrightId":"${copyrightId}","type":${type},"auditionsFlag":0}`
            );
            const salt = forge.random.getBytesSync(8);
            const derivedBytes = forge.pbe.opensslDeriveBytes(k, salt, 48);
            const buffer = forge.util.createBuffer(derivedBytes);
            const key = buffer.getBytes(32);
            const iv = buffer.getBytes(16);
            const cipher = forge.cipher.createCipher('AES-CBC', key);
            cipher.start({ iv });
            cipher.update(plain);
            cipher.finish();
            const output = forge.util.createBuffer();
            output.putBytes('Salted__');
            output.putBytes(salt);
            output.putBuffer(cipher.output);
            const aesResult = forge.util.encode64(output.bytes());
            const publicKey =
              '-----BEGIN PUBLIC KEY-----\nMIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC8asrfSaoOb4je+DSmKdriQJKW\nVJ2oDZrs3wi5W67m3LwTB9QVR+cE3XWU21Nx+YBxS0yun8wDcjgQvYt625ZCcgin\n2ro/eOkNyUOTBIbuj9CvMnhUYiR61lC1f1IGbrSYYimqBVSjpifVufxtx/I3exRe\nZosTByYp4Xwpb1+WAQIDAQAB\n-----END PUBLIC KEY-----';
            const secKey = forge.util.encode64(
              forge.pki.publicKeyFromPem(publicKey).encrypt(k)
            );
            const target_url = `https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?dataType=2&data=${encodeURIComponent(
              aesResult
            )}&secKey=${encodeURIComponent(secKey)}`;
            */
            const target_url = `https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?netType=01&resourceType=E&songId=${songmid}&toneFlag=${quality}`;
            return new Promise((resolve, reject) => {
              console.log(songmid, quality);
              request(target_url, {
                method: 'GET',
                headers: {
                  channel: '0146951',
                  uid: '0'
                }
              }, (err, resp) => {
                console.log(resp.body);
                if (err) return reject(err);
                let playUrl = resp.body.data?.url;
                if (!playUrl) return reject(new Error('failed'));
                if (playUrl.startsWith('//')) playUrl = `https:${playUrl}`;
                resolve(playUrl.replace(/\+/g, '%2B').split('?')[0]);
              });
            });
          }
        };
        ; // CONCATENATED MODULE: ./src/apis/index.js
      
        /* harmony default export */
        const apis = {
          wy: wy
        };
        ; // CONCATENATED MODULE: ./package.json
        const package_namespaceObject = JSON.parse('{"u2":"lx-music-source","i8":"1.1.1","v":"lyswhut"}');
        ; // CONCATENATED MODULE: ./src/update.js
      
        const address = [`https://raw.githubusercontent.com/${package_namespaceObject.v}/${package_namespaceObject.u2}/master`, `https://cdn.jsdelivr.net/gh/${package_namespaceObject.v}/${package_namespaceObject.u2}`, `https://fastly.jsdelivr.net/gh/${package_namespaceObject.v}/${package_namespaceObject.u2}`, `https://gcore.jsdelivr.net/gh/${package_namespaceObject.v}/${package_namespaceObject.u2}`];
        const getLatestVersion = async (url, retryNum = 0) => {
          return new Promise((resolve, reject) => {
            request(url, {
              timeout: 10000
            }, (err, resp) => {
              if (err || resp.statusCode != 200) {
                ++retryNum >= 3 ? reject(err || new Error(resp.statusMessage || resp.statusCode)) : getLatestVersion(url, retryNum).then(resolve).catch(reject);
              } else resolve(resp.body);
            });
          }).then(info => {
            if (info.version == null) throw new Error('failed');
            return info.version;
          });
        };
        const getVersion = async (index = 0) => {
          return getLatestVersion(address[index] + '/package.json').then(version => {
            return {
              version,
              url: address[index] + '/dist/lx-music-source.js'
            };
          }).catch(async err => {
            index++;
            if (index >= address.length) throw err;
            return getVersion(index);
          });
        };
        const checkLatestVersion = async () => {
          const remoteVersion = await getVersion();
          return compareVersions(package_namespaceObject.i8, remoteVersion.version) < 0 ? remoteVersion : null;
        }; // CONCATENATED MODULE: ./src/index.js
      
        // console.log(window.lx)
      
        on(lx_EVENT_NAMES.request, ({
          source,
          action,
          info
        }) => {
          switch (action) {
            case 'musicUrl':
              return apis[source].musicUrl(info.musicInfo, info.type).catch(err => {
                console.log(err.message);
                return Promise.reject(err);
              });
          }
        });
        const sources = {};
        for (const [source, apiInfo] of Object.entries(apis)) {
          sources[source] = apiInfo.info;
        }
        lx_send(lx_EVENT_NAMES.inited, {
          status: true,
          // openDevTools: true,
          // eslint-disable-next-line no-undef
          openDevTools: "production" === 'development',
          sources
        });
        checkLatestVersion().then(version => {
          if (!version) return;
          lx_send(lx_EVENT_NAMES.updateAlert, {
            log: '发现新版本 v' + version.version,
            updateUrl: version.url
          });
        });
      
        /******/
      })();
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [5]: gdstudio音乐源 v1.0.1（仅支持网易）.js  (平台: kg, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 4
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /**
       * @name gdstudio音乐源
       * @description 通过 music-api.gdstudio.xyz 提供音乐播放链接
       * @version 1.0.1
       * @author lx-music
       * @homepage https://github.com/lyswhut/lx-music-desktop
       */
      
      /* =========================== 配置 =========================== */
      var DEV_ENABLE = false;
      var API_BASE = 'https://music-api.gdstudio.xyz/api.php';
      var SEARCH_COUNT = 5;
      var CACHE_TTL = 30 * 60 * 1000;
      var REQUEST_TIMEOUT = 15000;
      
      /* ======================= 音质映射 =========================== */
      var QUALITY_MAP = {
        '128k': 128,
        '320k': 320,
        flac: 740,
        flac24bit: 999
      };
      var QUALITY_FALLBACKS = {
        999: [740, 320, 128],
        740: [320, 128],
        320: [128],
        128: []
      };
      
      /* ======================= 音源映射 =========================== */
      var SOURCE_MAP = {
        wy: 'netease',
        kw: 'kuwo',
        tx: 'tencent',
        kg: 'netease',
        mg: 'netease'
      };
      var SUPPORTED_SOURCES = ['wy', 'kw', 'tx', 'kg', 'mg'];
      var MUSIC_QUALITY = {
        wy: ['128k', '320k', 'flac', 'flac24bit'],
        kw: ['128k', '320k', 'flac', 'flac24bit'],
        tx: ['128k', '320k', 'flac', 'flac24bit'],
        kg: ['128k', '320k', 'flac', 'flac24bit'],
        mg: ['128k', '320k', 'flac', 'flac24bit']
      };
      
      /* ===================== LX 环境变量 ========================== */
      var EVENT_NAMES = __lx_proxy__.EVENT_NAMES;
      var request = __lx_proxy__.request;
      var on = __lx_proxy__.on;
      var send = __lx_proxy__.send;
      var env = __lx_proxy__.env;
      var version = __lx_proxy__.version;
      
      /* ======================= 工具函数 =========================== */
      
      var httpFetch = function (url, options) {
        options = options || {
          method: 'GET'
        };
        return new Promise(function (resolve, reject) {
          var timer = setTimeout(function () {
            reject(new Error('Request timeout'));
          }, REQUEST_TIMEOUT);
          request(url, options, function (err, resp) {
            clearTimeout(timer);
            if (err) return reject(err);
            resolve(resp);
          });
        });
      };
      var buildSearchUrl = function (source, keyword) {
        return API_BASE + '?types=search&source=' + source + '&name=' + encodeURIComponent(keyword) + '&count=' + SEARCH_COUNT;
      };
      var buildUrlApi = function (source, trackId, br) {
        return API_BASE + '?types=url&source=' + source + '&id=' + trackId + '&br=' + br;
      };
      
      /* ======================= 歌手名拆分 ========================= */
      
      // 分隔符：、 & ; / , | （半角和全角）
      var SINGER_SPLIT_RXP = /、|&|;|；|\/|,|，|\|/;
      
      // 将 artist 字段转为字符串（gdstudio 返回的是数组）
      var normalizeArtist = function (artist) {
        if (!artist) return '';
        if (Array.isArray(artist)) {
          // 清理每个歌手名末尾的 - . 等符号，再拼接
          var cleaned = artist.map(function (a) {
            return String(a).replace(/[-.]+$/g, '').trim();
          });
          return cleaned.join('、');
        }
        return String(artist);
      };
      var getFirstSinger = function (artist) {
        if (!artist) return '';
        var str = normalizeArtist(artist);
        return str.split(SINGER_SPLIT_RXP)[0].toLowerCase();
      };
      
      /* ======================= 相似度匹配 ========================= */
      
      var calcSimilarity = function (a, b) {
        if (!a || !b) return 0;
        var sa = a.toLowerCase().replace(/\s+/g, '');
        var sb = b.toLowerCase().replace(/\s+/g, '');
        if (sa === sb) return 100;
        if (sa.includes(sb) || sb.includes(sa)) return 80;
        var minLen = Math.min(sa.length, sb.length);
        var match = 0;
        for (var i = 0; i < minLen; i++) {
          if (sa[i] === sb[i]) match++;else break;
        }
        return match / Math.max(sa.length, sb.length) * 60;
      };
      var selectBestMatch = function (list, targetName, targetSinger) {
        if (!list || !list.length) return null;
        if (list.length === 1) return list[0];
        var tName = (targetName || '').toLowerCase().trim();
        var tSinger = getFirstSinger(targetSinger);
        var scored = list.map(function (item) {
          var iName = (item.name || '').toLowerCase().trim();
          var iArtistStr = normalizeArtist(item.artist).toLowerCase();
          var iArtistFirst = getFirstSinger(item.artist);
          var score = 0;
          if (iName === tName) {
            score += 50;
          } else if (iName.includes(tName) || tName.includes(iName)) {
            score += 35;
          } else {
            score += calcSimilarity(tName, iName) * 0.3;
          }
          if (tSinger && (iArtistStr.indexOf(tSinger) >= 0 || iArtistFirst === tSinger)) {
            score += 40;
          } else if (tSinger) {
            score += calcSimilarity(tSinger, iArtistFirst) * 0.2;
          }
          return {
            item: item,
            score: score
          };
        });
        scored.sort(function (a, b) {
          return b.score - a.score;
        });
        if (scored[0].score < 20) return null;
        return scored[0].item;
      };
      
      /* ======================= 缓存系统 =========================== */
      
      var pendingCache = {};
      var resultCache = {};
      var makeCacheKey = function (lxSource, name, singer) {
        var sname = (name || '').toLowerCase().replace(/\s+/g, '');
        var ssinger = getFirstSinger(singer || '');
        return lxSource + ':' + sname + ':' + ssinger;
      };
      var cacheGet = function (key) {
        var entry = resultCache[key];
        if (!entry) return null;
        if (Date.now() > entry.expireTime) {
          delete resultCache[key];
          return null;
        }
        return entry.data;
      };
      var cacheSet = function (key, data) {
        var keys = Object.keys(resultCache);
        if (keys.length > 500) {
          delete resultCache[keys[0]];
        }
        resultCache[key] = {
          data: data,
          expireTime: Date.now() + CACHE_TTL
        };
      };
      
      /* ====================== API 封装 =========================== */
      
      var searchSong = async function (lxSource, targetSource, name, singer) {
        var cacheKey = makeCacheKey(lxSource, name, singer);
        var cached = cacheGet(cacheKey);
        if (cached) return cached;
        if (pendingCache[cacheKey]) return pendingCache[cacheKey];
        var keyword = (name || '') + ' ' + (singer || '');
        keyword = keyword.trim();
        if (!keyword) throw new Error('Search keyword is empty');
        var promise = async function () {
          try {
            var resp = await httpFetch(buildSearchUrl(targetSource, keyword));
            var body = resp.body;
            if (!body || !Array.isArray(body)) {
              throw new Error('Invalid search response');
            }
            if (!body.length) {
              throw new Error('No search results');
            }
            var matched = selectBestMatch(body, name, singer);
            if (!matched) {
              throw new Error('No matching song found');
            }
            var result = {
              trackId: matched.id,
              lyricId: matched.lyric_id || matched.id,
              picId: matched.pic_id || '',
              matchedName: matched.name,
              matchedArtist: matched.artist,
              gdSource: matched.source || targetSource
            };
            cacheSet(cacheKey, result);
            return result;
          } finally {
            delete pendingCache[cacheKey];
          }
        }();
        pendingCache[cacheKey] = promise;
        return promise;
      };
      
      /* ====================== Action 处理 ========================= */
      
      var handleMusicUrl = async function (lxSource, musicInfo, quality) {
        var targetSource = SOURCE_MAP[lxSource];
        if (!targetSource) throw new Error('Unsupported source: ' + lxSource);
        var requestedBr = QUALITY_MAP[quality] || 320;
        var fallbacks = QUALITY_FALLBACKS[requestedBr] || [320, 128];
        var brsToTry = [requestedBr].concat(fallbacks);
        var searchResult = await searchSong(lxSource, targetSource, musicInfo.name, musicInfo.singer);
        for (var i = 0; i < brsToTry.length; i++) {
          var br = brsToTry[i];
          try {
            var resp = await httpFetch(buildUrlApi(searchResult.gdSource, searchResult.trackId, br));
            var body = resp.body;
            if (body && body.url) {
              if (br !== requestedBr) {
                console.log('[gdstudio] quality fallback: ' + quality + '(' + requestedBr + ') -> br=' + br);
              }
              return body.url;
            }
          } catch (_) {}
        }
        throw new Error('Failed to get audio URL at all quality levels');
      };
      
      /* ====================== 事件注册 =========================== */
      
      on(EVENT_NAMES.request, function (data) {
        var action = data.action;
        var source = data.source;
        var info = data.info;
        switch (action) {
          case 'musicUrl':
            if (env !== 'mobile') {
              console.group('[gdstudio] musicUrl');
              console.log('source:', source);
              console.log('quality:', info.type);
              console.log('name:', info.musicInfo && info.musicInfo.name);
              console.log('singer:', info.musicInfo && info.musicInfo.singer);
              console.groupEnd();
            }
            return handleMusicUrl(source, info.musicInfo, info.type);
          default:
            return Promise.reject(new Error('Unsupported action: ' + action));
        }
      });
      
      /* ====================== 初始化 =========================== */
      
      var musicSources = {};
      SUPPORTED_SOURCES.forEach(function (s) {
        musicSources[s] = {
          name: s,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: MUSIC_QUALITY[s]
        };
      });
      send(EVENT_NAMES.inited, {
        openDevTools: DEV_ENABLE,
        sources: musicSources
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [8]: HYWmusic_beta_公益测试.js  (平台: kw, kg, tx, wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 7
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /**
       * @name HYWmusic_beta_公益测试
       * @version v0.74.0
       * @author Ryn
       * @description 你知道吗我的trae积分用完了……我想要赞助喵……
      一群（满了）1094095648
      二群（可入）965503129
       * @homepage https://github.com/Macrohard0001/HYWmusic_source
       * @license MIT
       * @updateUrl http://103.79.184.97/api/releases?script=HYWmusic_beta_%E5%85%AC%E7%9B%8A%E6%B5%8B%E8%AF%95&scriptType=free&releaseType=lx&version=v0.74.0
       *
       * 支持平台: kw、kg、tx、wy、mg
       * 支持音质: 128k、320k、flac、flac24bit、master、atmos_plus、atmos、hires
       * 生成时间: 2026-08-06T07:52:23.078Z
       *
       * 协议参考：ikun-music-source.js + lxmusic.toside.cn/desktop/custom-source
       *   - MUSIC_QUALITY 每平台独立音质（按后端勾选写入）
       *   - on handler 纯 Promise 风格：({action, source, info}) => Promise
       *   - inited 发送 status:true + sources
       *   - API_BASE 必须注入，禁止回退 localhost
       */
      
      'use strict';
      
      const DEV_ENABLE = false;
      const UPDATE_ENABLE = true;
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        env,
        version: LX_VERSION
      } = __lx_proxy__;
      
      // ====== 每平台独立音质（参考 ikun） ======
      const MUSIC_QUALITY = JSON.parse('{"kw":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"kg":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"tx":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"wy":["128k","320k","flac","flac24bit","master","atmos_plus","atmos","hires"],"mg":["128k"]}');
      const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);
      
      // ====== 运行参数 ======
      const API_BASE = "http://__blocked__.invalid";
      const CARD_KEY = 'PYPW-QFRL-3DBF-95O6';
      
      // ====== 日志 ======
      const log = {
        info: (...args) => {
          try {
            console.log('[HYWmusic]', ...args);
          } catch (e) {}
        },
        error: (...args) => {
          try {
            console.error('[HYWmusic ERROR]', ...args);
          } catch (e) {}
        },
        warn: (...args) => {
          try {
            console.warn('[HYWmusic WARN]', ...args);
          } catch (e) {}
        }
      };
      
      // ====== API_BASE 检查：禁止回退 localhost ======
      if (!API_BASE || !/^https?:\/\//.test(API_BASE)) {
        log.error('API_BASE 未配置或格式非法: "' + API_BASE + '"，所有请求都将失败');
        log.error('请联系发行版管理员在创建发行版时设置 metadata.apiUrl');
      }
      
      // ====== HTTP 请求（严格对齐 ikun：仅 callback 风格 request） ======
      const httpFetch = (url, options = {
        method: 'GET'
      }) => {
        return new Promise((resolve, reject) => {
          if (!API_BASE || !/^https?:\/\//.test(API_BASE)) {
            return reject(new Error('API_BASE 未配置或格式非法'));
          }
          const headers = {
            ...(options.headers || {}),
            'User-Agent': env ? `lx-music-${env}/${LX_VERSION}` : `lx-music-request/${LX_VERSION || '1.0.0'}`
          };
          if (CARD_KEY) headers['X-Card-Key'] = CARD_KEY;
          const reqOptions = {
            ...options,
            headers
          };
          if (!reqOptions.method) reqOptions.method = 'GET';
          // 兼容 LX 沙箱 request 的两种 callback 签名：
          //   2 参数: (err, resp)       — resp.body 包含响应体
          //   3 参数: (err, resp, body) — body 是独立解析的响应体（needle 风格）
          // 部分版本 resp.body 为 undefined，body 在第三个参数；两者都取以兜底
          request(url, reqOptions, (err, resp, body) => {
            if (err) return reject(err);
            const respBody = resp && resp.body !== undefined && resp.body !== null ? resp.body : body;
            resolve({
              statusCode: resp ? resp.statusCode : undefined,
              headers: resp ? resp.headers : undefined,
              body: respBody
            });
          });
        });
      };
      
      // ====== 超时保护（保留但默认不使用，脚本内部调用） ======
      // const withTimeout = (promise, ms) => Promise.race([
      //   promise,
      //   new Promise((_, reject) => setTimeout(() => reject(new Error('请求超时(' + ms + 'ms)')), ms))
      // ])
      
      // ====== musicInfo 字段收集：透传完整字段 ======
      const collectMusicInfoParams = (musicInfo, platform) => {
        if (!musicInfo) return {};
        const params = {};
        const songId = musicInfo.songmid || musicInfo.songId || musicInfo.id || musicInfo.hash || musicInfo.rid || musicInfo.musicId || musicInfo.copyrightId || musicInfo.songid || '';
        if (songId) params.songId = songId;
        if (musicInfo.songmid) params.songmid = musicInfo.songmid;
        if (musicInfo.hash) params.hash = musicInfo.hash;
        const fields = ['albumAudioId', 'strMediaMid', 'mediaMid', 'copyrightId', 'rid', 'musicId', 'albumId', 'albumName', 'albumMid', 'songname', 'songName', 'name', 'singer', 'singers', 'artist'];
        for (const f of fields) {
          if (musicInfo[f] !== undefined && musicInfo[f] !== null && musicInfo[f] !== '') params[f] = musicInfo[f];
          if (musicInfo.meta && musicInfo.meta[f] !== undefined && musicInfo.meta[f] !== null && musicInfo.meta[f] !== '') params[f] = musicInfo.meta[f];
        }
        params.platform = platform;
        params.source = platform; // 兼容 /api/music/info（仅读 source，不读 platform）
        return params;
      };
      
      // ====== 获取音乐 URL（GET + query 参数，服务端仅支持 GET） ======
      const handleGetMusicUrl = async (source, musicInfo, quality) => {
        const params = collectMusicInfoParams(musicInfo, source);
        if (quality) params.quality = quality;
        if (CARD_KEY) params.key = CARD_KEY;
        const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(String(v))).join('&');
        const url = API_BASE + '/api/music/url' + (query ? '?' + query : '');
        const resp = await httpFetch(url, {
          method: 'GET'
        });
        let respBody = resp && resp.body;
        if (typeof respBody === 'string') {
          try {
            respBody = JSON.parse(respBody);
          } catch (e) {
            throw new Error('服务端返回非 JSON 数据');
          }
        }
        if (!respBody || typeof respBody !== 'object') {
          throw new Error('空响应');
        }
        switch (respBody.code) {
          case 200:
            return respBody.url || respBody.data || respBody;
          case 401:
          case 403:
            throw new Error(respBody.message || '鉴权失败');
          case 429:
            throw new Error('请求过速');
          case 500:
            throw new Error(respBody.message || '服务器错误');
          default:
            throw new Error(respBody.message || '未知错误 code=' + respBody.code);
        }
      };
      
      // ====== 获取歌词 ======
      const handleGetLyric = async (source, musicInfo) => {
        const params = collectMusicInfoParams(musicInfo, source);
        params.action = 'lyric';
        try {
          const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(String(v))).join('&');
          const url = API_BASE + '/api/music/info' + (query ? '?' + query : '');
          const resp = await httpFetch(url, {
            method: 'GET'
          });
          let respBody = resp && resp.body;
          if (typeof respBody === 'string') {
            try {
              respBody = JSON.parse(respBody);
            } catch (e) {
              respBody = null;
            }
          }
          if (!respBody || respBody.code !== 200) return {
            lyric: '',
            tlyric: null,
            rlyric: null,
            lxlyric: null
          };
          const data = respBody.data || respBody;
          return {
            lyric: data.lyric || '',
            tlyric: data.tlyric || null,
            rlyric: data.rlyric || null,
            lxlyric: data.lxlyric || null
          };
        } catch (e) {
          return {
            lyric: '',
            tlyric: null,
            rlyric: null,
            lxlyric: null
          };
        }
      };
      
      // ====== 获取封面 ======
      const handleGetPic = async (source, musicInfo) => {
        const params = collectMusicInfoParams(musicInfo, source);
        params.action = 'pic';
        try {
          const query = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => k + '=' + encodeURIComponent(String(v))).join('&');
          const url = API_BASE + '/api/music/info' + (query ? '?' + query : '');
          const resp = await httpFetch(url, {
            method: 'GET'
          });
          let respBody = resp && resp.body;
          if (typeof respBody === 'string') {
            try {
              respBody = JSON.parse(respBody);
            } catch (e) {
              return '';
            }
          }
          if (!respBody || respBody.code !== 200) return '';
          const data = respBody.data || respBody;
          return data.pic || data.url || '';
        } catch (e) {
          return '';
        }
      };
      
      // ====== on request（严格对齐 ikun：纯 Promise 风格，无 withTimeout） ======
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        switch (action) {
          case 'musicUrl':
            return handleGetMusicUrl(source, info.musicInfo, info.type);
          case 'lyric':
            return handleGetLyric(source, info.musicInfo);
          case 'pic':
            return handleGetPic(source, info.musicInfo);
          default:
            return Promise.reject('action not support: ' + action);
        }
      });
      
      // ====== 构建 sources（每平台独立 qualitys，参考 ikun） ======
      const musicSources = {};
      MUSIC_SOURCE.forEach(item => {
        musicSources[item] = {
          name: item,
          type: 'music',
          actions: ['musicUrl', 'lyric', 'pic'],
          qualitys: MUSIC_QUALITY[item]
        };
      });
      
      // ====== 发送 inited（参考 ikun：status: true + openDevTools） ======
      send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: DEV_ENABLE,
        sources: musicSources
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [12]: xinghai-music-sourcev2.3.7.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 11
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*! 
       * @name 星海音乐源
       * @description GDAPI | 聚合 | ChKSz API | 
       * @version v3.2.7   1.优化mg
       * @author 万去了了
       * @homepage https://zrcdy.dpdns.org/
       * @lastUpdate 2026-07-09
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        env
      } = __lx_proxy__;
      const DEBUG_MODE = false;
      
      // 网易云独立 API
      const MAIN_API_BASE = 'https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light';
      const NETEASE_VIP_API = 'https://api.chksz.top/api/163_music';
      // 更新检查地址：优先使用新 CDN，失败后使用原域名
      const VERSION_API_LIST = ["https://__blocked__.invalid/lx/version.php",
      // 新 CDN，优先
      "https://__blocked__.invalid/lx/version.php" // 原域名，备用
      ];
      const FALLBACK_UPDATE_URL = "https://__blocked__.invalid/lx/vers.php";
      const SCRIPT_VERSION = 'v3.2.7';
      const API_VERSION = '3.2.7';
      const HARDCODED_CONFIG = {
        backend_routes: {
          kg: "https://__blocked__.invalid/lx/api/api.php",
          kw: "https://__blocked__.invalid/lx/api/api.php",
          qq: "https://__blocked__.invalid/lx/api/api.php",
          migu: "https://__blocked__.invalid/lx/api/api.php"
        },
        ip_query_url: "https://__blocked__.invalid/ip.php"
      };
      const SOURCE_MAP = {
        kw: 'kw',
        kg: 'kg'
      };
      const PLATFORM_NAMES = {
        wy: '网易云音乐',
        kw: '酷我音乐',
        kg: '酷狗音乐'
      };
      const MUSIC_QUALITIES = {
        wy: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'jyeffect', 'sky', 'jymaster'],
        kw: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        kg: ['128k', '192k', '320k', 'flac', 'flac24bit']
      };
      const NETEASE_VIP_LEVEL_MAP = {
        hires: 'hires',
        jyeffect: 'jyeffect',
        sky: 'sky',
        jymaster: 'jymaster',
        flac24bit: 'hires'
      };
      const NETEASE_VIP_QUALITY_SET = new Set(['hires', 'jyeffect', 'sky', 'jymaster', 'flac24bit']);
      let userIp = null;
      let availablePlatforms = [];
      let backendRoutes = {};
      let ipQueryUrl = null;
      const extraCache = new Map();
      
      // ======================== 工具函数 ========================
      function isBuffer(obj) {
        return obj && typeof obj === 'object' && (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj) || typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer');
      }
      function safeParseBody(body) {
        if (typeof body === 'string') {
          const trimmed = body.trim();
          if (/^[{["]/.test(trimmed)) {
            try {
              return JSON.parse(trimmed);
            } catch (e) {}
          }
          return body;
        }
        if (typeof body === 'object' && body !== null) {
          try {
            if (typeof body.toString === 'function' && body.toString() !== '[object Object]') body = body.toString('utf-8');
          } catch (e) {}
          if (typeof body === 'object' && !isBuffer(body)) return body;
        }
        try {
          if (isBuffer(body)) {
            if (__lx_proxy__?.utils?.buffer?.bufToString) body = __lx_proxy__.utils.buffer.bufToString(body, 'utf-8');else if (typeof Buffer !== 'undefined') body = Buffer.from(body).toString('utf-8');else body = String(body);
          }
        } catch (e) {}
        if (typeof body === 'string') {
          const trimmed = body.trim();
          if (/^[{["]/.test(trimmed)) {
            try {
              return JSON.parse(trimmed);
            } catch (e) {}
          }
        }
        return body;
      }
      const httpFetch = (url, options = {}) => new Promise((resolve, reject) => {
        const start = Date.now();
        request(url, options, (err, resp) => {
          const elapsed = Date.now() - start;
          if (err) {
            console.error(`[星海] 网络请求失败 (${url.substring(0, 60)}...): ${err.message}`);
            return reject(err);
          }
          const body = safeParseBody(resp.body);
          resolve({
            body,
            statusCode: resp.statusCode,
            headers: resp.headers || {},
            elapsed
          });
        });
      });
      function mapQuality(target, avail) {
        const pm = {
          '臻品母带': 'jymaster',
          '臻品音质2.0': 'sky',
          '臻品音质AI': 'jyeffect',
          '臻品音质': 'jyeffect',
          'Hires 无损24-Bit': 'hires',
          'Hi-Res': 'hires',
          'FLAC': 'flac',
          '320k': '320k',
          '192k': '192k',
          '128k': '128k'
        };
        if (avail.includes(target)) return target;
        const m = pm[target];
        if (m && avail.includes(m)) return m;
        const order = ['jymaster', 'sky', 'jyeffect', 'hires', 'flac24bit', 'flac', '320k', '192k', '128k'];
        for (const q of order) if (avail.includes(q)) return q;
        return avail[0] || '128k';
      }
      async function fetchIp() {
        if (!ipQueryUrl) return;
        try {
          const r = await httpFetch(ipQueryUrl, {
            timeout: 3000
          });
          if (r.body && r.body.ip) userIp = r.body.ip;
        } catch (e) {}
      }
      
      // ======================== 网易云获取 ========================
      async function getWyGDUrl(id, q) {
        const brMap = {
          '128k': '128',
          '192k': '192',
          '320k': '320',
          'flac': '740',
          'flac24bit': '999'
        };
        const br = brMap[q] || '320';
        const url = `${MAIN_API_BASE}&types=url&source=netease&id=${id}&br=${br}`;
        const resp = await httpFetch(url, {
          headers: {
            'User-Agent': 'LX-Music-Mobile'
          },
          timeout: 8000
        });
        if (resp.statusCode !== 200) throw new Error(`GD HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (!data.url) throw new Error('GD未返回音频地址');
        return {
          url: data.url,
          lyric: null,
          cover: null
        };
      }
      async function getWyVipUrl(id, q) {
        const level = NETEASE_VIP_LEVEL_MAP[q] || 'jymaster';
        const url = `${NETEASE_VIP_API}?id=${id}&level=${level}`;
        const resp = await httpFetch(url, {
          headers: {
            'User-Agent': 'LX-Music-Mobile'
          },
          timeout: 8000
        });
        if (resp.statusCode !== 200) throw new Error(`VIP HTTP ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200 || !data.data?.url) throw new Error('VIP未返回音频');
        return {
          url: data.data.url,
          lyric: null,
          cover: null
        };
      }
      
      // ======================== 后端请求 ========================
      async function getUrlFromBackend(source, musicInfo, quality) {
        const backendSource = SOURCE_MAP[source] || source;
        const baseUrl = backendRoutes[backendSource];
        if (!baseUrl) throw new Error(`未找到平台 ${backendSource} 的后端路由`);
        const params = {
          version: API_VERSION,
          source: backendSource,
          name: musicInfo.name || '',
          singer: musicInfo.singer || '',
          songmid: musicInfo.songmid || musicInfo.id || '',
          interval: musicInfo.interval || '',
          albumName: musicInfo.albumName || musicInfo.album || '',
          quality: quality || ''
        };
        if (userIp) params.ip = userIp;
        const query = Object.keys(params).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(params[k])).join('&');
        const url = baseUrl + '?' + query;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        if (resp.statusCode !== 200) throw new Error(`后端状态码 ${resp.statusCode}`);
        const data = resp.body;
        if (data.code !== 200 || !data.url) throw new Error(data.msg || '无可用链接');
        return {
          url: data.url,
          lyric: data.lrc || null,
          cover: data.picture || null
        };
      }
      
      // ======================== 获取音乐 URL ========================
      async function fetchMusicUrl(source, musicInfo, quality) {
        const start = Date.now();
        const id = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        if (!id) throw new Error('缺少 songId');
        const availQualities = MUSIC_QUALITIES[source] || ['128k', '192k', '320k', 'flac'];
        const actualQuality = mapQuality(quality, availQualities);
        let result = {
          url: '',
          lyric: null,
          cover: null
        };
        if (source === 'wy') {
          let urlObj = null;
          if (NETEASE_VIP_QUALITY_SET.has(actualQuality)) {
            try {
              urlObj = await getWyVipUrl(id, actualQuality);
            } catch (e) {
              console.error(`[星海] 网易云VIP失败: ${e.message}`);
            }
          }
          if (!urlObj || !urlObj.url) urlObj = await getWyGDUrl(id, actualQuality);
          result = {
            url: urlObj.url,
            lyric: null,
            cover: null
          };
        } else {
          try {
            result = await getUrlFromBackend(source, musicInfo, actualQuality);
          } catch (e) {
            console.error(`[星海] 获取链接失败 (${source}): ${e.message}`);
            throw e;
          }
        }
        const totalTime = Date.now() - start;
        console.log(`[星海] 获取成功 (${source}) 耗时: ${totalTime}ms`);
        extraCache.set(id, {
          lyric: result.lyric,
          cover: result.cover
        });
        return result.url;
      }
      
      // ======================== 版本比较 ========================
      function compareVersions(a, b) {
        const v1 = a.replace(/^v/, '').split('.').map(Number);
        const v2 = b.replace(/^v/, '').split('.').map(Number);
        for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
          const n1 = v1[i] || 0;
          const n2 = v2[i] || 0;
          if (n1 > n2) return 1;
          if (n1 < n2) return -1;
        }
        return 0;
      }
      
      // ======================== 初始化 ========================
      async function tryFetchVersion(url) {
        try {
          const resp = await httpFetch(url, {
            timeout: 5000
          });
          if (resp.statusCode === 200 && resp.body && typeof resp.body === 'object' && resp.body.version) {
            return resp.body;
          }
        } catch (e) {}
        return null;
      }
      async function initPlatforms() {
        const initStart = Date.now();
        let configData = null;
        let usedNetwork = false;
        let needUpdateAlert = false;
      
        // 多级更新检查
        for (const url of VERSION_API_LIST) {
          configData = await tryFetchVersion(url);
          if (configData) {
            usedNetwork = true;
            console.log(`[星海] 配置获取成功: ${url}`);
            break;
          }
          console.error(`[星海] 配置获取失败: ${url}`);
        }
        if (usedNetwork && configData) {
          // 配置获取成功，检查版本是否需要更新
          if (compareVersions(configData.version, SCRIPT_VERSION) > 0) {
            needUpdateAlert = true;
            send(EVENT_NAMES.updateAlert, {
              log: configData.changelog || `发现新版本 ${configData.version}`,
              updateUrl: configData.update_url || FALLBACK_UPDATE_URL
            });
          }
          // 应用配置
          backendRoutes = configData.backend_routes || {};
          ipQueryUrl = configData.ip_query_url || null;
        } else {
          // 全部失败或数据异常：进入保底模式，仅网易云
          console.warn('[星海] 所有更新检查接口不可用或数据异常，进入保底模式（仅网易云）');
          backendRoutes = {};
          ipQueryUrl = null;
          needUpdateAlert = true;
          send(EVENT_NAMES.updateAlert, {
            log: '无法获取最新配置，请手动下载更新。',
            updateUrl: FALLBACK_UPDATE_URL
          });
        }
      
        // 平台可用性：网易云始终可用，其他平台需要有后端路由
        const status = {
          wy: true,
          kg: !!backendRoutes.kg,
          kw: !!backendRoutes.kw
        };
        availablePlatforms = Object.keys(status).filter(k => status[k]);
        const initElapsed = Date.now() - initStart;
        const srcNames = availablePlatforms.map(p => PLATFORM_NAMES[p] || p).join('、');
        let summary = `[星海] 初始化完成 (${initElapsed}ms)`;
        if (!usedNetwork) {
          summary += ' | 保底模式';
        }
        summary += ` | 可用源: ${srcNames || '无'}`;
        console.log(summary);
      }
      
      // ======================== 事件处理 ========================
      on(EVENT_NAMES.request, async ({
        action,
        source,
        info
      }) => {
        if (!source || !MUSIC_QUALITIES[source]) {
          throw new Error(`不支持的音乐源: ${source}`);
        }
        if (action === 'musicUrl') {
          if (!info?.musicInfo || !info.type) throw new Error('参数不完整');
          const {
            musicInfo,
            type: quality
          } = info;
          return fetchMusicUrl(source, musicInfo, quality);
        }
        if (action === 'lyric') {
          if (!info?.musicInfo) throw new Error('缺少 musicInfo');
          const id = info.musicInfo.hash ?? info.musicInfo.songmid ?? info.musicInfo.id;
          const cached = extraCache.get(id);
          if (cached && cached.lyric) return {
            lyric: cached.lyric,
            tlyric: ''
          };
          return null;
        }
        if (action === 'pic') {
          if (!info?.musicInfo) throw new Error('缺少 musicInfo');
          const id = info.musicInfo.hash ?? info.musicInfo.songmid ?? info.musicInfo.id;
          const cached = extraCache.get(id);
          if (cached && cached.cover) return cached.cover;
          return null;
        }
        throw new Error(`不支持的操作: ${action}`);
      });
      
      // ======================== 启动 ========================
      (async () => {
        console.log(`[星海] ${SCRIPT_VERSION} 启动，环境: ${env}`);
        await initPlatforms();
        fetchIp();
        const sources = {};
        availablePlatforms.forEach(p => {
          sources[p] = {
            name: PLATFORM_NAMES[p] || p,
            type: 'music',
            actions: ['musicUrl', 'lyric', 'pic'],
            qualitys: MUSIC_QUALITIES[p]
          };
        });
        send(EVENT_NAMES.inited, {
          status: true,
          sources
        });
      })();
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [14]: 全豆要-聚合音源 v9.7 97特供版 DeepSeek优化并修复版本.js  (平台: kw, kg, tx, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 13
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 全豆要[聚合音源]
       * @description 迭代9.7版本，聚合 星海/溯音/念心/长青/歌一刀专属汽水音乐，多链路自动回退
       * @version 9.7 修复优化版
       * @author 全豆要 & Gemini & Toskysun & TZB679 & DeepSeek优化
       */
      
      // --- 常量定义 ---
      const CACHE_TTL_MS = 21600000;
      const CACHE_MAX_SIZE = 500;
      const HTTP_URL_REGEX = /^https?:\/\//i;
      
      // API 端点
      const XINGHAI_MAIN_API = "https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light";
      const XINGHAI_BACKUP_API = "https://__blocked__.invalid/api/";
      const SUYIN_QQ_API = "https://__blocked__.invalid/api/QQ_Music";
      const SUYIN_QQ_KEY = "oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575";
      const SUYIN_163_API = "https://__blocked__.invalid/api/Music_163";
      const SUYIN_KUWO_API = "https://__blocked__.invalid/api/Kuwo";
      const SUYIN_MIGU_API = "https://__blocked__.invalid/api/music/migu";
      
      // 以下 API 需自行配置（若为空或无效则自动跳过该源）
      const HUIBQ_API = ""; // 例如 "https://api.huibq.com"
      const HUIBQ_REQUEST_KEY = ""; // 对应的请求密钥
      const LINGCHUAN_API = ""; // 例如 "https://api.lingchuan.com"
      
      // 长青SVIP URL模板
      const CHANGQING_URL_TEMPLATES = {
        tx: "http://__blocked__.invalid/kgqq/qq.php?type=mp3&id={id}&level={level}",
        wy: "http://__blocked__.invalid/wy/wy.php?type=mp3&id={id}&level={level}",
        kw: "https://__blocked__.invalid/music/kw.php?type=mp3&id={id}&level={level}",
        kg: "https://__blocked__.invalid/kgqq/kg.php?type=mp3&id={id}&level={level}",
        mg: "https://__blocked__.invalid/musicapi/mg.php?type=mp3&id={id}&level={level}"
      };
      
      // 念心SVIP URL模板
      const NIANXIN_URL_TEMPLATES = {
        tx: "https://__blocked__.invalid/kgqq/tx.php?id={id}&level={level}&type=mp3",
        wy: "http://__blocked__.invalid/wy.php?id={id}&level={level}&type=mp3",
        kw: "http://__blocked__.invalid/kw.php?id={id}&level={level}&type=mp3",
        kg: "https://__blocked__.invalid/kgqq/kg.php?id={id}&level={level}&type=mp3",
        mg: "http://__blocked__.invalid/mg.php?id={id}&level={level}&type=mp3"
      };
      
      // 汽水VIP
      const QISHUI_SOURCE_ID = "qsvip";
      const QISHUI_SOURCE_NAME = "汽水VIP";
      const QISHUI_API_HTTPS = "https://api.vsaa.cn/api/music.qishui.vip";
      const QISHUI_API_HTTP = "http://api.vsaa.cn/api/music.qishui.vip";
      const QISHUI_PROXY_API = "https://proxy.qishui.vsaa.cn/qishui/proxy";
      
      // 各平台支持的音质列表
      const PLATFORM_QUALITIES = {
        wy: ["24bit", "flac", "320k", "192k", "128k"],
        tx: ["24bit", "flac", "320k", "192k", "128k"],
        kw: ["24bit", "flac", "320k", "192k", "128k"],
        kg: ["24bit", "flac", "320k", "192k", "128k"],
        mg: ["24bit", "flac", "320k", "192k", "128k"]
      };
      
      // 平台ID映射到星海主API名称
      const PLATFORM_TO_XINGHAI = {
        wy: "netease",
        tx: "tencent",
        kw: "kuwo",
        kg: "kugou",
        mg: "migu"
      };
      
      // 音质到星海主API码率参数
      const QUALITY_TO_BR = {
        "128k": "128",
        "192k": "192",
        "320k": "320",
        flac: "740",
        flac24bit: "999",
        "24bit": "999"
      };
      
      // 平台ID映射到星海备API名称
      const PLATFORM_TO_XINGHAI_BACKUP = {
        wy: "netease",
        tx: "qq",
        kw: "kuwo"
      };
      
      // 音质到溯音QQ码率参数
      const QUALITY_TO_SUYIN_QQ_BR = {
        "128k": 7,
        "320k": 5,
        flac: 4,
        hires: 3,
        atmos: 2,
        master: 1,
        "24bit": 1
      };
      
      // 音质到溯音酷我码率参数
      const QUALITY_TO_KUWO_BR = {
        flac: 1,
        "320k": 5,
        "128k": 7,
        "24bit": 1
      };
      
      // 高品质音质集合
      const HIRES_QUALITY_SET = new Set(["24bit", "flac", "flac24bit", "hires", "master", "atmos"]);
      
      // URL缓存
      const urlCache = new Map();
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      
      // 空函数（占位/日志）
      function noop() {}
      
      // 发起HTTP请求，返回 Promise<{statusCode, headers, body}>
      function httpRequest(url, options = {
        method: "GET"
      }) {
        return new Promise((resolve, reject) => {
          request(url, {
            timeout: 20000,
            ...options
          }, (err, res) => {
            if (err) {
              return reject(new Error("请求错误: " + err.message));
            }
            let body = res?.body;
            if (typeof body === "string") {
              const trimmed = body.trim();
              if (trimmed.startsWith("{") || trimmed.startsWith("[") || trimmed.startsWith("\"")) {
                try {
                  body = JSON.parse(trimmed);
                } catch (e2) {}
              }
            }
            resolve({
              statusCode: res?.statusCode ?? 0,
              headers: res?.headers || {},
              body: body
            });
          });
        });
      }
      
      // 发起GET请求，自动拼接查询参数，返回响应body
      async function httpGet(url, params = {}) {
        const queryStr = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).map(k => encodeURIComponent(k) + "=" + encodeURIComponent(params[k])).join("&");
        const sep = url.includes("?") ? "&" : "?";
        const fullUrl = "" + url + (queryStr ? sep + queryStr : "");
        const res = await httpRequest(fullUrl, {
          method: "GET",
          timeout: 10000
        });
        if (res.statusCode >= 400) {
          throw new Error("HTTP错误: " + res.statusCode);
        }
        return res.body;
      }
      
      // 构建查询字符串（带前导 ?）
      function buildQueryString(params = {}) {
        const parts = Object.keys(params).filter(k => params[k] !== undefined && params[k] !== null).map(k => encodeURIComponent(String(k)) + "=" + encodeURIComponent(String(params[k])));
        return parts.length ? "?" + parts.join("&") : "";
      }
      
      // 带fallback的GET请求（汽水VIP自动尝试https/http）
      async function httpGetWithFallback(url, params = {}, timeout = 15000) {
        const urls = url === QISHUI_API_HTTPS ? [QISHUI_API_HTTPS, QISHUI_API_HTTP] : [url];
        let lastError = null;
        for (const u of urls) {
          try {
            const fullUrl = "" + u + buildQueryString(params);
            const res = await httpRequest(fullUrl, {
              method: "GET",
              timeout: timeout
            });
            if (res.statusCode >= 400) throw new Error("HTTP " + res.statusCode);
            return res.body;
          } catch (e) {
            lastError = e;
          }
        }
        throw lastError || new Error("请求失败");
      }
      
      // 发起POST请求，body为JSON，返回响应body
      async function httpPost(url, body = {}, timeout = 20000) {
        const res = await httpRequest(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: body,
          timeout: timeout
        });
        if (res.statusCode >= 400) throw new Error("HTTP错误: " + res.statusCode);
        return res.body;
      }
      
      // 从歌曲信息对象中提取歌曲ID字符串
      function getSongId(songInfo) {
        return (songInfo?.id || songInfo?.songmid || songInfo?.songId || songInfo?.hash || songInfo?.rid || songInfo?.mid || songInfo?.strMediaMid || songInfo?.mediaId || "").toString();
      }
      
      // 标准化音质字符串
      function normalizeQuality(quality) {
        switch (String(quality || "").toLowerCase()) {
          case "128k":
            return "low";
          case "320k":
            return "standard";
          case "flac":
            return "lossless";
          case "flac24bit":
            return "flac24bit";
          default:
            return "128k";
        }
      }
      
      // 标准化歌曲信息为统一格式
      function normalizeSongInfo(raw) {
        const id = raw?.id || raw?.vid ? String(raw.id || raw.vid) : "";
        return {
          id: id,
          songmid: id,
          hash: id,
          name: raw?.name ? String(raw.name) : "未知歌曲",
          singer: raw?.artists ? String(raw.artists) : "未知歌手",
          albumName: raw?.album ? String(raw.album) : "",
          duration: raw?.duration ? Math.floor(Number(raw.duration) / 1000) : 0,
          pic: raw?.cover || raw?.pic ? String(raw.cover || raw.pic) : "",
          _raw: raw || {}
        };
      }
      
      // 获取响应数据中的第一条记录
      function getFirstData(response) {
        const data = response?.data;
        if (Array.isArray(data)) return data[0] || null;
        if (data && typeof data === "object" && data[0]) return data[0];
        return null;
      }
      
      // 汽水VIP搜索
      async function qishuiSearch(keyword, page = 1, pageSize = 30) {
        if (!keyword) return {
          isEnd: true,
          list: []
        };
        const res = await httpGetWithFallback(QISHUI_API_HTTPS, {
          act: "search",
          keywords: keyword,
          page: page,
          pagesize: pageSize,
          type: "music"
        }, 15000);
        const list = Array.isArray(res?.data?.lists) ? res.data.lists : [];
        return {
          isEnd: list.length < pageSize,
          list: list.map(normalizeSongInfo),
          total: res?.data?.total ? Number(res.data.total) : list.length
        };
      }
      
      // 汽水VIP获取播放URL
      async function qishuiGetUrl(songInfo, quality) {
        const songId = getSongId(songInfo);
        if (!songId) throw new Error("汽水VIP缺少歌曲ID");
        const res = await httpGetWithFallback(QISHUI_API_HTTPS, {
          act: "song",
          id: songId,
          quality: normalizeQuality(quality)
        }, 20000);
        const data = getFirstData(res);
        if (!data?.url) throw new Error("汽水VIP未返回可用URL");
        if (data.ekey) {
          const proxyRes = await httpPost(QISHUI_PROXY_API, {
            url: data.url,
            key: data.ekey,
            filename: data.filename || "KMusic",
            ext: data.fileExtension ? String(data.fileExtension) : "aac"
          }, 60000);
          if (Number(proxyRes?.code) === 200 && proxyRes?.url) return String(proxyRes.url);
          throw new Error("汽水VIP代理解密失败");
        }
        return String(data.url);
      }
      
      // 汽水VIP获取歌词
      async function qishuiGetLyric(songInfo) {
        const songId = getSongId(songInfo);
        if (!songId) return {
          lyric: ""
        };
        const res = await httpGetWithFallback(QISHUI_API_HTTPS, {
          act: "song",
          id: songId
        }, 15000);
        const data = getFirstData(res);
        return {
          lyric: data?.lyric ? String(data.lyric) : ""
        };
      }
      
      // 汽水VIP统一处理器
      async function qishuiHandler(action, params = {}) {
        if (action === "musicSearch" || action === "search") {
          const keyword = params?.keyword ? String(params.keyword) : "";
          const page = params?.page ? Number(params.page) : 1;
          const pageSize = params?.pagesize ? Number(params.pagesize) : 30;
          return qishuiSearch(keyword, page, pageSize);
        }
        if (action === "musicUrl") {
          if (!params?.musicInfo) throw new Error("请求参数不完整");
          const url = await qishuiGetUrl(params.musicInfo, params.type);
          return validateUrl(url, "汽水VIP");
        }
        if (action === "lyric") return qishuiGetLyric(params?.musicInfo || {});
        throw new Error("action not support");
      }
      
      // 从支持的音质列表中选择最接近的音质（优化版）
      function selectQuality(requestedQuality, supportedQualities) {
        const qualityOrder = ["24bit", "flac", "flac24bit", "320k", "192k", "128k"];
        const req = String(requestedQuality || "128k").toLowerCase();
        if (supportedQualities.includes(req)) return req;
        // 降级：从请求音质向后查找第一个支持的
        let startIndex = qualityOrder.indexOf(req);
        if (startIndex === -1) startIndex = qualityOrder.length - 1;
        for (let i = startIndex; i < qualityOrder.length; i++) {
          if (supportedQualities.includes(qualityOrder[i])) return qualityOrder[i];
        }
        // 若没有匹配则返回最低音质
        for (let i = qualityOrder.length - 1; i >= 0; i--) {
          if (supportedQualities.includes(qualityOrder[i])) return qualityOrder[i];
        }
        return supportedQualities[0] || "128k";
      }
      
      // 标准化关键词（去除括号、空格、特殊字符，转小写）
      function normalizeKeyword(keyword) {
        if (!keyword) return "";
        return String(keyword).replace(/\(\s*Live\s*\)/gi, "").replace(/\([^)]*\)/g, "").replace(/\s+/g, "").replace(/[^\w\u4e00-\u9fa5]/g, "").trim().toLowerCase();
      }
      
      // 构建搜索关键词列表
      function buildSearchKeywords(songInfo) {
        const keywords = [];
        const name = songInfo?.name || "";
        const album = songInfo?.albumName || songInfo?.album || "";
        const singer = songInfo?.singer || "";
        if (name && album) {
          const kw = normalizeKeyword(name + album);
          if (kw) keywords.push({
            keyword: kw,
            strict: true
          });
        }
        if (name && singer) {
          const kw = normalizeKeyword(name + singer);
          if (kw) keywords.push({
            keyword: kw,
            strict: true
          });
        }
        if (name) {
          const kw = normalizeKeyword(name);
          if (kw) keywords.push({
            keyword: kw,
            strict: false
          });
        }
        return keywords;
      }
      
      // 标题模糊匹配（双向包含）
      function titleMatch(a, b) {
        const na = normalizeKeyword(a);
        const nb = normalizeKeyword(b);
        if (!na || !nb) return true;
        return na.includes(nb) || nb.includes(na);
      }
      
      // 歌曲信息匹配
      function songInfoMatch(responseData, songInfo) {
        const song = responseData?.song || responseData?.data?.song || "";
        const singer = responseData?.singer || responseData?.data?.singer || "";
        const album = responseData?.album || responseData?.data?.album || "";
        if (!titleMatch(song, songInfo?.name || "")) return false;
        if (songInfo?.singer && singer && !titleMatch(singer, songInfo.singer)) return false;
        if ((songInfo?.albumName || songInfo?.album) && album && !titleMatch(album, songInfo.albumName || songInfo.album)) return false;
        return true;
      }
      function songTitleMatch(responseData, songInfo) {
        if (!titleMatch(responseData?.title || "", songInfo?.name || "")) return false;
        if (songInfo?.singer && responseData?.artist && !titleMatch(responseData.artist, songInfo.singer)) return false;
        if ((songInfo?.albumName || songInfo?.album) && responseData?.album && !titleMatch(responseData.album, songInfo.albumName || songInfo.album)) return false;
        return true;
      }
      function parseMessageSongInfo(message) {
        if (!message) return null;
        const result = {};
        const lines = String(message).split("\n");
        for (const line of lines) {
          if (line.startsWith("歌名：")) result.song = line.replace("歌名：", "").trim();
          if (line.startsWith("歌手：")) result.singer = line.replace("歌手：", "").trim();
          if (line.startsWith("专辑：")) result.album = line.replace("专辑：", "").trim();
        }
        return result.song ? result : null;
      }
      function getHashOrMid(songInfo) {
        return songInfo?.hash ?? songInfo?.songmid ?? songInfo?.id ?? null;
      }
      function getQQSongId(songInfo) {
        const mid = songInfo?.meta?.qq?.mid || songInfo?.meta?.mid || songInfo?.songmid || (typeof songInfo?.id === "string" && !/^\d+$/.test(songInfo.id) ? songInfo.id : null);
        if (mid) return {
          type: "mid",
          value: mid
        };
        const songid = songInfo?.meta?.qq?.songid || songInfo?.meta?.songid || (typeof songInfo?.id === "number" ? songInfo.id : typeof songInfo?.id === "string" && /^\d+$/.test(songInfo.id) ? Number(songInfo.id) : null);
        if (songid) return {
          type: "songid",
          value: songid
        };
        return null;
      }
      function qualityToNetease(quality) {
        const q = String(quality || "128k").toLowerCase();
        if (q === "flac" || q === "flac24bit" || q === "hires" || q === "master" || q === "atmos") return "lossless";
        if (q === "320k" || q === "192k") return "exhigh";
        return "standard";
      }
      function getPlatformSongId(platform, songInfo) {
        if (platform === "kg") return songInfo?.hash || songInfo?.songmid || songInfo?.id || songInfo?.rid || songInfo?.mid || null;
        if (platform === "tx") {
          const qqId = getQQSongId(songInfo);
          if (qqId?.value) return qqId.value;
        }
        return songInfo?.songmid || songInfo?.id || songInfo?.songId || songInfo?.rid || songInfo?.hash || null;
      }
      function buildTemplateUrl(platform, quality, songInfo, templates, sourceName) {
        const template = templates[platform];
        if (!template) throw new Error(sourceName + "不支持该平台");
        const songId = getPlatformSongId(platform, songInfo);
        if (!songId) throw new Error(sourceName + "缺少songId");
        const level = qualityToNetease(quality);
        return template.replace("{id}", encodeURIComponent(String(songId))).replace("{level}", encodeURIComponent(level));
      }
      function buildCacheKey(prefix, songInfo, quality = "") {
        const name = songInfo?.name || "";
        const singer = songInfo?.singer || "";
        const album = songInfo?.albumName || songInfo?.album || "";
        return `${prefix}_${name}_${singer}_${album}_${quality}`;
      }
      function getCachedUrl(cacheKey) {
        const entry = urlCache.get(cacheKey);
        if (!entry) return null;
        if (Date.now() - entry.timestamp >= CACHE_TTL_MS) {
          urlCache.delete(cacheKey);
          return null;
        }
        return entry.url;
      }
      function setCachedUrl(cacheKey, url) {
        urlCache.set(cacheKey, {
          url: url,
          timestamp: Date.now()
        });
        if (urlCache.size > CACHE_MAX_SIZE) {
          const oldestKey = urlCache.keys().next().value;
          if (oldestKey !== undefined) urlCache.delete(oldestKey);
        }
      }
      function validateUrl(url, sourceName) {
        if (!url || typeof url !== "string") throw new Error(sourceName + "返回空URL");
        if (!HTTP_URL_REGEX.test(url.trim())) throw new Error(sourceName + "非法URL格式");
        return url;
      }
      function getMobileUserAgent() {
        return "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
      }
      
      // 星海主API
      async function xinghaiMainGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_XINGHAI[platform];
        if (!source) throw new Error("星海主API不支持该平台");
        const id = songId ?? getHashOrMid(songInfo);
        if (!id) throw new Error("缺少songId");
        const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac", "flac24bit"]);
        const br = QUALITY_TO_BR[selectedQuality];
        if (!br) throw new Error("星海主API音质映射失败");
        const url = `${XINGHAI_MAIN_API}&types=url&source=${source}&id=${encodeURIComponent(id)}&br=${br}`;
        const res = await httpRequest(url, {
          method: "GET",
          headers: {
            "User-Agent": "LX-Music-Mobile",
            Accept: "application/json"
          }
        });
        const body = res.body;
        if (!body || typeof body !== "object" || !body.url) throw new Error(body?.message || "星海主API未返回可用URL");
        return body.url;
      }
      
      // 星海备API（修复：真正请求并返回URL）
      async function xinghaiBackupGetUrl(platform, songId, quality, songInfo) {
        const source = PLATFORM_TO_XINGHAI_BACKUP[platform];
        if (!source) throw new Error("星海备API不支持该平台");
        const id = songId ?? getHashOrMid(songInfo);
        if (!id) throw new Error("缺少songId");
        const selectedQuality = selectQuality(quality, ["128k", "192k", "320k", "flac", "flac24bit"]);
        const reqUrl = `${XINGHAI_BACKUP_API}?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}&type=url&br=${encodeURIComponent(selectedQuality)}`;
        const res = await httpGet(reqUrl);
        if (!res?.url) throw new Error("星海备API未返回url字段");
        return res.url;
      }
      
      // Huibq API（增加可用性检查）
      async function huibqGetUrl(platform, songId, quality, songInfo) {
        if (!HUIBQ_API || !HUIBQ_REQUEST_KEY) throw new Error("Huibq未配置");
        const hashOrMid = songInfo?.hash ?? songInfo?.songmid;
        if (!hashOrMid) throw new Error("Huibq缺少hash/songmid");
        const selectedQuality = selectQuality(quality, ["320k", "128k"]);
        const url = `${HUIBQ_API}/url/${platform}/${encodeURIComponent(hashOrMid)}/${encodeURIComponent(selectedQuality)}`;
        const res = await httpRequest(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": getMobileUserAgent(),
            "X-Request-Key": HUIBQ_REQUEST_KEY
          }
        });
        const body = res.body;
        if (!body || typeof body !== "object" || isNaN(Number(body.code))) throw new Error("Huibq返回无效");
        switch (Number(body.code)) {
          case 0:
            if (!body.url) throw new Error("Huibq返回空URL");
            return body.url;
          case 1:
            throw new Error("Huibq block ip");
          case 2:
            throw new Error("Huibq get music url failed");
          case 4:
            throw new Error("Huibq too many requests");
          case 5:
            throw new Error("Huibq param error");
          case 6:
            throw new Error("Huibq internal server error");
          default:
            throw new Error(body.message || "Huibq unknown error");
        }
      }
      
      // 聆川API（增加可用性检查）
      async function lingchuanGetUrl(platform, songId, quality, songInfo) {
        if (!LINGCHUAN_API) throw new Error("聆川未配置");
        const hashOrMid = songInfo?.hash ?? songInfo?.songmid;
        if (!hashOrMid) throw new Error("聆川缺少hash/songmid");
        const selectedQuality = selectQuality(quality, ["320k", "128k"]);
        const url = `${LINGCHUAN_API}/url?source=${encodeURIComponent(platform)}&songId=${encodeURIComponent(hashOrMid)}&quality=${encodeURIComponent(selectedQuality)}`;
        const res = await httpRequest(url, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": getMobileUserAgent()
          },
          follow_max: 5
        });
        const body = res.body;
        if (!body || typeof body !== "object" || isNaN(Number(body.code))) throw new Error("聆川返回无效");
        switch (Number(body.code)) {
          case 200:
            if (!body.url) throw new Error("聆川返回空URL");
            return body.url;
          case 403:
            throw new Error("聆川403 forbidden");
          case 429:
            throw new Error("聆川429 rate limit");
          case 500:
            throw new Error("聆川500 " + (body.message || "server error"));
          default:
            throw new Error(body.message || "聆川未知错误");
        }
      }
      
      // 溯音QQ
      function extractQQUrl(responseData) {
        if (responseData?.music) return responseData.music;
        if (responseData?.url) return responseData.url;
        if (responseData?.message) {
          const match = String(responseData.message).match(/音频链接[：:](.+?)(?:\n|$)/);
          if (match && match[1]) return match[1].trim();
        }
        throw new Error("溯音QQ未找到音频链接");
      }
      function qualityToSuyinQQ(quality) {
        const q = String(quality || "128k").toLowerCase();
        if (q === "flac24bit") return "hires";
        if (q === "192k") return "320k";
        if (QUALITY_TO_SUYIN_QQ_BR[q]) return q;
        return "128k";
      }
      async function suyinQQGetUrl(songInfo, quality) {
        const qqId = getQQSongId(songInfo);
        if (!qqId) throw new Error("溯音QQ缺少songmid/id");
        const normalizedQuality = qualityToSuyinQQ(quality);
        const startBr = QUALITY_TO_SUYIN_QQ_BR[normalizedQuality] || QUALITY_TO_SUYIN_QQ_BR["128k"];
        const brList = [startBr, 4, 5, 7].filter((v, i, a) => a.indexOf(v) === i && v >= startBr).sort((a, b) => a - b);
        let lastError = null;
        for (const br of brList) {
          try {
            const reqParams = {
              key: SUYIN_QQ_KEY,
              type: "json",
              br: br,
              n: 1
            };
            if (qqId.type === "mid") reqParams.mid = qqId.value;else reqParams.songid = qqId.value;
            const res = await httpGet(SUYIN_QQ_API, reqParams);
            return extractQQUrl(res);
          } catch (e) {
            lastError = e;
          }
        }
        throw new Error("溯音QQ全部音质尝试失败: " + (lastError?.message || "unknown"));
      }
      async function suyin163GetUrl(songInfo) {
        const id = songInfo?.songmid || songInfo?.id;
        if (!id) throw new Error("溯音163缺少songmid/id");
        const res = await httpGet(SUYIN_163_API, {
          id: id
        });
        if (res?.code === 0 && res?.data) {
          const item = Array.isArray(res.data) ? res.data[0] : res.data;
          if (item?.url) return item.url;
        }
        throw new Error("溯音163获取失败");
      }
      async function suyinKuwoSearch(keyword, br, songInfo = null) {
        const res = await httpGet(SUYIN_KUWO_API, {
          msg: keyword,
          n: 1,
          br: br
        });
        if (res?.data?.url) {
          if (songInfo && !songInfoMatch(res, songInfo)) throw new Error("溯音酷我歌曲信息不匹配");
          return res.data.url;
        }
        if (res?.message) {
          const match = String(res.message).match(/音乐链接[：:](\S+)/);
          if (match && match[1]) {
            if (songInfo) {
              const parsed = parseMessageSongInfo(res.message);
              if (parsed && !songInfoMatch(parsed, songInfo)) throw new Error("溯音酷我歌曲信息不匹配");
            }
            return match[1];
          }
        }
        throw new Error("溯音酷我未找到链接");
      }
      async function suyinKuwoGetUrl(songInfo, quality) {
        if (!songInfo?.name) throw new Error("溯音酷我需要歌曲名");
        const cacheKey = buildCacheKey("kw", songInfo, quality);
        const cached = getCachedUrl(cacheKey);
        if (cached) return cached;
        const selectedQuality = selectQuality(quality, ["flac", "320k", "128k"]);
        const br = QUALITY_TO_KUWO_BR[selectedQuality] || 1;
        const keywords = buildSearchKeywords(songInfo);
        let lastError = null;
        for (const item of keywords) {
          try {
            const url = await suyinKuwoSearch(item.keyword, br, item.strict ? songInfo : null);
            if (url) {
              setCachedUrl(cacheKey, url);
              return url;
            }
          } catch (e) {
            lastError = e;
          }
        }
        throw new Error("溯音酷我失败: " + (lastError?.message || "unknown"));
      }
      
      // 溯音咪咕（修复：返回URL而非对象）
      async function suyinMiguGetUrl(songInfo) {
        if (!songInfo?.name) throw new Error("溯音咪咕需要歌曲名");
        const cacheKey = buildCacheKey("mg", songInfo);
        const cached = getCachedUrl(cacheKey);
        if (cached) return cached;
        const keywords = buildSearchKeywords(songInfo);
        let lastError = null;
        for (const item of keywords) {
          try {
            const res = await httpGet(SUYIN_MIGU_API, {
              gm: item.keyword,
              n: 1,
              num: 1,
              type: "json"
            });
            if (res?.code === 200 && res?.musicInfo) {
              if (item.strict && !songTitleMatch(res, songInfo)) throw new Error("溯音咪咕歌曲信息不匹配");
              const url = res.musicInfo; // 假设 musicInfo 字段直接是 URL
              if (url && HTTP_URL_REGEX.test(url)) {
                setCachedUrl(cacheKey, url);
                return url;
              }
            }
          } catch (e) {
            lastError = e;
          }
        }
        throw new Error("溯音咪咕失败: " + (lastError?.message || "unknown"));
      }
      
      // 溯音统一入口
      async function suyinGetUrl(platform, songId, quality, songInfo) {
        switch (platform) {
          case "tx":
            return suyinQQGetUrl(songInfo, quality);
          case "wy":
            return suyin163GetUrl(songInfo);
          case "kw":
            return suyinKuwoGetUrl(songInfo, quality);
          case "mg":
            return suyinMiguGetUrl(songInfo);
          default:
            throw new Error("溯音不支持该平台");
        }
      }
      
      // 长青SVIP
      async function changqingGetUrl(platform, songId, quality, songInfo) {
        return buildTemplateUrl(platform, quality, songInfo, CHANGQING_URL_TEMPLATES, "长青SVIP");
      }
      
      // 念心SVIP
      async function nianxinGetUrl(platform, songId, quality, songInfo) {
        return buildTemplateUrl(platform, quality, songInfo, NIANXIN_URL_TEMPLATES, "念心SVIP");
      }
      
      // 音源处理器注册表（动态过滤掉未配置的源）
      const SOURCE_HANDLERS = {};
      function initSourceHandlers() {
        const handlers = {
          xinghai: {
            name: "星海主",
            fn: xinghaiMainGetUrl,
            required: true
          },
          xinghaiBackup: {
            name: "星海备",
            fn: xinghaiBackupGetUrl,
            required: true
          },
          suyinQQ: {
            name: "溯音QQ",
            fn: (p, sid, q, si) => suyinGetUrl("tx", sid, q, si),
            required: true
          },
          suyin163: {
            name: "溯音163",
            fn: (p, sid, q, si) => suyinGetUrl("wy", sid, q, si),
            required: true
          },
          suyinSearch: {
            name: "溯音搜索",
            fn: (p, sid, q, si) => suyinGetUrl("kw", sid, q, si),
            required: true
          },
          suyinMigu: {
            name: "溯音咪咕",
            fn: (p, sid, q, si) => suyinGetUrl("mg", sid, q, si),
            required: true
          },
          changqingVip: {
            name: "长青SVIP",
            fn: changqingGetUrl,
            required: true
          },
          nianxinVip: {
            name: "念心SVIP",
            fn: nianxinGetUrl,
            required: true
          }
        };
        // Huibq 和聆川为可选源
        if (HUIBQ_API && HUIBQ_REQUEST_KEY) handlers.huibq = {
          name: "Huibq",
          fn: huibqGetUrl,
          required: false
        };
        if (LINGCHUAN_API) handlers.lingchuan = {
          name: "聆川",
          fn: lingchuanGetUrl,
          required: false
        };
        Object.assign(SOURCE_HANDLERS, handlers);
      }
      initSourceHandlers();
      
      // 构建音源链
      function buildSourceChain(platform, isHires, quality) {
        const chain = [];
        const order = ["xinghai", "huibq", "suyin163", "suyinQQ", "suyinSearch", "suyinMigu", "lingchuan", "changqingVip", "nianxinVip", "xinghaiBackup"];
        for (const key of order) {
          const handler = SOURCE_HANDLERS[key];
          if (!handler) continue;
          // 平台过滤：某些源只支持特定平台
          if (key === "suyin163" && platform !== "wy") continue;
          if (key === "suyinQQ" && platform !== "tx") continue;
          if (key === "suyinSearch" && platform !== "kw") continue;
          if (key === "suyinMigu" && platform !== "mg") continue;
          chain.push(handler);
        }
        return chain;
      }
      
      // 带fallback获取URL（并发尝试前3个，失败后顺序尝试剩余）
      async function getUrlWithFallback(platform, songInfo, quality) {
        if (!platform || typeof platform !== "string" || !PLATFORM_QUALITIES[platform]) throw new Error("无效的平台参数");
        if (!songInfo || typeof songInfo !== "object") throw new Error("无效的歌曲信息");
        const resolvedQuality = quality || "128k";
        const selectedQuality = selectQuality(resolvedQuality, PLATFORM_QUALITIES[platform]);
        const songId = getHashOrMid(songInfo);
        const isHires = HIRES_QUALITY_SET.has(resolvedQuality.toLowerCase());
        const chain = buildSourceChain(platform, isHires, selectedQuality);
        if (!chain.length) throw new Error("未找到可用fallback链");
        const errors = [];
        // 并发尝试前3个
        try {
          const url = await Promise.any(chain.slice(0, 3).map(async handler => {
            const result = await handler.fn(platform, songId, selectedQuality, songInfo);
            return validateUrl(result, handler.name);
          }));
          if (url) return url;
        } catch (e) {
          if (e.errors) e.errors.forEach(err => errors.push(err.message));else errors.push(e.message);
        }
        // 顺序尝试剩余
        for (const handler of chain.slice(3)) {
          try {
            const result = await handler.fn(platform, songId, selectedQuality, songInfo);
            return validateUrl(result, handler.name);
          } catch (e) {
            errors.push(`${handler.name}: ${e.message}`);
            continue;
          }
        }
        throw new Error("所有源均失败: " + errors.join("; "));
      }
      
      // --- 音源配置与注册 ---
      const sourceConfig = {};
      const PLATFORM_NAMES = {
        wy: "网易云音乐",
        tx: "QQ音乐",
        kw: "酷我音乐",
        kg: "酷狗音乐",
        mg: "咪咕音乐"
      };
      Object.keys(PLATFORM_QUALITIES).forEach(platform => {
        sourceConfig[platform] = {
          name: PLATFORM_NAMES[platform],
          type: "music",
          actions: ["musicUrl"],
          qualitys: PLATFORM_QUALITIES[platform]
        };
      });
      sourceConfig[QISHUI_SOURCE_ID] = {
        name: QISHUI_SOURCE_NAME,
        type: "music",
        actions: ["musicSearch", "musicUrl", "lyric"],
        qualitys: ["128k", "320k", "flac", "flac24bit"]
      };
      
      // --- 事件监听 ---
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        if (source === QISHUI_SOURCE_ID) return qishuiHandler(action, info);
        if (action !== "musicUrl") return Promise.reject(new Error("action not support"));
        if (!info?.musicInfo) return Promise.reject(new Error("请求参数不完整"));
        return getUrlWithFallback(source, info.musicInfo, info.type || "128k").then(url => Promise.resolve(url)).catch(err => Promise.reject(err));
      });
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources: sourceConfig
      });
      noop("初始化完成，聚合音源 v9.7 已就绪");
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [15]: 墨澜聚合音源 v2.0.0.js  (平台: kw, kg, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 14
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 墨澜聚合音源
       * @description 全平台支持flac，酷狗、QQ、网易支持母带（全用的是别人的接口，类似于全豆要）
       * @version 2.0.0
       * @author 白姬9527(2449067834)
       *
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        utils,
        env,
        version,
        currentScriptInfo
      } = __lx_proxy__;
      
      // ==================== 解析头部注解 ====================
      
      const currentScript = currentScriptInfo ? currentScriptInfo.rawScript : typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '';
      const parseHeader = str => {
        const comment = /^\/\*!(?:.|\n)+?\*\//.exec(str)?.[0];
        if (!comment) return {};
        const result = {};
        const pairs = [{
          key: 'tx_cookie',
          regex: /\*\s*@tx_cookie\s+(.+)/
        }, {
          key: 'wy_cookie',
          regex: /\*\s*@wy_cookie\s+(.+)/
        }];
        for (const {
          key,
          regex
        } of pairs) {
          const match = regex.exec(comment);
          const val = match?.[1]?.trim();
          result[key] = !val || val === 'null' ? '' : val;
        }
        return result;
      };
      const config = parseHeader(currentScript);
      const TX_COOKIE = config.tx_cookie;
      const WY_COOKIE = config.wy_cookie;
      const HAS_TX_COOKIE = !!TX_COOKIE;
      const HAS_WY_COOKIE = !!WY_COOKIE;
      
      // ==================== 音质列表（参照ikun音源格式） ====================
      
      const MUSIC_QUALITY = JSON.parse(HAS_TX_COOKIE && HAS_WY_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_TX_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_WY_COOKIE ? '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}');
      const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);
      
      // ==================== 工具函数 ====================
      
      const httpFetch = (url, options = {
        method: 'GET'
      }) => new Promise((resolve, reject) => {
        request(url, options, (err, resp) => {
          if (err) return reject(err);
          let body = resp.body;
          if (typeof body === 'string') {
            const trimmed = body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
              try {
                body = JSON.parse(trimmed);
              } catch (e) {}
            }
          }
          resolve({
            body,
            statusCode: resp.statusCode,
            headers: resp.headers || {}
          });
        });
      });
      const md5 = str => utils.crypto.md5(str);
      const randomGuid = () => {
        const hex = '0123456789abcdef';
        let guid = '';
        for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
        return guid;
      };
      const aesEncrypt = (data, key, iv, mode) => {
        if (!version) mode = mode.split('-').pop();
        return utils.crypto.aesEncrypt(data, mode, key, iv);
      };
      const buf2hex = buffer => {
        return version ? utils.buffer.bufToString(buffer, 'hex') : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
      };
      const wyEapi = (url, object) => {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt');
        const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest;
        return {
          params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase()
        };
      };
      const objToForm = obj => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
      const extractUrl = (obj, paths) => {
        for (const path of paths) {
          let val = obj;
          for (const key of path) {
            if (val == null) {
              val = undefined;
              break;
            }
            val = val[key];
          }
          if (Array.isArray(val)) val = val[0];
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val;
          if (typeof val === 'string' && val.startsWith('//')) return 'https:' + val;
        }
        return '';
      };
      const cleanUrl = url => {
        if (!url) return '';
        const s = String(url).replace(/\\?u0026/gi, '&').replace(/\\&/g, '&').replace(/\$/g, '&');
        const idx = s.indexOf('?');
        return idx > 0 ? s.substring(0, idx) : s;
      };
      
      // ==================== 通用音质转Level工具 ====================
      
      const qualityToLevel = quality => {
        const map = {
          '128k': 'standard',
          '192k': 'standard',
          '320k': 'exhigh',
          'flac': 'lossless',
          'flac24bit': 'lossless',
          'hires': 'lossless',
          'atmos': 'lossless',
          'atmos_plus': 'lossless',
          'master': 'lossless'
        };
        return map[quality] || 'standard';
      };
      
      // ==================== QQ 音乐音质文件映射 ====================
      
      const TX_FILE_CONFIG = {
        '128k': {
          s: 'M500',
          e: '.mp3',
          br: '128k'
        },
        '320k': {
          s: 'M800',
          e: '.mp3',
          br: '320k'
        },
        flac: {
          s: 'F000',
          e: '.flac',
          br: 'flac'
        },
        flac24bit: {
          s: 'AI00',
          e: '.flac',
          br: 'flac24bit'
        },
        hires: {
          s: 'AI00',
          e: '.flac',
          br: 'hires'
        },
        atmos: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        atmos_plus: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        master: {
          s: 'AI00',
          e: '.flac',
          br: 'master'
        }
      };
      
      // ==================== 网易云音质映射 ====================
      
      const WY_LEVEL_MAP = {
        '128k': 'standard',
        '320k': 'exhigh',
        flac: 'lossless',
        flac24bit: 'hires',
        hires: 'hires',
        atmos: 'sky',
        master: 'jymaster'
      };
      const WY_BR_MAP = {
        '128k': 128000,
        '320k': 320000,
        flac: 999000,
        flac24bit: 999000,
        hires: 999001,
        atmos: 999002,
        master: 999003
      };
      
      // ==================== 酷我音质Level映射（笒鬼鬼等专用） ====================
      
      const KW_LEVEL_MAP = {
        '128k': '128k',
        '192k': '128k',
        '320k': '320k',
        flac: 'lossless',
        flac24bit: 'lossless'
      };
      
      // ==================== Fish API 签名工具 ====================
      
      const FISH_DOMAIN = 'music.gdstudio.xyz';
      const FISH_VERSION = '20260510';
      const fishSign = async secret => {
        const timeRes = await httpFetch('https://' + FISH_DOMAIN + '/time', {
          method: 'GET',
          timeout: 10000
        });
        const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9);
        const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret;
        return md5(signInput).slice(-8).toUpperCase();
      };
      const fishPost = async (params, secret) => {
        const sign = await fishSign(secret);
        params.s = sign;
        const body = objToForm(params);
        const res = await httpFetch('https://' + FISH_DOMAIN + '/api.php', {
          method: 'POST',
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Origin: 'https://' + FISH_DOMAIN,
            Referer: 'https://' + FISH_DOMAIN + '/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body
        });
        return res.body;
      };
      
      // ==================== QQ音乐 后端接口列表（按优先级排列） ====================
      
      const TX_BACKENDS = [
      // === 后端1: QQ官方接口（带Cookie可解锁VIP） ===
      {
        name: 'QQ官方',
        fetch: async (songmid, quality) => {
          const fileInfo = TX_FILE_CONFIG[quality];
          if (!fileInfo) throw new Error('不支持的音质');
          const guid = randomGuid();
          const file = fileInfo.s + songmid + fileInfo.e;
          const reqData = {
            req_0: {
              module: 'vkey.GetVkeyServer',
              method: 'CgiGetVkey',
              param: {
                filename: [file],
                guid,
                songmid: [songmid],
                songtype: [0],
                uin: '0',
                loginflag: HAS_TX_COOKIE ? 1 : 0,
                platform: '20'
              }
            },
            loginUin: '0',
            comm: {
              uin: '0',
              format: 'json',
              ct: 24,
              cv: 0
            }
          };
          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://y.qq.com/'
          };
          if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE;
          const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            headers,
            body: JSON.stringify(reqData)
          });
          const d = res.body;
          if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
            const sip = d.req_0.data.sip || ['https://isure.stream.qqmusic.qq.com/'];
            return sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl;
          }
          throw new Error('QQ官方: 无数据');
        }
      },
      // === 后端6: vkeys API ===
      {
        name: 'vkeys',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          throw new Error('vkeys: 无数据');
        }
      },
      // === 后端7: vkeys 旧版API ===
      {
        name: 'vkeys旧版',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys旧版 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/music/tencent/song/link?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('vkeys旧版: 无数据');
        }
      },
      // === 后端8: 柳云API（liuyunidc） ===
      {
        name: '柳云API',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '128k',
            '320k': '320k',
            flac: 'flac',
            flac24bit: 'master',
            hires: 'atmos',
            atmos: 'atmos',
            atmos_plus: 'atmos',
            master: 'master'
          };
          const q = qualityMap[quality] || '128k';
          // 先获取card密钥
          let card = '';
          try {
            const cardRes = await httpFetch('https://github.com/CharlesPikachu/musicdl/releases/download/keys/baimusic.txt', {
              method: 'GET',
              timeout: 5000
            });
            card = String(cardRes.body || '').trim();
          } catch (e) {}
          const res = await httpFetch('https://api.liuyunidc.cn/baimusic/musicurl.php?source=tx&musicId=' + songmid + '&quality=' + q + (card ? '&card=' + encodeURIComponent(card) : ''), {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'http://api.liuyunidc.cn/baimusic/'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('柳云API: 无数据');
        }
      },
      // === 后端9: 317ak API ===
      {
        name: '317ak',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '5',
            '320k': '6',
            flac: '8',
            flac24bit: '7',
            hires: '9',
            atmos: '10',
            atmos_plus: '10',
            master: '10'
          };
          const br = brMap[quality] || '5';
          const res = await httpFetch('https://api.317ak.cn/api/yinyue/qqyinyue?ckey=ZK76QJCIH5PPICJOOXUH&i=' + songmid + '&br=' + br + '&type=json&lrc=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('317ak: 无数据');
        }
      },
      // === 后端10: nki.pw API（flac用） ===
      {
        name: 'nki',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('nki仅支持flac');
          const apiKeys = ['28fece925439b052792a97989c870ced3803a71c6b534f71e5a5338b2d31ef8', 'c4c4f5fc36bad4cacb98839e14fea40277b35ea2eb1babdad7bbde128400f3b1'];
          const errors = [];
          for (const key of apiKeys) {
            try {
              const res = await httpFetch('https://api.nki.pw/API/music_open_api.php?mid=' + songmid + '&apikey=' + key, {
                method: 'GET',
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  Accept: 'application/json'
                }
              });
              const d = res.body;
              const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
              if (url) return url;
            } catch (e) {
              errors.push(e.message);
            }
          }
          throw new Error('nki: ' + errors.join(' | '));
        }
      },
      // === 后端11: tang.api.s01s.cn（flac用） ===
      {
        name: 'tang',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('tang仅支持flac');
          const res = await httpFetch('https://tang.api.s01s.cn/music_open_api.php?mid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
          if (url) return url;
          throw new Error('tang: 无数据');
        }
      },
      // === 后端14: 88.lxmusic（独家音源v3/v4） ===
      {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          try {
            const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/tx/' + songmid + '/' + quality, {
              method: 'GET',
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0',
                Accept: 'application/json',
                'x-request-key': 'lxmusic'
              }
            });
            const d = res.body;
            if (d && (d.code === 0 || d.code === 200) && d.data) return d.data;
            if (d && d.url) return d.url;
          } catch (e) {}
          // 降级到v3
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv3/url/tx/' + songmid + '/' + quality, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data) return d.data;
          throw new Error('lxmusic88: 无数据');
        }
      },
      // === 后端18: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=qq&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端19: ChKsZ 聚合API ===
      {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'qq',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端22: Fish API（gdstudio POST） ===
      {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'qq',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      },
      // === 后端23: 汽水VIP API ===
      {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      }];
      
      // ==================== 网易云音乐 后端接口列表（按优先级排列） ====================
      
      const WY_BACKENDS = [
      // === 后端1: 网易云eapi官方接口（带Cookie可解锁VIP） ===
      {
        name: '网易云官方',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url/v1';
          const eapiUrl = '/api/song/enhance/player/url/v1';
          const payload = {
            ids: [Number(songmid)],
            level,
            encodeType: 'flac',
            immerseType: 'c51'
          };
          const encrypted = wyEapi(eapiUrl, payload);
          let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!';
          if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue;
          const res = await httpFetch(targetUrl, {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
              Referer: 'https://music.163.com/',
              Cookie: cookieValue
            },
            form: encrypted
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url;
          if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）');
          throw new Error('网易云官方: 无数据');
        }
      },
      // === 后端2: 星海音乐源VIP接口（ChKsZ） ===
      {
        name: 'ChKsZ-VIP',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.chksz.top/api/163_music?id=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'https://cp.chksz.top/'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ-VIP: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端5: wyapi.toubiec.cn（洛雪音乐源用） ===
      {
        name: 'toubiec',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://wyapi.toubiec.cn/api/music/url', {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
              Origin: 'https://wyapi.toubiec.cn',
              Referer: 'https://wyapi.toubiec.cn/'
            },
            body: JSON.stringify({
              id: songmid,
              level
            })
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url;
          if (d && d.url) return d.url;
          throw new Error('toubiec: 无数据');
        }
      },
      // === 后端6: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=netease&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端9: api.bugpk.com（多平台聚合音源） ===
      {
        name: 'bugpk',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.bugpk.com/api/163_music?type=json&ids=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url'], ['data', 0, 'url']]);
          if (url) return url;
          throw new Error('bugpk: 无数据');
        }
      },
      // === 后端13: 88.lxmusic（独家音源v4） ===
      {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/wy/' + songmid + '/' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'x-request-key': 'lxmusic'
            }
          });
          const d = res.body;
          if (d && (d.code === 0 || d.code === 200)) {
            if (d.data) return d.data;
            if (d.url) return d.url;
          }
          throw new Error('lxmusic88: 无数据');
        }
      },
      // === 后端14: Fish API（gdstudio POST） ===
      {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'netease',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      },
      // === 后端17: 汽水VIP API ===
      {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      }];
      
      // ==================== 酷我音乐(kw) 后端接口列表（按优先级排列） ====================
      
      const KW_BACKENDS = [
      // === 后端8: 酷我官方接口（KuwoDES格式，surl=1） ===
      {
        name: '酷我官方',
        fetch: async (songmid, quality, musicInfo) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我官方 不支持的音质');
          let rid = musicInfo?.rid || '';
          if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '');
          if (!rid) rid = songmid;
          // 使用KuwoDES格式，surl=1让服务器返回surl字段
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('酷我官方: 无数据');
        }
      },
      // === 后端9: 酷我手机版（不同source标识） ===
      {
        name: '酷我手机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我手机版 不支持的音质');
          const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我手机版: 无数据');
        }
      },
      // === 后端10: 酷我车机版（不同source标识） ===
      {
        name: '酷我车机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我车机版 不支持的音质');
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk&type=convert_url_with_sign&br=' + br + '&sig=0&rid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我车机版: 无数据');
        }
      }];
      
      // ==================== 酷狗音乐(kg) 后端接口列表（按优先级排列） ====================
      
      const KG_BACKENDS = [
      // === 后端7: ChKsZ 聚合API ===
      {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'kg',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端9: 酷狗官方API（直接调用酷狗官方接口） ===
      {
        name: '酷狗官方',
        fetch: async (songmid, quality, musicInfo) => {
          const hash = musicInfo?.hash || songmid;
          const albumId = musicInfo?.albumId || '';
          const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://www.kugou.com/'
            }
          });
          const d = res.body;
          if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url;
          if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url;
          throw new Error('酷狗官方: 无数据');
        }
      },
      // === 后端12: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=kg&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      }];
      
      // ==================== 咪咕音乐(mg) 后端接口列表（按优先级排列） ====================
      
      const MG_BACKENDS = [
      // === 后端4: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '1000'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=migu&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端5: Migu直接源（Hei Music） ===
      {
        name: 'Migu直接源',
        fetch: async (songmid, quality) => {
          const level = qualityToLevel(quality);
          const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: 'https://music.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          if (d && d.url) return d.url;
          if (d && d.playUrl) return d.playUrl;
          throw new Error('Migu直接源: 无数据');
        }
      },
      // === 后端6: Migu API（Hei Music） ===
      {
        name: 'Migu API',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'PQ',
            '320k': 'HQ',
            flac: 'SQ',
            flac24bit: 'ZQ'
          };
          const level = levelMap[quality] || 'HQ';
          const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
              Referer: 'https://app.c.nf.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          throw new Error('Migu API: 无数据');
        }
      }];
      
      // ==================== 获取音乐URL（带多后端轮询） ====================
      
      const handleGetMusicUrl = async (source, musicInfo, quality) => {
        const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        if (!songId) throw new Error('无法获取歌曲ID');
        const backends = {
          wy: WY_BACKENDS,
          kw: KW_BACKENDS,
          kg: KG_BACKENDS,
          mg: MG_BACKENDS
        }[source];
        if (!backends) throw new Error('未知音源: ' + source);
        const errors = [];
        for (const backend of backends) {
          try {
            console.log('[' + source + '] 尝试后端: ' + backend.name + ' ID: ' + songId + ' 音质: ' + quality);
            const url = await backend.fetch(songId, quality, musicInfo);
            if (url) {
              console.log('[' + source + '] ' + backend.name + ' 成功');
              return url;
            }
          } catch (e) {
            errors.push(backend.name + ': ' + e.message);
            console.log('[' + source + '] ' + backend.name + ' 失败: ' + e.message);
          }
        }
        throw new Error('所有后端均失败（共' + backends.length + '个）\n' + errors.join('\n'));
      };
      
      // ==================== 注册请求事件 ====================
      
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        switch (action) {
          case 'musicUrl':
            return handleGetMusicUrl(source, info.musicInfo, info.type).then(data => Promise.resolve(data)).catch(err => Promise.reject(err));
          default:
            return Promise.reject('action not support: ' + action);
        }
      });
      
      // ==================== 初始化音源 ====================
      
      const musicSources = {};
      MUSIC_SOURCE.forEach(item => {
        const nameMap = {
          wy: '网易云音乐',
          kw: '酷我音乐',
          kg: '酷狗音乐',
          mg: '咪咕音乐'
        };
        musicSources[item] = {
          name: nameMap[item] || item,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: MUSIC_QUALITY[item]
        };
      });
      send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: false,
        sources: musicSources
      });
      console.log('[QQ音乐+网易云音乐+酷我+酷狗+咪咕聚合音源 v4.0.0] 已加载完成');
      console.log('[QQ音乐] 后端数: ' + TX_BACKENDS.length + ' Cookie: ' + (HAS_TX_COOKIE ? '已配置' : '未配置'));
      console.log('[网易云音乐] 后端数: ' + WY_BACKENDS.length + ' Cookie: ' + (HAS_WY_COOKIE ? '已配置' : '未配置'));
      console.log('[酷我音乐] 后端数: ' + KW_BACKENDS.length);
      console.log('[酷狗音乐] 后端数: ' + KG_BACKENDS.length);
      console.log('[咪咕音乐] 后端数: ' + MG_BACKENDS.length);
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [16]: 墨澜音乐源v2.3.0.js  (平台: kw, kg, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 15
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 墨澜聚合音源
       * @description 全平台支持flac，wy，qq，kw，kg支持母带
       * @version 2.3.0
       * @author 白姬9527(2449067834)
       * @homepage https://github.com/baiji6/molanyinyueyuan
       * @license MIT
       * @update 2026-08-16
       * @changelog
          1.修复wy音源
          2.新增QQ越权
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        utils,
        env,
        version,
        currentScriptInfo
      } = __lx_proxy__;
      
      // ==================== 解析头部注解 ====================
      
      const currentScript = currentScriptInfo ? currentScriptInfo.rawScript : typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '';
      const parseHeader = str => {
        const comment = /^\/\*!(?:.|\n)+?\*\//.exec(str)?.[0];
        if (!comment) return {};
        const result = {};
        const pairs = [{
          key: 'tx_cookie',
          regex: /\*\s*@tx_cookie\s+(.+)/
        }, {
          key: 'wy_cookie',
          regex: /\*\s*@wy_cookie\s+(.+)/
        }];
        for (const {
          key,
          regex
        } of pairs) {
          const match = regex.exec(comment);
          const val = match?.[1]?.trim();
          result[key] = !val || val === 'null' ? '' : val;
        }
        return result;
      };
      const config = parseHeader(currentScript);
      const TX_COOKIE = config.tx_cookie;
      const WY_COOKIE = config.wy_cookie;
      const HAS_TX_COOKIE = !!TX_COOKIE;
      const HAS_WY_COOKIE = !!WY_COOKIE;
      
      // ==================== 音质列表（参照ikun音源格式） ====================
      
      const MUSIC_QUALITY = JSON.parse(HAS_TX_COOKIE && HAS_WY_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_TX_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_WY_COOKIE ? '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}');
      const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);
      
      // ==================== 工具函数 ====================
      
      const httpFetch = (url, options = {
        method: 'GET'
      }) => new Promise((resolve, reject) => {
        request(url, options, (err, resp) => {
          if (err) return reject(err);
          let body = resp.body;
          if (typeof body === 'string') {
            const trimmed = body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
              try {
                body = JSON.parse(trimmed);
              } catch (e) {}
            }
          }
          resolve({
            body,
            statusCode: resp.statusCode,
            headers: resp.headers || {}
          });
        });
      });
      const md5 = str => utils.crypto.md5(str);
      const randomGuid = () => {
        const hex = '0123456789abcdef';
        let guid = '';
        for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
        return guid;
      };
      const aesEncrypt = (data, key, iv, mode) => {
        if (!version) mode = mode.split('-').pop();
        return utils.crypto.aesEncrypt(data, mode, key, iv);
      };
      const buf2hex = buffer => {
        return version ? utils.buffer.bufToString(buffer, 'hex') : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
      };
      const wyEapi = (url, object) => {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt');
        const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest;
        return {
          params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase()
        };
      };
      const objToForm = obj => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
      const extractUrl = (obj, paths) => {
        for (const path of paths) {
          let val = obj;
          for (const key of path) {
            if (val == null) {
              val = undefined;
              break;
            }
            val = val[key];
          }
          if (Array.isArray(val)) val = val[0];
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val;
          if (typeof val === 'string' && val.startsWith('//')) return 'https:' + val;
        }
        return '';
      };
      const cleanUrl = url => {
        if (!url) return '';
        const s = String(url).replace(/\\?u0026/gi, '&').replace(/\\&/g, '&').replace(/\$/g, '&');
        const idx = s.indexOf('?');
        return idx > 0 ? s.substring(0, idx) : s;
      };
      
      // ==================== 通用音质转Level工具 ====================
      
      const qualityToLevel = quality => {
        const map = {
          '128k': 'standard',
          '192k': 'standard',
          '320k': 'exhigh',
          'flac': 'lossless',
          'flac24bit': 'lossless',
          'hires': 'lossless',
          'atmos': 'lossless',
          'atmos_plus': 'lossless',
          'master': 'lossless'
        };
        return map[quality] || 'standard';
      };
      
      // ==================== SHA256 工具（用于 Hello World API 签名） ====================
      
      const sha256 = function () {
        var HEX_CHARS = '0123456789abcdef'.split('');
        function Sha256() {
          this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
          this.h0 = 0x6a09e667;
          this.h1 = 0xbb67ae85;
          this.h2 = 0x3c6ef372;
          this.h3 = 0xa54ff53a;
          this.h4 = 0x510e527f;
          this.h5 = 0x9b05688c;
          this.h6 = 0x1f83d9ab;
          this.h7 = 0x5be0cd19;
          this.block = this.start = this.bytes = this.hBytes = 0;
          this.finalized = this.hashed = false;
          this.first = true;
        }
        Sha256.prototype.update = function (message) {
          if (this.finalized) return;
          var notString = typeof message !== 'string';
          var blocks = this.blocks;
          for (var i = 0; i < message.length; i++) {
            if (this.hashed) {
              this.hashed = false;
              blocks[0] = this.block;
              blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            }
            var code = notString ? message[i] : message.charCodeAt(i);
            blocks[this.start >> 2] |= code << 24 - this.start % 4 * 8;
            this.start++;
            if (this.start === 64) {
              this.block = blocks[16];
              this.start = 0;
              this.hash();
              this.hashed = true;
            }
          }
          this.bytes += message.length;
          if (this.bytes > 4294967295) {
            this.hBytes += this.bytes / 4294967296 << 0;
            this.bytes = this.bytes % 4294967296;
          }
          return this;
        };
        Sha256.prototype.finalize = function () {
          if (this.finalized) return;
          this.finalized = true;
          var blocks = this.blocks;
          var i = this.start;
          blocks[16] = this.block;
          blocks[i >> 2] |= 0x80 << 24 - i % 4 * 8;
          this.block = blocks[16];
          if (i >= 56) {
            if (!this.hashed) this.hash();
            blocks[0] = this.block;
            blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
          }
          blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
          blocks[15] = this.bytes << 3;
          this.hash();
        };
        Sha256.prototype.hash = function () {
          var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
          var a = this.h0,
            b = this.h1,
            c = this.h2,
            d = this.h3,
            e = this.h4,
            f = this.h5,
            g = this.h6,
            h = this.h7,
            blocks = this.blocks;
          for (var j = 0; j < 64; j++) {
            if (j >= 16) {
              var w0 = blocks[j - 15];
              var w1 = blocks[j - 2];
              var s0 = (w0 >>> 7 | w0 << 25) ^ (w0 >>> 18 | w0 << 14) ^ w0 >>> 3;
              var s1 = (w1 >>> 17 | w1 << 15) ^ (w1 >>> 19 | w1 << 13) ^ w1 >>> 10;
              blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1;
            }
            var S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
            var ch = e & f ^ ~e & g;
            var temp1 = h + S1 + ch + K[j] + (blocks[j] >>> 0);
            var S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
            var maj = a & b ^ a & c ^ b & c;
            var temp2 = S0 + maj;
            h = g;
            g = f;
            f = e;
            e = d + temp1 >>> 0;
            d = c;
            c = b;
            b = a;
            a = temp1 + temp2 >>> 0;
          }
          this.h0 = this.h0 + a >>> 0;
          this.h1 = this.h1 + b >>> 0;
          this.h2 = this.h2 + c >>> 0;
          this.h3 = this.h3 + d >>> 0;
          this.h4 = this.h4 + e >>> 0;
          this.h5 = this.h5 + f >>> 0;
          this.h6 = this.h6 + g >>> 0;
          this.h7 = this.h7 + h >>> 0;
        };
        Sha256.prototype.hex = function () {
          this.finalize();
          var h0 = this.h0,
            h1 = this.h1,
            h2 = this.h2,
            h3 = this.h3,
            h4 = this.h4,
            h5 = this.h5,
            h6 = this.h6,
            h7 = this.h7;
          return HEX_CHARS[h0 >> 28 & 0x0F] + HEX_CHARS[h0 >> 24 & 0x0F] + HEX_CHARS[h0 >> 20 & 0x0F] + HEX_CHARS[h0 >> 16 & 0x0F] + HEX_CHARS[h0 >> 12 & 0x0F] + HEX_CHARS[h0 >> 8 & 0x0F] + HEX_CHARS[h0 >> 4 & 0x0F] + HEX_CHARS[h0 & 0x0F] + HEX_CHARS[h1 >> 28 & 0x0F] + HEX_CHARS[h1 >> 24 & 0x0F] + HEX_CHARS[h1 >> 20 & 0x0F] + HEX_CHARS[h1 >> 16 & 0x0F] + HEX_CHARS[h1 >> 12 & 0x0F] + HEX_CHARS[h1 >> 8 & 0x0F] + HEX_CHARS[h1 >> 4 & 0x0F] + HEX_CHARS[h1 & 0x0F] + HEX_CHARS[h2 >> 28 & 0x0F] + HEX_CHARS[h2 >> 24 & 0x0F] + HEX_CHARS[h2 >> 20 & 0x0F] + HEX_CHARS[h2 >> 16 & 0x0F] + HEX_CHARS[h2 >> 12 & 0x0F] + HEX_CHARS[h2 >> 8 & 0x0F] + HEX_CHARS[h2 >> 4 & 0x0F] + HEX_CHARS[h2 & 0x0F] + HEX_CHARS[h3 >> 28 & 0x0F] + HEX_CHARS[h3 >> 24 & 0x0F] + HEX_CHARS[h3 >> 20 & 0x0F] + HEX_CHARS[h3 >> 16 & 0x0F] + HEX_CHARS[h3 >> 12 & 0x0F] + HEX_CHARS[h3 >> 8 & 0x0F] + HEX_CHARS[h3 >> 4 & 0x0F] + HEX_CHARS[h3 & 0x0F] + HEX_CHARS[h4 >> 28 & 0x0F] + HEX_CHARS[h4 >> 24 & 0x0F] + HEX_CHARS[h4 >> 20 & 0x0F] + HEX_CHARS[h4 >> 16 & 0x0F] + HEX_CHARS[h4 >> 12 & 0x0F] + HEX_CHARS[h4 >> 8 & 0x0F] + HEX_CHARS[h4 >> 4 & 0x0F] + HEX_CHARS[h4 & 0x0F] + HEX_CHARS[h5 >> 28 & 0x0F] + HEX_CHARS[h5 >> 24 & 0x0F] + HEX_CHARS[h5 >> 20 & 0x0F] + HEX_CHARS[h5 >> 16 & 0x0F] + HEX_CHARS[h5 >> 12 & 0x0F] + HEX_CHARS[h5 >> 8 & 0x0F] + HEX_CHARS[h5 >> 4 & 0x0F] + HEX_CHARS[h5 & 0x0F] + HEX_CHARS[h6 >> 28 & 0x0F] + HEX_CHARS[h6 >> 24 & 0x0F] + HEX_CHARS[h6 >> 20 & 0x0F] + HEX_CHARS[h6 >> 16 & 0x0F] + HEX_CHARS[h6 >> 12 & 0x0F] + HEX_CHARS[h6 >> 8 & 0x0F] + HEX_CHARS[h6 >> 4 & 0x0F] + HEX_CHARS[h6 & 0x0F] + HEX_CHARS[h7 >> 28 & 0x0F] + HEX_CHARS[h7 >> 24 & 0x0F] + HEX_CHARS[h7 >> 20 & 0x0F] + HEX_CHARS[h7 >> 16 & 0x0F] + HEX_CHARS[h7 >> 12 & 0x0F] + HEX_CHARS[h7 >> 8 & 0x0F] + HEX_CHARS[h7 >> 4 & 0x0F] + HEX_CHARS[h7 & 0x0F];
        };
        return function (message) {
          return new Sha256().update(message).hex();
        };
      }();
      const HELLO_WORLD_API_KEY = 'lxmusic';
      const HELLO_WORLD_SECRET_KEY = 'JaJ?a7Nwk_Fgj?2o:znAkst';
      const HELLO_WORLD_SCRIPT_MD5 = '1888f9865338afe6d5534b35171c61a4';
      const HELLO_WORLD_API_URL = 'https://88.lxmusic.xn--fiqs8s';
      const helloWorldSign = requestPath => sha256(requestPath + HELLO_WORLD_SCRIPT_MD5 + HELLO_WORLD_SECRET_KEY);
      const HYW_API_BASE = "http://__blocked__.invalid";
      const HYW_CARD_KEY = 'MOLAN-BAIJI';
      
      // ==================== QQ 音乐音质文件映射 ====================
      
      const TX_FILE_CONFIG = {
        '128k': {
          s: 'M500',
          e: '.mp3',
          br: '128k'
        },
        '320k': {
          s: 'M800',
          e: '.mp3',
          br: '320k'
        },
        flac: {
          s: 'F000',
          e: '.flac',
          br: 'flac'
        },
        flac24bit: {
          s: 'AI00',
          e: '.flac',
          br: 'flac24bit'
        },
        hires: {
          s: 'AI00',
          e: '.flac',
          br: 'hires'
        },
        atmos: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        atmos_plus: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        master: {
          s: 'AI00',
          e: '.flac',
          br: 'master'
        }
      };
      
      // ==================== 网易云音质映射 ====================
      
      const WY_LEVEL_MAP = {
        '128k': 'standard',
        '320k': 'exhigh',
        flac: 'lossless',
        flac24bit: 'hires',
        hires: 'hires',
        atmos: 'sky',
        master: 'jymaster'
      };
      const WY_BR_MAP = {
        '128k': 128000,
        '320k': 320000,
        flac: 999000,
        flac24bit: 999000,
        hires: 999001,
        atmos: 999002,
        master: 999003
      };
      
      // ==================== 酷我音质Level映射（笒鬼鬼等专用） ====================
      
      const KW_LEVEL_MAP = {
        '128k': '128k',
        '192k': '128k',
        '320k': '320k',
        flac: 'lossless',
        flac24bit: 'lossless'
      };
      
      // ==================== 酷狗音质Level映射（长青SVIP音源二改版专用） ====================
      
      const KG_LEVEL_MAP = {
        '128k': 'standard',
        '192k': 'standard',
        '320k': 'exhigh',
        flac: 'lossless',
        flac24bit: 'hires',
        hires: 'hires',
        atmos: 'atmos',
        atmos_plus: 'atmos',
        master: 'clear'
      };
      
      // ==================== 酷我流媒体音质Level映射（175.27.166.236:8928 专用） ====================
      
      const KW_STREAM_LEVEL_MAP = {
        '128k': '128k',
        '192k': '128k',
        '320k': '320k',
        flac: 'flac',
        flac24bit: 'flac',
        hires: 'hires',
        atmos: 'atmos',
        atmos_plus: 'atmos_plus',
        master: 'master'
      };
      
      // ==================== Fish API 签名工具 ====================
      
      const FISH_DOMAIN = 'music.gdstudio.xyz';
      const FISH_VERSION = '20260510';
      const fishSign = async secret => {
        const timeRes = await httpFetch('https://' + FISH_DOMAIN + '/time', {
          method: 'GET',
          timeout: 10000
        });
        const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9);
        const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret;
        return md5(signInput).slice(-8).toUpperCase();
      };
      const fishPost = async (params, secret) => {
        const sign = await fishSign(secret);
        params.s = sign;
        const body = objToForm(params);
        const res = await httpFetch('https://' + FISH_DOMAIN + '/api.php', {
          method: 'POST',
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Origin: 'https://' + FISH_DOMAIN,
            Referer: 'https://' + FISH_DOMAIN + '/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body
        });
        return res.body;
      };
      
      // ==================== 新增后端函数（取自星澜聚合音源 v3.1.1.1） ====================
      
      // -------- QQ越权（3重策略） --------
      const getQQExploit = async (songId, quality, musicInfo) => {
        const songmid = songId || musicInfo?.songmid || musicInfo?.id;
        if (!songmid) throw new Error('QQ越权: 缺少 songmid');
        const mediaMid = musicInfo?.mediaMid || musicInfo?.strMediaMid || musicInfo?.media_mid || '';
        const prefixMap = {
          '128k': 'M500',
          '192k': 'M800',
          '320k': 'M800',
          'flac': 'F000',
          'flac24bit': 'RS01',
          'hires': 'RS01',
          'atmos': 'atmosphere',
          'atmos_plus': 'atmosphere',
          'master': 'AIM00'
        };
        const prefix = prefixMap[quality] || 'M800';
        const extMap = {
          'M500': 'mp3',
          'M800': 'mp3',
          'F000': 'flac',
          'RS01': 'flac',
          'AIM00': 'mflac',
          'atmosphere': 'flac'
        };
        const ext = extMap[prefix] || 'mp3';
        const midForFile = mediaMid || songmid;
        const qqKey = '1984LZXvCR';
        const qqUin = '1234567890';
        const pgv_pvid = Math.floor(Math.random() * 10000000000).toString();
        const qqCookie = `qm_keyst=${qqKey}; uin=o${qqUin}; pgv_pvid=${pgv_pvid}; qqmusic_key=${qqKey}; qqmusic_uin=o${qqUin}; psrf_qqaccess_token=${qqKey}; ts_uid=${pgv_pvid}; psi=${pgv_pvid}`;
      
        // 策略A: ut.y.qq.com GetEVkey
        const filename = `${prefix}${midForFile}.${ext}`;
        const bodyA = {
          comm: {
            ct: 19,
            cv: 0,
            guid: pgv_pvid,
            tmeAppID: 'qqmusic',
            qq: qqUin
          },
          hot: {
            method: 'CgiGetHotVkey',
            module: 'music.vkey.GetEVkey',
            param: {
              filename: [filename],
              songmid: [songmid]
            }
          },
          ekey: {
            method: 'GetEkey',
            module: 'music.vkey.GetEVkey',
            param: {
              finfo: [{
                filename,
                mid: midForFile || '0'
              }]
            }
          }
        };
        try {
          const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://y.qq.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': qqCookie
            },
            body: JSON.stringify(bodyA)
          });
          const d = resp.body;
          if (d?.hot?.data?.urls?.[0]?.purl) {
            return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl;
          }
        } catch (e) {}
      
        // 策略B: u.y.qq.com platform=23
        const variants = [{
          name: '双songmid',
          filename: `${prefix}${songmid}${songmid}.${ext}`,
          uin: qqUin,
          loginflag: 1
        }, {
          name: '单songmid',
          filename: `${prefix}${songmid}.${ext}`,
          uin: qqUin,
          loginflag: 1
        }, {
          name: '双空uin',
          filename: `${prefix}${songmid}${songmid}.${ext}`,
          uin: '',
          loginflag: 1
        }, {
          name: '单空uin',
          filename: `${prefix}${songmid}.${ext}`,
          uin: '',
          loginflag: 1
        }];
        for (const v of variants) {
          try {
            const param = {
              filename: [v.filename],
              songmid: [songmid],
              songtype: [0],
              uin: v.uin,
              loginflag: v.loginflag,
              platform: '23',
              firstlogin: 1,
              newver: 1,
              nohash: 0,
              cms: 0
            };
            const apiData = JSON.stringify({
              comm: {
                uin: v.uin ? parseInt(v.uin) : 0,
                format: 'json',
                ct: 23,
                cv: 0,
                ...(v.uin ? {
                  qq: v.uin
                } : {})
              },
              req_0: {
                module: 'vkey.GetVkeyServer',
                method: 'CgiGetVkey',
                param
              }
            });
            const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(apiData)}`;
            const resp = await httpFetch(url, {
              method: 'GET',
              timeout: 8000,
              headers: {
                'Referer': 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': qqCookie
              }
            });
            const d = resp.body;
            if (d?.code === 0 && d?.req_0?.data?.midurlinfo?.[0]?.purl) {
              const sip = d.req_0.data.sip?.[0] || 'https://dl.stream.qqmusic.qq.com/';
              return sip + d.req_0.data.midurlinfo[0].purl;
            }
          } catch (e) {}
        }
      
        // 策略C: ut+key 增强
        try {
          const bodyC = {
            comm: {
              ct: 19,
              cv: 0,
              guid: pgv_pvid,
              tmeAppID: 'qqmusic',
              qq: qqUin
            },
            hot: {
              method: 'CgiGetHotVkey',
              module: 'music.vkey.GetEVkey',
              param: {
                filename: [filename],
                songmid: [songmid]
              }
            }
          };
          const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://y.qq.com/',
              'User-Agent': 'Mozilla/5.0 QQMusic/2201',
              'Cookie': qqCookie
            },
            body: JSON.stringify(bodyC)
          });
          const d = resp.body;
          if (d?.hot?.data?.urls?.[0]?.purl) {
            return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl;
          }
        } catch (e) {}
        throw new Error('QQ越权全部失败');
      };
      
      // -------- ygking QQ（全音质） --------
      const getYgkingTx = async (songId, quality, musicInfo) => {
        const mid = musicInfo?.songmid || musicInfo?.strMediaMid || musicInfo?.mediaMid || songId;
        if (!mid) throw new Error('ygking: 缺少 mid');
        const qMap = {
          '128k': '128',
          '192k': '320',
          '320k': '320',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'master',
          'atmos': 'master',
          'atmos_plus': 'master'
        };
        const q = qMap[quality] || '320';
        const url = `https://__blocked__.invalid/api/song/url?mid=${encodeURIComponent(mid)}&quality=${q}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 0 && d?.data?.[mid]) {
          return d.data[mid];
        }
        throw new Error('ygking 失败');
      };
      
      // -------- 残像 WY（母带） --------
      const getCanxiang = async (songId, quality, musicInfo) => {
        const id = musicInfo?.songId || musicInfo?.id || songId;
        const name = musicInfo?.songName || musicInfo?.name || '';
        const singer = musicInfo?.singer || '';
        const qMap = {
          '128k': '128k',
          '192k': '320k',
          '320k': '320k',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'jymaster',
          'atmos': 'jymaster',
          'atmos_plus': 'jymaster'
        };
        const type = qMap[quality] || '320k';
        const token = 'canxiang_token_2026';
        let params = {
          token,
          type
        };
        if (id) params.id = String(id);else if (name) {
          params.msg = name + (singer ? ' ' + singer : '');
          params.n = 1;
        } else throw new Error('残像: 缺少 id 或歌名');
        const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
        const url = `https://api.canxiang.cn/api/wyymusic?${query}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.data?.url) {
          return d.data.url;
        }
        throw new Error('残像 失败');
      };
      
      // -------- 星海聚合（通用） --------
      const getXinghai = async (platform, songId, quality, musicInfo) => {
        const sourceMap = {
          kw: 'kw',
          kg: 'kg',
          mg: 'migu'
        };
        const source = sourceMap[platform];
        if (!source) throw new Error('星海聚合: 不支持平台 ' + platform);
        const id = platform === 'kg' ? musicInfo?.hash || songId : musicInfo?.songmid || musicInfo?.rid || songId;
        if (!id) throw new Error('星海聚合: 缺少 id');
        const name = musicInfo?.name || musicInfo?.songName || '';
        const singer = musicInfo?.singer || '';
        const qMap = {
          '128k': '128kmp3',
          '192k': '320kmp3',
          '320k': '320kmp3',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'flac',
          'atmos': 'flac',
          'atmos_plus': 'flac'
        };
        const qualityParam = qMap[quality] || '320kmp3';
        const url = `https://api.xinghai.com/lx/api/?source=${source}&name=${encodeURIComponent(name + ' ' + singer)}&songmid=${encodeURIComponent(id)}&quality=${qualityParam}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.url) return d.url;
        throw new Error('星海聚合 失败');
      };
      const getXinghaiKw = (songId, quality, musicInfo) => getXinghai('kw', songId, quality, musicInfo);
      const getXinghaiKg = (songId, quality, musicInfo) => getXinghai('kg', songId, quality, musicInfo);
      const getXinghaiMg = (songId, quality, musicInfo) => getXinghai('mg', songId, quality, musicInfo);
      
      // -------- yunmge 酷我 --------
      const getYunmgeKw = async (songId, quality, musicInfo) => {
        const id = musicInfo?.rid || musicInfo?.songmid || songId;
        if (!id) throw new Error('yunmge: 缺少 id');
        const brMap = {
          '128k': 128,
          '192k': 192,
          '320k': 320,
          'flac': 2000,
          'flac24bit': 2000,
          'hires': 4000,
          'master': 4000
        };
        const wantBr = brMap[quality] || 320;
        const url = `https://api.yunmge.com/kuwo?key=yunmge_key&token=yunmge_token&id=${encodeURIComponent(id)}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.data?.all_bitrates) {
          const list = d.data.all_bitrates;
          const brOrder = [4000, 2000, 320, 192, 128];
          for (const br of brOrder) {
            if (br < wantBr) continue;
            const item = list.find(b => b.bitrate === br || String(b.bitrate) === String(br));
            if (item && item.play_url) return item.play_url;
          }
          const fallback = list.find(b => b.play_url);
          if (fallback) return fallback.play_url;
        }
        throw new Error('yunmge 失败');
      };
      
      // -------- 念心酷狗 --------
      const getNianxinKg = async (songId, quality, musicInfo) => {
        const hash = musicInfo?.hash || musicInfo?.songmid || songId;
        if (!hash) throw new Error('念心: 缺少 hash');
        const levelMap = {
          '128k': '128kmp3',
          '192k': '320kmp3',
          '320k': '320kmp3',
          'flac': '2000kflac',
          'flac24bit': '4000kflac',
          'hires': 'hires',
          'master': '4000kflac',
          'atmos': '4000kflac',
          'atmos_plus': '4000kflac'
        };
        const level = levelMap[quality] || '320kmp3';
        const url = `https://mcp.nianxinxz.com/kgqq/kg.php?id=${encodeURIComponent(hash)}&level=${level}&type=mp3`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.url) return d.url;
        if (typeof d === 'string' && d.startsWith('http')) return d;
        throw new Error('念心 失败');
      };
      
      // ==================== QQ音乐 后端接口列表（按优先级排列） ====================
      
      const TX_BACKENDS = [
      // === 后端1: QQ官方接口（带Cookie可解锁VIP） ===
      {
        name: 'QQ官方',
        fetch: async (songmid, quality) => {
          const fileInfo = TX_FILE_CONFIG[quality];
          if (!fileInfo) throw new Error('不支持的音质');
          const guid = randomGuid();
          const file = fileInfo.s + songmid + fileInfo.e;
          const reqData = {
            req_0: {
              module: 'vkey.GetVkeyServer',
              method: 'CgiGetVkey',
              param: {
                filename: [file],
                guid,
                songmid: [songmid],
                songtype: [0],
                uin: '0',
                loginflag: HAS_TX_COOKIE ? 1 : 0,
                platform: '20'
              }
            },
            loginUin: '0',
            comm: {
              uin: '0',
              format: 'json',
              ct: 24,
              cv: 0
            }
          };
          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://y.qq.com/'
          };
          if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE;
          const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            headers,
            body: JSON.stringify(reqData)
          });
          const d = res.body;
          if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
            const sip = d.req_0.data.sip || ['https://isure.stream.qqmusic.qq.com/'];
            return sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl;
          }
          throw new Error('QQ官方: 无数据');
        }
      },
      // === 后端6: vkeys API ===
      {
        name: 'vkeys',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          throw new Error('vkeys: 无数据');
        }
      },
      // === 后端7: vkeys 旧版API ===
      {
        name: 'vkeys旧版',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys旧版 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/music/tencent/song/link?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('vkeys旧版: 无数据');
        }
      },
      // === 后端8: 柳云API（liuyunidc） ===
      {
        name: '柳云API',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '128k',
            '320k': '320k',
            flac: 'flac',
            flac24bit: 'master',
            hires: 'atmos',
            atmos: 'atmos',
            atmos_plus: 'atmos',
            master: 'master'
          };
          const q = qualityMap[quality] || '128k';
          // 先获取card密钥
          let card = '';
          try {
            const cardRes = await httpFetch('https://github.com/CharlesPikachu/musicdl/releases/download/keys/baimusic.txt', {
              method: 'GET',
              timeout: 5000
            });
            card = String(cardRes.body || '').trim();
          } catch (e) {}
          const res = await httpFetch('https://api.liuyunidc.cn/baimusic/musicurl.php?source=tx&musicId=' + songmid + '&quality=' + q + (card ? '&card=' + encodeURIComponent(card) : ''), {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'http://api.liuyunidc.cn/baimusic/'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('柳云API: 无数据');
        }
      },
      // === 后端9: 317ak API ===
      {
        name: '317ak',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '5',
            '320k': '6',
            flac: '8',
            flac24bit: '7',
            hires: '9',
            atmos: '10',
            atmos_plus: '10',
            master: '10'
          };
          const br = brMap[quality] || '5';
          const res = await httpFetch('https://api.317ak.cn/api/yinyue/qqyinyue?ckey=ZK76QJCIH5PPICJOOXUH&i=' + songmid + '&br=' + br + '&type=json&lrc=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('317ak: 无数据');
        }
      },
      // === 后端10: nki.pw API（flac用） ===
      {
        name: 'nki',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('nki仅支持flac');
          const apiKeys = ['28fece925439b052792a97989c870ced3803a71c6b534f71e5a5338b2d31ef8', 'c4c4f5fc36bad4cacb98839e14fea40277b35ea2eb1babdad7bbde128400f3b1'];
          const errors = [];
          for (const key of apiKeys) {
            try {
              const res = await httpFetch('https://api.nki.pw/API/music_open_api.php?mid=' + songmid + '&apikey=' + key, {
                method: 'GET',
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  Accept: 'application/json'
                }
              });
              const d = res.body;
              const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
              if (url) return url;
            } catch (e) {
              errors.push(e.message);
            }
          }
          throw new Error('nki: ' + errors.join(' | '));
        }
      },
      // === 后端11: tang.api.s01s.cn（flac用） ===
      {
        name: 'tang',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('tang仅支持flac');
          const res = await httpFetch('https://tang.api.s01s.cn/music_open_api.php?mid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
          if (url) return url;
          throw new Error('tang: 无数据');
        }
      },
      // === 后端14: 88.lxmusic（独家音源v3/v4） ===
      {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          try {
            const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/tx/' + songmid + '/' + quality, {
              method: 'GET',
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0',
                Accept: 'application/json',
                'x-request-key': 'lxmusic'
              }
            });
            const d = res.body;
            if (d && (d.code === 0 || d.code === 200) && d.data) return d.data;
            if (d && d.url) return d.url;
          } catch (e) {}
          // 降级到v3
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv3/url/tx/' + songmid + '/' + quality, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data) return d.data;
          throw new Error('lxmusic88: 无数据');
        }
      },
      // === 后端18: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=qq&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端19: ChKsZ 聚合API ===
      {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'qq',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端22: Fish API（gdstudio POST） ===
      {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'qq',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      },
      // === 后端23: 汽水VIP API ===
      {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      },
      // === 后端24: HYWmusic API（白姬专用，103.79.184.97） ===
      {
        name: 'HYWmusic',
        fetch: async (songmid, quality) => {
          const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=tx&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'X-Card-Key': HYW_CARD_KEY
            }
          });
          const d = res.body;
          if (d && d.code === 200) {
            if (d.url) return d.url;
            if (d.data && d.data.url) return d.data.url;
          }
          throw new Error('HYWmusic: 无数据');
        }
      },
      // === 后端xx: QQ越权（3重策略，取自星澜） ===
      {
        name: 'QQ越权',
        fetch: getQQExploit
      },
      // === 后端xx: ygking QQ（全音质，取自星澜） ===
      {
        name: 'ygking QQ',
        fetch: getYgkingTx
      }];
      
      // ==================== 网易云音乐 后端接口列表（按优先级排列） ====================
      
      const WY_BACKENDS = [
      // === 前端1: ikun音源API（c.wwwweb.top，取自ikun音源v26） ===
      {
        name: 'ikun网易云',
        fetch: async (songmid, quality, musicInfo) => {
          const songId = musicInfo?.hash ?? songmid;
          const res = await httpFetch('https://c.wwwweb.top/music/url', {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'lx-music-request/2.9.0',
              'X-Api-Key': ''
            },
            body: {
              source: 'wy',
              musicId: songId,
              quality: quality
            },
            follow_max: 5
          });
          const d = res.body;
          if (!d || isNaN(Number(d.code))) throw new Error('ikun网易云: 未知错误');
          if (d.code === 200 && d.url) return d.url;
          if (d.code === 403) throw new Error('ikun网易云: 鉴权失败');
          if (d.code === 429) throw new Error('ikun网易云: 请求过速');
          throw new Error('ikun网易云: ' + (d.message || '获取URL失败'));
        }
      },
      // === 后端1: 网易云eapi官方接口（带Cookie可解锁VIP） ===
      {
        name: '网易云官方',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url/v1';
          const eapiUrl = '/api/song/enhance/player/url/v1';
          const payload = {
            ids: [Number(songmid)],
            level,
            encodeType: 'flac',
            immerseType: 'c51'
          };
          const encrypted = wyEapi(eapiUrl, payload);
          let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!';
          if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue;
          const res = await httpFetch(targetUrl, {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
              Referer: 'https://music.163.com/',
              Cookie: cookieValue
            },
            form: encrypted
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url;
          if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）');
          throw new Error('网易云官方: 无数据');
        }
      },
      // === 后端2: 星海音乐源VIP接口（ChKsZ） ===
      {
        name: 'ChKsZ-VIP',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.chksz.top/api/163_music?id=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'https://cp.chksz.top/'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ-VIP: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端5: wyapi.toubiec.cn（洛雪音乐源用） ===
      {
        name: 'toubiec',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://wyapi.toubiec.cn/api/music/url', {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
              Origin: 'https://wyapi.toubiec.cn',
              Referer: 'https://wyapi.toubiec.cn/'
            },
            body: JSON.stringify({
              id: songmid,
              level
            })
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url;
          if (d && d.url) return d.url;
          throw new Error('toubiec: 无数据');
        }
      },
      // === 后端6: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=netease&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端9: api.bugpk.com（多平台聚合音源） ===
      {
        name: 'bugpk',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.bugpk.com/api/163_music?type=json&ids=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url'], ['data', 0, 'url']]);
          if (url) return url;
          throw new Error('bugpk: 无数据');
        }
      },
      // === 后端13: 88.lxmusic（独家音源v4） ===
      {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/wy/' + songmid + '/' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'x-request-key': 'lxmusic'
            }
          });
          const d = res.body;
          if (d && (d.code === 0 || d.code === 200)) {
            if (d.data) return d.data;
            if (d.url) return d.url;
          }
          throw new Error('lxmusic88: 无数据');
        }
      },
      // === 后端14: Fish API（gdstudio POST） ===
      {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'netease',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      },
      // === 后端17: 汽水VIP API ===
      {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      },
      // === 后端18: HYWmusic API（白姬专用，103.79.184.97） ===
      {
        name: 'HYWmusic',
        fetch: async (songmid, quality) => {
          const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=wy&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'X-Card-Key': HYW_CARD_KEY
            }
          });
          const d = res.body;
          if (d && d.code === 200) {
            if (d.url) return d.url;
            if (d.data && d.data.url) return d.data.url;
          }
          throw new Error('HYWmusic: 无数据');
        }
      },
      // === 后端xx: 残像 WY（母带支持，取自星澜） ===
      {
        name: '残像 WY',
        fetch: async (songmid, quality) => {
          const info = {
            songId: songmid,
            songName: '',
            singer: ''
          };
          return getCanxiang(songmid, quality, info);
        }
      }];
      
      // ==================== 酷我音乐(kw) 后端接口列表（按优先级排列） ====================
      
      const KW_BACKENDS = [
      // === 后端8: 酷我官方接口（KuwoDES格式，surl=1） ===
      {
        name: '酷我官方',
        fetch: async (songmid, quality, musicInfo) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我官方 不支持的音质');
          let rid = musicInfo?.rid || '';
          if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '');
          if (!rid) rid = songmid;
          // 使用KuwoDES格式，surl=1让服务器返回surl字段
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('酷我官方: 无数据');
        }
      },
      // === 后端9: 酷我手机版（不同source标识） ===
      {
        name: '酷我手机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我手机版 不支持的音质');
          const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我手机版: 无数据');
        }
      },
      // === 后端10: 酷我车机版（不同source标识） ===
      {
        name: '酷我车机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我车机版 不支持的音质');
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk&type=convert_url_with_sign&br=' + br + '&sig=0&rid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我车机版: 无数据');
        }
      },
      // === 后端12: HYWmusic API（白姬专用，103.79.184.97） ===
      {
        name: 'HYWmusic',
        fetch: async (songmid, quality) => {
          const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kw&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'X-Card-Key': HYW_CARD_KEY
            }
          });
          const d = res.body;
          if (d && d.code === 200) {
            if (d.url) return d.url;
            if (d.data && d.data.url) return d.data.url;
          }
          throw new Error('HYWmusic: 无数据');
        }
      },
      // === 后端14: Hello World KW API（lxmusic.xn--fiqs8s，带SHA256签名） ===
      {
        name: 'HelloWorld',
        fetch: async (songmid, quality, musicInfo) => {
          const songId = musicInfo?.rid || musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid;
          if (!songId) throw new Error('HelloWorld: 找不到歌曲ID');
          const requestPath = '/lxmusicv4/url/kw/' + songId + '/' + quality;
          const sign = helloWorldSign(requestPath);
          const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign;
          const res = await httpFetch(url, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'accept': 'application/json',
              'x-request-key': HELLO_WORLD_API_KEY,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && (d.code === 0 || d.code === 200)) {
            const musicUrl = d.data || d.url;
            if (musicUrl) return musicUrl;
          }
          throw new Error('HelloWorld: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端xx: yunmge酷我（多码率选择，取自星澜） ===
      {
        name: 'yunmge酷我',
        fetch: getYunmgeKw
      },
      // === 后端xx: 星海酷我（通用聚合，取自星澜） ===
      {
        name: '星海酷我',
        fetch: getXinghaiKw
      }];
      
      // ==================== 酷狗音乐(kg) 后端接口列表（按优先级排列） ====================
      
      const KG_BACKENDS = [
      // === 后端1: 长青海棠主后端（musicserver.haitangw.cc，取自长青SVIP音源二改版主API） ===
      {
        name: '长青海棠',
        fetch: async (songmid, quality, musicInfo) => {
          const level = KG_LEVEL_MAP[quality] || 'standard';
          const hash = musicInfo?.hash || musicInfo?.songmid || songmid;
          const res = await httpFetch('https://musicserver.haitangw.cc/v1/music/resolve-url', {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'kg',
              rid: hash,
              level: level
            })
          });
          const d = res.body;
          // 响应格式: {code: 0, data: {url: "..."}}
          if (d && d.code === 0 && d.data && d.data.url) return d.data.url;
          throw new Error('长青海棠: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端8: Hello World KG API（lxmusic.xn--fiqs8s，带SHA256签名） ===
      {
        name: 'HelloWorld',
        fetch: async (songmid, quality, musicInfo) => {
          const songId = musicInfo?.hash || musicInfo?.songmid || musicInfo?.id || songmid;
          if (!songId) throw new Error('HelloWorld: 找不到歌曲ID');
          const requestPath = '/lxmusicv4/url/kg/' + songId + '/' + quality;
          const sign = helloWorldSign(requestPath);
          const url = HELLO_WORLD_API_URL + requestPath + '?sign=' + sign;
          const res = await httpFetch(url, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'accept': 'application/json',
              'x-request-key': HELLO_WORLD_API_KEY,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && (d.code === 0 || d.code === 200)) {
            const musicUrl = d.data || d.url;
            if (musicUrl) return musicUrl;
          }
          throw new Error('HelloWorld: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端11: ChKsZ 聚合API ===
      {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'kg',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      },
      // === 后端13: 酷狗官方API（直接调用酷狗官方接口） ===
      {
        name: '酷狗官方',
        fetch: async (songmid, quality, musicInfo) => {
          const hash = musicInfo?.hash || songmid;
          const albumId = musicInfo?.albumId || '';
          const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://www.kugou.com/'
            }
          });
          const d = res.body;
          if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url;
          if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url;
          throw new Error('酷狗官方: 无数据');
        }
      },
      // === 后端15: HYWmusic API（白姬专用，103.79.184.97） ===
      {
        name: 'HYWmusic',
        fetch: async (songmid, quality) => {
          const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=kg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'X-Card-Key': HYW_CARD_KEY
            }
          });
          const d = res.body;
          if (d && d.code === 200) {
            if (d.url) return d.url;
            if (d.data && d.data.url) return d.data.url;
          }
          throw new Error('HYWmusic: 无数据');
        }
      },
      // === 后端16: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=kg&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端xx: 星海酷狗（通用聚合，取自星澜） ===
      {
        name: '星海酷狗',
        fetch: getXinghaiKg
      },
      // === 后端xx: 念心酷狗（多码率，取自星澜） ===
      {
        name: '念心酷狗',
        fetch: getNianxinKg
      }];
      
      // ==================== 咪咕音乐(mg) 后端接口列表（按优先级排列） ====================
      
      const MG_BACKENDS = [
      // === 后端4: GD Studio API ===
      {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '1000'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=migu&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      },
      // === 后端5: Migu直接源（Hei Music） ===
      {
        name: 'Migu直接源',
        fetch: async (songmid, quality) => {
          const level = qualityToLevel(quality);
          const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: 'https://music.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          if (d && d.url) return d.url;
          if (d && d.playUrl) return d.playUrl;
          throw new Error('Migu直接源: 无数据');
        }
      },
      // === 后端6: Migu API（Hei Music） ===
      {
        name: 'Migu API',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'PQ',
            '320k': 'HQ',
            flac: 'SQ',
            flac24bit: 'ZQ'
          };
          const level = levelMap[quality] || 'HQ';
          const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
              Referer: 'https://app.c.nf.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          throw new Error('Migu API: 无数据');
        }
      },
      // === 后端11: HYWmusic API（白姬专用，103.79.184.97） ===
      {
        name: 'HYWmusic',
        fetch: async (songmid, quality) => {
          const res = await httpFetch(HYW_API_BASE + '/api/music/url?source=mg&songId=' + songmid + '&quality=' + quality + '&key=' + HYW_CARD_KEY, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'X-Card-Key': HYW_CARD_KEY
            }
          });
          const d = res.body;
          if (d && d.code === 200) {
            if (d.url) return d.url;
            if (d.data && d.data.url) return d.data.url;
          }
          throw new Error('HYWmusic: 无数据');
        }
      },
      // === 后端xx: 星海咪咕（通用聚合，取自星澜） ===
      {
        name: '星海咪咕',
        fetch: getXinghaiMg
      }];
      
      // ==================== 获取音乐URL（带多后端轮询） ====================
      
      const handleGetMusicUrl = async (source, musicInfo, quality) => {
        const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        if (!songId) throw new Error('无法获取歌曲ID');
        let backends = {
          wy: WY_BACKENDS,
          kw: KW_BACKENDS,
          kg: KG_BACKENDS,
          mg: MG_BACKENDS
        }[source];
        if (!backends) throw new Error('未知音源: ' + source);
      
        // 酷我音乐：高音质（atmos/atmos_plus/master）走流媒体直链，普通音质走星海等其他后端
        if (source === 'kw') {
          const highQuality = ['atmos', 'atmos_plus', 'master'];
          if (highQuality.includes(quality)) {
            // 高音质只走酷我流媒体（索引0），不做降级
            backends = [backends[0]];
          } else {
            // 普通音质跳过酷我流媒体（索引0），走星海等其他后端
            backends = backends.filter((_, i) => i !== 0);
          }
        }
        const errors = [];
        for (const backend of backends) {
          try {
            console.log('[' + source + '] 尝试后端: ' + backend.name + ' ID: ' + songId + ' 音质: ' + quality);
            const url = await backend.fetch(songId, quality, musicInfo);
            if (url) {
              console.log('[' + source + '] ' + backend.name + ' 成功');
              return url;
            }
          } catch (e) {
            errors.push(backend.name + ': ' + e.message);
            console.log('[' + source + '] ' + backend.name + ' 失败: ' + e.message);
          }
        }
        throw new Error('所有后端均失败（共' + backends.length + '个）\n' + errors.join('\n'));
      };
      
      // ==================== 注册请求事件 ====================
      
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        switch (action) {
          case 'musicUrl':
            return handleGetMusicUrl(source, info.musicInfo, info.type).then(data => Promise.resolve(data)).catch(err => Promise.reject(err));
          default:
            return Promise.reject('action not support: ' + action);
        }
      });
      
      // ==================== 初始化音源 ====================
      
      const musicSources = {};
      MUSIC_SOURCE.forEach(item => {
        const nameMap = {
          wy: '网易云音乐',
          kw: '酷我音乐',
          kg: '酷狗音乐',
          mg: '咪咕音乐'
        };
        musicSources[item] = {
          name: nameMap[item] || item,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: MUSIC_QUALITY[item]
        };
      });
      send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: false,
        sources: musicSources
      });
      console.log('[QQ音乐+网易云音乐+酷我+酷狗+咪咕聚合音源 v4.4.1] 已加载完成');
      console.log('[QQ音乐] 后端数: ' + TX_BACKENDS.length + ' Cookie: ' + (HAS_TX_COOKIE ? '已配置' : '未配置'));
      console.log('[网易云音乐] 后端数: ' + WY_BACKENDS.length + ' Cookie: ' + (HAS_WY_COOKIE ? '已配置' : '未配置'));
      console.log('[酷我音乐] 后端数: ' + KW_BACKENDS.length);
      console.log('[酷狗音乐] 后端数: ' + KG_BACKENDS.length + ' 主API: 长青海棠');
      console.log('[咪咕音乐] 后端数: ' + MG_BACKENDS.length);
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [18]: 忆音音源_v1.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 17
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 忆音音源
       * @description 支持Q音网易320k
       * @version v1
       * @author 竹佀＆玥然OvO
       */
      const {
        EVENT_NAMES,
        on,
        send
      } = __lx_proxy__;
      const getAudioUrl = (source, musicInfo) => {
        const platform = source === 'tx' ? 'tencent' : 'netease';
        const songId = musicInfo.songmid || musicInfo.id;
        if (!songId) {
          throw new Error('找不到歌曲ID');
        }
        return `https://music.3e0.cn/?server=${platform}&type=url&id=${songId}`;
      };
      on(EVENT_NAMES.request, ({
        source,
        action,
        info
      }) => {
        if (action !== 'musicUrl') {
          return Promise.reject(new Error('仅支持musicUrl操作'));
        }
        try {
          const url = getAudioUrl(source, info.musicInfo);
          console.log(`[DreamMeting] 返回链接: ${url}`);
          console.log(`[DreamMeting] 音质: 320k`);
          return Promise.resolve(url);
        } catch (error) {
          console.error(`[DreamMeting] 错误: ${error.message}`);
          return Promise.reject(new Error(`[DreamMeting] ${error.message}`));
        }
      });
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources: {
          wy: {
            name: '网易云音乐 - DreamMeting',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['320k']
          }
        }
      });
      console.log('音源初始化完成');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [20]: 收集の聚合接口.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 19
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 收集の聚合接口(LX版)
       * @id netapis_free
       * @version 1.0.0-beta
       * @description 聚合接口-来源于网络 整理:QZ
       * @author QZ
       * @support tx wy kw
       * @expire 2099-12-31 23:59:59
       */
      
      const DEV_ENABLE = false;
      const UPDATE_ENABLE = false; // 本接口无更新检查
      const SUPPORT_SOURCE = ['tx', 'wy', 'kw'];
      const QUALITY_MAP = {
        // 落雪音质 -> 自身音质
        tx: {
          '128k': '128k',
          '320k': '320k',
          'flac': 'flac',
          'flac24bit': 'flac',
          'hires': 'flac',
          'atmos': 'flac',
          'master': 'flac'
        },
        wy: {
          '128k': 'standard',
          '320k': 'exhigh',
          'flac': 'lossless',
          'flac24bit': 'lossless',
          'hires': 'lossless',
          'atmos': 'lossless',
          'master': 'lossless'
        },
        kw: {
          '128k': '128k',
          '320k': '320k',
          'flac': 'lossless',
          'flac24bit': 'lossless',
          'hires': 'lossless',
          'atmos': 'lossless',
          'master': 'lossless'
        }
      };
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        env,
        version
      } = __lx_proxy__;
      
      /* ---------- 工具 ---------- */
      const httpFetch = (url, options = {
        method: 'GET'
      }) => {
        return new Promise((resolve, reject) => {
          request(url, options, (err, resp) => {
            if (err) return reject(err);
            resolve(resp);
          });
        });
      };
      
      /* ---------- 核心 ---------- */
      const getMusicUrl = async (source, musicInfo, quality) => {
        const songId = musicInfo.hash ?? musicInfo.songmid;
        const level = QUALITY_MAP[source][quality] || 'lossless';
        let url;
        switch (source) {
          case 'wy':
            url = `https://__blocked__.invalid/api/netease/music_v1.php?id=${songId}&type=json&level=${level}`;
            break;
          default:
            throw new Error('不支持的源');
        }
        const {
          body
        } = await httpFetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': env ? `lx-music-${env}/${version}` : `lx-music-request/${version}`
          }
        });
        if (!body) throw new Error('空响应');
      
        // 统一提取 url
        let realUrl;
        if (source === 'tx') realUrl = body.url;else if (body.data) realUrl = body.data.url;
        if (!realUrl) throw new Error('获取播放链接失败');
        return realUrl;
      };
      
      /* ---------- 注册 ---------- */
      const sources = {};
      SUPPORT_SOURCE.forEach(s => {
        sources[s] = {
          name: s,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: Object.keys(QUALITY_MAP[s])
        };
      });
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        if (action !== 'musicUrl') return Promise.reject('action not support');
        return getMusicUrl(source, info.musicInfo, info.type).then(url => Promise.resolve(url)).catch(err => Promise.reject(err.message || err));
      });
      send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: DEV_ENABLE,
        sources
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [21]: 星海音源V2.3.5.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 20
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*! 
       * @name 星海音乐源
       * @description GDAPI | 聚会 | ChKSz API
       * @version v3.2.5
       * @author 万去了了
       * @homepage https://zrcdy.dpdns.org/
       * @lastUpdate 2026-06-16
       * 
       * @version v3.2.5 1,优化kw，kg源。2,大小考祝福：每逢大小考启幕，祝所有考生提笔有神，合笔如愿，逢考得胜。
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        env
      } = __lx_proxy__;
      const DEBUG_MODE = false;
      const UPDATE_CONFIG = {
        versionApiUrl: "https://__blocked__.invalid/lx/version.php",
        latestScriptUrl: "https://__blocked__.invalid/lx/vers.php",
        currentVersion: 'v3.2.5'
      };
      const STABLE_SOURCES_API_URL = "https://__blocked__.invalid/lx/stable_sources.php";
      const MAIN_API_BASE = 'https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light';
      const DIRECT_API_BASE = "https://__blocked__.invalid/api/music/";
      const SIGN_PROVIDER_URL = "https://__blocked__.invalid/lx/api/api.php?get_sign_only=1";
      const FALLBACK_PROXY_URL = "https://__blocked__.invalid/lx/api/api.php";
      const NETEASE_VIP_API = 'https://api.chksz.top/api/163_music';
      
      // GDAPI 屏蔽时间（1小时）
      let gdApiBlockedUntil = 0;
      
      // 代理支持的音乐源列表（kw 不在其中）
      const PROXY_SUPPORTED_SOURCES = new Set(['kg', 'migu', 'qq']);
      let musicSourceEnabled = true;
      let serverCheckCompleted = false;
      let backupApiAvailable = false;
      let stableSourcesList = null;
      let mainApiSourceMap = {};
      let availablePlatforms = [];
      let yaohuPlatformStatus = {
        kg: 'unknown',
        qq: 'unknown',
        migu: 'unknown',
        kw: 'unknown'
      };
      let gdApiStatus = 'unknown';
      let neteaseVipApiStatus = 'unknown';
      
      // 可用密钥版本列表（从 version.php 获取）
      let availableKeyVersions = [1]; // 默认仅有旧版本
      let currentKeyVersion = 1;
      
      // 签名凭证缓存（按版本存储）
      const cachedCredentials = {};
      const credentialExpireTimes = {};
      const ALL_PLATFORMS = ['wy', 'tx', 'kw', 'kg', 'mg'];
      const MUSIC_QUALITY_FULL = {
        wy: ['128k', '192k', '320k', 'flac', 'flac24bit', 'hires', 'jyeffect', 'sky', 'jymaster'],
        tx: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        kw: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        kg: ['128k', '192k', '320k', 'flac', 'flac24bit'],
        mg: ['128k', '192k', '320k', 'flac', 'flac24bit']
      };
      const PLATFORM_NAME_MAP = {
        wy: '网易云音乐',
        tx: 'QQ音乐',
        kw: '酷我音乐',
        kg: '酷狗音乐',
        mg: '咪咕音乐'
      };
      const DIRECT_SOURCE_PATH = {
        kg: 'kg',
        tx: 'qq',
        mg: 'migu',
        kw: 'kuwo'
      };
      const NETEASE_VIP_LEVEL_MAP = {
        hires: 'hires',
        jyeffect: 'jyeffect',
        sky: 'sky',
        jymaster: 'jymaster'
      };
      const NETEASE_VIP_QUALITY_SET = new Set(['hires', 'jyeffect', 'sky', 'jymaster']);
      
      // ============================ 工具函数 ============================
      function log(...args) {
        if (DEBUG_MODE) return console.log('[星海]', ...args);
        const msg = args.join(' ');
        if (/错误|失败|异常|不可用|维护|完全失败|无结果|降级|离线|跳过|屏蔽/.test(msg)) console.log('[星海]', ...args);
      }
      function logError(context, err, extra = '') {
        console.error(`[星海错误] ${context}: ${err.message || err} ${extra}`);
      }
      function logSuccess(source, method, url) {
        console.log(`[星海成功] ${method} 获取音频 (${source}): ${url.substring(0, 80)}...`);
      }
      function delay(ms) {
        return new Promise(r => setTimeout(r, ms));
      }
      function safeParseBody(body) {
        if (typeof body === 'string') {
          const trimmed = body.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
            try {
              return JSON.parse(trimmed);
            } catch (e) {}
          }
          return body;
        }
        if (typeof body === 'object' && body !== null) {
          try {
            if (typeof body.toString === 'function' && body.toString() !== '[object Object]') {
              body = body.toString('utf-8');
            }
          } catch (e) {}
          if (typeof body === 'object' && !isBuffer(body)) return body;
        }
        try {
          if (isBuffer(body)) {
            if (__lx_proxy__?.utils?.buffer?.bufToString) {
              body = __lx_proxy__.utils.buffer.bufToString(body, 'utf-8');
            } else if (typeof Buffer !== 'undefined') {
              body = Buffer.from(body).toString('utf-8');
            } else {
              body = String(body);
            }
          }
        } catch (e) {}
        if (typeof body === 'string') {
          const trimmed = body.trim();
          if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
            try {
              return JSON.parse(trimmed);
            } catch (e) {}
          }
        }
        return body;
      }
      function isBuffer(obj) {
        return obj && typeof obj === 'object' && (typeof Buffer !== 'undefined' && Buffer.isBuffer(obj) || typeof obj.constructor === 'function' && obj.constructor.name === 'Buffer');
      }
      function buildQueryString(params) {
        const parts = [];
        for (const key in params) {
          if (params.hasOwnProperty(key)) {
            let value = params[key];
            if (value !== undefined && value !== null && value !== '') {
              value = String(value).trim();
              value = encodeURIComponent(value).replace(/%20/g, '');
              parts.push(encodeURIComponent(key) + '=' + value);
            }
          }
        }
        return parts.join('&');
      }
      function mapQuality(target, avail) {
        const pm = {
          '臻品母带': 'jymaster',
          '臻品音质2.0': 'sky',
          '臻品音质AI': 'jyeffect',
          '臻品音质': 'jyeffect',
          'Hires 无损24-Bit': 'hires',
          'Hi-Res': 'hires',
          'FLAC': 'flac',
          '320k': '320k',
          '192k': '192k',
          '128k': '128k'
        };
        if (avail.includes(target)) return target;
        const m = pm[target];
        if (m && avail.includes(m)) return m;
        const order = ['jymaster', 'sky', 'jyeffect', 'hires', 'flac24bit', 'flac', '320k', '192k', '128k'];
        for (const q of order) if (avail.includes(q)) return q;
        return avail[0] || '128k';
      }
      const httpFetch = (url, options = {}) => new Promise((resolve, reject) => {
        request(url, options, (err, resp) => {
          if (err) return reject(new Error(`网络异常：${err.message}`));
          const body = safeParseBody(resp.body);
          resolve({
            body,
            statusCode: resp.statusCode,
            headers: resp.headers || {}
          });
        });
      });
      
      // ============================ 多密钥签名管理 ============================
      function selectAndSetKeyVersion() {
        if (!availableKeyVersions || availableKeyVersions.length === 0) {
          log('无可用密钥，直连不可用');
          return false;
        }
        if (availableKeyVersions.length === 1) {
          currentKeyVersion = availableKeyVersions[0];
        } else {
          currentKeyVersion = availableKeyVersions[Math.floor(Math.random() * availableKeyVersions.length)];
        }
        log(`选择密钥版本: ${currentKeyVersion}`);
        return true;
      }
      async function fetchCredentials() {
        const now = Date.now();
        if (cachedCredentials[currentKeyVersion] && now < credentialExpireTimes[currentKeyVersion]) {
          return cachedCredentials[currentKeyVersion];
        }
        log(`获取签名凭证 (ver=${currentKeyVersion})...`);
        let url = SIGN_PROVIDER_URL;
        if (currentKeyVersion !== 1) {
          url += '&ver=' + currentKeyVersion;
        }
        try {
          const resp = await httpFetch(url, {
            timeout: 5000
          });
          if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
          let data = resp.body;
          if (typeof data === 'string') data = JSON.parse(data);
          cachedCredentials[currentKeyVersion] = data;
          credentialExpireTimes[currentKeyVersion] = now + (data.expire_in ? data.expire_in - 5 : 55) * 1000;
          return data;
        } catch (err) {
          logError('签名获取失败', err);
          if (cachedCredentials[currentKeyVersion] && now < credentialExpireTimes[currentKeyVersion]) {
            return cachedCredentials[currentKeyVersion];
          }
          throw err;
        }
      }
      async function signedFetch(url, options = {}) {
        const cred = await fetchCredentials();
        const headers = {
          'X-Api-Key': cred.api_key,
          'X-Api-Timestamp': String(cred.timestamp),
          'X-Api-Sign': cred.sign,
          'Content-Type': 'application/json',
          ...(options.headers || {})
        };
        log(`直连请求 (ver=${currentKeyVersion}): ${url}`);
        try {
          const resp = await httpFetch(url, {
            ...options,
            headers
          });
          log(`直连响应 [${resp.statusCode}]: ${JSON.stringify(resp.body).substring(0, 300)}`);
          return resp;
        } catch (e) {
          logError(`直连异常 (ver=${currentKeyVersion})`, e);
          throw e;
        }
      }
      
      // ============================ 稳定源 ============================
      const fetchStableSources = async () => {
        if (env === 'desktop') return;
        try {
          const resp = await httpFetch(STABLE_SOURCES_API_URL, {
            timeout: 5000,
            headers: {
              'User-Agent': 'LX-Music-Mobile'
            }
          });
          if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
          let data = resp.body;
          if (typeof data === 'string') data = JSON.parse(data);
          if (!Array.isArray(data) || data.length === 0) throw new Error('数据为空');
          stableSourcesList = data.filter(s => typeof s === 'string' && /^[a-z]+$/.test(s));
        } catch (err) {
          logError('稳定源获取', err);
          stableSourcesList = ['netease', 'kuwo'];
        }
      };
      const buildPlatformsFromStableSources = () => {
        const map = {
          netease: 'wy',
          tencent: 'tx',
          kuwo: 'kw',
          kugou: 'kg',
          migu: 'mg'
        };
        mainApiSourceMap = {};
        stableSourcesList.forEach(s => {
          const c = map[s];
          if (c) mainApiSourceMap[c] = s;
        });
        availablePlatforms = [...ALL_PLATFORMS];
        if (env === 'desktop') availablePlatforms = availablePlatforms.filter(p => p !== 'mg');
      };
      
      // ============================ 平台可用性判断 ============================
      function isDirectAllowedForSource(source) {
        const up = DIRECT_SOURCE_PATH[source];
        if (!up) return false;
        if (source === 'kw') return true;
        return yaohuPlatformStatus[up] === 'available' && backupApiAvailable;
      }
      function isPlatformAvailable(platform) {
        if (platform === 'wy') return mainApiSourceMap['wy'] && gdApiStatus !== 'unavailable' || neteaseVipApiStatus !== 'unavailable';
        if (platform === 'kw') return mainApiSourceMap['kw'] && gdApiStatus !== 'unavailable' || true;
        const dp = DIRECT_SOURCE_PATH[platform];
        if (!dp) return false;
        const yaohuSt = yaohuPlatformStatus[dp] || 'unknown';
        const directOk = yaohuSt === 'available' && backupApiAvailable;
        const proxyOk = yaohuSt !== 'unavailable' && yaohuSt !== 'maintenance' && backupApiAvailable && PROXY_SUPPORTED_SOURCES.has(dp);
        return directOk || proxyOk;
      }
      function filterAvailablePlatforms() {
        const before = availablePlatforms.length;
        availablePlatforms = availablePlatforms.filter(p => isPlatformAvailable(p));
        if (availablePlatforms.length === 0) {
          availablePlatforms = env === 'desktop' ? ALL_PLATFORMS.filter(p => p !== 'mg') : [...ALL_PLATFORMS];
          console.log('[星海] 无可用平台，已恢复全平台（桌面端已排除咪咕）');
        } else {
          console.log(`[星海] 平台过滤: ${before} -> ${availablePlatforms.length}, 保留: ${availablePlatforms.join(',')}`);
        }
      }
      
      // ============================ 服务器状态检测（读取 available_keys） ============================
      const fetchServerStatus = async () => {
        for (let a = 0; a < 3; a++) {
          if (a > 0) await delay(1000);
          try {
            const resp = await httpFetch(UPDATE_CONFIG.versionApiUrl, {
              timeout: 5000,
              headers: {
                'User-Agent': 'LX-Music-Mobile'
              }
            });
            if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
            const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
            if (!data) throw new Error('数据无效');
            if (data.yaohu_api?.platforms) for (let p in data.yaohu_api.platforms) yaohuPlatformStatus[p] = data.yaohu_api.platforms[p].status || 'unknown';else {
              const ov = data.yaohu_api?.status || 'unknown';
              for (let p in yaohuPlatformStatus) yaohuPlatformStatus[p] = ov;
            }
            gdApiStatus = data.gd_api?.status || 'unknown';
            neteaseVipApiStatus = data.netease_vip_api?.status || 'unknown';
            backupApiAvailable = data.server_status?.online !== false;
            // 新增：读取可用密钥版本
            if (data.available_keys && Array.isArray(data.available_keys)) {
              availableKeyVersions = data.available_keys.filter(v => v === 1 || v === 2);
              log(`可用密钥版本: ${availableKeyVersions.join(',')}`);
            } else {
              availableKeyVersions = [1];
            }
            return {
              enabled: backupApiAvailable
            };
          } catch (e) {
            logError('状态检查失败', e, `(第${a + 1}次)`);
          }
        }
        for (let p in yaohuPlatformStatus) yaohuPlatformStatus[p] = 'unknown';
        gdApiStatus = 'unknown';
        neteaseVipApiStatus = 'unknown';
        backupApiAvailable = false;
        availableKeyVersions = [1];
        return {
          enabled: false
        };
      };
      
      // ============================ 落雪匹配逻辑（kw除外） ============================
      function cleanStr(str) {
        return str.replace(/[\s'.,，&"、\(\)（）`~\-<>|/[\]!！]/g, '').toLowerCase();
      }
      function parseDurationToSeconds(dur) {
        if (!dur) return null;
        const parts = String(dur).split(':');
        if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1]);
        return parseInt(dur);
      }
      function singerMutualInclude(targetSinger, candidateSinger) {
        return targetSinger.includes(candidateSinger) || candidateSinger.includes(targetSinger);
      }
      function nameMutualInclude(targetName, candidateName) {
        return targetName.includes(candidateName) || candidateName.includes(targetName);
      }
      function findBestMatchLxStyle(targetInfo, candidates) {
        const targetNameClean = cleanStr(targetInfo.name);
        const targetSingerClean = cleanStr(targetInfo.singer);
        const targetAlbumClean = cleanStr(targetInfo.album || '');
        const targetDuration = targetInfo.duration ? parseDurationToSeconds(targetInfo.duration) : null;
        let bestForScore = null;
        let bestScore = -1;
        for (const cand of candidates) {
          const candName = cand.name || cand.title || '';
          const candSinger = cand.singer || cand.author || '';
          const candAlbum = cand.album || '';
          const candDuration = cand.duration ? parseDurationToSeconds(cand.duration) : null;
          const fCandName = cleanStr(candName);
          const fCandSinger = cleanStr(candSinger);
          const fCandAlbum = cleanStr(candAlbum);
      
          // 第一层：时长+歌名完全一致
          if (targetDuration && candDuration && Math.abs(targetDuration - candDuration) <= 5) {
            if (fCandName === targetNameClean && singerMutualInclude(targetSingerClean, fCandSinger)) {
              return cand;
            }
          }
      
          // 第二层：歌手完全相同+歌名互相包含
          if (fCandSinger === targetSingerClean && nameMutualInclude(targetNameClean, fCandName)) {
            return cand;
          }
      
          // 第三层：专辑完全相同+歌手互相包含+歌名互相包含
          if (targetAlbumClean && fCandAlbum === targetAlbumClean && singerMutualInclude(targetSingerClean, fCandSinger) && nameMutualInclude(targetNameClean, fCandName)) {
            return cand;
          }
      
          // 后备分数匹配（名称0.6 + 歌手0.4）
          const nameScore = stringMatchScore(targetNameClean, fCandName);
          const singerScore = stringMatchScore(targetSingerClean, fCandSinger);
          const score = nameScore * 0.6 + singerScore * 0.4;
          if (score > bestScore) {
            bestScore = score;
            bestForScore = cand;
          }
        }
        return bestForScore && bestScore >= 0.3 ? bestForScore : null;
      }
      function stringMatchScore(a, b) {
        if (!a || !b) return 0;
        if (a === b) return 1;
        if (a.includes(b) || b.includes(a)) return 0.9;
        let m = 0;
        for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) m++;
        return m / Math.max(a.length, b.length);
      }
      
      // 搜索并匹配（仅 kg/tx/mg）
      async function searchAndMatch(source, songName, singer, useProxy = false) {
        const upstream = DIRECT_SOURCE_PATH[source];
        const searchFunc = useProxy ? proxySearch : directSearch;
        try {
          const songs = await searchFunc(upstream, songName, 25);
          if (!songs || songs.length === 0) throw new Error('搜索无结果');
          const targetInfo = {
            name: songName,
            singer: singer,
            album: '',
            duration: null
          };
          const best = findBestMatchLxStyle(targetInfo, songs);
          if (!best) throw new Error('未找到匹配歌曲');
          return best;
        } catch (e) {
          if (e.message === 'NO_RESULT') throw e;
          logError('搜索匹配失败', e);
          throw e;
        }
      }
      async function directSearch(upstreamSource, keyword, limit = 10) {
        const st = yaohuPlatformStatus[upstreamSource] || 'unknown';
        if (st !== 'available' && st !== 'unknown' && upstreamSource !== 'kuwo') throw new Error(`上游不可用（${st}）`);
        const params = {
          key: '8Sbg8jJCnrssIDGDaz9',
          msg: keyword,
          g: String(limit)
        };
        if (upstreamSource === 'migu') {
          params.num = String(limit);
          delete params.g;
        }
        const url = `${DIRECT_API_BASE}${upstreamSource}?${buildQueryString(params)}`;
        try {
          const resp = await signedFetch(url);
          if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
          const data = resp.body;
          if (data.code !== 200) {
            if (data.code === 404 && Array.isArray(data.data) && data.data.length === 0) throw new Error('NO_RESULT');
            throw new Error(`业务错误: ${data.msg || data.code}`);
          }
          const songs = extractSongsFromData(data, upstreamSource);
          if (songs.length === 0 && data.code === 404) throw new Error('NO_RESULT');
          return songs;
        } catch (e) {
          if (e.message === 'NO_RESULT') throw e;
          logError('直连搜索', e, `URL: ${url}`);
          throw e;
        }
      }
      async function proxySearch(proxySource, keyword, limit = 10) {
        if (!PROXY_SUPPORTED_SOURCES.has(proxySource)) throw new Error(`代理不支持此平台: ${proxySource}`);
        const params = {
          source: proxySource,
          msg: keyword,
          g: String(limit)
        };
        if (proxySource === 'migu') {
          params.num = String(limit);
          delete params.g;
        }
        const url = `${FALLBACK_PROXY_URL}?${buildQueryString(params)}`;
        try {
          const resp = await httpFetch(url);
          if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
          const data = resp.body;
          if (data.code !== 200) {
            if (data.code === 404 && Array.isArray(data.data) && data.data.length === 0) throw new Error('NO_RESULT');
            throw new Error(`业务错误: ${data.msg || data.code}`);
          }
          const songs = extractSongsFromData(data, proxySource);
          if (songs.length === 0 && data.code === 404) throw new Error('NO_RESULT');
          return songs;
        } catch (e) {
          if (e.message === 'NO_RESULT') throw e;
          logError('代理搜索', e, `URL: ${url}`);
          throw e;
        }
      }
      function extractSongsFromData(data, upstreamSource) {
        if (!data || data.code !== 200) return [];
        if (upstreamSource === 'kuwo') return Array.isArray(data.data) ? data.data : data.data?.songs || [];
        if (upstreamSource === 'qq' || upstreamSource === 'tx') return data.data?.songs || [];
        return Array.isArray(data.data) ? data.data : data.data?.songs || [];
      }
      
      // ============================ 音乐 URL 获取 ============================
      async function getMusicUrlFromMainAPI(source, songId, apiQuality) {
        if (Date.now() < gdApiBlockedUntil) throw new Error('GD API 暂时屏蔽');
        if (gdApiStatus === 'unavailable') throw new Error('GD API 不可用');
        const apiSource = mainApiSourceMap[source];
        if (!apiSource) throw new Error('GD不支持此平台');
        const url = `${MAIN_API_BASE}&types=url&source=${apiSource}&id=${songId}&br=${apiQuality}`;
        try {
          const resp = await httpFetch(url, {
            headers: {
              'User-Agent': 'LX-Music-Mobile'
            }
          });
          const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
          if (!data.url) {
            gdApiBlockedUntil = Date.now() + 3600000;
            log('GDAPI 返回空链接，已屏蔽1小时');
            throw new Error('GD未返回音频地址');
          }
          return data.url;
        } catch (e) {
          logError('GDAPI请求失败', e, `URL: ${url}`);
          throw e;
        }
      }
      async function getMusicUrlFromNeteaseVIP(songId, quality) {
        if (neteaseVipApiStatus === 'unavailable') throw new Error('VIP API 不可用');
        const level = NETEASE_VIP_LEVEL_MAP[quality] || 'jymaster';
        const url = `${NETEASE_VIP_API}?id=${songId}&level=${level}`;
        try {
          const resp = await httpFetch(url, {
            headers: {
              'User-Agent': 'LX-Music-Mobile'
            }
          });
          if (resp.statusCode !== 200) throw new Error(`HTTP ${resp.statusCode}`);
          const data = typeof resp.body === 'object' ? resp.body : JSON.parse(resp.body);
          if (data.code !== 200 || !data.data?.url) throw new Error('VIP未返回音频');
          return data.data.url;
        } catch (e) {
          logError('网易云VIP请求失败', e, `URL: ${url}`);
          throw e;
        }
      }
      
      // kw 专用：直接用 rid 获取播放链接
      async function getMusicUrlViaDirectKw(musicInfo, quality) {
        const rid = musicInfo.songmid || musicInfo.hash || musicInfo.id;
        if (!rid) throw new Error('缺少歌曲 rid');
        const qMap = {
          '128k': 'Standard',
          '192k': 'exhigh',
          '320k': 'SQ',
          'flac': 'lossless',
          'flac24bit': 'hires'
        };
        const sizeLevels = quality === 'flac' || quality === 'flac24bit' ? ['lossless', 'hires', 'SQ', 'exhigh', 'Standard'] : ['SQ', 'exhigh', 'Standard'];
        for (const size of sizeLevels) {
          const params = {
            key: '8Sbg8jJCnrssIDGDaz9',
            action: 'song',
            id: rid,
            size
          };
          const url = `${DIRECT_API_BASE}kuwo?${buildQueryString(params)}`;
          try {
            const resp = await signedFetch(url);
            if (resp.statusCode !== 200) continue;
            const data = resp.body;
            if (data.code === 200 && data.data?.vipmusic?.url) return data.data.vipmusic.url;
          } catch (e) {
            logError('Kw直连获取失败', e, `URL: ${url}`);
          }
        }
        throw new Error('Kw直连所有音质尝试失败');
      }
      
      // 其他平台直连（使用落雪匹配）
      async function getMusicUrlViaDirect(source, musicInfo, quality) {
        if (source === 'kw') return getMusicUrlViaDirectKw(musicInfo, quality);
        if (!isDirectAllowedForSource(source)) throw new Error('直连不可用');
        const songName = musicInfo.name || '',
          singer = musicInfo.singer || '';
        const best = await searchAndMatch(source, songName, singer, false);
        if (!best) throw new Error('未找到匹配歌曲');
        const rid = best.rid;
        const upstream = DIRECT_SOURCE_PATH[source];
        // 优先使用 rid 直取
        if (rid) {
          const params = {
            key: '8Sbg8jJCnrssIDGDaz9',
            action: 'song',
            id: rid
          };
          if (source === 'kg') params.quality = 'flac';else if (source === 'tx') params.size = 'hq';
          const url = `${DIRECT_API_BASE}${upstream}?${buildQueryString(params)}`;
          try {
            const resp = await signedFetch(url);
            if (resp.statusCode === 200 && resp.body.code === 200) {
              const d = resp.body.data;
              const purl = d?.vipmusic?.url || d?.play_url || d?.music_url || d?.url || d?.musicurl;
              if (purl) return purl;
            }
          } catch (e) {
            logError('直连 rid 方式失败', e);
          }
        }
        // 降级 n 方式
        const n = best.n || best.index || 1;
        const params = {
          key: '8Sbg8jJCnrssIDGDaz9',
          msg: songName,
          n: String(n)
        };
        if (source === 'kg') params.quality = 'flac';else if (source === 'tx') params.size = 'hq';
        const url = `${DIRECT_API_BASE}${upstream}?${buildQueryString(params)}`;
        const resp = await signedFetch(url);
        if (resp.statusCode !== 200) throw new Error(`详情请求失败`);
        const detail = resp.body;
        if (detail.code !== 200) throw new Error(detail.msg || '详情失败');
        const purl = detail.data?.vipmusic?.url || detail.data?.play_url || detail.data?.music_url || detail.data?.url || detail.data?.musicurl;
        if (!purl) throw new Error('未找到音频地址');
        return purl;
      }
      
      // 代理获取（仅支持 kg/migu/qq）
      async function getMusicUrlViaProxy(source, musicInfo, quality) {
        const proxySource = DIRECT_SOURCE_PATH[source];
        if (!proxySource || !PROXY_SUPPORTED_SOURCES.has(proxySource)) throw new Error(`代理不支持此平台`);
        if (!backupApiAvailable) throw new Error('代理服务器离线');
        const best = await searchAndMatch(source, musicInfo.name || '', musicInfo.singer || '', true);
        if (!best) throw new Error('代理搜索无匹配');
        const n = best.n || best.index || 1;
        const params = {
          source: proxySource,
          msg: musicInfo.name || '',
          n: String(n)
        };
        if (proxySource === 'kg') params.quality = 'flac';else if (proxySource === 'qq') params.size = 'hq';
        const url = `${FALLBACK_PROXY_URL}?${buildQueryString(params)}`;
        const resp = await httpFetch(url);
        if (resp.statusCode !== 200) throw new Error(`代理详情 HTTP ${resp.statusCode}`);
        const detail = resp.body;
        if (detail.code !== 200) throw new Error(detail.msg || '获取失败');
        const purl = detail.data?.play_url || detail.data?.music_url || detail.data?.url || detail.data?.musicurl;
        if (!purl) throw new Error('代理未返回音频');
        return purl;
      }
      
      // ============================ 事件处理 ============================
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        if (action === 'musicUrl') {
          if (!info?.musicInfo || !info.type) return Promise.reject(new Error('参数不完整'));
          const {
            musicInfo,
            type: quality
          } = info;
          const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
          if (!songId) return Promise.reject(new Error('歌曲信息不完整'));
          const avail = MUSIC_QUALITY_FULL[source] || ['128k', '192k', '320k', 'flac'];
          let actual = mapQuality(quality, avail);
          const finalUrl = (async () => {
            // 网易云VIP
            if (source === 'wy' && NETEASE_VIP_QUALITY_SET.has(actual) && neteaseVipApiStatus !== 'unavailable') {
              try {
                const url = await getMusicUrlFromNeteaseVIP(songId, actual);
                logSuccess(source, 'VIP', url);
                return url;
              } catch (e) {
                logError('VIP失败', e);
                actual = 'flac24bit';
              }
            }
            // GDAPI（可能被屏蔽）
            if (mainApiSourceMap[source] && gdApiStatus !== 'unavailable') {
              try {
                const brMap = {
                  '128k': '128',
                  '192k': '192',
                  '320k': '320',
                  'flac': '740',
                  'flac24bit': '999'
                };
                const url = await getMusicUrlFromMainAPI(source, songId, brMap[actual] || '320');
                logSuccess(source, 'GD', url);
                return url;
              } catch (e) {
                logError('GD失败', e);
                if (source === 'kw') {
                  try {
                    const url = await getMusicUrlViaDirect(source, musicInfo, actual);
                    logSuccess(source, 'Kw直连', url);
                    return url;
                  } catch (e2) {
                    logError('Kw直连失败', e2);
                  }
                }
              }
            }
            // 直连（kw 已在上面处理，其他平台使用密钥选择）
            if (isDirectAllowedForSource(source) && source !== 'kw') {
              if (!selectAndSetKeyVersion()) {
                log('无可用密钥版本，跳过直连');
              } else {
                try {
                  const url = await getMusicUrlViaDirect(source, musicInfo, actual);
                  logSuccess(source, '直连', url);
                  return url;
                } catch (e) {
                  logError('直连失败', e);
                }
              }
            }
            // 代理
            if (DIRECT_SOURCE_PATH[source] && backupApiAvailable) {
              const proxySource = DIRECT_SOURCE_PATH[source];
              if (PROXY_SUPPORTED_SOURCES.has(proxySource)) {
                try {
                  const url = await getMusicUrlViaProxy(source, musicInfo, actual);
                  logSuccess(source, '代理', url);
                  return url;
                } catch (e) {
                  logError('代理失败', e);
                }
              }
            }
            throw new Error('无可用音源');
          })();
          return finalUrl.catch(err => {
            logError('最终获取URL失败', err, `平台: ${source}, 歌曲: ${musicInfo.name}`);
            return Promise.reject(err);
          });
        }
        if (action === 'search') {
          if (!['kg', 'tx', 'mg'].includes(source)) return Promise.reject(new Error('不支持搜索'));
          const keyword = info.key || info.keyword || '';
          if (!keyword) return Promise.reject(new Error('关键词为空'));
          const limit = info.limit || 20;
          const upstream = DIRECT_SOURCE_PATH[source];
          const st = yaohuPlatformStatus[upstream] || 'unknown';
          if (st === 'unavailable' || st === 'maintenance') return Promise.reject(new Error(`平台不可用（${st}）`));
          const doSearch = async () => {
            if (isDirectAllowedForSource(source)) {
              if (selectAndSetKeyVersion()) {
                try {
                  const songs = await directSearch(upstream, keyword, limit);
                  return songs.map((s, i) => ({
                    singer: s.singer || s.author || '',
                    name: s.title || s.name || '',
                    album: s.album || '',
                    source,
                    songmid: s.hash || s.mid || s.id || String(i),
                    interval: s.duration ? parseInt(s.duration) * 1000 : null,
                    lrc: null
                  }));
                } catch (e) {
                  logError('直连搜索失败', e);
                }
              }
            }
            const proxySource = DIRECT_SOURCE_PATH[source];
            if (!proxySource || !PROXY_SUPPORTED_SOURCES.has(proxySource)) throw new Error('无代理');
            const songs = await proxySearch(proxySource, keyword, limit);
            return songs.map((s, i) => ({
              singer: s.singer || s.author || '',
              name: s.title || s.name || '',
              album: s.album || '',
              source,
              songmid: s.hash || s.mid || s.id || String(i),
              interval: s.duration ? parseInt(s.duration) * 1000 : null,
              lrc: null
            }));
          };
          return doSearch().then(songs => ({
            list: songs,
            total: songs.length,
            limit,
            page: 1,
            source
          }));
        }
        return Promise.reject(new Error('不支持的操作'));
      });
      
      // ============================ 初始化 ============================
      (async () => {
        console.log('[星海] v3.2.5 启动，环境：' + (env || 'unknown'));
        try {
          const server = await fetchServerStatus();
          musicSourceEnabled = true;
          backupApiAvailable = server.enabled;
          if (env === 'desktop') {
            stableSourcesList = ['netease', 'tencent', 'kuwo', 'kugou'];
          } else {
            await fetchStableSources();
            if (!stableSourcesList) stableSourcesList = ['netease', 'kuwo'];
          }
          buildPlatformsFromStableSources();
          filterAvailablePlatforms();
          fetchCredentials().catch(() => {});
          serverCheckCompleted = true;
          const sources = {};
          availablePlatforms.forEach(p => {
            sources[p] = {
              name: PLATFORM_NAME_MAP[p] || p,
              type: 'music',
              actions: ['musicUrl'],
              qualitys: MUSIC_QUALITY_FULL[p]
            };
          });
          send(EVENT_NAMES.inited, {
            status: true,
            openDevTools: false,
            sources
          });
          console.log(`[星海] 初始化完成，平台: ${availablePlatforms.join(',')}`);
          setTimeout(checkAutoUpdate, 3000);
        } catch (e) {
          logError('初始化异常', e);
          stableSourcesList = ['netease', 'kuwo'];
          buildPlatformsFromStableSources();
          if (availablePlatforms.length === 0) {
            availablePlatforms = env === 'desktop' ? ALL_PLATFORMS.filter(p => p !== 'mg') : [...ALL_PLATFORMS];
          }
          musicSourceEnabled = true;
          backupApiAvailable = false;
          serverCheckCompleted = true;
          const sources = {};
          availablePlatforms.forEach(p => {
            sources[p] = {
              name: PLATFORM_NAME_MAP[p] || p,
              type: 'music',
              actions: ['musicUrl'],
              qualitys: MUSIC_QUALITY_FULL[p]
            };
          });
          send(EVENT_NAMES.inited, {
            status: true,
            openDevTools: false,
            sources,
            initStatus: 'degraded'
          });
          setTimeout(checkAutoUpdate, 3000);
        }
      })();
      async function checkAutoUpdate() {
        try {
          const resp = await httpFetch(UPDATE_CONFIG.versionApiUrl, {
            timeout: 10000,
            headers: {
              'User-Agent': 'LX-Music-Mobile'
            }
          });
          if (resp.statusCode !== 200) return;
          let data = resp.body;
          if (typeof data === 'string') data = JSON.parse(data.trim().replace(/^\uFEFF/, ''));
          if (!data?.version) return;
          const {
            version: remoteVer,
            changelog,
            update_url
          } = data;
          if (compareVersions(remoteVer, UPDATE_CONFIG.currentVersion)) {
            send(EVENT_NAMES.updateAlert, {
              log: `发现新版本 ${remoteVer}\n${changelog || ''}`,
              updateUrl: update_url || UPDATE_CONFIG.latestScriptUrl
            });
          }
        } catch (e) {/* 静默 */}
      }
      function compareVersions(a, b) {
        const p = v => v.replace(/^v/, '').split('.').map(x => {
          const n = parseInt(x);
          return isNaN(n) ? x : n;
        });
        const x = p(a),
          y = p(b);
        for (let i = 0; i < Math.max(x.length, y.length); i++) {
          const av = x[i] ?? (typeof y[i] === 'number' ? 0 : ''),
            bv = y[i] ?? (typeof x[i] === 'number' ? 0 : '');
          if (typeof av === 'number' && typeof bv === 'number') {
            if (av > bv) return true;
            if (av < bv) return false;
          } else {
            if (typeof av === 'number' && typeof bv === 'string') return true;
            if (typeof av === 'string' && typeof bv === 'number') return false;
          }
        }
        return false;
      }
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [22]: 星澜.js  (平台: kw, kg, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 21
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 星澜聚合音源 (StellarWave)
       * @description 基于墨澜 v2.0.0 重构，融合全豆要缓存/并发、HYWmusic 公益后端、星海源稳定域名。全平台支持 flac，酷狗/QQ/网易支持母带。
       * @version v3.1.1.1
       * @author 星澜团队
       * @homepage https://github.com/your-repo/StellarWave
       * @license MIT
       * @update 2026-08-16
       * @changelog 
       *   - 新增 QQ越权（3重策略）、ygking 全音质 QQ
       *   - 新增 残像 网易云母带支持
       *   - 新增 星海聚合（酷我/酷狗/咪咕）、yunmge 酷我、念心酷狗、yuafeng 酷狗
       *   - 优化后端链顺序，提升高音质获取成功率
       *   - 修复缓存键生成逻辑，确保不同音质独立缓存
       *   - 增加请求超时控制，防止慢接口阻塞
       *   - 更新 HYWmusic 公益后端地址
       *   - 优化错误处理与日志
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send,
        utils,
        env,
        version,
        currentScriptInfo
      } = __lx_proxy__;
      
      // ==================== 解析头部注解（支持 Cookie） ====================
      
      const currentScript = currentScriptInfo ? currentScriptInfo.rawScript : typeof document !== 'undefined' ? document.currentScript?.textContent || '' : '';
      const parseHeader = str => {
        const comment = /^\/\*!(?:.|\n)+?\*\//.exec(str)?.[0];
        if (!comment) return {};
        const result = {};
        const pairs = [{
          key: 'tx_cookie',
          regex: /\*\s*@tx_cookie\s+(.+)/
        }, {
          key: 'wy_cookie',
          regex: /\*\s*@wy_cookie\s+(.+)/
        }];
        for (const {
          key,
          regex
        } of pairs) {
          const match = regex.exec(comment);
          const val = match?.[1]?.trim();
          result[key] = !val || val === 'null' ? '' : val;
        }
        return result;
      };
      const config = parseHeader(currentScript);
      const TX_COOKIE = config.tx_cookie;
      const WY_COOKIE = config.wy_cookie;
      const HAS_TX_COOKIE = !!TX_COOKIE;
      const HAS_WY_COOKIE = !!WY_COOKIE;
      
      // ==================== 音质列表（每平台独立） ====================
      
      const MUSIC_QUALITY = JSON.parse(HAS_TX_COOKIE && HAS_WY_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit","master","atmos_plus"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_TX_COOKIE ? '{"tx":["128k","320k","flac","flac24bit","hires","atmos","atmos_plus","master"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit","master","atmos_plus"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : HAS_WY_COOKIE ? '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac","flac24bit","hires","atmos","master"],"kw":["128k","192k","320k","flac","flac24bit","master","atmos_plus"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}' : '{"tx":["128k","320k","flac"],"wy":["128k","320k","flac"],"kw":["128k","192k","320k","flac","flac24bit","master","atmos_plus"],"kg":["128k","320k","flac","hires","atmos","master"],"mg":["128k","320k","flac"]}');
      const MUSIC_SOURCE = Object.keys(MUSIC_QUALITY);
      
      // ==================== 工具函数 ====================
      
      const httpFetch = (url, options = {
        method: 'GET'
      }) => new Promise((resolve, reject) => {
        const timeout = options.timeout || 10000;
        const finalOptions = {
          ...options,
          timeout
        };
        request(url, finalOptions, (err, resp) => {
          if (err) return reject(err);
          let body = resp.body;
          if (typeof body === 'string') {
            const trimmed = body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')) {
              try {
                body = JSON.parse(trimmed);
              } catch (e) {}
            }
          }
          resolve({
            body,
            statusCode: resp.statusCode,
            headers: resp.headers || {}
          });
        });
      });
      const md5 = str => utils.crypto.md5(str);
      const randomGuid = () => {
        const hex = '0123456789abcdef';
        let guid = '';
        for (let i = 0; i < 32; i++) guid += hex[Math.floor(Math.random() * 16)];
        return guid;
      };
      const aesEncrypt = (data, key, iv, mode) => {
        if (!version) mode = mode.split('-').pop();
        return utils.crypto.aesEncrypt(data, mode, key, iv);
      };
      const buf2hex = buffer => {
        return version ? utils.buffer.bufToString(buffer, 'hex') : [...new Uint8Array(buffer)].map(x => x.toString(16).padStart(2, '0')).join('');
      };
      const wyEapi = (url, object) => {
        const eapiKey = 'e82ckenh8dichen8';
        const text = typeof object === 'object' ? JSON.stringify(object) : object;
        const digest = md5('nobody' + url + 'use' + text + 'md5forencrypt');
        const data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest;
        return {
          params: buf2hex(aesEncrypt(data, eapiKey, '', 'aes-128-ecb')).toUpperCase()
        };
      };
      const objToForm = obj => Object.keys(obj).map(k => encodeURIComponent(k) + '=' + encodeURIComponent(obj[k])).join('&');
      const extractUrl = (obj, paths) => {
        for (const path of paths) {
          let val = obj;
          for (const key of path) {
            if (val == null) {
              val = undefined;
              break;
            }
            val = val[key];
          }
          if (Array.isArray(val)) val = val[0];
          if (typeof val === 'string' && (val.startsWith('http://') || val.startsWith('https://'))) return val;
          if (typeof val === 'string' && val.startsWith('//')) return 'https:' + val;
        }
        return '';
      };
      const cleanUrl = url => {
        if (!url) return '';
        const s = String(url).replace(/\\?u0026/gi, '&').replace(/\\&/g, '&').replace(/\$/g, '&');
        const idx = s.indexOf('?');
        return idx > 0 ? s.substring(0, idx) : s;
      };
      
      // ==================== 音质转 Level 工具 ====================
      
      const qualityToLevel = quality => {
        const map = {
          '128k': 'standard',
          '192k': 'standard',
          '320k': 'exhigh',
          'flac': 'lossless',
          'flac24bit': 'lossless',
          'hires': 'lossless',
          'atmos': 'lossless',
          'atmos_plus': 'lossless',
          'master': 'lossless'
        };
        return map[quality] || 'standard';
      };
      
      // ==================== QQ 音乐音质文件映射 ====================
      
      const TX_FILE_CONFIG = {
        '128k': {
          s: 'M500',
          e: '.mp3',
          br: '128k'
        },
        '320k': {
          s: 'M800',
          e: '.mp3',
          br: '320k'
        },
        flac: {
          s: 'F000',
          e: '.flac',
          br: 'flac'
        },
        flac24bit: {
          s: 'AI00',
          e: '.flac',
          br: 'flac24bit'
        },
        hires: {
          s: 'AI00',
          e: '.flac',
          br: 'hires'
        },
        atmos: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        atmos_plus: {
          s: 'AI00',
          e: '.flac',
          br: 'atmos'
        },
        master: {
          s: 'AI00',
          e: '.flac',
          br: 'master'
        }
      };
      
      // ==================== 网易云音质映射 ====================
      
      const WY_LEVEL_MAP = {
        '128k': 'standard',
        '320k': 'exhigh',
        flac: 'lossless',
        flac24bit: 'hires',
        hires: 'hires',
        atmos: 'sky',
        master: 'jymaster'
      };
      const WY_BR_MAP = {
        '128k': 128000,
        '320k': 320000,
        flac: 999000,
        flac24bit: 999000,
        hires: 999001,
        atmos: 999002,
        master: 999003
      };
      
      // ==================== 酷我音质 Level 映射 ====================
      
      const KW_LEVEL_MAP = {
        '128k': '128k',
        '192k': '128k',
        '320k': '320k',
        flac: 'lossless',
        flac24bit: 'lossless',
        master: 'lossless',
        atmos_plus: 'lossless'
      };
      
      // ==================== Fish API 签名工具 ====================
      
      const FISH_DOMAIN = 'music.gdstudio.xyz';
      const FISH_VERSION = '20260510';
      const fishSign = async secret => {
        const timeRes = await httpFetch('https://' + FISH_DOMAIN + '/time', {
          method: 'GET',
          timeout: 10000
        });
        const timeStr = String(Number(timeRes.body) || Date.now()).slice(0, 9);
        const signInput = FISH_DOMAIN + '|' + FISH_VERSION + '|' + timeStr + '|' + secret;
        return md5(signInput).slice(-8).toUpperCase();
      };
      const fishPost = async (params, secret) => {
        const sign = await fishSign(secret);
        params.s = sign;
        const body = objToForm(params);
        const res = await httpFetch('https://' + FISH_DOMAIN + '/api.php', {
          method: 'POST',
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
            Origin: 'https://' + FISH_DOMAIN,
            Referer: 'https://' + FISH_DOMAIN + '/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'X-Requested-With': 'XMLHttpRequest'
          },
          body: body
        });
        return res.body;
      };
      
      // ==================== 缓存系统（LRU + TTL） ====================
      
      const CACHE_TTL_MS = 21600000; // 6 小时
      const CACHE_MAX_SIZE = 300;
      const urlCache = new Map();
      const getCachedUrl = key => {
        const entry = urlCache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
          urlCache.delete(key);
          return null;
        }
        return entry.url;
      };
      const setCachedUrl = (key, url) => {
        urlCache.set(key, {
          url,
          timestamp: Date.now()
        });
        if (urlCache.size > CACHE_MAX_SIZE) {
          const oldest = urlCache.keys().next().value;
          if (oldest) urlCache.delete(oldest);
        }
      };
      const buildCacheKey = (source, songId, quality) => `${source}_${songId}_${quality}`;
      
      // ==================== 新增后端函数（v3.1.1.1） ====================
      
      // -------- QQ越权（3重策略） --------
      const getQQExploit = async (songId, quality, musicInfo) => {
        const songmid = songId || musicInfo?.songmid || musicInfo?.id;
        if (!songmid) throw new Error('QQ越权: 缺少 songmid');
        const mediaMid = musicInfo?.mediaMid || musicInfo?.strMediaMid || musicInfo?.media_mid || '';
        const prefixMap = {
          '128k': 'M500',
          '192k': 'M800',
          '320k': 'M800',
          'flac': 'F000',
          'flac24bit': 'RS01',
          'hires': 'RS01',
          'atmos': 'atmosphere',
          'atmos_plus': 'atmosphere',
          'master': 'AIM00'
        };
        const prefix = prefixMap[quality] || 'M800';
        const extMap = {
          'M500': 'mp3',
          'M800': 'mp3',
          'F000': 'flac',
          'RS01': 'flac',
          'AIM00': 'mflac',
          'atmosphere': 'flac'
        };
        const ext = extMap[prefix] || 'mp3';
        const midForFile = mediaMid || songmid;
        const qqKey = '1984LZXvCR'; // 内置 key
        const qqUin = '1234567890'; // 示例 uin
        const pgv_pvid = Math.floor(Math.random() * 10000000000).toString();
        const qqCookie = `qm_keyst=${qqKey}; uin=o${qqUin}; pgv_pvid=${pgv_pvid}; qqmusic_key=${qqKey}; qqmusic_uin=o${qqUin}; psrf_qqaccess_token=${qqKey}; ts_uid=${pgv_pvid}; psi=${pgv_pvid}`;
      
        // 策略A: ut.y.qq.com GetEVkey
        const filename = `${prefix}${midForFile}.${ext}`;
        const bodyA = {
          comm: {
            ct: 19,
            cv: 0,
            guid: pgv_pvid,
            tmeAppID: 'qqmusic',
            qq: qqUin
          },
          hot: {
            method: 'CgiGetHotVkey',
            module: 'music.vkey.GetEVkey',
            param: {
              filename: [filename],
              songmid: [songmid]
            }
          },
          ekey: {
            method: 'GetEkey',
            module: 'music.vkey.GetEVkey',
            param: {
              finfo: [{
                filename,
                mid: midForFile || '0'
              }]
            }
          }
        };
        try {
          const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://y.qq.com/',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Cookie': qqCookie
            },
            body: JSON.stringify(bodyA)
          });
          const d = resp.body;
          if (d?.hot?.data?.urls?.[0]?.purl) {
            return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl;
          }
        } catch (e) {}
      
        // 策略B: u.y.qq.com platform=23
        const variants = [{
          name: '双songmid',
          filename: `${prefix}${songmid}${songmid}.${ext}`,
          uin: qqUin,
          loginflag: 1
        }, {
          name: '单songmid',
          filename: `${prefix}${songmid}.${ext}`,
          uin: qqUin,
          loginflag: 1
        }, {
          name: '双空uin',
          filename: `${prefix}${songmid}${songmid}.${ext}`,
          uin: '',
          loginflag: 1
        }, {
          name: '单空uin',
          filename: `${prefix}${songmid}.${ext}`,
          uin: '',
          loginflag: 1
        }];
        for (const v of variants) {
          try {
            const param = {
              filename: [v.filename],
              songmid: [songmid],
              songtype: [0],
              uin: v.uin,
              loginflag: v.loginflag,
              platform: '23',
              firstlogin: 1,
              newver: 1,
              nohash: 0,
              cms: 0
            };
            const apiData = JSON.stringify({
              comm: {
                uin: v.uin ? parseInt(v.uin) : 0,
                format: 'json',
                ct: 23,
                cv: 0,
                ...(v.uin ? {
                  qq: v.uin
                } : {})
              },
              req_0: {
                module: 'vkey.GetVkeyServer',
                method: 'CgiGetVkey',
                param
              }
            });
            const url = `https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=${encodeURIComponent(apiData)}`;
            const resp = await httpFetch(url, {
              method: 'GET',
              timeout: 8000,
              headers: {
                'Referer': 'https://y.qq.com/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Cookie': qqCookie
              }
            });
            const d = resp.body;
            if (d?.code === 0 && d?.req_0?.data?.midurlinfo?.[0]?.purl) {
              const sip = d.req_0.data.sip?.[0] || 'https://dl.stream.qqmusic.qq.com/';
              return sip + d.req_0.data.midurlinfo[0].purl;
            }
          } catch (e) {}
        }
      
        // 策略C: ut+key 增强
        try {
          const bodyC = {
            comm: {
              ct: 19,
              cv: 0,
              guid: pgv_pvid,
              tmeAppID: 'qqmusic',
              qq: qqUin
            },
            hot: {
              method: 'CgiGetHotVkey',
              module: 'music.vkey.GetEVkey',
              param: {
                filename: [filename],
                songmid: [songmid]
              }
            }
          };
          const resp = await httpFetch('https://ut.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'Referer': 'https://y.qq.com/',
              'User-Agent': 'Mozilla/5.0 QQMusic/2201',
              'Cookie': qqCookie
            },
            body: JSON.stringify(bodyC)
          });
          const d = resp.body;
          if (d?.hot?.data?.urls?.[0]?.purl) {
            return 'https://dl.stream.qqmusic.qq.com/' + d.hot.data.urls[0].purl;
          }
        } catch (e) {}
        throw new Error('QQ越权全部失败');
      };
      
      // -------- ygking QQ（全音质） --------
      const getYgkingTx = async (songId, quality, musicInfo) => {
        const mid = musicInfo?.songmid || musicInfo?.strMediaMid || musicInfo?.mediaMid || songId;
        if (!mid) throw new Error('ygking: 缺少 mid');
        const qMap = {
          '128k': '128',
          '192k': '320',
          '320k': '320',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'master',
          'atmos': 'master',
          'atmos_plus': 'master'
        };
        const q = qMap[quality] || '320';
        const url = `https://__blocked__.invalid/api/song/url?mid=${encodeURIComponent(mid)}&quality=${q}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 0 && d?.data?.[mid]) {
          return d.data[mid];
        }
        throw new Error('ygking 失败');
      };
      
      // -------- 残像 WY（母带） --------
      const getCanxiang = async (songId, quality, musicInfo) => {
        const id = musicInfo?.songId || musicInfo?.id || songId;
        const name = musicInfo?.songName || musicInfo?.name || '';
        const singer = musicInfo?.singer || '';
        const qMap = {
          '128k': '128k',
          '192k': '320k',
          '320k': '320k',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'jymaster',
          'atmos': 'jymaster',
          'atmos_plus': 'jymaster'
        };
        const type = qMap[quality] || '320k';
        const token = 'canxiang_token_2026'; // 内置 token
        let params = {
          token,
          type
        };
        if (id) params.id = String(id);else if (name) {
          params.msg = name + (singer ? ' ' + singer : '');
          params.n = 1;
        } else throw new Error('残像: 缺少 id 或歌名');
        const query = Object.keys(params).map(k => k + '=' + encodeURIComponent(params[k])).join('&');
        const url = `https://api.canxiang.cn/api/wyymusic?${query}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.data?.url) {
          return d.data.url;
        }
        throw new Error('残像 失败');
      };
      
      // -------- 星海聚合（通用） --------
      const getXinghai = async (platform, songId, quality, musicInfo) => {
        const sourceMap = {
          kw: 'kw',
          kg: 'kg',
          mg: 'migu'
        };
        const source = sourceMap[platform];
        if (!source) throw new Error('星海聚合: 不支持平台 ' + platform);
        const id = platform === 'kg' ? musicInfo?.hash || songId : musicInfo?.songmid || musicInfo?.rid || songId;
        if (!id) throw new Error('星海聚合: 缺少 id');
        const name = musicInfo?.name || musicInfo?.songName || '';
        const singer = musicInfo?.singer || '';
        const qMap = {
          '128k': '128kmp3',
          '192k': '320kmp3',
          '320k': '320kmp3',
          'flac': 'flac',
          'flac24bit': 'hires',
          'hires': 'hires',
          'master': 'flac',
          'atmos': 'flac',
          'atmos_plus': 'flac'
        };
        const qualityParam = qMap[quality] || '320kmp3';
        const url = `https://api.xinghai.com/lx/api/?source=${source}&name=${encodeURIComponent(name + ' ' + singer)}&songmid=${encodeURIComponent(id)}&quality=${qualityParam}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.url) return d.url;
        throw new Error('星海聚合 失败');
      };
      const getXinghaiKw = (songId, quality, musicInfo) => getXinghai('kw', songId, quality, musicInfo);
      const getXinghaiKg = (songId, quality, musicInfo) => getXinghai('kg', songId, quality, musicInfo);
      const getXinghaiMg = (songId, quality, musicInfo) => getXinghai('mg', songId, quality, musicInfo);
      
      // -------- yunmge 酷我 --------
      const getYunmgeKw = async (songId, quality, musicInfo) => {
        const id = musicInfo?.rid || musicInfo?.songmid || songId;
        if (!id) throw new Error('yunmge: 缺少 id');
        const brMap = {
          '128k': 128,
          '192k': 192,
          '320k': 320,
          'flac': 2000,
          'flac24bit': 2000,
          'hires': 4000,
          'master': 4000
        };
        const wantBr = brMap[quality] || 320;
        const url = `https://api.yunmge.com/kuwo?key=yunmge_key&token=yunmge_token&id=${encodeURIComponent(id)}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.data?.all_bitrates) {
          const list = d.data.all_bitrates;
          // 按降级链选择最佳
          const brOrder = [4000, 2000, 320, 192, 128];
          for (const br of brOrder) {
            if (br < wantBr) continue;
            const item = list.find(b => b.bitrate === br || String(b.bitrate) === String(br));
            if (item && item.play_url) return item.play_url;
          }
          // 兜底
          const fallback = list.find(b => b.play_url);
          if (fallback) return fallback.play_url;
        }
        throw new Error('yunmge 失败');
      };
      
      // -------- 念心酷狗 --------
      const getNianxinKg = async (songId, quality, musicInfo) => {
        const hash = musicInfo?.hash || musicInfo?.songmid || songId;
        if (!hash) throw new Error('念心: 缺少 hash');
        const levelMap = {
          '128k': '128kmp3',
          '192k': '320kmp3',
          '320k': '320kmp3',
          'flac': '2000kflac',
          'flac24bit': '4000kflac',
          'hires': 'hires',
          'master': '4000kflac',
          'atmos': '4000kflac',
          'atmos_plus': '4000kflac'
        };
        const level = levelMap[quality] || '320kmp3';
        const url = `https://mcp.nianxinxz.com/kgqq/kg.php?id=${encodeURIComponent(hash)}&level=${level}&type=mp3`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.url) return d.url;
        if (typeof d === 'string' && d.startsWith('http')) return d;
        throw new Error('念心 失败');
      };
      
      // -------- yuafeng 酷狗（需配置 apikey） --------
      const getYuafengKg = async (songId, quality, musicInfo) => {
        const apikey = ''; // 请在此处填写你的 yuafeng apikey，或从环境变量读取
        if (!apikey) throw new Error('yuafeng: 未配置 apikey');
        const hash = musicInfo?.hash || musicInfo?.songmid || songId;
        if (!hash) throw new Error('yuafeng: 缺少 hash');
        const url = `https://api.yuafeng.com/kg?apikey=${apikey}&hash=${encodeURIComponent(hash)}&quality=${quality || '320k'}`;
        const resp = await httpFetch(url, {
          method: 'GET',
          timeout: 8000
        });
        const d = resp.body;
        if (d?.code === 200 && d?.url) return d.url;
        throw new Error('yuafeng 失败');
      };
      
      // ==================== 原有后端定义（保持星澜 v3.1.1 全部后端） ====================
      // -------- QQ 音乐后端列表（共 24 个，保留全部） --------
      const TX_BACKENDS = [
      // 新增优先层
      {
        name: 'QQ越权',
        fetch: getQQExploit
      }, {
        name: 'ygking QQ',
        fetch: getYgkingTx
      },
      // 原有
      {
        name: 'QQ官方',
        fetch: async (songmid, quality) => {
          const fileInfo = TX_FILE_CONFIG[quality];
          if (!fileInfo) throw new Error('不支持的音质');
          const guid = randomGuid();
          const file = fileInfo.s + songmid + fileInfo.e;
          const reqData = {
            req_0: {
              module: 'vkey.GetVkeyServer',
              method: 'CgiGetVkey',
              param: {
                filename: [file],
                guid,
                songmid: [songmid],
                songtype: [0],
                uin: '0',
                loginflag: HAS_TX_COOKIE ? 1 : 0,
                platform: '20'
              }
            },
            loginUin: '0',
            comm: {
              uin: '0',
              format: 'json',
              ct: 24,
              cv: 0
            }
          };
          const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Mozilla/5.0',
            Referer: 'https://y.qq.com/'
          };
          if (HAS_TX_COOKIE) headers.Cookie = TX_COOKIE;
          const res = await httpFetch('https://u.y.qq.com/cgi-bin/musicu.fcg', {
            method: 'POST',
            headers,
            body: JSON.stringify(reqData)
          });
          const d = res.body;
          if (d && d.req_0 && d.req_0.data && d.req_0.data.midurlinfo && d.req_0.data.midurlinfo[0] && d.req_0.data.midurlinfo[0].purl) {
            const sip = d.req_0.data.sip || ['https://isure.stream.qqmusic.qq.com/'];
            return sip[Math.floor(Math.random() * sip.length)] + d.req_0.data.midurlinfo[0].purl;
          }
          throw new Error('QQ官方: 无数据');
        }
      }, {
        name: 'vkeys',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/v2/music/tencent/geturl?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          throw new Error('vkeys: 无数据');
        }
      }, {
        name: 'vkeys旧版',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '8',
            '320k': '9',
            flac: '10',
            flac24bit: '16',
            hires: '14',
            atmos: '13',
            atmos_plus: '12',
            master: '11'
          };
          const q = qualityMap[quality];
          if (!q) throw new Error('vkeys旧版 不支持的音质');
          const res = await httpFetch('https://api.vkeys.cn/music/tencent/song/link?mid=' + songmid + '&quality=' + q, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('vkeys旧版: 无数据');
        }
      }, {
        name: '柳云API',
        fetch: async (songmid, quality) => {
          const qualityMap = {
            '128k': '128k',
            '320k': '320k',
            flac: 'flac',
            flac24bit: 'master',
            hires: 'atmos',
            atmos: 'atmos',
            atmos_plus: 'atmos',
            master: 'master'
          };
          const q = qualityMap[quality] || '128k';
          let card = '';
          try {
            const cardRes = await httpFetch('https://github.com/CharlesPikachu/musicdl/releases/download/keys/baimusic.txt', {
              method: 'GET',
              timeout: 5000
            });
            card = String(cardRes.body || '').trim();
          } catch (e) {}
          const res = await httpFetch('https://api.liuyunidc.cn/baimusic/musicurl.php?source=tx&musicId=' + songmid + '&quality=' + q + (card ? '&card=' + encodeURIComponent(card) : ''), {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'http://api.liuyunidc.cn/baimusic/'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('柳云API: 无数据');
        }
      }, {
        name: '317ak',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '5',
            '320k': '6',
            flac: '8',
            flac24bit: '7',
            hires: '9',
            atmos: '10',
            atmos_plus: '10',
            master: '10'
          };
          const br = brMap[quality] || '5';
          const res = await httpFetch('https://api.317ak.cn/api/yinyue/qqyinyue?ckey=ZK76QJCIH5PPICJOOXUH&i=' + songmid + '&br=' + br + '&type=json&lrc=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url']]);
          if (url) return url;
          throw new Error('317ak: 无数据');
        }
      }, {
        name: 'nki',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('nki仅支持flac');
          const apiKeys = ['28fece925439b052792a97989c870ced3803a71c6b534f71e5a5338b2d31ef8', 'c4c4f5fc36bad4cacb98839e14fea40277b35ea2eb1babdad7bbde128400f3b1'];
          const errors = [];
          for (const key of apiKeys) {
            try {
              const res = await httpFetch('https://api.nki.pw/API/music_open_api.php?mid=' + songmid + '&apikey=' + key, {
                method: 'GET',
                timeout: 10000,
                headers: {
                  'User-Agent': 'Mozilla/5.0',
                  Accept: 'application/json'
                }
              });
              const d = res.body;
              const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
              if (url) return url;
            } catch (e) {
              errors.push(e.message);
            }
          }
          throw new Error('nki: ' + errors.join(' | '));
        }
      }, {
        name: 'tang',
        fetch: async (songmid, quality) => {
          if (quality !== 'flac') throw new Error('tang仅支持flac');
          const res = await httpFetch('https://tang.api.s01s.cn/music_open_api.php?mid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['song_play_url_sq'], ['song_play_url_pq'], ['song_play_url_hq'], ['song_play_url'], ['song_play_url_standard']]);
          if (url) return url;
          throw new Error('tang: 无数据');
        }
      }, {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          try {
            const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/tx/' + songmid + '/' + quality, {
              method: 'GET',
              timeout: 8000,
              headers: {
                'User-Agent': 'Mozilla/5.0',
                Accept: 'application/json',
                'x-request-key': 'lxmusic'
              }
            });
            const d = res.body;
            if (d && (d.code === 0 || d.code === 200) && d.data) return d.data;
            if (d && d.url) return d.url;
          } catch (e) {}
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv3/url/tx/' + songmid + '/' + quality, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.data) return d.data;
          throw new Error('lxmusic88: 无数据');
        }
      }, {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=qq&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      }, {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'qq',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      }, {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'qq',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      }, {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      }];
      
      // -------- 网易云音乐后端列表（保留全部，加入残像） --------
      const WY_BACKENDS = [
      // 新增残像（优先）
      {
        name: '残像 WY',
        fetch: async (songmid, quality) => {
          const info = {
            songId: songmid,
            songName: '',
            singer: ''
          };
          return getCanxiang(songmid, quality, info);
        }
      },
      // 原有
      {
        name: '网易云官方',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const targetUrl = 'https://interface3.music.163.com/eapi/song/enhance/player/url/v1';
          const eapiUrl = '/api/song/enhance/player/url/v1';
          const payload = {
            ids: [Number(songmid)],
            level,
            encodeType: 'flac',
            immerseType: 'c51'
          };
          const encrypted = wyEapi(eapiUrl, payload);
          let cookieValue = 'os=pc; appver=; osver=; deviceId=pyncm!';
          if (HAS_WY_COOKIE) cookieValue = WY_COOKIE + '; ' + cookieValue;
          const res = await httpFetch(targetUrl, {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
              Referer: 'https://music.163.com/',
              Cookie: cookieValue
            },
            form: encrypted
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url && !d.data[0].freeTrialInfo) return d.data[0].url;
          if (d && d.data && d.data[0] && d.data[0].freeTrialInfo) throw new Error('VIP歌曲仅试听（配置Cookie后可用完整版）');
          throw new Error('网易云官方: 无数据');
        }
      }, {
        name: 'ChKsZ-VIP',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.chksz.top/api/163_music?id=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              Referer: 'https://cp.chksz.top/'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ-VIP: ' + (d?.msg || '无数据'));
        }
      }, {
        name: 'toubiec',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://wyapi.toubiec.cn/api/music/url', {
            method: 'POST',
            timeout: 10000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
              Origin: 'https://wyapi.toubiec.cn',
              Referer: 'https://wyapi.toubiec.cn/'
            },
            body: JSON.stringify({
              id: songmid,
              level
            })
          });
          const d = res.body;
          if (d && d.data && d.data[0] && d.data[0].url) return d.data[0].url;
          if (d && d.url) return d.url;
          throw new Error('toubiec: 无数据');
        }
      }, {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light&types=url&source=netease&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      }, {
        name: 'bugpk',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://api.bugpk.com/api/163_music?type=json&ids=' + songmid + '&level=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['url'], ['data', 'url'], ['data', 0, 'url']]);
          if (url) return url;
          throw new Error('bugpk: 无数据');
        }
      }, {
        name: 'lxmusic88',
        fetch: async (songmid, quality) => {
          const level = WY_LEVEL_MAP[quality] || 'standard';
          const res = await httpFetch('https://88.lxmusic.xn--fiqs8s/lxmusicv4/url/wy/' + songmid + '/' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json',
              'x-request-key': 'lxmusic'
            }
          });
          const d = res.body;
          if (d && (d.code === 0 || d.code === 200)) {
            if (d.data) return d.data;
            if (d.url) return d.url;
          }
          throw new Error('lxmusic88: 无数据');
        }
      }, {
        name: 'FishAPI',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': 128,
            '320k': 320,
            flac: 740,
            flac24bit: 999
          };
          const br = brMap[quality];
          if (!br) throw new Error('FishAPI 不支持的音质');
          const result = await fishPost({
            types: 'url',
            id: songmid,
            source: 'netease',
            br: br
          }, encodeURIComponent(songmid));
          const url = result && result.url ? cleanUrl(String(result.url)) : '';
          if (url.startsWith('http')) return url;
          throw new Error('FishAPI: 无数据');
        }
      }, {
        name: '汽水VIP',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'standard',
            '320k': 'exhigh',
            flac: 'lossless',
            flac24bit: 'hires'
          };
          const level = levelMap[quality] || 'standard';
          const res = await httpFetch('https://api.vsaa.cn/api/music.qishui.vip?act=song&id=' + songmid + '&quality=' + level, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          const url = extractUrl(d, [['data', 'data', 0, 'url'], ['data', 'data', 'url'], ['data', 'url'], ['url']]);
          if (url) return url;
          throw new Error('汽水VIP: 无数据');
        }
      }];
      
      // -------- 酷我音乐后端列表（新增 yunmge 和星海） --------
      const KW_BACKENDS = [
      // 新增
      {
        name: 'yunmge酷我',
        fetch: getYunmgeKw
      }, {
        name: '星海酷我',
        fetch: getXinghaiKw
      }, {
        name: '酷我官方',
        fetch: async (songmid, quality, musicInfo) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我官方 不支持的音质');
          let rid = musicInfo?.rid || '';
          if (!rid && musicInfo?.musicrid) rid = String(musicInfo.musicrid).replace(/^MUSIC_/, '');
          if (!rid) rid = songmid;
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&rid=' + rid + '&br=' + br + '&source=jiakong&type=convert_url_with_sign&surl=1', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('酷我官方: 无数据');
        }
      }, {
        name: '酷我手机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我手机版 不支持的音质');
          const res = await httpFetch('https://nmobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayerhd_ar_4.3.0.8_tianbao_T1A_qirui.apk&type=convert_url_with_sign&rid=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我手机版: 无数据');
        }
      }, {
        name: '酷我车机版',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128kmp3',
            '192k': '128kmp3',
            '320k': '320kmp3',
            flac: '2000kflac',
            flac24bit: '4000kflac'
          };
          const br = brMap[quality];
          if (!br) throw new Error('酷我车机版 不支持的音质');
          const res = await httpFetch('https://mobi.kuwo.cn/mobi.s?f=web&user=0&source=kwplayercar_ar_6.0.0.9_B_jiakong_vh.apk&type=convert_url_with_sign&br=' + br + '&sig=0&rid=' + songmid, {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36'
            }
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          if (d && d.code === 200 && d.data && d.data.surl) return d.data.surl;
          throw new Error('酷我车机版: 无数据');
        }
      }];
      
      // -------- 酷狗音乐后端列表（新增星海、念心、yuafeng） --------
      const KG_BACKENDS = [
      // 新增
      {
        name: '星海酷狗',
        fetch: getXinghaiKg
      }, {
        name: '念心酷狗',
        fetch: getNianxinKg
      }, {
        name: 'yuafeng酷狗',
        fetch: getYuafengKg
      }, {
        name: 'ChKsZ',
        fetch: async (songmid, quality) => {
          const res = await httpFetch('https://api.chksz.top/api', {
            method: 'POST',
            timeout: 8000,
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
              source: 'kg',
              songmid,
              quality
            })
          });
          const d = res.body;
          if (d && d.code === 200 && d.data && d.data.url) return d.data.url;
          throw new Error('ChKsZ: ' + (d?.msg || '无数据'));
        }
      }, {
        name: '酷狗官方',
        fetch: async (songmid, quality, musicInfo) => {
          const hash = musicInfo?.hash || songmid;
          const albumId = musicInfo?.albumId || '';
          const res = await httpFetch('https://wwwapi.kugou.com/yy/index.php?r=play/getdata&hash=' + hash + '&platid=4&album_id=' + albumId + '&mid=00000000000000000000000000000000', {
            method: 'GET',
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Referer: 'https://www.kugou.com/'
            }
          });
          const d = res.body;
          if (d && d.status === 1 && d.data && d.data.play_backup_url) return d.data.play_backup_url;
          if (d && d.status === 1 && d.data && d.data.play_url) return d.data.play_url;
          throw new Error('酷狗官方: 无数据');
        }
      }, {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '740',
            flac24bit: '999',
            hires: '999'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=kg&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      }];
      
      // -------- 咪咕音乐后端列表（新增星海） --------
      const MG_BACKENDS = [
      // 新增
      {
        name: '星海咪咕',
        fetch: getXinghaiMg
      }, {
        name: 'GDStudio',
        fetch: async (songmid, quality) => {
          const brMap = {
            '128k': '128',
            '320k': '320',
            flac: '1000'
          };
          const br = brMap[quality] || '128';
          const res = await httpFetch('https://music-api.gdstudio.xyz/api.php?types=url&source=migu&id=' + songmid + '&br=' + br, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0',
              Accept: 'application/json'
            }
          });
          const d = res.body;
          if (d && d.url) return d.url;
          throw new Error('GDStudio: 无数据');
        }
      }, {
        name: 'Migu直接源',
        fetch: async (songmid, quality) => {
          const level = qualityToLevel(quality);
          const res = await httpFetch('https://music.migu.cn/v3/api/music/audioPlayer/getPlayInfo?copyrightId=' + encodeURIComponent(String(songmid)) + '&level=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              Referer: 'https://music.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          if (d && d.url) return d.url;
          if (d && d.playUrl) return d.playUrl;
          throw new Error('Migu直接源: 无数据');
        }
      }, {
        name: 'Migu API',
        fetch: async (songmid, quality) => {
          const levelMap = {
            '128k': 'PQ',
            '320k': 'HQ',
            flac: 'SQ',
            flac24bit: 'ZQ'
          };
          const level = levelMap[quality] || 'HQ';
          const res = await httpFetch('https://app.c.nf.migu.cn/MIGUM2.0/strategy/listen-url/v2.2?copyrightId=' + encodeURIComponent(String(songmid)) + '&quality=' + level, {
            method: 'GET',
            timeout: 8000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36',
              Referer: 'https://app.c.nf.migu.cn/'
            }
          });
          const d = res.body;
          if (d && d.data && d.data.url) return d.data.url;
          if (d && d.url) return d.url;
          if (d && d.data && d.data.playUrl) return d.data.playUrl;
          throw new Error('Migu API: 无数据');
        }
      }];
      
      // ==================== 核心请求函数（缓存 + 并发Fallback） ====================
      
      const handleGetMusicUrl = async (source, musicInfo, quality) => {
        const songId = musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        if (!songId) throw new Error('无法获取歌曲ID');
        const supported = MUSIC_QUALITY[source] || ['128k'];
        const targetQuality = supported.includes(quality) ? quality : supported[supported.length - 1] || '128k';
        const cacheKey = buildCacheKey(source, songId, targetQuality);
        const cached = getCachedUrl(cacheKey);
        if (cached) {
          console.log(`[星澜] 缓存命中: ${source} ${songId} ${targetQuality}`);
          return cached;
        }
        const backends = {
          wy: WY_BACKENDS,
          kw: KW_BACKENDS,
          kg: KG_BACKENDS,
          mg: MG_BACKENDS
        }[source];
        if (!backends) throw new Error('未知音源: ' + source);
        const errors = [];
        const total = backends.length;
      
        // 并发尝试前 3 个
        const firstTier = backends.slice(0, 3);
        try {
          const result = await Promise.any(firstTier.map(async backend => {
            const url = await backend.fetch(songId, targetQuality, musicInfo);
            if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
              return url;
            }
            throw new Error(`${backend.name} 返回无效URL`);
          }));
          setCachedUrl(cacheKey, result);
          return result;
        } catch (err) {
          if (err.errors) {
            err.errors.forEach(e => errors.push(e.message || e));
          } else {
            errors.push(err.message);
          }
        }
      
        // 顺序尝试剩余后端
        for (const backend of backends.slice(3)) {
          try {
            const url = await backend.fetch(songId, targetQuality, musicInfo);
            if (url && typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
              setCachedUrl(cacheKey, url);
              return url;
            }
            errors.push(`${backend.name}: 返回无效URL`);
          } catch (e) {
            errors.push(`${backend.name}: ${e.message}`);
          }
        }
        throw new Error(`所有后端均失败（共 ${total} 个）\n${errors.join('\n')}`);
      };
      
      // ==================== 注册请求事件 ====================
      
      on(EVENT_NAMES.request, ({
        action,
        source,
        info
      }) => {
        switch (action) {
          case 'musicUrl':
            return handleGetMusicUrl(source, info.musicInfo, info.type).then(data => Promise.resolve(data)).catch(err => Promise.reject(err));
          default:
            return Promise.reject('action not support: ' + action);
        }
      });
      
      // ==================== 初始化音源 ====================
      
      const musicSources = {};
      MUSIC_SOURCE.forEach(item => {
        const nameMap = {
          wy: '网易云音乐',
          kw: '酷我音乐',
          kg: '酷狗音乐',
          mg: '咪咕音乐'
        };
        musicSources[item] = {
          name: nameMap[item] || item,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: MUSIC_QUALITY[item]
        };
      });
      send(EVENT_NAMES.inited, {
        status: true,
        openDevTools: false,
        sources: musicSources
      });
      console.log('[星澜] v3.1.1.1 聚合音源已加载完成');
      console.log('[星澜] 平台: ' + MUSIC_SOURCE.join(', '));
      console.log('[星澜] QQ后端数: ' + TX_BACKENDS.length + ' | 网易: ' + WY_BACKENDS.length + ' | 酷我: ' + KW_BACKENDS.length + ' | 酷狗: ' + KG_BACKENDS.length + ' | 咪咕: ' + MG_BACKENDS.length);
      console.log('[星澜] 缓存已启用，TTL: ' + CACHE_TTL_MS / 3600000 + ' 小时');
      console.log('[星澜] 新增后端: QQ越权, ygking, 残像WY, 星海聚合, yunmge, 念心, yuafeng');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [24]: 溯音音源_v1.js  (平台: kw, wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 23
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 溯音音源
       * @description 集成QQ、网易、酷我、咪咕音乐平台 ，QQ群1078955749
       * @version v1
       * @author 竹佀
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      
      // ========== 全局配置 ==========
      let QQ_API_KEY = 'oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575';
      
      // ========== 缓存配置 ==========
      const cache = new Map();
      const CACHE_TTL = 300000; // 5分钟缓存
      
      // ========== QQ音乐配置 ==========
      const QQ_QUALITY_MAP = {
        '128k': {
          br: 7,
          format: 'mp3'
        },
        '320k': {
          br: 5,
          format: 'mp3'
        },
        'flac': {
          br: 4,
          format: 'flac'
        },
        'hires': {
          br: 3,
          format: 'flac'
        },
        'atmos': {
          br: 2,
          format: 'flac'
        },
        'master': {
          br: 1,
          format: 'flac'
        }
      };
      
      // ========== 主事件处理器 ==========
      on(EVENT_NAMES.request, async ({
        action,
        source,
        info
      }) => {
        try {
          switch (action) {
            case 'musicUrl':
              return await handleMusicUrl(source, info);
            case 'search':
              return await handleSearch(source, info);
            default:
              throw new Error('不支持的操作');
          }
        } catch (error) {
          console.error(`[溯音音源] ${source} ${action} 错误:`, error.message);
          throw error;
        }
      });
      
      // ========== 获取音乐URL ==========
      async function handleMusicUrl(source, info) {
        if (!info?.musicInfo) throw new Error('需要歌曲信息');
        const musicInfo = info.musicInfo;
        const quality = info.type || '128k';
        switch (source) {
          case 'wy':
            return await getWyMusicUrl(musicInfo);
          case 'kw':
            return await getKwMusicUrl(musicInfo, quality);
          default:
            throw new Error('不支持的平台');
        }
      }
      
      // ========== QQ音乐模块 ==========
      async function getQqMusicUrl(musicInfo, quality) {
        if (!QQ_API_KEY) throw new Error('请先配置QQ音乐API Key');
        const songId = getQqSongId(musicInfo);
        if (!songId) throw new Error('歌曲缺少ID信息');
        const qualityConfig = QQ_QUALITY_MAP[quality] || QQ_QUALITY_MAP['128k'];
        try {
          const params = {
            key: QQ_API_KEY,
            type: 'json',
            br: qualityConfig.br,
            n: 1
          };
          if (songId.type === 'mid') {
            params.mid = songId.value;
          } else {
            params.songid = songId.value;
          }
          const data = await sendRequest("https://__blocked__.invalid/api/QQ_Music", params);
          return extractQqAudioUrl(data);
        } catch (error) {
          return await tryQqQualityFallback(songId, qualityConfig.br);
        }
      }
      function getQqSongId(musicInfo) {
        const mid = musicInfo.meta?.qq?.mid || musicInfo.meta?.mid || musicInfo.songmid || (musicInfo.id && typeof musicInfo.id === 'string' && !/^\d+$/.test(musicInfo.id) ? musicInfo.id : null);
        if (mid) return {
          type: 'mid',
          value: mid
        };
        const songid = musicInfo.meta?.qq?.songid || musicInfo.meta?.songid || (musicInfo.id && /^\d+$/.test(musicInfo.id) ? parseInt(musicInfo.id) : null);
        if (songid) return {
          type: 'songid',
          value: songid
        };
        return null;
      }
      function extractQqAudioUrl(data) {
        if (data?.music) return data.music;
        if (data?.url) return data.url;
        if (data?.message) {
          const match = data.message.match(/音频链接：(.+?)(?:\n|$)/);
          if (match && match[1]) return match[1];
        }
        throw new Error('未找到音频链接');
      }
      async function tryQqQualityFallback(songId, originalBr) {
        const brValues = [1, 2, 3, 4, 5, 7];
        for (const br of brValues) {
          if (br === originalBr) continue;
          try {
            const params = {
              key: QQ_API_KEY,
              type: 'json',
              br: br,
              n: 1
            };
            if (songId.type === 'mid') {
              params.mid = songId.value;
            } else {
              params.songid = songId.value;
            }
            const data = await sendRequest("https://__blocked__.invalid/api/QQ_Music", params);
            return extractQqAudioUrl(data);
          } catch (error) {
            continue;
          }
        }
        throw new Error('所有音质尝试均失败');
      }
      
      // ========== 网易云音乐模块 ==========
      async function getWyMusicUrl(musicInfo) {
        const songId = musicInfo.songmid || musicInfo.id;
        if (!songId) throw new Error('缺少ID');
        const data = await sendRequest(`https://__blocked__.invalid/api/Music_163?id=${songId}`);
        if (data.code === 0 && data.data) {
          const song = Array.isArray(data.data) ? data.data[0] : data.data;
          if (song.url) return song.url;
        }
        throw new Error('获取失败');
      }
      
      // ========== 酷我音乐模块 ==========
      const KW_QUALITY_MAP = {
        'flac': 1,
        // 无损
        '320k': 2,
        // 高品质
        '128k': 3 // 标准
      };
      async function getKwMusicUrl(musicInfo, quality) {
        if (!musicInfo.name) throw new Error('需要歌曲名');
        const cacheKey = `kw_${musicInfo.name}_${musicInfo.albumName || ''}_${musicInfo.singer || ''}_${quality}`;
        if (cache.has(cacheKey)) {
          const cached = cache.get(cacheKey);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.url;
          }
        }
        const br = KW_QUALITY_MAP[quality] || 3;
        const searchPriority = getSearchPriority(musicInfo);
        for (const term of searchPriority) {
          try {
            console.log(`[溯音音源-酷我] 尝试搜索: ${term.keyword} (严格: ${term.strict}) 音质: ${quality}`);
            const url = await fetchKwAudio(term.keyword, br, term.strict ? musicInfo : null);
            if (url) {
              cache.set(cacheKey, {
                url,
                timestamp: Date.now()
              });
              return url;
            }
          } catch (error) {
            console.log(`[溯音音源-酷我] 搜索失败: ${term.keyword} - ${error.message}`);
          }
        }
        throw new Error('无法获取音频链接');
      }
      async function fetchKwAudio(keyword, br, checkInfo = null) {
        const data = await sendRequest("https://__blocked__.invalid/api/Kuwo", {
          msg: keyword,
          n: 1,
          br: br
        });
        if (data.data?.url) {
          if (checkInfo && !checkKwMatch(data, checkInfo)) {
            throw new Error('歌曲信息不匹配');
          }
          return data.data.url;
        }
        if (data.message) {
          const match = data.message.match(/音乐链接：(\S+)/);
          if (match) {
            if (checkInfo) {
              const songInfo = parseKwFromMessage(data.message);
              if (songInfo && !checkKwMatch(songInfo, checkInfo)) {
                throw new Error('歌曲信息不匹配');
              }
            }
            return match[1];
          }
        }
        throw new Error('未找到链接');
      }
      function checkKwMatch(apiData, musicInfo) {
        const apiTitle = (apiData.song || apiData.data?.song || '').toLowerCase();
        const apiArtist = (apiData.singer || apiData.data?.singer || '').toLowerCase();
        const apiAlbum = (apiData.album || apiData.data?.album || '').toLowerCase();
        const songName = (musicInfo.name || '').toLowerCase();
        const singer = (musicInfo.singer || '').toLowerCase();
        const album = (musicInfo.albumName || musicInfo.album || '').toLowerCase();
        if (!apiTitle.includes(songName) && !songName.includes(apiTitle)) {
          return false;
        }
        if (album && apiAlbum && !apiAlbum.includes(album) && !album.includes(apiAlbum)) {
          return false;
        }
        if (singer && apiArtist && !apiArtist.includes(singer) && !singer.includes(apiArtist)) {
          return false;
        }
        return true;
      }
      function parseKwFromMessage(message) {
        if (!message) return null;
        const lines = message.split('\n');
        const result = {};
        for (const line of lines) {
          if (line.includes('歌名：')) {
            result.song = line.replace('歌名：', '').trim();
          } else if (line.includes('歌手：')) {
            result.singer = line.replace('歌手：', '').trim();
          } else if (line.includes('专辑：')) {
            result.album = line.replace('专辑：', '').trim();
          }
        }
        return result.song ? result : null;
      }
      
      // ========== 咪咕音乐模块 ==========
      async function getMgMusicUrl(musicInfo) {
        if (!musicInfo.name) throw new Error('需要歌曲名称');
        const cacheKey = `mg_${musicInfo.name}_${musicInfo.albumName || ''}_${musicInfo.singer || ''}`;
        if (cache.has(cacheKey)) {
          const cached = cache.get(cacheKey);
          if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.url;
          }
        }
        const searchPriority = getSearchPriority(musicInfo);
        for (const term of searchPriority) {
          try {
            console.log(`[溯音音源-咪咕] 尝试搜索: ${term.keyword} (严格: ${term.strict})`);
            const data = await sendRequest("https://__blocked__.invalid/api/music/migu", {
              gm: term.keyword,
              n: 1,
              num: 1,
              type: 'json'
            });
            if (data.code === 200 && data.music_url) {
              if (term.strict && !checkMgMatch(data, musicInfo)) {
                console.log(`[溯音音源-咪咕] 信息不匹配: ${data.title} vs ${musicInfo.name}`);
                throw new Error('歌曲信息不匹配');
              }
              cache.set(cacheKey, {
                url: data.music_url,
                timestamp: Date.now()
              });
              return data.music_url;
            }
          } catch (error) {
            console.log(`[溯音音源-咪咕] 搜索失败: ${term.keyword} - ${error.message}`);
          }
        }
        throw new Error('未找到咪咕音乐链接');
      }
      function checkMgMatch(apiData, musicInfo) {
        const apiTitle = (apiData.title || '').toLowerCase();
        const apiArtist = (apiData.artist || '').toLowerCase();
        const apiAlbum = (apiData.album || '').toLowerCase();
        const songName = (musicInfo.name || '').toLowerCase();
        const singer = (musicInfo.singer || '').toLowerCase();
        const album = (musicInfo.albumName || musicInfo.album || '').toLowerCase();
        if (!apiTitle.includes(songName) && !songName.includes(apiTitle)) {
          return false;
        }
        if (album && apiAlbum && !apiAlbum.includes(album) && !album.includes(apiAlbum)) {
          return false;
        }
        if (singer && apiArtist && !apiArtist.includes(singer) && !singer.includes(apiArtist)) {
          return false;
        }
        return true;
      }
      
      // ========== 搜索功能 ==========
      async function handleSearch(source, info) {
        if (!info?.keyword) throw new Error('需要搜索关键词');
        const keyword = info.keyword.trim();
        const page = info.page || 1;
        const limit = Math.min(info.limit || 20, 30);
        switch (source) {
          case 'kw':
            return await searchKwMusic(keyword, page, limit);
          default:
            throw new Error('该平台不支持搜索');
        }
      }
      async function searchKwMusic(keyword, page, limit) {
        const results = [];
        const maxPages = Math.ceil(limit / 5);
        for (let i = page; i <= maxPages && results.length < limit; i++) {
          try {
            const data = await sendRequest("https://__blocked__.invalid/api/Kuwo", {
              msg: keyword,
              n: i
            });
            const song = parseKwSong(data);
            if (song) {
              results.push(song);
            }
          } catch {}
        }
        if (results.length === 0) throw new Error('未找到相关歌曲');
        return results;
      }
      async function searchMgMusic(keyword, page, limit) {
        const results = [];
        for (let i = page; i <= page + 2 && results.length < limit; i++) {
          try {
            const data = await sendRequest("https://__blocked__.invalid/api/music/migu", {
              gm: keyword,
              n: i,
              num: 1,
              type: 'json'
            });
            if (data.code === 200) {
              results.push({
                name: data.title || keyword,
                singer: data.artist || '',
                albumName: data.album || '',
                id: `mg_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                source: 'mg',
                interval: data.duration || '00:00'
              });
            }
          } catch {}
        }
        if (results.length === 0) throw new Error('未找到相关歌曲');
        return results;
      }
      
      // ========== 核心工具函数 ==========
      function getSearchPriority(musicInfo) {
        const priority = [];
      
        // 第一优先级：歌名 + 专辑
        if (musicInfo.albumName || musicInfo.album) {
          const album = musicInfo.albumName || musicInfo.album;
          const keyword = cleanText(musicInfo.name + album);
          if (keyword) {
            priority.push({
              keyword: keyword,
              strict: true,
              type: 'name+album'
            });
          }
        }
      
        // 第二优先级：歌名 + 歌手
        if (musicInfo.singer) {
          const keyword = cleanText(musicInfo.name + musicInfo.singer);
          if (keyword) {
            priority.push({
              keyword: keyword,
              strict: true,
              type: 'name+singer'
            });
          }
        }
      
        // 第三优先级：仅歌名
        const keyword = cleanText(musicInfo.name);
        if (keyword) {
          priority.push({
            keyword: keyword,
            strict: false,
            type: 'name'
          });
        }
        return priority;
      }
      function parseKwSong(data) {
        const songInfo = data.data || data;
        if (!songInfo?.song) {
          if (data.message) {
            const parsed = parseKwFromMessage(data.message);
            if (parsed?.song) {
              songInfo.song = parsed.song;
              songInfo.singer = parsed.singer;
              songInfo.album = parsed.album;
            }
          }
        }
        if (!songInfo?.song) return null;
        const duration = parseInt(songInfo.time) || 0;
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        return {
          name: songInfo.song,
          singer: songInfo.singer || '',
          albumName: songInfo.album || '',
          id: songInfo.rid || `kw_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
          source: 'kw',
          interval: `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
          meta: {
            picture: songInfo.picture || ''
          }
        };
      }
      function sendRequest(baseUrl, params = {}) {
        return new Promise((resolve, reject) => {
          const query = Object.keys(params).map(k => `${k}=${encodeURIComponent(params[k])}`).join('&');
          const url = `${baseUrl}${query ? '?' + query : ''}`;
          request(url, {
            method: 'GET',
            timeout: 8000
          }, (err, resp) => {
            if (err) {
              reject(new Error(`请求失败: ${err.message}`));
              return;
            }
            try {
              const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body;
              resolve(data);
            } catch (e) {
              reject(new Error('响应格式错误'));
            }
          });
        });
      }
      function cleanText(text) {
        if (!text) return '';
        return text.replace(/\(\s*Live\s*\)/gi, '').replace(/\([^)]*\)/g, '').replace(/\s+/g, '').replace(/[^\w\u4e00-\u9fa5]/g, '').trim();
      }
      
      // ========== 配置界面 ==========
      on(EVENT_NAMES.showConfigView, () => {
        const view = {
          title: '溯音音源配置',
          width: 450,
          height: 200,
          config: [{
            key: 'qq_api_key',
            type: 'input',
            title: 'QQ音乐API Key',
            placeholder: '输入oiapi密钥',
            value: QQ_API_KEY,
            description: '用于获取QQ音乐的高品质音源'
          }],
          onSave: config => {
            QQ_API_KEY = config.qq_api_key.trim();
            return {
              result: true,
              message: QQ_API_KEY ? '密钥已保存' : '密钥已清空'
            };
          }
        };
        send(EVENT_NAMES.showConfigView, view);
      });
      
      // ========== 初始化 ==========
      const registeredSources = {
        tx: {
          name: 'QQ音乐',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: Object.keys(QQ_QUALITY_MAP),
          features: ['idOnly'],
          defaultQuality: '128k'
        },
        wy: {
          name: '网易云音乐',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: ['128k', '320k', 'flac']
        },
        kw: {
          name: '酷我音乐',
          type: 'music',
          actions: ['musicUrl', 'search'],
          qualitys: ['128k', '320k', 'flac'],
          supportSearchSuggestions: true
        },
        mg: {
          name: '咪咕音乐',
          type: 'music',
          actions: ['musicUrl', 'search'],
          qualitys: ['128k', '320k'],
          supportSearchSuggestions: false
        }
      };
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources: registeredSources
      });
      console.log('[溯音音源] v1 已加载 - 支持QQ、网易、酷我、咪咕音乐');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [26]: 稳定版音源 v1.0.3.js  (平台: tx)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 25
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /**
       * @name 稳定版音源 v1.0.3
       * @description 多平台稳定获取播放链接，无调试日志
       * @version 1.0.3
       * @author LX
       * @homepage https://lxmusic.toside.cn/mobile/custom-source
       */
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      const QUALITY_MAP = {
        wy: {
          '128k': 'standard',
          '320k': 'exhigh',
          'flac': 'lossless',
          'flac24bit': 'lossless'
        },
        tx: {
          '128k': '128k',
          '320k': '320k',
          'flac': 'flac',
          'flac24bit': 'flac'
        },
        kw: {
          '128k': '128k',
          '320k': '320k',
          'flac': 'lossless',
          'flac24bit': 'lossless'
        }
      };
      const STABLE_API = {
        wy: (id, level) => `https://__blocked__.invalid/meting/api/?server=wy&type=url&id=${id}&level=${level}`,
        tx: (id, level) => `https://__blocked__.invalid/API/qq_music.php?apikey=1ffdf5733f5d538760e63d7e46ba17438d9f7b9dfc18c51be1109386fd74c3a1&type=json&mid=${id}`,
        kw: (id, level) => `https://__blocked__.invalid?id=${id}&type=song&format=json&level=${level}`
      };
      const httpRequest = (url, options = {
        method: 'GET'
      }) => new Promise((resolve, reject) => {
        request(url, options, (err, _, body) => {
          if (err) return reject(err);
          resolve(body);
        });
      });
      const getMusicUrl = async (source, musicInfo, quality) => {
        const songId = (musicInfo.id || musicInfo.hash || musicInfo.songmid || musicInfo.songId || musicInfo.musicId || '').toString().trim();
        if (!songId) throw new Error('歌曲ID无效，请检查歌单导入来源');
        const level = QUALITY_MAP[source][quality] || '128k';
        const apiUrl = STABLE_API[source](songId, level);
        const res = await httpRequest(apiUrl, {
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15'
          }
        });
        let realUrl = '';
        if (typeof res === 'string') {
          realUrl = res;
        } else if (res?.url) {
          realUrl = res.url;
        } else if (res?.data?.url) {
          realUrl = res.data.url;
        }
        if (!realUrl || realUrl.includes('404') || realUrl.includes('error') || realUrl.includes('null')) {
          throw new Error('获取链接失败，可能是该歌曲无版权或接口维护');
        }
        return realUrl;
      };
      const apis = {
        wy: {
          musicUrl: (info, q) => getMusicUrl('wy', info, q)
        },
        tx: {
          musicUrl: (info, q) => getMusicUrl('tx', info, q)
        },
        kw: {
          musicUrl: (info, q) => getMusicUrl('kw', info, q)
        }
      };
      on(EVENT_NAMES.request, params => {
        const {
          source,
          action,
          info
        } = params;
        switch (action) {
          case 'musicUrl':
            return apis[source].musicUrl(info.musicInfo, info.type).catch(err => Promise.reject(err.message || '获取播放链接失败'));
          default:
            return Promise.reject('不支持的操作，仅支持musicUrl');
        }
      });
      send(EVENT_NAMES.inited, {
        sources: {
          wy: {
            name: '网易云稳定版',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit']
          },
          tx: {
            name: 'QQ音乐稳定版',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit']
          },
          kw: {
            name: '酷狗稳定版',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit']
          }
        }
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [27]: 统一音乐源.js  (平台: wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 26
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /**
       * @name 统一音乐源
       * @description 基于GD音乐台（music.gdstudio.xyz）的通用音乐源
       * @version 1.0.0
       * @author 脚本作者：7878gyc API提供者：GDSTUDIO
       */
      
      console.log('脚本开始执行');
      
      // 检查lx对象
      if (typeof __lx_proxy__ === 'undefined') {
        console.log('错误: lx对象不存在');
      } else {
        console.log('lx版本:', __lx_proxy__.version);
        console.log('运行环境:', __lx_proxy__.env);
      
        // 源映射
        var sourceMap = {
          'kw': 'kuwo',
          'wy': 'netease'
        };
      
        // 音质映射 - 添加flac支持
        var qualityMap = {
          '128k': '128',
          '192k': '192',
          '320k': '320',
          'flac': '740',
          // 16bit flac
          'flac24bit': '999' // 24bit flac（酷我可能不支持，但先加上）
        };
      
        // 各源支持的音质
        var sourceQualitys = {
          'kw': ['128k', '192k', '320k', 'flac'],
          // 酷我支持16bit flac
          'wy': ['128k', '320k', 'flac'] // 网易云支持flac
        };
      
        // HTTP请求函数
        function httpRequest(url) {
          return new Promise(function (resolve, reject) {
            console.log('发送HTTP请求:', url);
            var options = {
              timeout: 10000,
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
              }
            };
            __lx_proxy__.request(url, options, function (err, resp) {
              if (err) {
                console.log('HTTP请求错误:', err.message || err);
                reject(new Error('网络请求失败'));
                return;
              }
              console.log('HTTP响应状态码:', resp.statusCode);
              console.log('响应体类型:', typeof resp.body);
      
              // 记录响应头中的content-type
              if (resp.headers && resp.headers['content-type']) {
                console.log('Content-Type:', resp.headers['content-type']);
              }
      
              // 如果响应体是对象，直接记录
              if (resp.body && typeof resp.body === 'object') {
                console.log('响应体是对象，键:', Object.keys(resp.body));
                console.log('响应体内容:', JSON.stringify(resp.body).substring(0, 200));
              } else if (typeof resp.body === 'string') {
                console.log('响应体是字符串，长度:', resp.body.length);
                console.log('响应体前200字符:', resp.body.substring(0, Math.min(200, resp.body.length)));
              }
              resolve(resp);
            });
          });
        }
      
        // 从响应中提取URL
        function extractUrlFromResponse(resp) {
          if (!resp) {
            console.log('响应为空');
            return null;
          }
          var body = resp.body;
          console.log('提取URL，body类型:', typeof body);
      
          // 如果body已经是对象
          if (body && typeof body === 'object') {
            console.log('body是对象，直接提取URL');
      
            // 根据API文档，可能的返回格式：
            // 1. {url: "音乐链接", br: "音质", size: "文件大小"}
            // 2. {data: {url: "音乐链接", br: "音质", size: "文件大小"}}
      
            if (body.url) {
              console.log('从body.url获取URL');
              return body.url;
            }
            if (body.data && body.data.url) {
              console.log('从body.data.url获取URL');
              return body.data.url;
            }
      
            // 尝试查找任何包含URL的字段
            for (var key in body) {
              var value = body[key];
              if (typeof value === 'string' && value.startsWith('http')) {
                console.log('从字段', key, '获取URL');
                return value;
              }
              if (value && typeof value === 'object' && value.url && typeof value.url === 'string' && value.url.startsWith('http')) {
                console.log('从嵌套对象', key, '.url获取URL');
                return value.url;
              }
            }
            console.log('无法从对象中提取URL，对象内容:', JSON.stringify(body).substring(0, 300));
            return null;
          }
      
          // 如果body是字符串，尝试解析为JSON
          if (typeof body === 'string') {
            console.log('body是字符串，尝试解析为JSON');
            try {
              var data = JSON.parse(body);
              if (data.url) return data.url;
              if (data.data && data.data.url) return data.data.url;
            } catch (e) {
              console.log('JSON解析失败:', e.message);
            }
      
            // 如果不是JSON，尝试正则匹配URL
            var urlMatch = body.match(/https?:\/\/[^\s<>"']+/);
            if (urlMatch) {
              console.log('从字符串中正则匹配到URL');
              return urlMatch[0];
            }
          }
          console.log('无法提取URL');
          return null;
        }
      
        // 音质降级策略
        function getQualityFallbackChain(quality) {
          var chain = [];
          switch (quality) {
            case 'flac24bit':
              chain = ['flac24bit', 'flac', '320k', '192k', '128k'];
              break;
            case 'flac':
              chain = ['flac', '320k', '192k', '128k'];
              break;
            case '320k':
              chain = ['320k', '192k', '128k'];
              break;
            case '192k':
              chain = ['192k', '128k'];
              break;
            case '128k':
              chain = ['128k'];
              break;
            default:
              chain = ['320k', '128k'];
          }
          return chain;
        }
      
        // 获取音乐URL（支持音质降级）
        function getMusicUrl(musicInfo, quality) {
          console.log('开始获取音乐URL:', {
            source: musicInfo.source,
            songmid: musicInfo.songmid,
            id: musicInfo.id,
            quality: quality
          });
          return new Promise(function (resolve, reject) {
            try {
              var source = musicInfo.source;
              var apiSource = sourceMap[source];
              if (!apiSource) {
                console.log('不支持的音源:', source);
                reject(new Error('暂不支持此音源'));
                return;
              }
              var songId = musicInfo.songmid || musicInfo.id;
              if (!songId) {
                console.log('缺少歌曲ID');
                reject(new Error('缺少歌曲ID'));
                return;
              }
      
              // 获取该源支持的音质列表
              var supportedQualitys = sourceQualitys[source] || ['128k', '320k'];
              var qualityChain = getQualityFallbackChain(quality);
      
              // 过滤掉不支持的音质
              qualityChain = qualityChain.filter(function (q) {
                return supportedQualitys.includes(q);
              });
              console.log('音质尝试链:', qualityChain);
      
              // 递归尝试不同音质
              function tryQualityChain(index) {
                if (index >= qualityChain.length) {
                  reject(new Error('所有音质尝试均失败'));
                  return;
                }
                var currentQuality = qualityChain[index];
                var br = qualityMap[currentQuality] || '320';
                console.log('尝试音质:', currentQuality, '-> br:', br);
                var url = 'https://music-api.gdstudio.xyz/api.php?types=url&source=' + apiSource + '&id=' + songId + '&br=' + br;
                httpRequest(url).then(function (resp) {
                  if (resp.statusCode !== 200) {
                    console.log('音质', currentQuality, '请求失败，状态码:', resp.statusCode);
                    tryQualityChain(index + 1);
                    return;
                  }
                  var musicUrl = extractUrlFromResponse(resp);
                  if (musicUrl) {
                    console.log('成功获取', currentQuality, '音质URL');
                    resolve(musicUrl);
                  } else {
                    console.log('音质', currentQuality, '无法提取URL');
                    tryQualityChain(index + 1);
                  }
                }).catch(function (err) {
                  console.log('音质', currentQuality, '请求出错:', err.message);
                  tryQualityChain(index + 1);
                });
              }
      
              // 开始尝试
              tryQualityChain(0);
            } catch (error) {
              console.log('获取音乐URL过程中发生异常:', error);
              reject(error);
            }
          });
        }
      
        // 注册事件处理器
        console.log('注册事件处理器');
        __lx_proxy__.on(__lx_proxy__.EVENT_NAMES.request, function (data) {
          console.log('收到请求事件, action:', data.action);
          if (data.action === 'musicUrl') {
            return getMusicUrl(data.info.musicInfo, data.info.type);
          }
          return Promise.reject(new Error('不支持的action: ' + data.action));
        });
      
        // 初始化
        console.log('准备初始化');
        setTimeout(function () {
          try {
            console.log('发送初始化事件');
            var config = {
              sources: {
                kw: {
                  name: '酷我音乐',
                  type: 'music',
                  actions: ['musicUrl'],
                  qualitys: ['128k', '192k', '320k', 'flac'] // 添加flac支持
                },
                wy: {
                  name: '网易云音乐',
                  type: 'music',
                  actions: ['musicUrl'],
                  qualitys: ['128k', '320k', 'flac'] // 添加flac支持
                }
              }
            };
            __lx_proxy__.send(__lx_proxy__.EVENT_NAMES.inited, config);
            console.log('初始化完成');
          } catch (error) {
            console.log('初始化失败:', error);
          }
        }, 100);
      }
      console.log('脚本加载完成');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [28]: 聚合API.js  (平台: kw, tx)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 27
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 聚合API接口 (CF)
       * @description v3
       * @version 3
       * @author lerd
       */
      let {
        stringify: t,
        parse: a
      } = JSON;
      let x = r => {
        throw new Error(r);
      };
      let {
        EVENT_NAMES: n,
        request: b,
        on,
        send: y,
        version: v
      } = __lx_proxy__;
      let A = "https://__blocked__.invalid";
      let h = (u, o = {
        method: 'GET'
      }) => new Promise((s, j) => {
        b(u, o, (e, r) => {
          if (e) return j(e);
          s(r);
        });
      });
      h(`${A}/init.conf`).then(r => {
        if (r.body.code !== 200) x("脚本初始化失败");
        let U = r.body.data;
        if (U.update.version > v) y(n.updateAlert, U.update);
        y(n.inited, U.init);
      }).catch(e => x(e));
      on(n.request, async ({
        action,
        source,
        info
      }) => {
        let r = await h(`${A}/${source}`, {
          method: 'POST',
          body: t(info),
          headers: {
            'Content-Type': 'application/json'
          }
        });
        let B = r.body;
        if (B.code === 200) return B.data.url;else if (B.code === 303) {
          let S = a(t(B.data));
          let D = S.request;
          let F = S.response;
          try {
            let z = await h(encodeURI(D.url), D.options);
            if (F.check.key.reduce((a, c) => a && a[c], z) == F.check.value) {
              let u = F.url.reduce((a, c) => a && a[c], z);
              if (u.startsWith("http")) return u;
            }
          } catch (e) {
            x(e);
          }
        } else x(B.msg);
      });
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [29]: 西瓜聚合.js  (平台: kw, tx, wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 28
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 西瓜聚合源
       * @description 聚合星海/溯音/CHKSZ/长青/念心/Huibq等10+API后端，多源自动回退
       * @version v1.40
       * @author 整合自多个音源
       */
      
      // ==================== 全局常量 ====================
      var lx = __lx_proxy__;
      var EVENT_NAMES = lx.EVENT_NAMES;
      var request = lx.request;
      var on = lx.on;
      var send = lx.send;
      var currentScriptInfo = lx.currentScriptInfo || {};
      var env = lx.env || 'desktop';
      var version = lx.version || '';
      
      // ==================== 配置区 ====================
      
      // --- 可选源开关（设为 false 则跳过，不配置 API 则自动跳过）---
      var HUIBQ_ENABLE = true;
      var FISH_ENABLE = true;
      var HYW_ENABLE = true;
      
      // --- 云端版本检查地址 ---
      var VERSION_CHECK_URL = "https://__blocked__.invalid/?api=1&type=lx";
      
      // --- 调用日志上传地址（设为空则禁用）---
      var LOG_API_URL = "https://__blocked__.invalid/";
      
      // 日志上报（异步，不阻塞请求）
      function sendLog(platform, apiName, durationMs) {
        if (!LOG_API_URL) return;
        var body = 'action=log&plugin_type=lx&platform=' + encodeURIComponent(platform) + '&api_name=' + encodeURIComponent(apiName) + '&duration_ms=' + durationMs;
        httpRequest(LOG_API_URL, {
          method: 'POST',
          timeout: 3000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: body
        }).catch(function () {/* 静默忽略 */});
      }
      
      // --- API 端点 ---
      // 星海主API（全平台，动态稳定源）
      var XINGHAI_MAIN = 'https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light';
      
      // 星海备API（降级备用）
      var XINGHAI_BACKUP = "https://__blocked__.invalid/api/";
      
      // CHKSZ（网易云专用，支持高音质+音质降级）
      var CHKSZ_API = 'https://api.chksz.top/api';
      
      // 溯音系列
      var SUYIN_QQ_API = "https://__blocked__.invalid/api/QQ_Music";
      var SUYIN_QQ_KEY = 'oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575';
      var SUYIN_163_API = "https://__blocked__.invalid/api/Music_163";
      var SUYIN_KW_API = "https://__blocked__.invalid/api/Kuwo";
      var SUYIN_MG_API = "https://__blocked__.invalid/api/music/migu";
      
      // 长青SVIP URL模板
      var CHANGQING = {
        tx: "http://__blocked__.invalid/kgqq/qq.php?type=mp3&id={id}&level={level}",
        wy: "http://__blocked__.invalid/wy/wy.php?type=mp3&id={id}&level={level}",
        kw: "https://__blocked__.invalid/music/kw.php?type=mp3&id={id}&level={level}",
        kg: "https://__blocked__.invalid/kgqq/kg.php?type=mp3&id={id}&level={level}",
        mg: "https://__blocked__.invalid/musicapi/mg.php?type=mp3&id={id}&level={level}"
      };
      
      // 念心SVIP URL模板
      var NIANXIN = {
        tx: "https://__blocked__.invalid/kgqq/tx.php?id={id}&level={level}&type=mp3",
        wy: "http://__blocked__.invalid/wy.php?id={id}&level={level}&type=mp3",
        kw: "http://__blocked__.invalid/kw.php?id={id}&level={level}&type=mp3",
        kg: "https://__blocked__.invalid/kgqq/kg.php?id={id}&level={level}&type=mp3",
        mg: "http://__blocked__.invalid/mg.php?id={id}&level={level}&type=mp3"
      };
      
      // Huibq（需配置 KEY，设为空则自动跳过）
      var HUIBQ_API = HUIBQ_ENABLE ? "https://__blocked__.invalid" : '';
      var HUIBQ_KEY = 'share-v3';
      
      // fish-music（需配置 API 地址）
      var FISH_API = FISH_ENABLE ? "https://__blocked__.invalid" : '';
      var FISH_KEY = '';
      
      // HYWmusic（内置卡密认证）
      var HYW_API = HYW_ENABLE ? "https://__blocked__.invalid" : '';
      var HYW_CARD_KEY = 'TF-VSS0-8Y73-U1AW-GEXJ';
      
      // 收集の聚合接口（独立API集合）
      var SHOUJI_TX_API = "https://__blocked__.invalid/API/qq_music.php?apikey=1ffdf5733f5d538760e63d7e46ba17438d9f7b9dfc18c51be1109386fd74c3a1&type=json";
      var SHOUJI_WY_API = "https://__blocked__.invalid/api/netease/music_v1.php";
      var SHOUJI_KW_API = "https://__blocked__.invalid";
      
      // 汽水VIP
      var QISHUI_API = 'https://api.vsaa.cn/api/music.qishui.vip';
      var QISHUI_API_HTTP = 'http://api.vsaa.cn/api/music.qishui.vip';
      
      // 聚合API（通用 POST 代理，有专用 /kg 接口）
      var JUHE_API = "https://__blocked__.invalid";
      
      // 星海备用搜索接口（zrcdy，搜索式回退，支持 kg/tx/mg）
      var ZRCDY_API = "https://__blocked__.invalid/lx/api/api.php";
      
      // ==================== 音质映射表 ====================
      
      // 标准音质 → 星海API br参数
      var QUALITY_BR_MAP = {
        '128k': '128',
        '320k': '320',
        'flac': '740',
        'flac24bit': '999'
      };
      
      // 标准音质 → 溯音QQ br码率
      var QUALITY_SUYIN_QQ_BR = {
        '128k': 7,
        '320k': 5,
        'flac': 4,
        'flac24bit': 1
      };
      
      // 标准音质 → 溯音酷我 br
      var QUALITY_SUYIN_KW_BR = {
        '128k': 7,
        '320k': 5,
        'flac': 1,
        'flac24bit': 1
      };
      
      // 标准音质 → CHKSZ level
      var QUALITY_CHKSZ_LEVEL = {
        '128k': 'standard',
        '320k': 'exhigh',
        'flac': 'lossless',
        'flac24bit': 'jymaster'
      };
      
      // CHKSZ 音质降级链
      var CHKSZ_FALLBACK = {
        jymaster: ['jymaster', 'lossless', 'exhigh', 'standard'],
        lossless: ['lossless', 'exhigh', 'standard'],
        exhigh: ['exhigh', 'standard'],
        standard: ['standard']
      };
      
      // 标准音质 → 长青/念心/收集网易 level
      function qualityToLevel(quality) {
        var q = String(quality || '128k').toLowerCase();
        if (q === 'flac' || q === 'flac24bit') return 'lossless';
        if (q === '320k') return 'exhigh';
        return 'standard';
      }
      
      // 平台名称 → 星海 API source参数
      var PLATFORM_SOURCE_MAP = {
        wy: 'netease',
        tx: 'tencent',
        kw: 'kuwo',
        kg: 'kugou',
        mg: 'migu'
      };
      
      // 各平台支持的音质（仅4种标准值）
      var PLATFORM_QUALITIES = {
        wy: ['128k', '320k', 'flac', 'flac24bit'],
        tx: ['128k', '320k', 'flac', 'flac24bit'],
        kw: ['128k', '320k', 'flac'],
        kg: ['128k', '320k', 'flac', 'flac24bit'],
        mg: ['128k', '320k', 'flac']
      };
      var PLATFORM_NAMES = {
        wy: '网易云音乐',
        tx: 'QQ音乐',
        kw: '酷我音乐',
        kg: '酷狗音乐',
        mg: '咪咕音乐'
      };
      
      // ==================== 缓存模块 ====================
      var urlCache = new Map();
      var CACHE_TTL = 21600000; // 6小时
      var CACHE_MAX = 500;
      function cacheGet(key) {
        var entry = urlCache.get(key);
        if (!entry) return null;
        if (Date.now() - entry.timestamp >= CACHE_TTL) {
          urlCache.delete(key);
          return null;
        }
        return entry.url;
      }
      function cacheSet(key, url) {
        if (urlCache.size >= CACHE_MAX) {
          var oldestKey = urlCache.keys().next().value;
          if (oldestKey !== undefined) urlCache.delete(oldestKey);
        }
        urlCache.set(key, {
          url: url,
          timestamp: Date.now()
        });
      }
      
      // ==================== HTTP 工具函数 ====================
      // 核心请求封装，严格使用(err, resp, body)三参数回调
      function httpRequest(url, options) {
        options = options || {};
        var method = options.method || 'GET';
        var timeout = options.timeout || 10000;
        var headers = options.headers || {};
        return new Promise(function (resolve, reject) {
          request(url, {
            method: method,
            timeout: timeout,
            headers: extend({
              'Accept': 'application/json'
            }, headers),
            body: options.body || undefined,
            follow_max: options.follow_max || 2
          }, function (err, resp, body) {
            if (err) return reject(new Error('请求错误: ' + (err.message || err)));
            var statusCode = resp ? resp.statusCode : 0;
            if (statusCode >= 400) return reject(new Error('HTTP ' + statusCode));
            resolve({
              statusCode: statusCode,
              headers: resp ? resp.headers || {} : {},
              body: body
            });
          });
        });
      }
      
      // 简单属性合并（避免 Object.assign 在移动版不可用）
      function extend(target, source) {
        var result = {};
        var key;
        for (key in target) {
          if (target.hasOwnProperty(key)) result[key] = target[key];
        }
        for (key in source) {
          if (source.hasOwnProperty(key)) result[key] = source[key];
        }
        return result;
      }
      
      // 发起GET请求，拼接参数，返回解析后的body
      function httpGet(url, params, extraHeaders, timeout) {
        params = params || {};
        extraHeaders = extraHeaders || {};
        timeout = timeout || 10000;
        var keys = Object.keys(params).filter(function (k) {
          return params[k] !== undefined && params[k] !== null;
        });
        var queryStr = keys.map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]);
        }).join('&');
        var fullUrl = url + (queryStr ? (url.indexOf('?') >= 0 ? '&' : '?') + queryStr : '');
        return httpRequest(fullUrl, {
          method: 'GET',
          timeout: timeout,
          headers: extraHeaders
        }).then(function (res) {
          var body = res.body;
          if (typeof body === 'string') {
            var trimmed = body.trim();
            if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
              try {
                body = JSON.parse(trimmed);
              } catch (e) {}
            }
          }
          return body;
        });
      }
      
      // URL验证（增强版：检测音频大小，过滤几秒的假链接）
      // 最低音频大小阈值（字节）：128kbps 约 16KB/s，10秒≈160KB，取 150KB 为下限
      var MIN_AUDIO_SIZE = 800 * 1024;
      function validateUrl(url, sourceName) {
        if (!url || typeof url !== 'string') {
          throw new Error((sourceName || '未知源') + ' 返回空URL');
        }
        var trimmed = url.trim();
        if (!/^https?:\/\//i.test(trimmed)) {
          throw new Error((sourceName || '未知源') + ' URL格式非法');
        }
        return trimmed;
      }
      
      // 深度验证：HEAD 请求检测音频文件大小，过滤短音频假链接
      function deepValidateUrl(url, sourceName) {
        return new Promise(function (resolve, reject) {
          request(url, {
            method: 'HEAD',
            timeout: 5000,
            follow_max: 2
          }, function (err, resp) {
            if (err) {
              // HEAD 失败不阻止，直接返回 URL（信任源）
              return resolve(url);
            }
            var headers = resp ? resp.headers || {} : {};
            var contentLength = parseInt(headers['content-length'] || headers['Content-Length'] || '0', 10);
      
            // 有大小信息且过小 → 假链接
            if (contentLength > 0 && contentLength < MIN_AUDIO_SIZE) {
              return reject(new Error((sourceName || '未知源') + ' 音频过小(' + contentLength / 1024 + 'KB)，疑似假链接'));
            }
      
            // 无大小信息或大小正常 → 通过
            resolve(url);
          });
        });
      }
      
      // ==================== 歌曲信息工具函数 ====================
      
      // 通用歌曲ID提取
      function getSongId(songInfo) {
        if (!songInfo) return '';
        return String(songInfo.songmid || songInfo.hash || songInfo.id || songInfo.songId || songInfo.rid || songInfo.mid || '');
      }
      
      // 获取hash或songmid（酷狗等平台用）
      function getHashOrMid(songInfo) {
        if (!songInfo) return null;
        return songInfo.hash || songInfo.songmid || songInfo.id || null;
      }
      
      // QQ歌曲ID（mid优先，然后songid）
      function getQqSongId(songInfo) {
        if (!songInfo) return null;
        var mid = songInfo.meta && songInfo.meta.qq && songInfo.meta.qq.mid || songInfo.meta && songInfo.meta.mid || songInfo.songmid || (typeof songInfo.id === 'string' && !/^\d+$/.test(songInfo.id) ? songInfo.id : null);
        if (mid) return {
          type: 'mid',
          value: mid
        };
        var songid = songInfo.meta && songInfo.meta.qq && songInfo.meta.qq.songid || songInfo.meta && songInfo.meta.songid || songInfo.id;
        if (songid) {
          var numId = typeof songid === 'number' ? songid : /^\d+$/.test(String(songid)) ? Number(songid) : null;
          if (numId) return {
            type: 'songid',
            value: numId
          };
        }
        return null;
      }
      
      // 文本清洗（去除括号/空格/特殊符号，转小写）
      function cleanText(text) {
        if (!text) return '';
        return String(text).replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '').replace(/[【】《》"'·,，。!！?？:：;；\/\\|\-]/g, '').trim().toLowerCase();
      }
      
      // 构建搜索关键词列表（按严格度排序）
      function buildSearchKeywords(songInfo) {
        if (!songInfo) return [];
        var keywords = [];
        var name = songInfo.name || '';
        var singer = songInfo.singer || '';
        var album = songInfo.albumName || songInfo.album || '';
        if (name && singer) {
          keywords.push({
            keyword: name + ' ' + singer,
            strict: true
          });
        }
        if (name && album) {
          keywords.push({
            keyword: name + ' ' + album,
            strict: true
          });
        }
        if (name) {
          keywords.push({
            keyword: name,
            strict: false
          });
        }
        return keywords;
      }
      
      // 歌曲名匹配
      function titleMatch(a, b) {
        var ca = cleanText(a);
        var cb = cleanText(b);
        if (!ca || !cb) return true;
        return ca.indexOf(cb) >= 0 || cb.indexOf(ca) >= 0;
      }
      
      // 歌曲信息匹配验证
      function checkSongMatch(apiName, apiArtist, musicInfo) {
        if (!titleMatch(apiName, musicInfo.name || '')) return false;
        if (musicInfo.singer && apiArtist) {
          if (!titleMatch(apiArtist, musicInfo.singer)) return false;
        }
        return true;
      }
      
      // 从message字符串提取URL
      function extractUrlFromMsg(msg) {
        if (!msg) return null;
        var m = String(msg).match(/https?:\/\/[^\s"'<>]+/);
        return m ? m[0] : null;
      }
      
      // 从响应中提取URL（通用）
      function extractUrl(body) {
        if (!body) return null;
        if (typeof body === 'string') {
          var trimmed = body.trim();
          if (trimmed.startsWith('http')) return trimmed;
          try {
            var parsed = JSON.parse(trimmed);
            return parsed.url || parsed.data && parsed.data.url || extractUrlFromMsg(trimmed);
          } catch (e) {
            return extractUrlFromMsg(trimmed);
          }
        }
        if (typeof body === 'object') {
          if (body.url) return body.url;
          if (body.data) {
            if (typeof body.data === 'string' && /^https?:\/\//i.test(body.data)) return body.data;
            if (body.data.url) return body.data.url;
            if (Array.isArray(body.data) && body.data[0] && body.data[0].url) return body.data[0].url;
          }
        }
        return null;
      }
      
      // ==================== Provider 函数层 ====================
      
      // --- 8.1 星海主API (全平台) ---
      function xinghaiMainGetUrl(platform, songInfo, quality) {
        var source = PLATFORM_SOURCE_MAP[platform];
        if (!source) throw new Error('星海主不支持: ' + platform);
        var id = getSongId(songInfo);
        if (!id) throw new Error('星海主缺少歌曲ID');
        var br = QUALITY_BR_MAP[quality] || '320';
        var url = XINGHAI_MAIN + '&types=url&source=' + source + '&id=' + encodeURIComponent(id) + '&br=' + br;
        return httpGet(url, {}, {}, 15000).then(function (body) {
          var resultUrl = extractUrl(body);
          if (!resultUrl) throw new Error('星海主未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.2 星海备API (降级备用，支持wy/tx/kw) ---
      function xinghaiBackupGetUrl(platform, songInfo, quality) {
        var source = PLATFORM_SOURCE_MAP[platform];
        if (!source) throw new Error('星海备不支持: ' + platform);
        var id = getSongId(songInfo);
        if (!id) throw new Error('星海备缺少歌曲ID');
        return httpGet(XINGHAI_BACKUP, {
          source: source,
          id: id,
          type: 'url',
          br: quality
        }, {}, 15000).then(function (body) {
          var resultUrl = extractUrl(body);
          if (!resultUrl) throw new Error('星海备未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.3 CHKSZ (网易云专用，带音质降级) ---
      function chkszGetUrl(songInfo, quality) {
        var id = getSongId(songInfo);
        if (!id) throw new Error('CHKSZ缺少ID');
        var level = QUALITY_CHKSZ_LEVEL[quality] || 'standard';
        var levels = CHKSZ_FALLBACK[level] || ['standard'];
        function tryLevel(index) {
          if (index >= levels.length) return Promise.reject(new Error('CHKSZ所有音质失败'));
          var lv = levels[index];
          return httpGet(CHKSZ_API + '/163_music', {
            id: id,
            level: lv
          }, {
            'Referer': 'https://cp.chksz.top/'
          }, 12000).then(function (body) {
            if (body && body.code === 200 && body.data && body.data.url) {
              return body.data.url;
            }
            throw new Error('CHKSZ音质' + lv + '失败');
          }).catch(function () {
            return tryLevel(index + 1);
          });
        }
        return tryLevel(0);
      }
      
      // --- 8.4 溯音QQ (QQ音乐专用，带码率降级) ---
      function suyinQQGetUrl(songInfo, quality) {
        var qqId = getQqSongId(songInfo);
        if (!qqId) throw new Error('溯音QQ缺少歌曲ID');
        var startBr = QUALITY_SUYIN_QQ_BR[quality] || 5;
        // 去重&排序
        var brList = [];
        [startBr, 4, 5, 7].forEach(function (v) {
          if (brList.indexOf(v) < 0) brList.push(v);
        });
        brList.sort(function (a, b) {
          return a - b;
        });
        function tryBr(index) {
          if (index >= brList.length) return Promise.reject(new Error('溯音QQ所有码率失败'));
          var br = brList[index];
          var params = {
            key: SUYIN_QQ_KEY,
            type: 'json',
            br: br,
            n: 1
          };
          if (qqId.type === 'mid') {
            params.mid = qqId.value;
          } else {
            params.songid = qqId.value;
          }
          return httpGet(SUYIN_QQ_API, params, {}, 12000).then(function (body) {
            var url = extractUrl(body);
            if (!url) throw new Error('溯音QQ未找到链接');
            return url;
          }).catch(function () {
            return tryBr(index + 1);
          });
        }
        return tryBr(0);
      }
      
      // --- 8.5 溯音163 (网易云专用) ---
      function suyin163GetUrl(songInfo) {
        var id = getSongId(songInfo);
        if (!id) throw new Error('溯音163缺少ID');
        return httpGet(SUYIN_163_API, {
          id: id
        }, {}, 12000).then(function (body) {
          var data = body;
          if (data && data.code === 0 && data.data) {
            var item = Array.isArray(data.data) ? data.data[0] : data.data;
            if (item && item.url) return item.url;
          }
          throw new Error('溯音163获取失败');
        });
      }
      
      // --- 8.6 溯音酷我 (搜索式，带歌曲匹配) ---
      function suyinKwGetUrl(songInfo, quality) {
        if (!songInfo || !songInfo.name) throw new Error('溯音酷我需要歌曲名');
        var br = QUALITY_SUYIN_KW_BR[quality] || 1;
        var keywords = buildSearchKeywords(songInfo);
        function tryKeyword(index) {
          if (index >= keywords.length) return Promise.reject(new Error('溯音酷我失败'));
          var item = keywords[index];
          return httpGet(SUYIN_KW_API, {
            msg: item.keyword,
            n: 1,
            br: br
          }, {}, 12000).then(function (body) {
            var url = extractUrl(body);
            if (!url) throw new Error('溯音酷我未找到链接');
            if (item.strict) {
              // 提取返回的歌曲名和歌手名用于验证
              var song = body && body.data && body.data.song || body && body.song || '';
              var singer = body && body.data && body.data.singer || body && body.singer || '';
              if (song && !checkSongMatch(song, singer, songInfo)) {
                throw new Error('溯音酷我歌曲不匹配');
              }
            }
            return url;
          }).catch(function () {
            return tryKeyword(index + 1);
          });
        }
        return tryKeyword(0);
      }
      
      // --- 8.7 溯音咪咕 (搜索式) ---
      function suyinMgGetUrl(songInfo) {
        if (!songInfo || !songInfo.name) throw new Error('溯音咪咕需要歌曲名');
        var keywords = buildSearchKeywords(songInfo);
        function tryKeyword(index) {
          if (index >= keywords.length) return Promise.reject(new Error('溯音咪咕失败'));
          var item = keywords[index];
          return httpGet(SUYIN_MG_API, {
            gm: item.keyword,
            n: 1,
            num: 1,
            type: 'json'
          }, {}, 12000).then(function (body) {
            if (body && body.code === 200) {
              var url = body.music_url || body.musicInfo || extractUrl(body);
              if (url && typeof url === 'string' && /^https?:\/\//i.test(url)) {
                if (item.strict) {
                  var title = body.title || '';
                  var artist = body.artist || '';
                  if (title && !checkSongMatch(title, artist, songInfo)) {
                    throw new Error('溯音咪咕歌曲不匹配');
                  }
                }
                return url;
              }
            }
            throw new Error('溯音咪咕未找到链接');
          }).catch(function () {
            return tryKeyword(index + 1);
          });
        }
        return tryKeyword(0);
      }
      
      // --- 8.8 长青SVIP (全平台 URL 模板) ---
      function changqingGetUrl(platform, songInfo, quality) {
        var tpl = CHANGQING[platform];
        if (!tpl) throw new Error('长青不支持: ' + platform);
        var id = getSongId(songInfo);
        if (!id) throw new Error('长青缺少歌曲ID');
        var level = qualityToLevel(quality);
        var url = tpl.replace('{id}', encodeURIComponent(id)).replace('{level}', encodeURIComponent(level));
        return httpGet(url, {}, {}, 15000).then(function (body) {
          var resultUrl = extractUrl(body);
          if (!resultUrl) throw new Error('长青未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.9 念心SVIP (全平台 URL 模板) ---
      function nianxinGetUrl(platform, songInfo, quality) {
        var tpl = NIANXIN[platform];
        if (!tpl) throw new Error('念心不支持: ' + platform);
        var id = getSongId(songInfo);
        if (!id) throw new Error('念心缺少歌曲ID');
        var level = qualityToLevel(quality);
        var url = tpl.replace('{id}', encodeURIComponent(id)).replace('{level}', encodeURIComponent(level));
        return httpGet(url, {}, {}, 15000).then(function (body) {
          var resultUrl = extractUrl(body);
          if (!resultUrl) throw new Error('念心未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.10 Huibq (全平台，可选) ---
      function huibqGetUrl(platform, songInfo, quality) {
        if (!HUIBQ_API || !HUIBQ_KEY) throw new Error('Huibq未配置');
        var songId = getHashOrMid(songInfo) || getSongId(songInfo);
        if (!songId) throw new Error('Huibq缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        return httpGet(HUIBQ_API + '/url/' + platform + '/' + encodeURIComponent(songId) + '/' + quality, {}, {
          'Content-Type': 'application/json',
          'User-Agent': userAgent,
          'X-Request-Key': HUIBQ_KEY
        }, 12000).then(function (body) {
          if (!body || isNaN(Number(body.code))) throw new Error('Huibq未知响应');
          switch (Number(body.code)) {
            case 0:
              return body.url || body.data && body.data.url;
            case 1:
              throw new Error('Huibq IP被封');
            case 2:
              throw new Error('Huibq获取失败');
            case 4:
              throw new Error('Huibq服务器错误');
            case 5:
              throw new Error('Huibq请求过多');
            case 6:
              throw new Error('Huibq参数错误');
            default:
              throw new Error(body.msg || 'Huibq未知错误');
          }
        });
      }
      
      // --- 8.11 fish-music (全平台，可选) ---
      function fishGetUrl(platform, songInfo, quality) {
        if (!FISH_API) throw new Error('fish-music未配置');
        var songId = getHashOrMid(songInfo) || getSongId(songInfo);
        if (!songId) throw new Error('fish-music缺少歌曲ID');
        var userAgent = env ? 'lx-music-' + env + '/' + version : 'lx-music-request/' + version;
        var headers = {
          'Content-Type': 'application/json',
          'User-Agent': userAgent
        };
        if (FISH_KEY) headers['X-Request-Key'] = FISH_KEY;
        return httpGet(FISH_API + '/url/' + platform + '/' + encodeURIComponent(songId) + '/' + quality, {}, headers, 12000).then(function (body) {
          if (body && body.code === 0 && body.data && body.data.url) return body.data.url;
          if (body && body.url) return body.url;
          throw new Error('fish-music获取失败');
        });
      }
      
      // --- 8.12 收集の聚合接口 (tx/wy/kw) ---
      function shoujiGetUrl(platform, songInfo, quality) {
        var songId = getSongId(songInfo);
        if (!songId) throw new Error('收集聚合缺少歌曲ID');
        var level = qualityToLevel(quality);
        var url;
        switch (platform) {
          case 'tx':
            url = SHOUJI_TX_API + '&mid=' + encodeURIComponent(songId);
            break;
          case 'wy':
            url = SHOUJI_WY_API + '?id=' + encodeURIComponent(songId) + '&type=json&level=' + encodeURIComponent(level);
            break;
          case 'kw':
            url = SHOUJI_KW_API + '?id=' + encodeURIComponent(songId) + '&type=song&format=json&level=' + encodeURIComponent(level);
            break;
          default:
            throw new Error('收集聚合不支持: ' + platform);
        }
        return httpGet(url, {}, {}, 12000).then(function (body) {
          if (platform === 'tx') {
            return body.url || body.data && body.data.url;
          }
          return body.data && body.data.url || body.url;
        }).then(function (resultUrl) {
          if (!resultUrl) throw new Error('收集聚合未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.13 HYWmusic (全平台，可选) ---
      function hywGetUrl(platform, songInfo, quality) {
        if (!HYW_API) throw new Error('HYWmusic未配置');
        var songId = getSongId(songInfo);
        if (!songId) throw new Error('HYWmusic缺少歌曲ID');
        return httpGet(HYW_API + '/api/music/url', {
          source: platform,
          songId: songId,
          quality: quality
        }, {
          'X-Script-Version': 'HYWmusic_beta',
          'X-Card-Key': HYW_CARD_KEY
        }, 12000).then(function (body) {
          if (!body || typeof body !== 'object') throw new Error('HYWmusic响应异常');
          if (body.code !== 200) throw new Error('HYWmusic: ' + (body.msg || '获取失败'));
          return body.url || body.data && body.data.url;
        }).then(function (resultUrl) {
          if (!resultUrl) throw new Error('HYWmusic未返回URL');
          return resultUrl;
        });
      }
      
      // --- 8.14 汽水VIP (网易云/QQ平台，可选) ---
      function qishuiGetUrl(songInfo, quality) {
        var songId = getSongId(songInfo);
        if (!songId) throw new Error('汽水VIP缺少歌曲ID');
        var q = '128k';
      
        // 将标准音质映射为汽水API参数
        switch (quality) {
          case 'flac24bit':
          case 'flac':
            q = 'lossless';
            break;
          case '320k':
            q = 'exhigh';
            break;
          default:
            q = 'standard';
            break;
        }
        function tryApi(url) {
          return httpGet(url, {
            act: 'song',
            id: songId,
            quality: q
          }, {}, 15000).then(function (body) {
            var data = body;
            if (Array.isArray(data && data.data)) data = data.data[0] || data;else if (data && data.data) data = data.data;
            if (!data || !data.url) throw new Error('汽水VIP未返回URL');
            return String(data.url);
          });
        }
        return tryApi(QISHUI_API).catch(function () {
          return tryApi(QISHUI_API_HTTP);
        });
      }
      
      // --- 8.15 聚合API（POST 代理接口，使用独立 /kg 端点） ---
      function juheGetUrl(platform, songInfo, quality) {
        if (!JUHE_API) throw new Error('聚合API未配置');
        var songId = getSongId(songInfo);
        if (!songId) throw new Error('聚合API缺少歌曲ID');
        return httpRequest(JUHE_API + '/' + platform, {
          method: 'POST',
          timeout: 12000,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'musicUrl',
            source: platform,
            info: {
              musicInfo: songInfo,
              type: quality
            }
          })
        }).then(function (res) {
          var body = typeof res.body === 'string' ? JSON.parse(res.body) : res.body;
          if (body && body.code === 200 && body.data && body.data.url) {
            return body.data.url;
          }
          // 支持 303 重定向模式
          if (body && body.code === 303 && body.data) {
            var redirectInfo = typeof body.data === 'string' ? JSON.parse(body.data) : body.data;
            if (redirectInfo && redirectInfo.request && redirectInfo.response) {
              var req = redirectInfo.request;
              var resp = redirectInfo.response;
              return httpRequest(encodeURI(req.url), req.options || {}).then(function (respResult) {
                var respBody = respResult.body;
                if (typeof respBody === 'string' && (respBody.startsWith('{') || respBody.startsWith('['))) {
                  try {
                    respBody = JSON.parse(respBody);
                  } catch (e) {}
                }
                var checkOk = true;
                if (resp.check && resp.check.key && Array.isArray(resp.check.key)) {
                  var cursor = respBody;
                  for (var ci = 0; ci < resp.check.key.length; ci++) {
                    if (cursor && cursor[resp.check.key[ci]]) {
                      cursor = cursor[resp.check.key[ci]];
                    } else {
                      checkOk = false;
                      break;
                    }
                  }
                  if (checkOk && cursor !== resp.check.value) checkOk = false;
                }
                if (checkOk && resp.url && Array.isArray(resp.url.key)) {
                  var urlCursor = respBody;
                  for (var ui = 0; ui < resp.url.key.length; ui++) {
                    if (urlCursor && urlCursor[resp.url.key[ui]]) {
                      urlCursor = urlCursor[resp.url.key[ui]];
                    } else {
                      checkOk = false;
                      break;
                    }
                  }
                  if (checkOk && typeof urlCursor === 'string' && urlCursor.indexOf('http') === 0) return urlCursor;
                }
                throw new Error('聚合API 303模式失败');
              });
            }
          }
          throw new Error('聚合API: ' + (body && body.msg || '获取失败'));
        });
      }
      
      // --- 8.16 星海备用搜索接口（zrcdy，搜索式回退，支持 kg/tx/mg） ---
      function zrcdyGetUrl(platform, songInfo, quality) {
        if (!ZRCDY_API) throw new Error('zrcdy未配置');
        var name = songInfo.name || '';
        var singer = songInfo.singer || '';
        if (!name) throw new Error('zrcdy需要歌曲名');
        var backupSourceMap = {
          kg: 'kg',
          tx: 'qq',
          mg: 'migu'
        };
        var backupSource = backupSourceMap[platform];
        if (!backupSource) throw new Error('zrcdy不支持: ' + platform);
        var keywords = buildSearchKeywords(songInfo);
        function searchKeyword(index) {
          if (index >= keywords.length) return Promise.reject(new Error('zrcdy所有搜索词失败'));
          var kw = keywords[index];
          var searchUrl = ZRCDY_API + '?source=' + backupSource + '&msg=' + encodeURIComponent(kw.keyword) + '&n=0&g=10';
          return httpGet(searchUrl, {}, {}, 12000).then(function (body) {
            if (!body || body.code !== 200 || !body.data || !body.data.songs || !body.data.songs.length) {
              throw new Error('zrcdy搜索无结果');
            }
            var songs = body.data.songs;
            var bestN = 1;
            if (kw.strict && singer) {
              var bestScore = -1;
              for (var si = 0; si < songs.length; si++) {
                var sName = songs[si].title || songs[si].name || '';
                var sSinger = songs[si].singer || songs[si].author || '';
                var nScore = cleanText(sName).indexOf(cleanText(name)) >= 0 || cleanText(name).indexOf(cleanText(sName)) >= 0 ? 0.6 : 0;
                var sScore = cleanText(sSinger).indexOf(cleanText(singer)) >= 0 || cleanText(singer).indexOf(cleanText(sSinger)) >= 0 ? 0.4 : 0;
                var total = nScore + sScore;
                if (total > bestScore) {
                  bestScore = total;
                  bestN = si + 1;
                }
              }
              if (bestScore < 0.3) throw new Error('zrcdy歌曲匹配度低');
            }
            var qMap = {
              '128k': '128',
              '192k': '192',
              '320k': '320',
              'flac': 'flac',
              'flac24bit': 'flac'
            };
            var apiQuality = qMap[quality] || '320';
            var detailUrl = ZRCDY_API + '?source=' + backupSource + '&msg=' + encodeURIComponent(kw.keyword) + '&n=' + bestN + '&quality=' + apiQuality;
            return httpGet(detailUrl, {}, {}, 12000).then(function (detailBody) {
              if (!detailBody || detailBody.code !== 200) throw new Error('zrcdy获取详情失败');
              var data = detailBody.data;
              var musicUrl = data && (data.play_url || data.music_url || data.url || data.musicurl) || '';
              if (!musicUrl) throw new Error('zrcdy未返回URL');
              return musicUrl;
            });
          }).catch(function () {
            return searchKeyword(index + 1);
          });
        }
        return searchKeyword(0);
      }
      
      // ==================== 回退链定义 ====================
      
      // 每个平台一条回退链，按优先级排列
      // required: 必选源始终在链中；false为可选源，未配置时过滤掉
      var CHAIN_TEMPLATES = {
        wy: [{
          name: 'CHKSZ',
          fn: function (si, q) {
            return chkszGetUrl(si, q);
          },
          required: true
        }, {
          name: '星海主',
          fn: function (si, q) {
            return xinghaiMainGetUrl('wy', si, q);
          },
          required: true
        }, {
          name: '溯音163',
          fn: function (si, q) {
            return suyin163GetUrl(si);
          },
          required: true
        }, {
          name: '长青SVIP',
          fn: function (si, q) {
            return changqingGetUrl('wy', si, q);
          },
          required: true
        }, {
          name: '收集聚合',
          fn: function (si, q) {
            return shoujiGetUrl('wy', si, q);
          },
          required: true
        }, {
          name: '念心SVIP',
          fn: function (si, q) {
            return nianxinGetUrl('wy', si, q);
          },
          required: true
        }, {
          name: '星海备',
          fn: function (si, q) {
            return xinghaiBackupGetUrl('wy', si, q);
          },
          required: true
        }, {
          name: 'Huibq',
          fn: function (si, q) {
            return huibqGetUrl('wy', si, q);
          },
          required: false
        }, {
          name: 'HYWmusic',
          fn: function (si, q) {
            return hywGetUrl('wy', si, q);
          },
          required: false
        }, {
          name: 'fish-music',
          fn: function (si, q) {
            return fishGetUrl('wy', si, q);
          },
          required: false
        }, {
          name: '汽水VIP',
          fn: function (si, q) {
            return qishuiGetUrl(si, q);
          },
          required: false
        }],
        tx: [{
          name: '溯音QQ',
          fn: function (si, q) {
            return suyinQQGetUrl(si, q);
          },
          required: true
        }, {
          name: '星海主',
          fn: function (si, q) {
            return xinghaiMainGetUrl('tx', si, q);
          },
          required: true
        }, {
          name: '长青SVIP',
          fn: function (si, q) {
            return changqingGetUrl('tx', si, q);
          },
          required: true
        }, {
          name: '收集聚合',
          fn: function (si, q) {
            return shoujiGetUrl('tx', si, q);
          },
          required: true
        }, {
          name: '念心SVIP',
          fn: function (si, q) {
            return nianxinGetUrl('tx', si, q);
          },
          required: true
        }, {
          name: '星海备',
          fn: function (si, q) {
            return xinghaiBackupGetUrl('tx', si, q);
          },
          required: true
        }, {
          name: 'Huibq',
          fn: function (si, q) {
            return huibqGetUrl('tx', si, q);
          },
          required: false
        }, {
          name: 'HYWmusic',
          fn: function (si, q) {
            return hywGetUrl('tx', si, q);
          },
          required: false
        }, {
          name: 'fish-music',
          fn: function (si, q) {
            return fishGetUrl('tx', si, q);
          },
          required: false
        }, {
          name: '汽水VIP',
          fn: function (si, q) {
            return qishuiGetUrl(si, q);
          },
          required: false
        }],
        kw: [{
          name: '星海主',
          fn: function (si, q) {
            return xinghaiMainGetUrl('kw', si, q);
          },
          required: true
        }, {
          name: '溯音酷我',
          fn: function (si, q) {
            return suyinKwGetUrl(si, q);
          },
          required: true
        }, {
          name: '长青SVIP',
          fn: function (si, q) {
            return changqingGetUrl('kw', si, q);
          },
          required: true
        }, {
          name: '收集聚合',
          fn: function (si, q) {
            return shoujiGetUrl('kw', si, q);
          },
          required: true
        }, {
          name: '念心SVIP',
          fn: function (si, q) {
            return nianxinGetUrl('kw', si, q);
          },
          required: true
        }, {
          name: '星海备',
          fn: function (si, q) {
            return xinghaiBackupGetUrl('kw', si, q);
          },
          required: true
        }, {
          name: 'Huibq',
          fn: function (si, q) {
            return huibqGetUrl('kw', si, q);
          },
          required: false
        }, {
          name: 'HYWmusic',
          fn: function (si, q) {
            return hywGetUrl('kw', si, q);
          },
          required: false
        }, {
          name: 'fish-music',
          fn: function (si, q) {
            return fishGetUrl('kw', si, q);
          },
          required: false
        }],
        kg: [{
          name: '聚合API',
          fn: function (si, q) {
            return juheGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: '长青SVIP',
          fn: function (si, q) {
            return changqingGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: 'zrcdy备用',
          fn: function (si, q) {
            return zrcdyGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: '念心SVIP',
          fn: function (si, q) {
            return nianxinGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: '星海主',
          fn: function (si, q) {
            return xinghaiMainGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: '星海备',
          fn: function (si, q) {
            return xinghaiBackupGetUrl('kg', si, q);
          },
          required: true
        }, {
          name: 'Huibq',
          fn: function (si, q) {
            return huibqGetUrl('kg', si, q);
          },
          required: false
        }, {
          name: 'HYWmusic',
          fn: function (si, q) {
            return hywGetUrl('kg', si, q);
          },
          required: false
        }, {
          name: 'fish-music',
          fn: function (si, q) {
            return fishGetUrl('kg', si, q);
          },
          required: false
        }],
        mg: [{
          name: '星海主',
          fn: function (si, q) {
            return xinghaiMainGetUrl('mg', si, q);
          },
          required: true
        }, {
          name: '溯音咪咕',
          fn: function (si, q) {
            return suyinMgGetUrl(si);
          },
          required: true
        }, {
          name: '长青SVIP',
          fn: function (si, q) {
            return changqingGetUrl('mg', si, q);
          },
          required: true
        }, {
          name: '念心SVIP',
          fn: function (si, q) {
            return nianxinGetUrl('mg', si, q);
          },
          required: true
        }, {
          name: '星海备',
          fn: function (si, q) {
            return xinghaiBackupGetUrl('mg', si, q);
          },
          required: true
        }, {
          name: 'Huibq',
          fn: function (si, q) {
            return huibqGetUrl('mg', si, q);
          },
          required: false
        }, {
          name: 'HYWmusic',
          fn: function (si, q) {
            return hywGetUrl('mg', si, q);
          },
          required: false
        }, {
          name: 'fish-music',
          fn: function (si, q) {
            return fishGetUrl('mg', si, q);
          },
          required: false
        }]
      };
      
      // 动态构建回退链（过滤未配置的可选源）
      function buildChain(platform) {
        var template = CHAIN_TEMPLATES[platform];
        if (!template) return [];
        return template.filter(function (handler) {
          if (handler.required) return true;
          if (handler.name === 'Huibq') return !!(HUIBQ_API && HUIBQ_KEY);
          if (handler.name === 'HYWmusic') return !!HYW_API;
          if (handler.name === 'fish-music') return !!FISH_API;
          if (handler.name === '汽水VIP') return !!QISHUI_API;
          return false;
        });
      }
      
      // ==================== 核心回退引擎 ====================
      
      function getUrlWithFallback(platform, songInfo, quality) {
        var chain = buildChain(platform);
        if (!chain.length) return Promise.reject(new Error('无可用回退链: ' + platform));
      
        // 检查缓存
        var cacheKey = 'url_' + platform + '_' + getSongId(songInfo) + '_' + quality;
        var cached = cacheGet(cacheKey);
        if (cached) return Promise.resolve(cached);
        var errors = [];
        var startTime = Date.now();
      
        // Phase 1: 前N个源并发竞速（kg平台全部并发，其他平台前3个）
        function phase1() {
          var n = platform === 'kg' ? chain.length : Math.min(3, chain.length);
          var concurrent = chain.slice(0, n);
          var promises = concurrent.map(function (handler) {
            return handler.fn(songInfo, quality).then(function (url) {
              var validUrl = validateUrl(url, handler.name);
              return deepValidateUrl(validUrl, handler.name);
            }).then(function (url) {
              // 返回带源名称的包装对象，用于 promise.any 竞速识别
              return {
                url: url,
                name: handler.name
              };
            });
          });
      
          // 使用 Promise.any 竞速
          return Promise.any(promises).then(function (result) {
            var url = result.url;
            var name = result.name;
            cacheSet(cacheKey, url);
            var totalMs = Date.now() - startTime;
            sendLog(platform, name, totalMs);
            return url;
          }).catch(function (e) {
            if (e && e.errors) {
              e.errors.forEach(function (err) {
                errors.push(err.message);
              });
            } else if (e) {
              errors.push(e.message || String(e));
            }
            return null; // 全部失败，进入 Phase 2
          });
        }
      
        // Phase 2: 顺序尝试剩余源（kg平台已全部并发，无剩余）
        function phase2() {
          var offset = platform === 'kg' ? chain.length : Math.min(3, chain.length);
          var remaining = chain.slice(offset);
          if (!remaining.length) return Promise.reject(new Error('所有音源均失败: ' + errors.join('; ')));
          function tryNext(index) {
            if (index >= remaining.length) {
              return Promise.reject(new Error('所有音源均失败: ' + errors.join('; ')));
            }
            var handler = remaining[index];
            return handler.fn(songInfo, quality).then(function (url) {
              var validUrl = validateUrl(url, handler.name);
              return deepValidateUrl(validUrl, handler.name);
            }).then(function (url) {
              cacheSet(cacheKey, url);
              var totalMs = Date.now() - startTime;
              sendLog(platform, handler.name, totalMs);
              return url;
            }).catch(function (e) {
              errors.push(handler.name + ': ' + (e.message || String(e)));
              return tryNext(index + 1);
            });
          }
          return tryNext(0);
        }
        return phase1().then(function (url) {
          if (url) return url;
          return phase2();
        });
      }
      
      // ==================== 更新检查 ====================
      
      function checkUpdate() {
        if (!VERSION_CHECK_URL) return;
        httpGet(VERSION_CHECK_URL, {}, {}, 8000).then(function (body) {
          var remoteVersion = body && body.version;
          var localVersion = currentScriptInfo.version || '1.0.0';
          if (remoteVersion && remoteVersion !== localVersion) {
            var log = body.log || '新版本 ' + remoteVersion + ' 可用，请更新音源脚本';
            var updateUrl = body.updateUrl || '';
            var alertData = {
              log: log.substring(0, 1024)
            };
            if (updateUrl) alertData.updateUrl = updateUrl.substring(0, 1024);
            send(EVENT_NAMES.updateAlert, alertData);
          }
        }).catch(function () {
          // 更新检查失败，静默处理
        });
      }
      
      // ==================== 事件注册与初始化 ====================
      
      // 监听 request 事件
      on(EVENT_NAMES.request, function (handler) {
        return new Promise(function (resolve, reject) {
          var action = handler.action;
          var source = handler.source;
          var info = handler.info;
      
          // 仅处理 musicUrl action（符合 LX Music 官方规范）
          if (action !== 'musicUrl') {
            return reject(new Error('action not support'));
          }
          if (!info || !info.musicInfo) {
            return reject(new Error('请求参数不完整'));
          }
          var quality = info.type || '128k';
          getUrlWithFallback(source, info.musicInfo, quality).then(function (url) {
            resolve(url);
          }).catch(function (err) {
            reject(err);
          });
        });
      });
      
      // 构建音源配置（严格符合官方规范）
      var sourceConfig = {};
      Object.keys(PLATFORM_QUALITIES).forEach(function (platform) {
        sourceConfig[platform] = {
          name: PLATFORM_NAMES[platform],
          type: 'music',
          actions: ['musicUrl'],
          qualitys: PLATFORM_QUALITIES[platform]
        };
      });
      
      // 发送初始化事件
      send(EVENT_NAMES.inited, {
        sources: sourceConfig
      });
      
      // 启动更新检查（延迟以避免阻塞初始化）
      setTimeout(function () {
        checkUpdate();
      }, 3000);
      console.log('[西瓜聚合源] v1.40 已就绪 - 聚合星海/溯音/CHKSZ/长青/念心/Huibq/HYW/fish/收集/汽水VIP 共10+后端，覆盖wy/tx/kw/kg/mg五大平台');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [30]: 非常刀 v5.js  (平台: kw, wy)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 29
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 非常刀
       * @description 聚合音源，进群链接 https://t.me/gydjlfk
       * @version v5
       * @author 群主要进去
       */
      
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      
      // ========== API 端点 ==========
      const CHKSZ_API = 'https://api.chksz.top/api';
      const XINGHAI_API = 'https://music-api.gdstudio.xyz/api.php?use_xbridge3=true&loader_name=forest&need_sec_link=1&sec_link_scene=im&theme=light';
      const SUYIN_QQ_API = "https://__blocked__.invalid/api/QQ_Music";
      const SUYIN_QQ_KEY = 'oiapi-ef6133b7-ac2f-dc7d-878c-d3e207a82575';
      const SUYIN_163_API = "https://__blocked__.invalid/api/Music_163";
      const SUYIN_KW_API = "https://__blocked__.invalid/api/Kuwo";
      const SUYIN_MG_API = "https://__blocked__.invalid/api/music/migu";
      const QISHUI_SEARCH_API = 'https://api-vehicle.volcengine.com/v2/search/type';
      const QISHUI_H5_API = 'https://api.qishui.com/luna/h5/track';
      
      // ========== 音质映射 ==========
      const CHKSZ_LEVEL = {
        '128k': 'standard',
        '320k': 'exhigh',
        'flac': 'lossless',
        'flac24bit': 'jymaster'
      };
      const CHKSZ_FALLBACK = {
        jymaster: ['jymaster', 'lossless', 'exhigh', 'standard'],
        lossless: ['lossless', 'exhigh', 'standard'],
        exhigh: ['exhigh', 'standard'],
        standard: ['standard']
      };
      const XINGHAI_BR = {
        '128k': '128',
        '192k': '192',
        '320k': '320',
        'flac': '740',
        'flac24bit': '999'
      };
      const XINGHAI_SRC = {
        wy: 'netease',
        tx: 'tencent',
        kw: 'kuwo',
        kg: 'kugou',
        mg: 'migu'
      };
      const SUYIN_QQ_BR = {
        '128k': 7,
        '320k': 5,
        'flac': 4,
        'hires': 3,
        'flac24bit': 1,
        'master': 1
      };
      const SUYIN_KW_BR = {
        'flac': 1,
        '320k': 5,
        '128k': 7
      };
      
      // ========== 长青/念心 URL 模板 ==========
      const CHANGQING = {
        tx: "http://__blocked__.invalid/kgqq/qq.php?type=mp3&id={id}&level={level}",
        wy: "http://__blocked__.invalid/wy/wy.php?type=mp3&id={id}&level={level}",
        kw: "https://__blocked__.invalid/music/kw.php?type=mp3&id={id}&level={level}",
        kg: "https://__blocked__.invalid/kgqq/kg.php?type=mp3&id={id}&level={level}",
        mg: "https://__blocked__.invalid/musicapi/mg.php?type=mp3&id={id}&level={level}"
      };
      const NIANXIN = {
        tx: "https://__blocked__.invalid/kgqq/tx.php?id={id}&level={level}&type=mp3",
        wy: "http://__blocked__.invalid/wy.php?id={id}&level={level}&type=mp3",
        kw: "http://__blocked__.invalid/kw.php?id={id}&level={level}&type=mp3",
        kg: "https://__blocked__.invalid/kgqq/kg.php?id={id}&level={level}&type=mp3",
        mg: "http://__blocked__.invalid/mg.php?id={id}&level={level}&type=mp3"
      };
      
      // ========== 缓存 ==========
      const cache = new Map();
      const CACHE_TTL = 300000;
      const CACHE_MAX = 200;
      function cacheGet(key) {
        const c = cache.get(key);
        if (!c) return null;
        if (Date.now() - c.ts > CACHE_TTL) {
          cache.delete(key);
          return null;
        }
        return c.val;
      }
      function cacheSet(key, val) {
        if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
        cache.set(key, {
          val,
          ts: Date.now()
        });
      }
      
      // ========== 工具函数 ==========
      function httpGet(url, {
        timeout = 10000,
        headers = {}
      } = {}) {
        return new Promise((resolve, reject) => {
          request(url, {
            method: 'GET',
            timeout,
            headers: {
              Accept: 'application/json',
              ...headers
            }
          }, (err, resp) => {
            if (err) return reject(new Error(err.message));
            try {
              resolve(typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body);
            } catch {
              reject(new Error('响应解析失败'));
            }
          });
        });
      }
      function validateUrl(url) {
        if (typeof url === 'string' && /^https?:\/\//.test(url)) return url;
        throw new Error('无效URL');
      }
      function getSongId(info) {
        return (info.hash || info.songmid || info.id || info.rid || info.songId || '').toString();
      }
      function getQqSongId(info) {
        const mid = info.meta?.qq?.mid || info.meta?.mid || info.songmid || (typeof info.id === 'string' && !/^\d+$/.test(info.id) ? info.id : null);
        if (mid) return {
          type: 'mid',
          value: mid
        };
        const songid = info.meta?.qq?.songid || info.meta?.songid || info.id;
        if (songid) return {
          type: 'songid',
          value: songid
        };
        return null;
      }
      function qualityToLevel(q) {
        if (['flac', 'flac24bit', '24bit', 'hires', 'master'].includes(q)) return 'lossless';
        if (['320k', '192k'].includes(q)) return 'exhigh';
        return 'standard';
      }
      function cleanText(text) {
        if (!text) return '';
        return text.replace(/（[^）]*）/g, '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '').replace(/\s+/g, '').replace(/[【】《》"""'''·,，。!！?？:：;；/\\|\-]/g, '').trim().toLowerCase();
      }
      function formatDuration(ms) {
        const sec = typeof ms === 'number' ? Math.floor(ms > 1000 ? ms / 1000 : ms) : 0;
        if (sec <= 0) return '00:00';
        return `${Math.floor(sec / 60).toString().padStart(2, '0')}:${(sec % 60).toString().padStart(2, '0')}`;
      }
      function buildSearchKeywords(info) {
        const kws = [];
        if (info.singer) kws.push({
          kw: `${info.name} ${info.singer}`,
          strict: true
        });
        if (info.albumName || info.album) kws.push({
          kw: `${info.name} ${info.albumName || info.album}`,
          strict: true
        });
        kws.push({
          kw: info.name,
          strict: false
        });
        return kws;
      }
      function checkSongMatch(apiName, apiArtist, musicInfo) {
        const a = cleanText(apiName),
          b = cleanText(musicInfo.name || '');
        if (!a || !b || !a.includes(b) && !b.includes(a)) return false;
        const singer = cleanText(musicInfo.singer || '');
        if (singer) {
          const c = cleanText(apiArtist || '');
          if (c && !c.includes(singer) && !singer.includes(c)) return false;
        }
        return true;
      }
      
      // ========== Provider: CHKSZ (网易云) ==========
      async function chkszGetUrl(info, quality) {
        const level = CHKSZ_LEVEL[quality] || 'standard';
        const levels = CHKSZ_FALLBACK[level] || ['standard'];
        const id = getSongId(info);
        if (!id) throw new Error('缺少ID');
        for (const lv of levels) {
          try {
            const body = await httpGet(`${CHKSZ_API}/163_music?id=${id}&level=${lv}`, {
              headers: {
                Referer: 'https://cp.chksz.top/'
              }
            });
            if (body?.code === 200 && body.data?.url) return body.data.url;
          } catch {
            continue;
          }
        }
        throw new Error('CHKSZ失败');
      }
      
      // ========== Provider: 星海 (全平台) ==========
      async function xinghaiGetUrl(platform, info, quality) {
        const source = XINGHAI_SRC[platform];
        const br = XINGHAI_BR[quality] || '320';
        const id = getSongId(info);
        if (!source || !id) throw new Error('参数缺失');
        const body = await httpGet(`${XINGHAI_API}&types=url&source=${source}&id=${encodeURIComponent(id)}&br=${br}`);
        return validateUrl(body?.url);
      }
      
      // ========== Provider: 溯音QQ ==========
      async function suyinQQGetUrl(info, quality) {
        const qqId = getQqSongId(info);
        if (!qqId) throw new Error('缺少QQ歌曲ID');
        const startBr = SUYIN_QQ_BR[quality] || 5;
        const brs = [...new Set([startBr, 4, 5, 7])];
        for (const br of brs) {
          try {
            const params = `key=${SUYIN_QQ_KEY}&type=json&br=${br}&n=1&${qqId.type}=${qqId.value}`;
            const body = await httpGet(`${SUYIN_QQ_API}?${params}`);
            const url = body?.data?.music || body?.data?.url || extractUrlFromMsg(body?.data?.message || body?.message);
            if (url) return validateUrl(url);
          } catch {
            continue;
          }
        }
        throw new Error('溯音QQ失败');
      }
      function extractUrlFromMsg(msg) {
        if (!msg) return null;
        const m = msg.match(/https?:\/\/[^\s"'<>]+/);
        return m ? m[0] : null;
      }
      
      // ========== Provider: 溯音163 ==========
      async function suyin163GetUrl(info) {
        const id = getSongId(info);
        if (!id) throw new Error('缺少ID');
        const body = await httpGet(`${SUYIN_163_API}?id=${id}`);
        const data = Array.isArray(body?.data) ? body.data[0] : body?.data;
        return validateUrl(data?.url);
      }
      
      // ========== Provider: 溯音酷我 (搜索式) ==========
      async function suyinKwGetUrl(info, quality) {
        const br = SUYIN_KW_BR[quality] || 5;
        for (const {
          kw,
          strict
        } of buildSearchKeywords(info)) {
          try {
            const body = await httpGet(`${SUYIN_KW_API}?msg=${encodeURIComponent(kw)}&n=1&br=${br}`);
            const url = body?.data?.url || extractUrlFromMsg(body?.data?.message || body?.message);
            if (url && (!strict || checkSongMatch(body?.data?.song || '', body?.data?.singer || '', info))) return validateUrl(url);
          } catch {
            continue;
          }
        }
        throw new Error('溯音酷我失败');
      }
      
      // ========== Provider: 溯音咪咕 (搜索式) ==========
      async function suyinMgGetUrl(info) {
        for (const {
          kw,
          strict
        } of buildSearchKeywords(info)) {
          try {
            const body = await httpGet(`${SUYIN_MG_API}?gm=${encodeURIComponent(kw)}&n=1&num=1&type=json`);
            if (body?.code === 200 && body?.music_url) {
              if (!strict || checkSongMatch(body.title || '', body.artist || '', info)) return validateUrl(body.music_url);
            }
          } catch {
            continue;
          }
        }
        throw new Error('溯音咪咕失败');
      }
      
      // ========== Provider: 模板URL (长青/念心) ==========
      async function templateGetUrl(platform, info, quality, templates) {
        const tpl = templates[platform];
        if (!tpl) throw new Error('模板不支持该平台');
        const id = getSongId(info);
        if (!id) throw new Error('缺少ID');
        const level = qualityToLevel(quality);
        const url = tpl.replace('{id}', encodeURIComponent(id)).replace('{level}', level);
        const body = await httpGet(url);
        return validateUrl(body?.url || body?.data?.url || extractUrlFromMsg(typeof body === 'string' ? body : JSON.stringify(body)));
      }
      
      // ========== Provider: 汽水H5 (免费直链) ==========
      async function qishuiH5GetUrl(info) {
        const id = getSongId(info);
        if (!id) throw new Error('缺少ID');
        const body = await httpGet(`${QISHUI_H5_API}?track_id=${id}`);
        const songStr = body?.track_player?.video_model;
        if (!songStr) throw new Error('汽水H5无数据');
        const song = JSON.parse(songStr).video_list?.[0];
        if (!song?.main_url) throw new Error('汽水H5无链接');
        return validateUrl(song.main_url);
      }
      
      // ========== 回退链 ==========
      const CHAINS = {
        wy: [{
          name: 'CHKSZ',
          fn: (si, q) => chkszGetUrl(si, q)
        }, {
          name: '星海',
          fn: (si, q) => xinghaiGetUrl('wy', si, q)
        }, {
          name: '溯音163',
          fn: (si, q) => suyin163GetUrl(si)
        }, {
          name: '长青',
          fn: (si, q) => templateGetUrl('wy', si, q, CHANGQING)
        }, {
          name: '念心',
          fn: (si, q) => templateGetUrl('wy', si, q, NIANXIN)
        }],
        tx: [{
          name: '溯音QQ',
          fn: (si, q) => suyinQQGetUrl(si, q)
        }, {
          name: '星海',
          fn: (si, q) => xinghaiGetUrl('tx', si, q)
        }, {
          name: '长青',
          fn: (si, q) => templateGetUrl('tx', si, q, CHANGQING)
        }, {
          name: '念心',
          fn: (si, q) => templateGetUrl('tx', si, q, NIANXIN)
        }],
        kw: [{
          name: '星海',
          fn: (si, q) => xinghaiGetUrl('kw', si, q)
        }, {
          name: '溯音酷我',
          fn: (si, q) => suyinKwGetUrl(si, q)
        }, {
          name: '长青',
          fn: (si, q) => templateGetUrl('kw', si, q, CHANGQING)
        }, {
          name: '念心',
          fn: (si, q) => templateGetUrl('kw', si, q, NIANXIN)
        }],
        kg: [{
          name: '星海',
          fn: (si, q) => xinghaiGetUrl('kg', si, q)
        }, {
          name: '长青',
          fn: (si, q) => templateGetUrl('kg', si, q, CHANGQING)
        }, {
          name: '念心',
          fn: (si, q) => templateGetUrl('kg', si, q, NIANXIN)
        }],
        mg: [{
          name: '星海',
          fn: (si, q) => xinghaiGetUrl('mg', si, q)
        }, {
          name: '溯音咪咕',
          fn: (si, q) => suyinMgGetUrl(si)
        }, {
          name: '长青',
          fn: (si, q) => templateGetUrl('mg', si, q, CHANGQING)
        }, {
          name: '念心',
          fn: (si, q) => templateGetUrl('mg', si, q, NIANXIN)
        }],
        qs: [{
          name: '汽水H5',
          fn: (si, q) => qishuiH5GetUrl(si)
        }]
      };
      async function getUrlWithFallback(platform, songInfo, quality) {
        const chain = CHAINS[platform];
        if (!chain) throw new Error('不支持的平台');
        const key = `url_${platform}_${getSongId(songInfo)}_${quality}`;
        const cached = cacheGet(key);
        if (cached) return cached;
      
        // Phase 1: 前3个源并发竞速
        const concurrent = chain.slice(0, 3);
        try {
          const url = await Promise.any(concurrent.map(s => s.fn(songInfo, quality).then(validateUrl)));
          cacheSet(key, url);
          return url;
        } catch {}
      
        // Phase 2: 剩余源顺序尝试
        for (const s of chain.slice(3)) {
          try {
            const url = validateUrl(await s.fn(songInfo, quality));
            cacheSet(key, url);
            return url;
          } catch {
            continue;
          }
        }
        throw new Error('所有音源均失败');
      }
      
      // ========== 事件处理 ==========
      on(EVENT_NAMES.request, async ({
        action,
        source,
        info
      }) => {
        try {
          switch (action) {
            case 'musicUrl':
              return await handleMusicUrl(source, info);
            case 'search':
              return await handleSearch(source, info);
            case 'lyric':
              return await handleLyric(source, info);
            default:
              throw new Error('不支持的操作');
          }
        } catch (error) {
          console.error(`[非常刀] ${source} ${action} 错误:`, error.message);
          throw error;
        }
      });
      async function handleMusicUrl(source, info) {
        if (!info?.musicInfo) throw new Error('需要歌曲信息');
        return await getUrlWithFallback(source, info.musicInfo, info.type || '128k');
      }
      
      // ========== 搜索 ==========
      async function handleSearch(source, info) {
        if (!info?.keyword) throw new Error('需要搜索关键词');
        const keyword = info.keyword.trim();
        const limit = Math.min(info.limit || 20, 30);
        switch (source) {
          case 'wy':
            return await searchChksz(keyword, limit);
          case 'kw':
            return await searchKuwo(keyword, limit);
          case 'qs':
            return await searchQishui(keyword, limit);
          default:
            throw new Error('该平台不支持搜索');
        }
      }
      async function searchChksz(keyword, limit) {
        const body = await httpGet(`${CHKSZ_API}/163_search?keyword=${encodeURIComponent(keyword)}&limit=${limit}`, {
          headers: {
            Referer: 'https://cp.chksz.top/'
          }
        });
        if (body?.code !== 200) throw new Error('搜索失败');
        const items = Array.isArray(body.data) ? body.data : body.data?.songs || [];
        if (!items.length) throw new Error('未找到相关歌曲');
        return items.slice(0, limit).map(s => ({
          name: s.name || '',
          singer: s.artists || '',
          albumName: typeof s.album === 'string' ? s.album : s.album?.name || '',
          id: s.id,
          source: 'wy',
          interval: formatDuration(s.duration),
          meta: {
            picture: s.picUrl || '',
            wy: {
              id: s.id,
              url_id: s.id,
              lyric_id: s.id
            }
          }
        }));
      }
      async function searchKuwo(keyword, limit) {
        const results = [];
        for (let page = 1; results.length < limit && page <= 3; page++) {
          try {
            const body = await httpGet(`${SUYIN_KW_API}?msg=${encodeURIComponent(keyword)}&n=${page}`);
            const d = body?.data;
            if (!d?.song) break;
            results.push({
              name: d.song || '',
              singer: d.singer || '',
              albumName: d.album || '',
              id: d.rid || `kw_${Date.now()}_${page}`,
              source: 'kw',
              interval: formatDuration(d.duration || d.time),
              meta: {
                kw: {
                  id: d.rid || d.id
                }
              }
            });
          } catch {
            break;
          }
        }
        if (!results.length) throw new Error('未找到相关歌曲');
        return results;
      }
      async function searchMigu(keyword, limit) {
        const results = [];
        for (let page = 1; results.length < limit && page <= 3; page++) {
          try {
            const body = await httpGet(`${SUYIN_MG_API}?gm=${encodeURIComponent(keyword)}&n=${page}&num=1&type=json`);
            if (body?.code !== 200 || !body.title) break;
            results.push({
              name: body.title || '',
              singer: body.artist || '',
              albumName: body.album || '',
              id: `mg_${Date.now()}_${page}`,
              source: 'mg',
              interval: body.duration || '00:00',
              meta: {
                mg: {
                  id: body.id || ''
                }
              }
            });
          } catch {
            break;
          }
        }
        if (!results.length) throw new Error('未找到相关歌曲');
        return results;
      }
      
      // ========== 歌词 ==========
      async function handleLyric(source, info) {
        if (source !== 'qs') throw new Error('该平台不支持歌词');
        const id = getSongId(info?.musicInfo || {});
        if (!id) throw new Error('缺少ID');
        const body = await httpGet(`${QISHUI_H5_API}?track_id=${id}`);
        const raw = body?.lyric?.content || '';
        if (!raw) throw new Error('无歌词');
        return {
          lyric: krcToLrc(raw)
        };
      }
      function krcToLrc(krc) {
        const lines = krc.split('\n');
        const result = [];
        for (const line of lines) {
          const m = line.match(/^\[(\d+),(\d+)\](.*)$/);
          if (!m) continue;
          const startMs = parseInt(m[1]);
          const min = Math.floor(startMs / 60000);
          const sec = Math.floor(startMs % 60000 / 1000);
          const ms = Math.floor(startMs % 1000 / 10);
          const text = m[3].replace(/<\d+,\d+,\d+>/g, '');
          if (text.trim()) result.push(`[${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${text}`);
        }
        return result.join('\n');
      }
      async function searchQishui(keyword, limit) {
        const body = await httpGet(`${QISHUI_SEARCH_API}?keyword=${encodeURIComponent(keyword)}&search_type=music&limit=${limit}&real_offset=0&search_source=qishui`);
        const items = body?.data?.list;
        if (!Array.isArray(items) || !items.length) throw new Error('未找到相关歌曲');
        return items.slice(0, limit).map(s => ({
          name: s.title || '',
          singer: s.author_info?.name || '',
          albumName: '',
          id: s.item_id,
          source: 'qs',
          interval: formatDuration(s.duration),
          meta: {
            picture: s.cover_url || '',
            qs: {
              id: s.item_id
            }
          }
        }));
      }
      
      // ========== 初始化 ==========
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources: {
          wy: {
            name: '网易云音乐',
            type: 'music',
            actions: ['musicUrl', 'search'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit'],
            defaultQuality: 'flac'
          },
          tx: {
            name: 'QQ音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit']
          },
          kw: {
            name: '酷我音乐',
            type: 'music',
            actions: ['musicUrl', 'search'],
            qualitys: ['128k', '320k', 'flac']
          },
          kg: {
            name: '酷狗音乐',
            type: 'music',
            actions: ['musicUrl'],
            qualitys: ['128k', '320k', 'flac', 'flac24bit']
          },
          mg: {
            name: '咪咕音乐',
            type: 'music',
            actions: ['musicUrl', 'search'],
            qualitys: ['128k', '320k', 'flac']
          },
          qs: {
            name: '汽水音乐',
            type: 'music',
            actions: ['musicUrl', 'search', 'lyric'],
            qualitys: ['128k']
          }
        }
      });
      console.log('[非常刀] v4 已加载 - 网易/QQ/酷我/酷狗/咪咕/汽水 多源聚合');
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 音源 [31]: 𝖧౿ᥣᥣ𝗈 Ԝ𝗈𝗋ᥣᑯ260809.js  (平台: tx, wy, mg)
  // ═══════════════════════════════════════════════════════
  ;(function () {
    const __fileIdx = 30
    try {
      const __lx_proxy__ = Object.assign({}, __origin_lx)

      __lx_proxy__.on = function (event, handler) {
        if (event === EVENT_NAMES.request) {
          __handlers__.push({ fileIdx: __fileIdx, handler: handler })
        }
      }

      __lx_proxy__.send = function () {};

      // ⭐ v1.7：在本音源内部包装 request（只改拷贝出来的 __lx_proxy__，
      // 不改全局 __origin_lx.request）。这样：
      //   1. 避免触发 globalThis.lx.request 的 read-only 保护
      //   2. 拦截只影响当前音源，不污染宿主与其他音源
      if (typeof __makeRequestWrapper__ === 'function' && __lx_proxy__.request) {
        try {
          __lx_proxy__.request = __makeRequestWrapper__(__lx_proxy__.request)
        } catch (_) {}
      }

      // ═════════════ 原始代码开始 ═════════════
      /*!
       * @name 𝖧౿ᥣᥣ𝗈 Ԝ𝗈𝗋ᥣᑯ
       * @author hello world
       * @version 260809
       * @description 缝合怪,轻点喷
       */
      
      const ENABLE_CACHE = true;
      const CACHE_TTL = 20 * 60 * 1000;
      const TIMEOUT = 10000;
      const RACE_APIS = false;
      const CONFIG = {
        kw: {
          name: '酷我音乐',
          apis: [{
            api: '',
            idField: ['rid', 'id', 'songmid', 'hash'],
            urlField: ['data.url', 'url', 'playUrl'],
            quality: {
              '128k': '0',
              '320k': '5',
              'flac': '1'
            }
          }]
        },
        kg: {
          name: '酷狗音乐',
          apis: [{
            api: '',
            idField: ['hash', 'songmid', 'id', 'rid'],
            urlField: ['0.url', 'url', 'data.url', 'playUrl'],
            quality: {
              '128k': '128',
              '320k': '320',
              'flac': 'flac'
            }
          }]
        },
        tx: {
          name: 'QQ音乐',
          apis: [{
            api: "https://__blocked__.invalid/qq.music?msg={keyword}&n=1&type={quality}",
            idField: ['songmid', 'id', 'hash'],
            urlField: ['data.music', 'playUrl', 'url', 'data.url'],
            quality: {
              '128k': '0',
              '320k': '1',
              'flac': '4',
              'master': '5'
            }
          }]
        },
        wy: {
          name: '网易云音乐',
          apis: [{
            api: '',
            idField: ['id', 'songmid', 'hash'],
            urlField: ['url', 'data.url', 'playUrl'],
            quality: {
              '128k': 'standard',
              '320k': 'exhigh',
              'flac': 'lossless',
              'hires': 'hires',
              'atmos': 'jyeffect',
              'atmos_plus': 'sky',
              'master': 'jymaster'
            }
          }]
        },
        mg: {
          name: '咪咕音乐',
          apis: [{
            api: "https://__blocked__.invalid/lx/api/?source=migu&songmid={id}&quality={quality}",
            idField: ['songmid', 'id', 'hash'],
            urlField: ['url', 'data.url'],
            quality: {
              '128k': '128k',
              '320k': '320k',
              'flac': 'flac'
            }
          }]
        }
      };
      const {
        EVENT_NAMES,
        request,
        on,
        send
      } = __lx_proxy__;
      const cache = Object.create(null);
      const sourceKeys = Object.keys(CONFIG);
      const getCache = k => ENABLE_CACHE && cache[k]?.expire > Date.now() ? cache[k].data : (delete cache[k], null);
      const setCache = (k, d) => ENABLE_CACHE && (cache[k] = {
        data: d,
        expire: Date.now() + CACHE_TTL
      });
      const httpRequest = (url, options = {}) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('请求超时')), TIMEOUT);
        request(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
          },
          ...options
        }, (err, resp) => {
          clearTimeout(timer);
          if (err) return reject(err instanceof Error ? err : new Error(String(err)));
          if (!resp) return reject(new Error('空响应'));
          resolve({
            body: resp.body,
            statusCode: resp.statusCode || resp.status || 200,
            url: resp.url
          });
        });
      });
      const getField = (obj, path) => path.split('.').reduce((val, p) => val == null ? undefined : Array.isArray(val) ? /^\d+$/.test(p) ? val[+p] : val.map(v => v?.[p]).find(v => v != null && v !== '') : val[p], obj);
      const asUrl = v => typeof v === 'string' && /^(https?:)?\/\//.test(v.trim()) ? v.trim().startsWith('//') ? 'https:' + v.trim() : v.trim() : null;
      const findUrl = (data, fields) => data == null ? null : asUrl(data) || fields.map(f => asUrl(getField(data, f))).find(Boolean) || null;
      const getSongId = (info, fields) => fields.map(f => info[f]).find(v => v !== undefined && v !== null && v !== '')?.toString() ?? '';
      const qualitys = Object.create(null);
      const sources = Object.create(null);
      const idFieldsBySource = Object.create(null);
      sourceKeys.forEach(s => {
        const apiList = CONFIG[s].apis || [];
        const qs = [...new Set(apiList.flatMap(a => Object.keys(a.quality || {})))];
        qualitys[s] = qs.reduce((acc, q) => (acc[q] = q, acc), {});
        sources[s] = {
          name: CONFIG[s].name,
          type: 'music',
          actions: ['musicUrl'],
          qualitys: qs
        };
        idFieldsBySource[s] = [...new Set(apiList.flatMap(a => a.idField || []))];
      });
      qualitys.local = {};
      sources.local = {
        name: '本地音乐',
        type: 'music',
        actions: ['musicUrl', 'lyric', 'pic'],
        qualitys: []
      };
      const FALLBACK = {
        master: ['master', 'atmos', 'atmos_plus', 'hires', 'flac24bit', 'flac', '320k', '128k'],
        atmos: ['atmos', 'atmos_plus', 'hires', 'flac24bit', 'flac', '320k', '128k'],
        atmos_plus: ['atmos_plus', 'hires', 'flac24bit', 'flac', '320k', '128k'],
        hires: ['hires', 'flac24bit', 'flac', '320k', '128k'],
        flac24bit: ['flac24bit', 'flac', '320k', '128k'],
        flac: ['flac', '320k', '128k'],
        '320k': ['320k', '128k'],
        '128k': ['128k']
      };
      const tryApi = async (s, info, quality) => {
        const apiList = CONFIG[s].apis;
        if (!apiList?.length) throw new Error('无API配置');
        const keyword = encodeURIComponent(info.name || info.songname || '');
        const run = async api => {
          const tag = api.api.split('?')[0].split('/').pop() || 'api';
          if (api.quality && !(quality in api.quality)) throw new Error(`${tag}:不支持${quality}`);
          const needsId = api.api.includes('{id}');
          const needsKeyword = api.api.includes('{keyword}');
          const id = needsId ? getSongId(info, api.idField) : '';
          if (needsId && !id) throw new Error(`${tag}:缺少id字段`);
          if (needsKeyword && !keyword) throw new Error(`${tag}:缺少歌曲名`);
          const url = api.api.replace(/\{id\}/g, id).replace(/\{keyword\}/g, keyword).replace(/\{quality\}/g, api.quality ? api.quality[quality] : quality);
          if (!url || /\{[^}]*\}/.test(url)) throw new Error(`${tag}:URL模板未配置`);
          const resp = await httpRequest(url);
          if ([301, 302, 307, 308].includes(resp.statusCode) && resp.url) {
            const abs = asUrl(resp.url) || (() => {
              try {
                return new URL(resp.url, url).href;
              } catch {
                return null;
              }
            })();
            if (abs) return abs;
          }
          const direct = asUrl(resp.body);
          if (direct) return direct;
          const data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body;
          const result = findUrl(data, api.urlField || ['url', 'data.url', 'playUrl']);
          if (result) return result;
          throw new Error(`${tag}:响应中未找到有效链接`);
        };
        if (RACE_APIS) {
          try {
            return await Promise.any(apiList.map(run));
          } catch (agg) {
            throw new Error(`所有API均失败(${quality}) [${(agg.errors || [agg]).map(e => e.message || String(e)).join(' | ')}]`);
          }
        }
        const fails = [];
        for (const api of apiList) {
          try {
            return await run(api);
          } catch (e) {
            fails.push(e.message || String(e));
          }
        }
        throw new Error(`所有API均失败(${quality}) [${fails.join(' | ')}]`);
      };
      const inflight = Object.create(null);
      const apis = sourceKeys.reduce((acc, s) => {
        acc[s] = {
          async musicUrl(info, quality) {
            if (!info) throw new Error('缺少musicInfo');
            const key = `${s}_${getSongId(info, idFieldsBySource[s]) || `${info.name || ''}-${info.singer || info.artist || ''}` || 'unknown'}_${quality}`;
            const cached = getCache(key);
            if (cached) return cached;
            if (inflight[key]) return inflight[key];
            const run = (async () => {
              const fails = [];
              for (const q of FALLBACK[quality] || [quality]) {
                if (!qualitys[s].hasOwnProperty(q)) continue;
                try {
                  const result = await tryApi(s, info, q);
                  if (result) {
                    setCache(key, result);
                    return result;
                  }
                } catch (e) {
                  fails.push(e.message || String(e));
                }
              }
              throw new Error(fails.length ? fails.join(' || ') : '所有音质均失败');
            })();
            inflight[key] = run;
            try {
              return await run;
            } finally {
              delete inflight[key];
            }
          }
        };
        return acc;
      }, {});
      on(EVENT_NAMES.request, ({
        source,
        action,
        info
      } = {}) => {
        if (!apis[source] || action !== 'musicUrl') return Promise.reject('不支持');
        if (!qualitys[source]?.[info?.type]) return Promise.reject(`不支持的音质: ${info?.type}`);
        return apis[source].musicUrl(info.musicInfo, info.type).catch(e => {
          console.error(`[${source}] 失败:`, e.message);
          return Promise.reject(e.message);
        });
      });
      send(EVENT_NAMES.inited, {
        openDevTools: false,
        sources
      });
      ;
      (function () {
        'use strict';
      
        CONFIG.kg.qualitys = {
          '128k': '128',
          '320k': '320',
          'flac': 'flac',
          'flac24bit': 'flac24bit',
          'atmos': 'atmos',
          'atmos_plus': 'atmos_plus',
          'hires': 'hires',
          'master': 'master'
        };
        CONFIG.kw.qualitys = {
          '128k': '128',
          '320k': '320',
          'flac': 'flac'
        };
        const API_URL = "https://88.lxmusic.xn--fiqs8s";
        const API_KEY = "lxmusic";
        const SECRET_KEY = 'JaJ?a7Nwk_Fgj?2o:znAkst';
        const SCRIPT_MD5 = '1888f9865338afe6d5534b35171c61a4';
        const KG_QUALITY_LIST = ['master', 'flac24bit', 'flac', '320k', '128k'];
        const KW_QUALITY_LIST = ['flac', '320k', '128k'];
        const MUSIC_SOURCE = ['kg', 'kw'];
        const sha256 = function () {
          var HEX_CHARS = '0123456789abcdef'.split('');
          function Sha256() {
            this.blocks = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
            this.h0 = 0x6a09e667;
            this.h1 = 0xbb67ae85;
            this.h2 = 0x3c6ef372;
            this.h3 = 0xa54ff53a;
            this.h4 = 0x510e527f;
            this.h5 = 0x9b05688c;
            this.h6 = 0x1f83d9ab;
            this.h7 = 0x5be0cd19;
            this.block = this.start = this.bytes = this.hBytes = 0;
            this.finalized = this.hashed = false;
            this.first = true;
          }
          Sha256.prototype.update = function (message) {
            if (this.finalized) return;
            var notString = typeof message !== 'string';
            var blocks = this.blocks;
            for (var i = 0; i < message.length; i++) {
              if (this.hashed) {
                this.hashed = false;
                blocks[0] = this.block;
                blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
              }
              var code = notString ? message[i] : message.charCodeAt(i);
              blocks[this.start >> 2] |= code << 24 - this.start % 4 * 8;
              this.start++;
              if (this.start === 64) {
                this.block = blocks[16];
                this.start = 0;
                this.hash();
                this.hashed = true;
              }
            }
            this.bytes += message.length;
            if (this.bytes > 4294967295) {
              this.hBytes += this.bytes / 4294967296 << 0;
              this.bytes = this.bytes % 4294967296;
            }
            return this;
          };
          Sha256.prototype.finalize = function () {
            if (this.finalized) return;
            this.finalized = true;
            var blocks = this.blocks;
            var i = this.start;
            blocks[16] = this.block;
            blocks[i >> 2] |= 0x80 << 24 - i % 4 * 8;
            this.block = blocks[16];
            if (i >= 56) {
              if (!this.hashed) this.hash();
              blocks[0] = this.block;
              blocks[16] = blocks[1] = blocks[2] = blocks[3] = blocks[4] = blocks[5] = blocks[6] = blocks[7] = blocks[8] = blocks[9] = blocks[10] = blocks[11] = blocks[12] = blocks[13] = blocks[14] = blocks[15] = 0;
            }
            blocks[14] = this.hBytes << 3 | this.bytes >>> 29;
            blocks[15] = this.bytes << 3;
            this.hash();
          };
          Sha256.prototype.hash = function () {
            var K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070, 0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
            var a = this.h0,
              b = this.h1,
              c = this.h2,
              d = this.h3,
              e = this.h4,
              f = this.h5,
              g = this.h6,
              h = this.h7,
              blocks = this.blocks;
            for (var j = 0; j < 64; j++) {
              if (j >= 16) {
                var w0 = blocks[j - 15];
                var w1 = blocks[j - 2];
                var s0 = (w0 >>> 7 | w0 << 25) ^ (w0 >>> 18 | w0 << 14) ^ w0 >>> 3;
                var s1 = (w1 >>> 17 | w1 << 15) ^ (w1 >>> 19 | w1 << 13) ^ w1 >>> 10;
                blocks[j] = blocks[j - 16] + s0 + blocks[j - 7] + s1;
              }
              var S1 = (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
              var ch = e & f ^ ~e & g;
              var temp1 = h + S1 + ch + K[j] + (blocks[j] >>> 0);
              var S0 = (a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10);
              var maj = a & b ^ a & c ^ b & c;
              var temp2 = S0 + maj;
              h = g;
              g = f;
              f = e;
              e = d + temp1 >>> 0;
              d = c;
              c = b;
              b = a;
              a = temp1 + temp2 >>> 0;
            }
            this.h0 = this.h0 + a >>> 0;
            this.h1 = this.h1 + b >>> 0;
            this.h2 = this.h2 + c >>> 0;
            this.h3 = this.h3 + d >>> 0;
            this.h4 = this.h4 + e >>> 0;
            this.h5 = this.h5 + f >>> 0;
            this.h6 = this.h6 + g >>> 0;
            this.h7 = this.h7 + h >>> 0;
          };
          Sha256.prototype.hex = function () {
            this.finalize();
            var h0 = this.h0,
              h1 = this.h1,
              h2 = this.h2,
              h3 = this.h3,
              h4 = this.h4,
              h5 = this.h5,
              h6 = this.h6,
              h7 = this.h7;
            return HEX_CHARS[h0 >> 28 & 0x0F] + HEX_CHARS[h0 >> 24 & 0x0F] + HEX_CHARS[h0 >> 20 & 0x0F] + HEX_CHARS[h0 >> 16 & 0x0F] + HEX_CHARS[h0 >> 12 & 0x0F] + HEX_CHARS[h0 >> 8 & 0x0F] + HEX_CHARS[h0 >> 4 & 0x0F] + HEX_CHARS[h0 & 0x0F] + HEX_CHARS[h1 >> 28 & 0x0F] + HEX_CHARS[h1 >> 24 & 0x0F] + HEX_CHARS[h1 >> 20 & 0x0F] + HEX_CHARS[h1 >> 16 & 0x0F] + HEX_CHARS[h1 >> 12 & 0x0F] + HEX_CHARS[h1 >> 8 & 0x0F] + HEX_CHARS[h1 >> 4 & 0x0F] + HEX_CHARS[h1 & 0x0F] + HEX_CHARS[h2 >> 28 & 0x0F] + HEX_CHARS[h2 >> 24 & 0x0F] + HEX_CHARS[h2 >> 20 & 0x0F] + HEX_CHARS[h2 >> 16 & 0x0F] + HEX_CHARS[h2 >> 12 & 0x0F] + HEX_CHARS[h2 >> 8 & 0x0F] + HEX_CHARS[h2 >> 4 & 0x0F] + HEX_CHARS[h2 & 0x0F] + HEX_CHARS[h3 >> 28 & 0x0F] + HEX_CHARS[h3 >> 24 & 0x0F] + HEX_CHARS[h3 >> 20 & 0x0F] + HEX_CHARS[h3 >> 16 & 0x0F] + HEX_CHARS[h3 >> 12 & 0x0F] + HEX_CHARS[h3 >> 8 & 0x0F] + HEX_CHARS[h3 >> 4 & 0x0F] + HEX_CHARS[h3 & 0x0F] + HEX_CHARS[h4 >> 28 & 0x0F] + HEX_CHARS[h4 >> 24 & 0x0F] + HEX_CHARS[h4 >> 20 & 0x0F] + HEX_CHARS[h4 >> 16 & 0x0F] + HEX_CHARS[h4 >> 12 & 0x0F] + HEX_CHARS[h4 >> 8 & 0x0F] + HEX_CHARS[h4 >> 4 & 0x0F] + HEX_CHARS[h4 & 0x0F] + HEX_CHARS[h5 >> 28 & 0x0F] + HEX_CHARS[h5 >> 24 & 0x0F] + HEX_CHARS[h5 >> 20 & 0x0F] + HEX_CHARS[h5 >> 16 & 0x0F] + HEX_CHARS[h5 >> 12 & 0x0F] + HEX_CHARS[h5 >> 8 & 0x0F] + HEX_CHARS[h5 >> 4 & 0x0F] + HEX_CHARS[h5 & 0x0F] + HEX_CHARS[h6 >> 28 & 0x0F] + HEX_CHARS[h6 >> 24 & 0x0F] + HEX_CHARS[h6 >> 20 & 0x0F] + HEX_CHARS[h6 >> 16 & 0x0F] + HEX_CHARS[h6 >> 12 & 0x0F] + HEX_CHARS[h6 >> 8 & 0x0F] + HEX_CHARS[h6 >> 4 & 0x0F] + HEX_CHARS[h6 & 0x0F] + HEX_CHARS[h7 >> 28 & 0x0F] + HEX_CHARS[h7 >> 24 & 0x0F] + HEX_CHARS[h7 >> 20 & 0x0F] + HEX_CHARS[h7 >> 16 & 0x0F] + HEX_CHARS[h7 >> 12 & 0x0F] + HEX_CHARS[h7 >> 8 & 0x0F] + HEX_CHARS[h7 >> 4 & 0x0F] + HEX_CHARS[h7 & 0x0F];
          };
          return function (message) {
            return new Sha256().update(message).hex();
          };
        }();
        const generateSign = requestPath => sha256(requestPath + SCRIPT_MD5 + SECRET_KEY);
        const getSongId = (source, musicInfo) => {
          if (source === 'kg') return musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
          if (source === 'kw') return musicInfo.rid ?? musicInfo.id ?? musicInfo.songmid ?? musicInfo.hash;
          return musicInfo.hash ?? musicInfo.songmid ?? musicInfo.id;
        };
        const httpFetch = (url, options = {
          method: 'GET'
        }) => {
          const isFullUrl = url.startsWith('http');
          if (!isFullUrl) {
            const requestPath = url;
            const sign = generateSign(requestPath);
            url = `${API_URL}${requestPath}?sign=${sign}`;
          }
          return new Promise((resolve, reject) => {
            request(url, {
              method: options.method || 'GET',
              headers: {
                'accept': 'application/json',
                'x-request-key': API_KEY,
                'user-agent': `${__lx_proxy__.env ? `lx-music-${__lx_proxy__.env}/${__lx_proxy__.version}` : 'lx-music-request/2.0.0'}`
              },
              ...options
            }, (err, resp, body) => {
              if (err) return reject(err);
              const statusCode = resp ? resp.statusCode || resp.status || 200 : 200;
              resolve({
                statusCode,
                body: body || (resp ? resp.body : null),
                headers: resp ? resp.headers : {}
              });
            });
          });
        };
        const handleGetMusicUrl = async (source, musicInfo, quality) => {
          const songId = getSongId(source, musicInfo);
          if (!songId) throw new Error('找不到歌曲ID');
          const requestPath = `/lxmusicv4/url/${source}/${songId}/${quality}`;
          const response = await httpFetch(requestPath);
          const {
            body,
            statusCode
          } = response;
          if (statusCode === 404) throw new Error('API端点不存在');
          if (statusCode >= 500) throw new Error(`服务器错误(${statusCode})`);
          if (!body) throw new Error('服务器返回空响应');
          const data = typeof body === 'string' ? JSON.parse(body) : body;
          if (!data || isNaN(Number(data.code))) throw new Error('无效的响应数据');
          switch (data.code) {
            case 0:
            case 200:
              const musicUrl = data.data || data.url;
              if (musicUrl) return musicUrl;
              throw new Error('响应中未找到有效的URL');
            case 1:
              throw new Error('block ip');
            case 2:
              throw new Error(data.msg || 'get music url failed');
            case 5:
              throw new Error('too many requests');
            default:
              throw new Error(data.msg ?? `Unknown error(code:${data.code})`);
          }
        };
        apis.kg = {
          async musicUrl(info, quality) {
            const id = getSongId('kg', info);
            const key = `kg_${id || info.name || 'unknown'}_${quality}`;
            const cached = getCache(key);
            if (cached) return cached;
            const idx = KG_QUALITY_LIST.indexOf(quality);
            const qList = idx >= 0 ? KG_QUALITY_LIST.slice(idx) : [quality];
            for (const q of qList) {
              try {
                const result = await handleGetMusicUrl('kg', info, q);
                setCache(key, result);
                return result;
              } catch (e) {
                continue;
              }
            }
            throw '所有音质均失败';
          }
        };
        apis.kw = {
          async musicUrl(info, quality) {
            const id = getSongId('kw', info);
            const key = `kw_${id || info.name || 'unknown'}_${quality}`;
            const cached = getCache(key);
            if (cached) return cached;
            const idx = KW_QUALITY_LIST.indexOf(quality);
            const qList = idx >= 0 ? KW_QUALITY_LIST.slice(idx) : [quality];
            for (const q of qList) {
              try {
                const result = await handleGetMusicUrl('kw', info, q);
                setCache(key, result);
                return result;
              } catch (e) {
                continue;
              }
            }
            throw '所有音质均失败';
          }
        };
        sources.kg = {
          name: '酷狗母带',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: KG_QUALITY_LIST
        };
        sources.kw = {
          name: '酷我无损',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: KW_QUALITY_LIST
        };
        qualitys.kg = KG_QUALITY_LIST.reduce((acc, q) => {
          acc[q] = q;
          return acc;
        }, {});
        qualitys.kw = KW_QUALITY_LIST.reduce((acc, q) => {
          acc[q] = q;
          return acc;
        }, {});
      })();
      ;
      (function () {
        'use strict';
      
        var WY_QUALITY_LIST = ['master', 'hires', 'flac24bit', 'flac', '320k', '128k'];
        function tryApi(url, body) {
          return new Promise(function (resolve, reject) {
            var timer = setTimeout(function () {
              reject('请求超时');
            }, 10000);
            request(url, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
              },
              body: body
            }, function (err, resp) {
              clearTimeout(timer);
              if (err) {
                reject(err);
                return;
              }
              try {
                var data = typeof resp.body === 'string' ? JSON.parse(resp.body) : resp.body;
                if (data.code === 200 && data.url) {
                  resolve(data.url);
                  return;
                }
              } catch (e) {}
              reject('未找到播放链接');
            });
          });
        }
        apis.wy = {
          async musicUrl(info, quality) {
            var id = info.songmid || info.songId || info.id;
            if (!id) throw new Error('网易云歌曲ID不存在');
            var key = 'wy_' + id + '_' + quality;
            var cached = getCache(key);
            if (cached) return cached;
            var fallbackList = [];
            var idx = WY_QUALITY_LIST.indexOf(quality);
            if (idx >= 0) {
              fallbackList = WY_QUALITY_LIST.slice(idx);
            } else {
              fallbackList = ['128k'];
            }
            for (var i = 0; i < fallbackList.length; i++) {
              var q = fallbackList[i];
              var body = {
                source: 'wy',
                musicId: id,
                quality: q
              };
              try {
                var result = await tryApi('https://c.wwwweb.top/music/url', body);
                if (result) {
                  setCache(key, result);
                  return result;
                }
              } catch (e) {
                continue;
              }
            }
            throw new Error('网易云所有音质均失败');
          }
        };
        sources.wy = {
          name: '网易云音乐',
          type: 'music',
          actions: ['musicUrl'],
          qualitys: WY_QUALITY_LIST
        };
        qualitys.wy = {};
        for (var i = 0; i < WY_QUALITY_LIST.length; i++) {
          var q = WY_QUALITY_LIST[i];
          qualitys.wy[q] = q;
        }
      })();
      // ═════════════ 原始代码结束 ═════════════
    } catch (__e) {
      try {
        console.error(
          '[合并音源] 音源[' + (__fileIdx + 1) + '] 加载异常:',
          (__e && __e.message) ? __e.message : __e
        )
      } catch (_) {}
    }
  })()

  // ═══════════════════════════════════════════════════════
  // 质量探测工具
  // ═══════════════════════════════════════════════════════
  var __QUALITY_RANK__ = ['master','atmos_plus','atmos','hires','flac','flac24bit','320k','192k','128k']
  function __qualityIndex__(q) {
    var i = __QUALITY_RANK__.indexOf(q)
    return i === -1 ? 99 : i
  }

  function __detectQuality__(buf) {
    if (!buf || buf.length < 4) return null
    if (buf[0]===0x66 && buf[1]===0x4C && buf[2]===0x61 && buf[3]===0x43) {
      if (buf.length < 42) return 'flac'
      var si = 8
      var b18 = buf[si+10], b19 = buf[si+11], b20 = buf[si+12], b21 = buf[si+13]
      var sr = (b18<<12) | (b19<<4) | ((b20>>4)&0x0f)
      var bd = (((b20&0x01)<<4) | ((b21>>4)&0x0f)) + 1
      if (sr >= 192000) return 'master'
      if (sr >= 96000 || bd >= 24) return 'hires'
      return 'flac'
    }
    if ((buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) ||
        (buf[0]===0xFF && (buf[1]&0xE0)===0xE0)) {
      var bitrateTableV1L3 = [0,32,40,48,56,64,80,96,112,128,160,192,224,256,320,0]
      var bitrateTableV2L3 = [0,8,16,24,32,40,48,56,64,80,96,112,128,144,160,0]
      var offset = 0
      if (buf[0]===0x49 && buf.length >= 10) {
        offset = 10 + (((buf[6]&0x7f)<<21)|((buf[7]&0x7f)<<14)|((buf[8]&0x7f)<<7)|(buf[9]&0x7f))
      }
      for (var i = offset; i < buf.length-4; i++) {
        if (buf[i]===0xFF && (buf[i+1]&0xE0)===0xE0) {
          var vBits = (buf[i+1]>>3)&0x03
          var lBits = (buf[i+1]>>1)&0x03
          var brIdx = (buf[i+2]>>4)&0x0f
          if (lBits !== 0x01) continue
          var table = vBits===0x03 ? bitrateTableV1L3 : bitrateTableV2L3
          var br = table[brIdx]
          if (br >= 320) return '320k'
          if (br >= 192) return '192k'
          if (br > 0) return '128k'
        }
      }
      return null
    }
    if (buf[4]===0x66 && buf[5]===0x74 && buf[6]===0x79 && buf[7]===0x70) return '128k'
    if (buf[0]===0x4F && buf[1]===0x67 && buf[2]===0x67 && buf[3]===0x53) return 'flac'
    if (buf[0]===0x52 && buf[1]===0x49 && buf[2]===0x46 && buf[3]===0x46) return 'flac'
    return null
  }

  function __bodyToBuffer__(body) {
    if (!body) return null
    if (body instanceof ArrayBuffer) return new Uint8Array(body)
    if (body instanceof Uint8Array) return body
    if (ArrayBuffer.isView(body)) return new Uint8Array(body.buffer, body.byteOffset, body.byteLength)
    if (body && body.type === 'Buffer' && Array.isArray(body.data)) {
      return new Uint8Array(body.data)
    }
    if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(body)) {
      return new Uint8Array(body)
    }
    if (typeof body === 'string') {
      var arr = new Uint8Array(body.length)
      for (var i = 0; i < body.length; i++) arr[i] = body.charCodeAt(i) & 0xFF
      return arr
    }
    return null
  }

  // ⭐ 块 A：放宽探测（超时 8s、Range 1KB、最小 4 字节、三态返回）
  function __probeUrl__(url) {
    return new Promise(function (resolve) {
      var timer = setTimeout(function () { resolve(null) }, 8000)
      try {
        __origin_lx.request(url, {
          method: 'GET',
          headers: { 'Range': 'bytes=0-1023' },
          timeout: 8000,
          binary: true,
        }, function (err, resp) {
          clearTimeout(timer)

          // ① 明确失败：连接错误 / 无响应
          if (err || !resp) return resolve(null)

          // ② 明确失败：HTTP 4xx / 5xx
          if (resp.statusCode < 200 || resp.statusCode >= 400) {
            return resolve(null)
          }

          var buf = __bodyToBuffer__(resp.body)

          // ③ 能连上，但数据太短，无法识别格式 → 视作可用
          if (!buf || buf.length < 4) {
            return resolve('__UNKNOWN_OK__')
          }

          var q = __detectQuality__(buf)

          // ④ 能连上，但识别不出格式 → 视作可用
          if (!q) return resolve('__UNKNOWN_OK__')

          // ⑤ 识别出具体音质
          return resolve(q)
        })
      } catch (e) {
        clearTimeout(timer)
        resolve(null)
      }
    })
  }

  __origin_lx.on(EVENT_NAMES.request, async function (params) {
    const source = params.source
    const priorityList = PLATFORM_PRIORITY[source]
    if (!priorityList || !priorityList.length) {
      throw new Error('不支持的平台: ' + source)
    }

    const requested = params.info && params.info.type
    const reqIdx = requested ? __qualityIndex__(requested) : 99
    const errors = []

    for (const fileIdx of priorityList) {
      const h = __handlers__.find(function (x) { return x.fileIdx === fileIdx })
      if (!h) continue
      try {
        const result = await h.handler(params)
        if (!result) continue

        const actual = await __probeUrl__(result)

        // ⭐ 块 B：三态判定
        // ① 明确失败 → 跳过
        if (actual === null) {
          errors.push('[源' + (fileIdx + 1) + '] 探测失败')
          continue
        }

        // ② 能连上但未知格式 → 直接视作可用
        if (actual === '__UNKNOWN_OK__') {
          return result
        }

        // ③ 识别出具体音质 → 走原音质判定
        if (__qualityIndex__(actual) <= reqIdx) {
          return result
        }

        errors.push('[源' + (fileIdx + 1) + '] 降级 ' + requested + '→' + actual)
      } catch (e) {
        errors.push('[源' + (fileIdx + 1) + '] ' + (e && e.message ? e.message : String(e)))
      }
    }

    try {
      const firstIdx = priorityList[0]
      const h0 = __handlers__.find(function (x) { return x.fileIdx === firstIdx })
      if (h0) {
        const fallback = await h0.handler(params)
        if (fallback) return fallback
      }
    } catch (e) {}

    if (errors.length === 0) {
      throw new Error('平台 ' + source + ' 没有任何可用的处理程序')
    }
    throw new Error('平台 ' + source + ' 全部失败: ' + errors.slice(0, 8).join(' | '))
  })

  __origin_lx.send(EVENT_NAMES.inited, {
    openDevTools: false,
    sources: {
      "wy": {
            "name": "网易云音乐",
            "type": "music",
            "actions": [
                  "musicUrl"
            ],
            "qualitys": [
                  "128k",
                  "320k",
                  "flac",
                  "hires",
                  "atmos",
                  "master"
            ]
      },
      "kg": {
            "name": "酷狗音乐",
            "type": "music",
            "actions": [
                  "musicUrl"
            ],
            "qualitys": [
                  "128k",
                  "320k",
                  "flac",
                  "hires",
                  "atmos",
                  "master"
            ]
      },
      "mg": {
            "name": "咪咕音乐",
            "type": "music",
            "actions": [
                  "musicUrl"
            ],
            "qualitys": [
                  "128k",
                  "320k",
                  "flac"
            ]
      },
      "kw": {
            "name": "kw",
            "type": "music",
            "actions": [
                  "musicUrl"
            ],
            "qualitys": [
                  "128k",
                  "320k",
                  "flac",
                  "hires",
                  "atmos",
                  "atmos_plus",
                  "master"
            ]
      },
      "tx": {
            "name": "QQ音乐",
            "type": "music",
            "actions": [
                  "musicUrl"
            ],
            "qualitys": [
                  "128k",
                  "320k",
                  "flac",
                  "master",
                  "hires",
                  "atmos",
                  "atmos_plus"
            ]
      }
}
  })
})()
