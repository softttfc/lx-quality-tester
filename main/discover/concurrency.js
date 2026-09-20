// 简单的异步并发池，替代 Python 的 ThreadPoolExecutor
async function asyncPool(limit, items, worker, options = {}) {
  const { stopFlag } = options
  const list = Array.isArray(items) ? items : []
  const results = new Array(list.length)
  let nextIndex = 0

  async function run() {
    while (true) {
      if (stopFlag && stopFlag.cancelled) return
      const current = nextIndex++
      if (current >= list.length) return
      try {
        results[current] = await worker(list[current], current)
      } catch (err) {
        results[current] = {
          error: err && err.message ? err.message : String(err),
        }
      }
    }
  }

  const n = Math.max(1, Math.min(limit, list.length))
  const workers = []
  for (let i = 0; i < n; i++) workers.push(run())
  await Promise.all(workers)
  return results
}

module.exports = { asyncPool }
