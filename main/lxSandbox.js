const axios = require('axios')
const crypto = require('crypto')

const EVENT_NAMES = {
  request: 'request',
  inited: 'inited',
  updateAlert: 'updateAlert',
}
const ALL_EVENT_NAMES = Object.values(EVENT_NAMES)

const ALL_SOURCES = ['kw', 'kg', 'tx', 'wy', 'mg', 'git', 'local']

const SUPPORT_QUALITYS = {
  kw: ['128k', '320k', 'flac', 'hires', 'atmos', 'atmos_plus', 'master'],
  kg: ['128k', '320k', 'flac', 'hires', 'atmos', 'master'],
  tx: ['128k', '320k', 'flac', 'hires', 'atmos', 'atmos_plus', 'master'],
  wy: ['128k', '320k', 'flac', 'hires', 'atmos', 'master'],
  mg: ['128k', '320k', 'flac', 'hires'],
  git: ['128k', '320k', 'flac'],
  local: [],
}

const SUPPORT_ACTIONS = {
  kw: ['musicUrl'],
  kg: ['musicUrl'],
  tx: ['musicUrl'],
  wy: ['musicUrl'],
  mg: ['musicUrl'],
  git: ['musicUrl'],
  local: ['musicUrl', 'lyric', 'pic'],
}

function extractHost(url) {
  try {
    const m = String(url).match(/^https?:\/\/([^/?#]+)/i)
    return m ? m[1].toLowerCase().replace(/:\d+$/, '') : null
  } catch (_) {
    return null
  }
}

function createLxSandbox(scriptInfo = {}, options = {}) {
  const handlers = { request: null, inited: null, updateAlert: null }
  const state = { isInitedApi: false, isShowedUpdateAlert: false }

  // ⭐ v1.8：记录脚本启动时间，用于判断请求是否发生在"初始化窗口"内
  const scriptStartTime = Date.now()
  const INIT_WINDOW_MS = options.initWindowMs || 15000

  // ⭐ v1.6：请求过滤 + 请求日志
  const requestFilter = options.requestFilter || null
  const logRequests = options.logRequests === true
  const requestLog = []

  // ⭐ v2.0：sequence 计数器（每次沙箱内第 N 次请求）
  let sequenceCounter = 0

  // ═══════════════════════════════════════════════════════
  // ⭐ 受控定时器：跟踪沙箱内创建的所有 timer，测试完统一清理
  // ═══════════════════════════════════════════════════════
  const timerHandles = new Set()

  function safeCallback(fn, args, tag) {
    try {
      fn.apply(null, args)
    } catch (e) {
      console.error(
        `[lxSandbox] ${tag} 回调异常（已捕获，不影响主进程）:`,
        e && e.message ? e.message : e
      )
    }
  }

  const trackedSetTimeout = (fn, ms, ...args) => {
    const id = setTimeout(() => {
      timerHandles.delete(id)
      safeCallback(fn, args, 'setTimeout')
    }, ms)
    timerHandles.add(id)
    return id
  }

  const trackedSetInterval = (fn, ms, ...args) => {
    const id = setInterval(() => {
      safeCallback(fn, args, 'setInterval')
    }, ms)
    timerHandles.add(id)
    return id
  }

  const trackedSetImmediate = (fn, ...args) => {
    const id = setImmediate(() => {
      timerHandles.delete(id)
      safeCallback(fn, args, 'setImmediate')
    })
    timerHandles.add(id)
    return id
  }

  const clearTrackedTimeout = (id) => {
    try { clearTimeout(id) } catch (_) {}
    timerHandles.delete(id)
  }
  const clearTrackedInterval = (id) => {
    try { clearInterval(id) } catch (_) {}
    timerHandles.delete(id)
  }
  const clearTrackedImmediate = (id) => {
    try { clearImmediate(id) } catch (_) {}
    timerHandles.delete(id)
  }

  const timers = {
    setTimeout: trackedSetTimeout,
    clearTimeout: clearTrackedTimeout,
    setInterval: trackedSetInterval,
    clearInterval: clearTrackedInterval,
    setImmediate: trackedSetImmediate,
    clearImmediate: clearTrackedImmediate,
  }

  function cleanup() {
    for (const id of timerHandles) {
      try { clearTimeout(id) } catch (_) {}
      try { clearInterval(id) } catch (_) {}
      try { clearImmediate(id) } catch (_) {}
    }
    timerHandles.clear()
    try { requestLog.length = 0 } catch (_) {}
  }

  const lx = {
    EVENT_NAMES,
    version: '2.0.0',
    env: 'mobile',
    currentScriptInfo: {
      name: scriptInfo.name || '',
      description: scriptInfo.description || '',
      version: scriptInfo.version || '',
      author: scriptInfo.author || '',
      homepage: scriptInfo.homepage || '',
      rawScript: scriptInfo.rawScript || '',
    },
    utils: {
      crypto: {
        md5(str) {
          if (typeof str !== 'string') throw new Error('param required a string')
          return crypto.createHash('md5').update(decodeURIComponent(encodeURIComponent(str))).digest('hex')
        },
        randomBytes(size) {
          return new Uint8Array(crypto.randomBytes(size))
        },
        aesEncrypt(buffer, mode, key, iv) {
          const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key)
          const ivBuf = Buffer.isBuffer(iv) ? iv : Buffer.from(iv)
          const isECB = String(mode).includes('ecb')
          const cipher = crypto.createCipheriv(
            isECB ? 'aes-128-ecb' : 'aes-128-cbc',
            keyBuf.slice(0, 16),
            isECB ? null : ivBuf.slice(0, 16)
          )
          const data = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
          return new Uint8Array(Buffer.concat([cipher.update(data), cipher.final()]))
        },
        rsaEncrypt(buffer, key) {
          throw new Error('rsaEncrypt not supported in sandbox')
        },
      },
      buffer: {
        from(input, encoding) {
          if (typeof input === 'string') {
            if (encoding === 'base64') return new Uint8Array(Buffer.from(input, 'base64'))
            if (encoding === 'hex') return new Uint8Array(Buffer.from(input, 'hex'))
            return new Uint8Array(Buffer.from(input, 'utf8'))
          }
          if (Array.isArray(input)) return new Uint8Array(input)
          if (ArrayBuffer.isView(input)) return new Uint8Array(input.buffer, input.byteOffset, input.byteLength)
          throw new Error('Unsupported input type: ' + typeof input)
        },
        bufToString(buf, format) {
          const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf)
          switch (format) {
            case 'hex': return b.toString('hex')
            case 'base64': return b.toString('base64')
            case 'binary': return b
            case 'utf8':
            case 'utf-8':
            default:
              return b.toString('utf8')
          }
        },
      },
    },
    on(eventName, handler) {
      if (!ALL_EVENT_NAMES.includes(eventName)) {
        return Promise.reject(new Error('The event is not supported: ' + eventName))
      }
      if (eventName === EVENT_NAMES.request) {
        handlers.request = handler
      } else {
        return Promise.reject(new Error('The event is not supported: ' + eventName))
      }
      return Promise.resolve()
    },
    send(eventName, data) {
      return new Promise((resolve, reject) => {
        if (!ALL_EVENT_NAMES.includes(eventName)) {
          return reject(new Error('The event is not supported: ' + eventName))
        }
        switch (eventName) {
          case EVENT_NAMES.inited: {
            if (state.isInitedApi) return reject(new Error('Script is inited'))
            state.isInitedApi = true
            const result = handleInit(data)
            if (!result.status) {
              return reject(new Error(result.errorMessage || 'init failed'))
            }
            handlers.inited = result
            resolve()
            break
          }
          case EVENT_NAMES.updateAlert:
            if (state.isShowedUpdateAlert) {
              return reject(new Error('The update alert can only be called once.'))
            }
            state.isShowedUpdateAlert = true
            handlers.updateAlert = data
            resolve()
            break
          default:
            reject(new Error('Unknown event name: ' + eventName))
        }
      })
    },
    request(url, options, callback) {
      const opts = typeof options === 'object' && options !== null ? options : {}
      const cb = typeof options === 'function' ? options : callback
      if (typeof cb !== 'function') return () => {}

      const host = extractHost(url)

      // ⭐ v2.0：创建 requestLog 条目（带生命周期字段）
      let logEntry = null
      if (logRequests && host) {
        const now = Date.now()
        logEntry = {
          requestId: requestLog.length,
          sequence: ++sequenceCounter,
          url,
          host,
          timestamp: now,
          beforeInited: !state.isInitedApi,
          inInitWindow: (now - scriptStartTime) < INIT_WINDOW_MS,
          endTime: null,
          duration: null,
          statusCode: null,
          status: 'pending',
          error: null,
          blockedByMultiRound: false,
        }
        requestLog.push(logEntry)
      }

      // ⭐ v2.1：请求过滤（支持白名单 allowedHosts + 黑名单 blockedHosts）
      //   - 多轮影子测试用 blockedHosts 强制音源 fallback
      //   - backendTester 隔离测试用 allowedHosts 只放行单个 host
      if (requestFilter && host) {
        let isAllowed = true

        const allowed = requestFilter.allowedHosts
        if (Array.isArray(allowed)) {
          isAllowed = allowed.includes(host)
        } else if (allowed instanceof Set) {
          isAllowed = allowed.has(host)
        }

        // ⭐ 黑名单优先判定
        const blocked = requestFilter.blockedHosts
        if (blocked) {
          let isBlocked = false
          if (Array.isArray(blocked)) isBlocked = blocked.includes(host)
          else if (blocked instanceof Set) isBlocked = blocked.has(host)
          if (isBlocked) isAllowed = false
        }

        if (!isAllowed) {
          const err = new Error('ECONNREFUSED: blocked by request filter')
          err.code = 'ECONNREFUSED'
          const fakeResp = {
            statusCode: 0,
            statusMessage: 'Blocked by request filter',
            headers: {},
            body: '',
          }
          if (logEntry) {
            logEntry.endTime = Date.now()
            logEntry.duration = logEntry.endTime - logEntry.timestamp
            logEntry.status = 'blocked'
            logEntry.error = 'ECONNREFUSED'
            // ⭐ 标记为多轮影子测试的人为拦截（区别于黑名单模式）
            logEntry.blockedByMultiRound = Array.isArray(requestFilter.blockedHosts) ||
              requestFilter.blockedHosts instanceof Set
          }
          trackedSetImmediate(() => {
            try {
              cb(err, fakeResp, fakeResp.body)
            } catch (e) {
              console.error('[lxSandbox] 拦截回调异常（已捕获，不影响主进程）:', e && e.message ? e.message : e)
            }
          })
          return () => {}
        }
      }

      const method = (opts.method || 'GET').toUpperCase()
      const timeout = opts.timeout && opts.timeout > 0 ? Math.min(opts.timeout, 60000) : 10000
      const headers = opts.headers || {}
      const binary = opts.binary === true

      const config = {
        url,
        method,
        headers,
        timeout,
        validateStatus: () => true,
        responseType: binary ? 'arraybuffer' : 'text',
        transformResponse: [(d) => d],
        maxRedirects: 5,
      }

      if (opts.body !== undefined) {
        if (method === 'GET') config.params = opts.body
        else config.data = opts.body
      } else if (opts.form !== undefined) {
        const params = new URLSearchParams()
        for (const [k, v] of Object.entries(opts.form)) params.append(k, v)
        config.data = params.toString()
        config.headers = { ...headers, 'Content-Type': 'application/x-www-form-urlencoded' }
      } else if (opts.formData !== undefined) {
        config.data = opts.formData
        config.headers = { ...headers, 'Content-Type': 'multipart/form-data' }
      }

      let aborted = false
      axios(config)
        .then((res) => {
          if (aborted) return
          let data = res.data
          if (typeof data === 'string' && !binary) {
            const t = data.trim()
            if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
              try { data = JSON.parse(t) } catch (e) {}
            }
          }
          const resp = {
            statusCode: res.status,
            statusMessage: res.statusText,
            headers: res.headers,
            body: data,
          }
          if (logEntry) {
            logEntry.endTime = Date.now()
            logEntry.duration = logEntry.endTime - logEntry.timestamp
            logEntry.statusCode = res.status
            logEntry.status = (res.status >= 200 && res.status < 400) ? 'ok' : 'http-error'
          }
          try {
            cb(null, resp, data)
          } catch (e) {
            console.error(
              '[lxSandbox] 脚本请求回调异常（已捕获，不影响主进程）:',
              e && e.message ? e.message : e
            )
          }
        })
        .catch((err) => {
          if (aborted) return
          if (logEntry) {
            logEntry.endTime = Date.now()
            logEntry.duration = logEntry.endTime - logEntry.timestamp
            logEntry.status = 'fail'
            logEntry.error = (err && err.message) ? err.message : String(err)
          }
          const e = err instanceof Error ? err : new Error(String(err))
          try {
            cb(e, null, null)
          } catch (e2) {
            console.error(
              '[lxSandbox] 脚本错误回调异常（已捕获，不影响主进程）:',
              e2 && e2.message ? e2.message : e2
            )
          }
        })

      return () => { aborted = true }
    },
  }

  function handleInit(info) {
    if (!info || typeof info !== 'object') {
      return { status: false, errorMessage: 'Missing required parameter init info' }
    }
    if (!info.sources || typeof info.sources !== 'object') {
      return { status: false, errorMessage: 'Missing sources field' }
    }
    const sourceInfo = { sources: {} }
    try {
      for (const source of ALL_SOURCES) {
        const userSource = info.sources[source]
        if (!userSource || userSource.type !== 'music') continue
        const qualitys = SUPPORT_QUALITYS[source] || []
        const actions = SUPPORT_ACTIONS[source] || []
        const userActions = Array.isArray(userSource.actions) ? userSource.actions : []
        const userQualitys = Array.isArray(userSource.qualitys) ? userSource.qualitys : []
        sourceInfo.sources[source] = {
          name: userSource.name || source,
          type: 'music',
          actions: actions.filter((a) => userActions.includes(a)),
          qualitys: qualitys.filter((q) => userQualitys.includes(q)),
        }
      }
    } catch (err) {
      return { status: false, errorMessage: err.message }
    }
    return { status: true, info: sourceInfo, sources: sourceInfo.sources }
  }

  return {
    lx,
    handlers,
    getRequestLog: () => requestLog.slice(),
    getInitRequestLog: () => requestLog.filter((r) => r.inInitWindow === true),
    timers,
    cleanup,
  }
}

module.exports = { createLxSandbox, EVENT_NAMES }
