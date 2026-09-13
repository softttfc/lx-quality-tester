const axios = require('axios')
const crypto = require('crypto')

const EVENT_NAMES = {
  request: 'request',
  inited: 'inited',
  updateAlert: 'updateAlert',
}

function createLxSandbox(scriptInfo = {}) {
  const handlers = { request: null, inited: null, updateAlert: null }

  const lx = {
    EVENT_NAMES,
    version: '2.0.0',
    env: 'desktop',
    currentScriptInfo: {
      name: scriptInfo.name || '',
      version: scriptInfo.version || '',
      author: scriptInfo.author || '',
      homepage: scriptInfo.homepage || '',
    },
    utils: {
      buffer: {
        from: (...args) => Buffer.from(...args),
        bufToString: (buf, fmt) => (Buffer.isBuffer(buf) ? buf.toString(fmt || 'utf8') : String(buf)),
        concat: (bufs) => Buffer.concat(bufs),
      },
      crypto: {
        md5: (str) => crypto.createHash('md5').update(str).digest('hex'),
        randomBytes: (size) => crypto.randomBytes(size).toString('hex'),
      },
    },
    on: (event, handler) => {
      handlers[event] = handler
    },
    send: (event, data) => {
      if (event === EVENT_NAMES.inited) handlers.inited = data
      else if (event === EVENT_NAMES.updateAlert) handlers.updateAlert = data
    },
    request: (url, options, callback) => {
      const opts = typeof options === 'object' && options !== null ? options : {}
      const cb = typeof options === 'function' ? options : callback
      if (typeof cb !== 'function') return

      const timeout = opts.timeout || 10000
      const method = (opts.method || 'GET').toUpperCase()
      const headers = opts.headers || {}
      const body = opts.body
      const binary = opts.binary

      const config = {
        url,
        method,
        headers,
        timeout,
        validateStatus: () => true,
        responseType: binary ? 'arraybuffer' : 'text',
        transformResponse: [(d) => d],
        maxRedirects: opts.follow_max || 5,
      }

      if (body !== undefined) {
        if (method === 'GET') config.params = body
        else config.data = body
      }

      axios(config)
        .then((res) => {
          let data = res.data
          if (typeof data === 'string' && !binary) {
            const t = data.trim()
            if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
              try {
                data = JSON.parse(t)
              } catch (e) {}
            }
          }
          cb(null, {
            statusCode: res.status,
            statusMessage: res.statusText,
            headers: res.headers,
            body: data,
          })
        })
        .catch((err) => cb(err, null))
    },
  }

  return { lx, handlers }
}

module.exports = { createLxSandbox, EVENT_NAMES }
