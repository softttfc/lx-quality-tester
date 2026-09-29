const $ = (id) => document.getElementById(id)

let currentDir = null
let availableFiles = []
let lastReport = null
let analyzedFiles = null
let unsubscribe = null
let selectedIds = { wy: null, tx: null, kw: null, kg: null, mg: null }
let backendResults = null
let backendUnsubscribe = null

// ⭐ v2.0：影子测试与合并策略
let hostScores = null
let shadowUnsubscribe = null
let heavyTestLock = null   // 'backend' | 'shadow' | null —— 两个测试互斥

// ⭐ v1.3.0：共享后端提示防抖
let sharedHintTimer = null

/* ═════════ 目录选择 ═════════ */
$('btnSelectDir').addEventListener('click', async () => {
  const dir = await window.api.selectSourcesDir()
  if (!dir) return
  currentDir = dir
  $('dirPath').textContent = dir
  availableFiles = await window.api.listSources(dir)
  $('fileList').innerHTML =
    availableFiles.map((f) => `<div class="file">${escapeHtml(f.name)}</div>`).join('') ||
    '<div style="color:#bbb">没有 .js 文件</div>'
})

/* ═════════ 自动搜索 ID ═════════ */
$('btnSearch').addEventListener('click', async () => {
  const name = $('songName').value.trim()
  const singer = $('singer').value.trim()
  if (!name) return alert('请先填写歌曲名')

  $('searchStatus').textContent = '搜索中...'
  $('searchStatus').style.color = '#007aff'

  const r = await window.api.searchSong({ name, singer })

  if (r.error) {
    $('searchStatus').textContent = '搜索失败：' + r.error
    $('searchStatus').style.color = '#ff3b30'
    return
  }

  const matched = r.matched || {}
  const counts = r.counts || {}
  selectedIds = { wy: null, tx: null, kw: null, kg: null, mg: null }

  if (matched.wy) selectedIds.wy = matched.wy
  if (matched.tx) selectedIds.tx = matched.tx
  if (matched.kw) selectedIds.kw = matched.kw
  if (matched.kg) selectedIds.kg = matched.kg
  if (matched.mg) selectedIds.mg = matched.mg

  const found = Object.keys(matched).length
  $('searchStatus').textContent =
    `找到 ${found}/5 个平台匹配 (网易:${counts.wy||0} QQ:${counts.tx||0} 酷我:${counts.kw||0} 酷狗:${counts.kg||0} 咪咕:${counts.mg||0})`
  $('searchStatus').style.color = found > 0 ? '#34c759' : '#ff3b30'
})

/* ═════════ 开始测试 ═════════ */
$('btnStart').addEventListener('click', async () => {
  if (!currentDir) return alert('请先选择音源目录')
  if (!availableFiles.length) return alert('目录下没有音源文件')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请填写歌曲名')

  const anyId = selectedIds.wy || selectedIds.tx || selectedIds.kw || selectedIds.kg || selectedIds.mg
  if (!anyId) return alert('请先点击「🔍 自动搜索各平台 ID」获取歌曲 ID')

  const ids = {
    wy: selectedIds.wy || {},
    tx: selectedIds.tx || {},
    kw: selectedIds.kw || {},
    kg: selectedIds.kg || {},
    mg: selectedIds.mg || {},
  }

  const song = {
    name: songName,
    singer: $('singer').value.trim(),
    albumName: $('albumName').value.trim() ||
      (selectedIds.wy && selectedIds.wy.albumName) ||
      (selectedIds.tx && selectedIds.tx.albumName) ||
      (selectedIds.kw && selectedIds.kw.albumName) ||
      (selectedIds.kg && selectedIds.kg.albumName) ||
      (selectedIds.mg && selectedIds.mg.albumName) || '',
    interval: (selectedIds.wy && selectedIds.wy.interval) ||
      (selectedIds.tx && selectedIds.tx.interval) ||
      (selectedIds.kw && selectedIds.kw.interval) ||
      (selectedIds.kg && selectedIds.kg.interval) ||
      (selectedIds.mg && selectedIds.mg.interval) || '04:30',
    ids,
  }

  const options = {
    verifyUrl: $('verifyUrl').checked,
    delay: parseInt($('delay').value, 10) || 200,
    enableFfmpegCheck: true,
    ffmpegTimeout: 15000,
  }

  setRunning(true)
  $('results').innerHTML = ''
  $('summary').style.display = 'none'
  $('progress').style.display = 'block'
  $('btnGenerateMerge').disabled = true
  analyzedFiles = null

  unsubscribe = window.api.onTestProgress(handleProgress)

  try {
    const result = await window.api.runTest({
      sourcesDir: currentDir,
      files: availableFiles,
      song,
      options,
    })
    lastReport = result
    renderResult(result)
    await prepareMergeData()
  } catch (err) {
    alert('测试失败：' + (err && err.message ? err.message : String(err)))
  } finally {
    setRunning(false)
    $('progress').style.display = 'none'
    if (unsubscribe) unsubscribe()
  }
})

/* ═════════ 保存报告 ═════════ */
$('btnSave').addEventListener('click', async () => {
  if (!lastReport) return
  const data = {
    ...lastReport,
    tool: 'lx-quality-tester',
    version: '1.8.0',
    exportedAt: new Date().toISOString(),
  }
  const r = await window.api.saveReport(JSON.stringify(data, null, 2))
  if (r && r.ok) alert('报告已保存到：\n' + r.path)
})

$('filterPlainOnly').addEventListener('change', applyAllFilters)
$('filterLowRiskOnly').addEventListener('change', applyAllFilters)
$('filterNoExploit').addEventListener('change', applyAllFilters)

/* ═════════ 分析 + 合并数据准备 ═════════ */
async function prepareMergeData() {
  if (!availableFiles.length) return
  $('mergeStatus').textContent = '正在分析音源...'
  $('mergeStatus').style.color = '#007aff'
  try {
    analyzedFiles = await window.api.analyzeSources(availableFiles)
    if (analyzedFiles && analyzedFiles.error) {
      $('mergeStatus').textContent = '分析失败: ' + analyzedFiles.error
      $('mergeStatus').style.color = '#ff3b30'
      return
    }
    const ok = (analyzedFiles || []).filter((f) => !f.error).length
    const cleanCount = (analyzedFiles || []).filter((f) => f.cleanReport && f.cleanReport.changed).length
    const initReqCount = (analyzedFiles || []).filter((f) => f.hasInitRequests).length

    let statusText = `已分析 ${ok}/${analyzedFiles.length} 个音源`
    if (cleanCount > 0) statusText += `，Layer 1 已清理 ${cleanCount} 个`
    if (initReqCount > 0) statusText += `，${initReqCount} 个将被排除`
    $('mergeStatus').textContent = statusText + '，可勾选平台后生成'
    $('mergeStatus').style.color = ok > 0 ? '#34c759' : '#ff3b30'

    refreshInitRequestFlags()
    updateMergeButtonState()
    refreshSharedHostsHint()
  } catch (err) {
    $('mergeStatus').textContent = '分析失败: ' + (err.message || err)
    $('mergeStatus').style.color = '#ff3b30'
  }
}

/* ═════════ 共享后端检测提示 ═════════ */
function scheduleSharedHint() {
  if (sharedHintTimer) clearTimeout(sharedHintTimer)
  sharedHintTimer = setTimeout(() => {
    sharedHintTimer = null
    refreshSharedHostsHint()
  }, 300)
}

async function refreshSharedHostsHint() {
  const el = $('sharedHostsHint')
  if (!el) return
  if (!analyzedFiles || !analyzedFiles.length) {
    el.textContent = '勾选平台后自动检测共享后端'
    el.style.color = '#999'
    return
  }

  const fileIndexMap = new Map()
  analyzedFiles.forEach((f, idx) => fileIndexMap.set(f.name, idx))
  const selection = {}
  document.querySelectorAll('.api-card:not(.filtered-out) .merge-checkbox').forEach((cb) => {
    if (!cb.checked) return
    const file = cb.dataset.file
    const source = cb.dataset.source
    const idx = fileIndexMap.get(file)
    if (idx === undefined) return
    if (!selection[idx]) selection[idx] = []
    if (!selection[idx].includes(source)) selection[idx].push(source)
  })

  if (Object.keys(selection).length === 0) {
    el.textContent = '勾选平台后自动检测共享后端'
    el.style.color = '#999'
    return
  }

  el.textContent = '检测中...'
  el.style.color = '#007aff'

  try {
    const r = await window.api.detectSharedHosts({
      files: analyzedFiles,
      selection,
    })
    if (r && r.hosts && r.hosts.length > 0) {
      el.innerHTML = `检测到 ${r.hosts.length} 个共享后端，生成时会启用有界并发保护：<br>` +
        r.hosts.map((h) => `<code>${escapeHtml(h)}</code>`).join(' ')
      el.style.color = '#007aff'
    } else {
      el.textContent = '未检测到共享后端（无并发打爆风险）'
      el.style.color = '#34c759'
    }
  } catch (e) {
    el.textContent = '检测失败：' + (e.message || e)
    el.style.color = '#ff3b30'
  }
}

/* ═════════ 卡片初始化请求标记 ═════════ */
function refreshInitRequestFlags() {
  if (!analyzedFiles) return
  const map = new Map()
  for (const f of analyzedFiles) map.set(f.name, f)

  document.querySelectorAll('.api-card:not(.standalone-backend-card)').forEach((card) => {
    const file = card.dataset.file
    const analyzed = map.get(file)
    if (!analyzed) return

    if (analyzed.hasInitRequests) {
      card.dataset.hasInitRequests = 'true'
      const titleEl = card.querySelector('.api-title')
      if (titleEl && !titleEl.querySelector('.badge-init-request')) {
        titleEl.insertAdjacentHTML(
          'beforeend',
          '<span class="badge badge-risk-medium badge-init-request" ' +
          'title="初始化阶段发起网络请求，合并时会被自动排除，避免整体初始化失败">' +
          '⚠️ 初始化发请求</span>'
        )
      }
    } else {
      card.dataset.hasInitRequests = 'false'
    }
  })
}

/* ═════════ 测试互斥锁 ═════════ */
function acquireHeavyLock(which) {
  if (heavyTestLock) {
    const nameMap = { backend: '后端检测', shadow: '影子测试' }
    alert(`已有测试正在运行：${nameMap[heavyTestLock] || heavyTestLock}`)
    return false
  }
  heavyTestLock = which
  $('btnTestBackends').disabled = true
  $('btnRunShadowTest').disabled = true
  return true
}

function releaseHeavyLock() {
  heavyTestLock = null
  $('btnTestBackends').disabled = false
  $('btnRunShadowTest').disabled = false
}

/* ═════════ 后端检测 ═════════ */
$('btnTestBackends').addEventListener('click', async () => {
  if (!availableFiles.length) return alert('请先选择音源目录')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请先填写歌曲名（用于发起测试请求）')

  const anyId = selectedIds.wy || selectedIds.tx || selectedIds.kw || selectedIds.kg || selectedIds.mg
  if (!anyId) return alert('请先点击「🔍 自动搜索各平台 ID」获取歌曲 ID')

  if (!acquireHeavyLock('backend')) return

  const song = {
    name: songName,
    singer: $('singer').value.trim(),
    albumName: $('albumName').value.trim(),
    interval: '04:30',
    ids: {
      wy: selectedIds.wy || {},
      tx: selectedIds.tx || {},
      kw: selectedIds.kw || {},
      kg: selectedIds.kg || {},
      mg: selectedIds.mg || {},
    },
  }

  $('btnTestBackends').textContent = '检测中...'
  $('backendStatus').textContent = '检测中，请耐心等待（每个音源约需 30~120 秒）...'
  $('backendStatus').style.color = '#007aff'
  $('backendSummary').style.display = 'none'

  backendUnsubscribe = window.api.onBackendProgress((p) => {
    if (p.type === 'file-progress') {
      $('backendStatus').textContent = `[${p.current}/${p.total}] ${p.file}`
    } else if (p.type === 'backend-platform-start') {
      $('backendStatus').textContent = `${p.file} · ${p.platform}`
    } else if (p.type === 'backend-host-test') {
      $('backendStatus').textContent = `${p.file} · ${p.platform} · 测试 ${p.host}`
    }
  })

  try {
    const r = await window.api.testBackends({
      files: availableFiles,
      song,
      options: { platforms: ['kw', 'kg', 'tx', 'wy', 'mg'], timeout: 15000 },
    })
    if (!r.ok) {
      $('backendStatus').textContent = '检测失败: ' + (r.error || '未知错误')
      $('backendStatus').style.color = '#ff3b30'
      return
    }
    backendResults = r.results
    renderBackendSummary(r.results)
    injectBackendPanels(r.results)
    $('backendStatus').textContent = `完成：${r.results.length} 个音源`
    $('backendStatus').style.color = '#34c759'
    updateBackendModeStatus()
  } catch (err) {
    $('backendStatus').textContent = '检测失败: ' + (err.message || err)
    $('backendStatus').style.color = '#ff3b30'
  } finally {
    $('btnTestBackends').textContent = '🎯 检测所有平台后端'
    if (backendUnsubscribe) { backendUnsubscribe(); backendUnsubscribe = null }
    releaseHeavyLock()
  }
})

function renderBackendSummary(results) {
  let total = 0, usable = 0
  for (const r of results) {
    for (const hosts of Object.values(r.platforms || {})) {
      total += hosts.length
      usable += hosts.filter((h) => h.usable).length
    }
  }
  $('backendSummary').style.display = 'block'
  $('backendSummary').innerHTML = `
    <div class="backend-stat">
      <span class="num">${usable}/${total}</span>
      <span class="lbl">后端可用</span>
    </div>
  `
}

function injectBackendPanels(results) {
  document.querySelectorAll('.backend-panel').forEach((el) => el.remove())
  document.querySelectorAll('.standalone-backend-card').forEach((el) => el.remove())

  let anyInjected = false

  for (const r of results) {
    let card = document.querySelector(`.api-card[data-file="${cssEscape(r.file)}"]`)
    if (!card) {
      card = [...document.querySelectorAll('.api-card')].find((c) => {
        const title = c.querySelector('.api-title')?.textContent || ''
        return title.includes(r.file)
      })
    }
    if (!card) continue

    const platformsWithBackends = Object.entries(r.platforms || {}).filter(
      ([, hosts]) => hosts.length > 0
    )
    if (platformsWithBackends.length === 0) continue

    const body = card.querySelector('.api-body')
    if (!body) continue

    const panelHtml = `
      <details class="backend-panel" open>
        <summary class="backend-panel-summary">
          <span>🎯 后端清单（${platformsWithBackends.length} 个平台）</span>
        </summary>
        <div class="backend-panel-body">
          ${platformsWithBackends.map(([platform, hosts]) => renderBackendPlatform(r.file, platform, hosts)).join('')}
        </div>
      </details>`

    body.insertAdjacentHTML('afterbegin', panelHtml)
    anyInjected = true
  }

  if (!anyInjected) renderBackendPanelsStandalone(results)

  bindBackendPanelEvents()
  updateBackendSummary()
}

function renderBackendPanelsStandalone(results) {
  const container = document.getElementById('results')
  if (!container) return

  const cardsHtml = results
    .map((r) => {
      const platformsWithBackends = Object.entries(r.platforms || {}).filter(
        ([, hosts]) => hosts.length > 0
      )
      if (platformsWithBackends.length === 0) return ''
      return `
        <div class="api-card standalone-backend-card" data-file="${escapeHtml(r.file)}">
          <div class="api-header">
            <div class="api-title">
              <span class="icon">▼</span>
              <span>🎯 ${escapeHtml(r.file)}</span>
              <span class="api-meta">后端清单（未运行音质测试）</span>
            </div>
          </div>
          <div class="api-body">
            <details class="backend-panel" open>
              <summary class="backend-panel-summary">
                <span>🎯 后端清单（${platformsWithBackends.length} 个平台）</span>
              </summary>
              <div class="backend-panel-body">
                ${platformsWithBackends.map(([platform, hosts]) => renderBackendPlatform(r.file, platform, hosts)).join('')}
              </div>
            </details>
          </div>
        </div>`
    })
    .filter(Boolean)
    .join('')

  if (!cardsHtml) return
  container.innerHTML = cardsHtml

  container.querySelectorAll('.api-header').forEach((h) => {
    h.addEventListener('click', () => {
      const body = h.parentElement.querySelector('.api-body')
      const icon = h.querySelector('.icon')
      const hidden = body.style.display === 'none'
      body.style.display = hidden ? 'block' : 'none'
      icon.textContent = hidden ? '▼' : '▶'
    })
  })
}

function bindBackendPanelEvents() {
  document.querySelectorAll('.backend-host-cb').forEach((cb) => {
    if (cb.dataset.bound === '1') return
    cb.dataset.bound = '1'
    cb.addEventListener('change', updateBackendSummary)
  })
  document.querySelectorAll('[data-action="all-usable"]').forEach((btn) => {
    if (btn.dataset.bound === '1') return
    btn.dataset.bound = '1'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const file = btn.dataset.file
      const platform = btn.dataset.platform
      document.querySelectorAll(`.backend-host-cb[data-file="${cssEscape(file)}"][data-platform="${cssEscape(platform)}"]`).forEach((cb) => {
        const entry = findBackendEntry(file, platform, cb.dataset.host)
        cb.checked = !!(entry && entry.usable)
      })
      updateBackendSummary()
    })
  })
  document.querySelectorAll('[data-action="all"]').forEach((btn) => {
    if (btn.dataset.bound === '1') return
    btn.dataset.bound = '1'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const file = btn.dataset.file
      const platform = btn.dataset.platform
      document.querySelectorAll(`.backend-host-cb[data-file="${cssEscape(file)}"][data-platform="${cssEscape(platform)}"]`).forEach((cb) => {
        cb.checked = true
      })
      updateBackendSummary()
    })
  })
  document.querySelectorAll('[data-action="none"]').forEach((btn) => {
    if (btn.dataset.bound === '1') return
    btn.dataset.bound = '1'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const file = btn.dataset.file
      const platform = btn.dataset.platform
      document.querySelectorAll(`.backend-host-cb[data-file="${cssEscape(file)}"][data-platform="${cssEscape(platform)}"]`).forEach((cb) => {
        cb.checked = false
      })
      updateBackendSummary()
    })
  })
}

function renderBackendPlatform(file, platform, hosts) {
  const rows = hosts.map((h) => {
    const icon = h.usable
      ? (h.quality && h.qualities[0] && h.quality !== h.qualities[0] ? '🟡' : '🟢')
      : '🔴'
    const qualityText = h.usable ? (h.quality || '?') : '—'
    const statusText = h.usable
      ? (h.quality && h.qualities[0] && qualityText !== h.qualities[0] ? '可用（降级）' : '可用')
      : (h.error || '失败')

    return `
      <label class="backend-host-row">
        <input type="checkbox" class="backend-host-cb"
               data-file="${escapeHtml(file)}"
               data-platform="${escapeHtml(platform)}"
               data-host="${escapeHtml(h.host)}"
               ${h.usable ? 'checked' : ''}>
        <span class="backend-host-icon">${icon}</span>
        <span class="backend-host-name">${escapeHtml(h.host)}</span>
        <span class="backend-host-quality">${escapeHtml(qualityText)}</span>
        <span class="backend-host-status" title="${escapeHtml(statusText)}">${escapeHtml(statusText)}</span>
      </label>`
  }).join('')

  return `
    <div class="backend-platform">
      <div class="backend-platform-header">
        <span class="backend-platform-name">${escapeHtml(platform)}</span>
        <span class="backend-platform-actions">
          <a href="javascript:void(0)" data-action="all-usable" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">仅保留可用</a>
          <a href="javascript:void(0)" data-action="all" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">全选</a>
          <a href="javascript:void(0)" data-action="none" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">全不选</a>
        </span>
      </div>
      <div class="backend-host-list">${rows}</div>
    </div>`
}

function findBackendEntry(file, platform, host) {
  if (!backendResults) return null
  for (const r of backendResults) {
    if (r.file !== file) continue
    const hosts = (r.platforms || {})[platform] || []
    return hosts.find((h) => h.host === host) || null
  }
  return null
}

function updateBackendSummary() {
  const all = [...document.querySelectorAll('.backend-host-cb')]
  const blocked = all.filter((cb) => !cb.checked)
  if (backendResults) renderBackendSummary(backendResults)

  // ⭐ v1.7.0 P10：按 (file, platform) 统计屏蔽数
  let totalBlocked = 0
  const seen = new Set()
  for (const cb of blocked) {
    const key = `${cb.dataset.file}::${cb.dataset.platform}::${cb.dataset.host}`
    if (seen.has(key)) continue
    seen.add(key)
    totalBlocked++
  }

  let el = document.getElementById('blockedHostsSummary')
  if (!el) {
    el = document.createElement('div')
    el.id = 'blockedHostsSummary'
    el.className = 'blocked-hosts-summary'
    $('backendSummary').appendChild(el)
  }
  if (totalBlocked > 0) {
    el.style.display = 'block'
    el.innerHTML = `⚠️ 已屏蔽 ${totalBlocked} 条 (文件+平台+域名) 规则，生成时按 (文件, 平台) 维度生效`
  } else {
    el.style.display = 'none'
    el.innerHTML = ''
  }
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&')
}

/* ⭐ v1.7.0 P10：按 (file, platform) 收集黑名单
 *   返回 { [file]: { [platform]: [hosts] } }
 *   全局 blockedHosts 不再从 UI 收集，默认空 */
function collectBlockedHostsByFilePlatform() {
  const result = {}
  document.querySelectorAll('.backend-host-cb').forEach((cb) => {
    if (cb.checked) return
    const file = cb.dataset.file
    const platform = cb.dataset.platform
    const host = cb.dataset.host
    if (!file || !platform || !host) return
    if (!result[file]) result[file] = {}
    if (!result[file][platform]) result[file][platform] = []
    if (!result[file][platform].includes(host)) {
      result[file][platform].push(host)
    }
  })
  return result
}

/* ═════════ v2.0：影子测试 ═════════ */
$('btnUseLastSong').addEventListener('click', () => {
  const name = $('songName').value.trim()
  const singer = $('singer').value.trim()
  if (!name) return alert('请先在上方填写歌曲名')
  const line = singer ? `${name} - ${singer}` : name
  const el = $('shadowSongs')
  const cur = el.value.trim()
  el.value = cur ? (cur + '\n' + line) : line
})

$('btnClearShadowSongs').addEventListener('click', () => {
  $('shadowSongs').value = ''
})

function parseShadowSongs(text) {
  const lines = String(text || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
  const songs = []
  for (const line of lines) {
    let name = ''
    let singer = ''
    const m = line.match(/^(.+?)\s*[-|—–]\s*(.+)$/)
    if (m) {
      name = m[1].trim()
      singer = m[2].trim()
    } else {
      name = line
    }
    if (name) songs.push({ name, singer })
  }
  return songs
}

$('btnRunShadowTest').addEventListener('click', async () => {
  if (!availableFiles.length) return alert('请先选择音源目录')

  const songLines = parseShadowSongs($('shadowSongs').value)
  if (songLines.length === 0) {
    return alert('请至少填写一首测试歌曲（每行一首，格式：歌名 - 歌手）')
  }

  if (!acquireHeavyLock('shadow')) return

  // ⭐ v2.1：读取"覆盖全部 host"开关（默认开启）
  const fullCoverageEl = $('shadowFullCoverage')
  const fullCoverage = fullCoverageEl ? fullCoverageEl.checked : true

  $('btnRunShadowTest').textContent = '影子测试中...'
  $('shadowStatus').textContent = '正在搜索歌曲 ID...'
  $('shadowStatus').style.color = '#007aff'
  $('shadowSummary').style.display = 'none'

  shadowUnsubscribe = window.api.onShadowProgress((p) => {
    if (p.type === 'shadow-preload-start') {
      $('shadowStatus').textContent = `预加载音源声明（共 ${p.total} 个文件）...`
      $('shadowStatus').style.color = '#6633aa'
    } else if (p.type === 'shadow-preload') {
      $('shadowStatus').textContent = `预加载 declaredSources: ${p.file}`
      $('shadowStatus').style.color = '#6633aa'
    } else if (p.type === 'shadow-preload-done') {
      $('shadowStatus').textContent = '预加载完成，开始影子测试...'
      $('shadowStatus').style.color = '#6633aa'
    } else if (p.type === 'shadow-round-start') {
      $('shadowStatus').textContent =
        `第 ${p.round}/${p.maxRounds} 轮开始（已屏蔽 ${p.blockedCount} 个 host 规则）`
      $('shadowStatus').style.color = '#6633aa'
    } else if (p.type === 'shadow-round-done') {
      $('shadowStatus').textContent =
        `第 ${p.round} 轮完成：新增成功 ${p.newlySucceeded.length} 项，` +
        `累计成功 ${p.totalSuccess} 项，累计屏蔽规则 ${p.totalBlocked} 项`
      $('shadowStatus').style.color = '#34c759'
    } else if (p.type === 'shadow-run') {
      $('shadowStatus').textContent =
        `[${p.done + 1}/${p.total}] ${p.file} · ${p.platform} · ${p.song}`
    } else if (p.type === 'shadow-progress') {
      const pct = p.total > 0 ? Math.round((p.done / p.total) * 100) : 0
      $('shadowStatus').textContent = `进度 ${pct}% (${p.done}/${p.total})`
    } else if (p.type === 'shadow-file-error') {
      console.warn('[shadow] 音源加载失败:', p.file, p.error)
    }
  })

  try {
    const songs = []
    for (let i = 0; i < songLines.length; i++) {
      const { name, singer } = songLines[i]
      $('shadowStatus').textContent = `[${i + 1}/${songLines.length}] 搜索 ID：${name}${singer ? ' - ' + singer : ''}`
      try {
        const r = await window.api.searchSong({ name, singer })
        if (r && r.matched) {
          const ids = {
            wy: r.matched.wy || null,
            tx: r.matched.tx || null,
            kw: r.matched.kw || null,
            kg: r.matched.kg || null,
            mg: r.matched.mg || null,
          }
          const anyId = ids.wy || ids.tx || ids.kw || ids.kg || ids.mg
          if (anyId) {
            songs.push({
              name,
              singer,
              albumName: (ids.wy && ids.wy.albumName) || (ids.tx && ids.tx.albumName) ||
                         (ids.kw && ids.kw.albumName) || (ids.kg && ids.kg.albumName) ||
                         (ids.mg && ids.mg.albumName) || '',
              interval: (ids.wy && ids.wy.interval) || (ids.tx && ids.tx.interval) ||
                        (ids.kw && ids.kw.interval) || (ids.kg && ids.kg.interval) ||
                        (ids.mg && ids.mg.interval) || '04:30',
              ids,
            })
          }
        }
      } catch (e) {
        console.warn(`[shadow] 搜索失败: ${name} - ${singer}`, e)
      }
    }

    if (songs.length === 0) {
      $('shadowStatus').textContent = '所有歌曲都搜索不到 ID，无法进行影子测试'
      $('shadowStatus').style.color = '#ff3b30'
      return
    }

    $('shadowStatus').textContent = fullCoverage
      ? `开始多轮影子测试（覆盖全部 host），共 ${songs.length} 首歌曲 × ${availableFiles.length} 个音源`
      : `开始单轮影子测试，共 ${songs.length} 首歌曲 × ${availableFiles.length} 个音源`
    $('shadowStatus').style.color = '#007aff'

    const r = await window.api.runShadowTest({
      files: availableFiles,
      songs,
      options: {
        platforms: ['kw', 'kg', 'tx', 'wy', 'mg'],
        timeout: 15000,
        fullCoverage,
        maxRounds: 10,
      },
    })

    if (!r.ok) {
      $('shadowStatus').textContent = '影子测试失败: ' + (r.error || '未知错误')
      $('shadowStatus').style.color = '#ff3b30'
      return
    }

    hostScores = r.hostScores
    renderShadowScorePanel(r.hostScores)
    injectShadowPanels(r.hostScores)
    const globalScope = r.hostScores.global || {}
    const hostCount = Object.keys(globalScope).length
    const meta = r.hostScores._meta || {}
    const roundInfo = meta.fullCoverage ? `（${meta.rounds} 轮全覆盖）` : '（单轮）'
    $('shadowStatus').textContent = `完成：收集到 ${hostCount} 个 host 的评分数据${roundInfo}`
    $('shadowStatus').style.color = '#34c759'
    updateBackendModeStatus()
  } catch (err) {
    $('shadowStatus').textContent = '影子测试失败: ' + (err.message || err)
    $('shadowStatus').style.color = '#ff3b30'
  } finally {
    $('btnRunShadowTest').textContent = '▶️ 运行影子测试'
    if (shadowUnsubscribe) { shadowUnsubscribe(); shadowUnsubscribe = null }
    releaseHeavyLock()
  }
})

/* ⭐ v1.8.0：新评分公式
 *   score = rate*0.45 + smoothedContrib*0.35 + speed*0.12 + order*0.08
 *   smoothedContrib = (contributions + 1) / (calls + 10)
 *   引入贡献率，区分"能连通"和"有产出"；速度/顺序权重提高到 0.2 */
function computeScore(s) {
  if (!s || typeof s !== 'object') return 0
  const rate = typeof s.rate === 'number' ? s.rate : 0
  const calls = s.calls || 0
  const contributions = s.contributions || 0
  const smoothedContrib = (contributions + 1) / (calls + 10)
  const speedScore = Math.max(0, 1 - (s.avgMs || 0) / 5000)
  const orderScore = Math.max(0, 1 - (s.avgOrder || 0) / 10)
  return rate * 0.45 + smoothedContrib * 0.35 + speedScore * 0.12 + orderScore * 0.08
}

/* ⭐ v1.8.0：默认勾选规则与运行时 __checkScoreBlock__ 完全一致
 *   拦截条件 A：calls >= 5 && score < 0.20 && rate < 0.15
 *   拦截条件 B：calls >= 10 && contributions === 0 && rate < 0.30
 *   满足任一条件 → 默认不勾选 */
function shouldKeepByScore(s) {
  const calls = s.calls || 0
  if (calls < 5) return true
  const rate = typeof s.rate === 'number' ? s.rate : 0
  const contributions = s.contributions || 0
  const score = computeScore(s)

  // 条件 A：低分 + 低成功率
  if (score < 0.20 && rate < 0.15) return false
  // 条件 B：有调用但从不产出 URL
  if (calls >= 10 && contributions === 0 && rate < 0.30) return false

  return true
}

function renderShadowScorePanel(hostScores) {
  if (!hostScores) return
  const globalScope = hostScores.global || hostScores
  const entries = Object.entries(globalScope).filter(([k]) => k !== '_meta')
  if (entries.length === 0) {
    $('shadowSummary').style.display = 'block'
    $('shadowSummary').innerHTML = '<div style="color:#999;text-align:center;padding:8px">未收集到任何 host 数据</div>'
    return
  }

  entries.sort((a, b) => computeScore(b[1]) - computeScore(a[1]))

  const shown = entries.slice(0, 50)
  const rows = shown.map(([host, s]) => {
    const score = computeScore(s)
    const icon = score >= 0.5 ? '🟢' : score >= 0.3 ? '🟡' : '🔴'
    const rate = ((s.rate || 0) * 100).toFixed(0)
    const contrib = s.contributions || 0
    const contribRate = ((s.contributionRate || 0) * 100).toFixed(0)
    return `
      <div class="shadow-score-row" title="${escapeHtml(host)}">
        <span class="shadow-score-icon">${icon}</span>
        <span class="shadow-score-host">${escapeHtml(host)}</span>
        <span class="shadow-score-num">${s.calls || 0}</span>
        <span class="shadow-score-num">${rate}%</span>
        <span class="shadow-score-num">${contrib}</span>
        <span class="shadow-score-num">${contribRate}%</span>
        <span class="shadow-score-num">${s.avgMs || 0}ms</span>
        <span class="shadow-score-num">#${s.avgOrder || 0}</span>
        <span class="shadow-score-score">${(score * 100).toFixed(0)}</span>
      </div>`
  }).join('')

  const meta = hostScores._meta || {}
  const metaText = meta.testSongCount
    ? `（${meta.testSongCount} 首歌曲 × ${meta.testFileCount} 个音源` +
      (meta.fullCoverage ? `，共 ${meta.rounds} 轮全覆盖` : '') + `）`
    : ''

  $('shadowSummary').style.display = 'block'
  $('shadowSummary').innerHTML = `
    <div class="shadow-stat-header">
      共 ${entries.length} 个 host${entries.length > 50 ? '，显示前 50 个' : ''} ${metaText}
    </div>
    <div class="shadow-score-header">
      <span class="shadow-score-icon"></span>
      <span class="shadow-score-host">域名</span>
      <span class="shadow-score-num">调用</span>
      <span class="shadow-score-num">成功</span>
      <span class="shadow-score-num">贡献</span>
      <span class="shadow-score-num">贡献率</span>
      <span class="shadow-score-num">耗时</span>
      <span class="shadow-score-num">顺序</span>
      <span class="shadow-score-score">评分</span>
    </div>
    <div class="shadow-score-list">${rows}</div>
  `
}

/* ⭐ v1.5.0：影子评分卡片面板（按子源、按平台） */
function injectShadowPanels(hostScores) {
  document.querySelectorAll('.shadow-panel').forEach((el) => el.remove())
  document.querySelectorAll('.standalone-shadow-card').forEach((el) => el.remove())

  const byFile = hostScores && hostScores.byFile ? hostScores.byFile : {}
  if (Object.keys(byFile).length === 0) return

  let anyInjected = false

  for (const [file, data] of Object.entries(byFile)) {
    const card = findCardByFile(file)
    if (!card) continue
    const body = card.querySelector('.api-body')
    if (!body) continue

    const platforms = Object.entries(data.byPlatform || {}).filter(
      ([, hosts]) => Object.keys(hosts).length > 0
    )
    if (platforms.length === 0) continue

    const panelHtml = `
      <details class="shadow-panel" open>
        <summary class="shadow-panel-summary">
          <span>📊 影子评分（${platforms.length} 个平台）</span>
        </summary>
        <div class="shadow-panel-body">
          ${platforms.map(([platform, hosts]) => renderShadowPlatform(file, platform, hosts)).join('')}
        </div>
      </details>`

    body.insertAdjacentHTML('beforeend', panelHtml)
    anyInjected = true
  }

  if (!anyInjected) renderShadowPanelsStandalone(hostScores)

  bindShadowPanelEvents()
}

function renderShadowPanelsStandalone(hostScores) {
  const container = document.getElementById('results')
  if (!container) return
  const byFile = hostScores && hostScores.byFile ? hostScores.byFile : {}

  const cardsHtml = Object.entries(byFile)
    .map(([file, data]) => {
      const platforms = Object.entries(data.byPlatform || {}).filter(
        ([, hosts]) => Object.keys(hosts).length > 0
      )
      if (platforms.length === 0) return ''
      return `
        <div class="api-card standalone-shadow-card" data-file="${escapeHtml(file)}">
          <div class="api-header">
            <div class="api-title">
              <span class="icon">▼</span>
              <span>📊 ${escapeHtml(file)}</span>
              <span class="api-meta">影子评分（未运行音质测试）</span>
            </div>
          </div>
          <div class="api-body">
            <details class="shadow-panel" open>
              <summary class="shadow-panel-summary">
                <span>📊 影子评分（${platforms.length} 个平台）</span>
              </summary>
              <div class="shadow-panel-body">
                ${platforms.map(([platform, hosts]) => renderShadowPlatform(file, platform, hosts)).join('')}
              </div>
            </details>
          </div>
        </div>`
    })
    .filter(Boolean)
    .join('')

  if (!cardsHtml) return
  container.innerHTML = cardsHtml

  container.querySelectorAll('.api-header').forEach((h) => {
    h.addEventListener('click', () => {
      const body = h.parentElement.querySelector('.api-body')
      const icon = h.querySelector('.icon')
      const hidden = body.style.display === 'none'
      body.style.display = hidden ? 'block' : 'none'
      icon.textContent = hidden ? '▼' : '▶'
    })
  })
}

function renderShadowPlatform(file, platform, hosts) {
  const entries = Object.entries(hosts || {}).map(([host, data]) => ({ host, ...data }))
  if (entries.length === 0) return ''

  entries.sort((a, b) => computeScore(b) - computeScore(a))

  const rows = entries.map((h) => {
    const score = computeScore(h)
    const keep = shouldKeepByScore(h)
    const icon = score >= 0.5 ? '🟢' : score >= 0.3 ? '🟡' : '🔴'
    const ratePct = ((h.rate || 0) * 100).toFixed(0)
    const contrib = h.contributions || 0
    const contribRate = ((h.contributionRate || 0) * 100).toFixed(0)

    return `
      <label class="shadow-host-row">
        <input type="checkbox" class="shadow-host-cb"
               data-file="${escapeHtml(file)}"
               data-platform="${escapeHtml(platform)}"
               data-host="${escapeHtml(h.host)}"
               ${keep ? 'checked' : ''}>
        <span class="shadow-host-icon">${icon}</span>
        <span class="shadow-host-name">${escapeHtml(h.host)}</span>
        <span class="shadow-host-num">${h.calls || 0}</span>
        <span class="shadow-host-num">${ratePct}%</span>
        <span class="shadow-host-num">${contrib}</span>
        <span class="shadow-host-num">${contribRate}%</span>
        <span class="shadow-host-num">${h.avgMs || 0}ms</span>
        <span class="shadow-host-num">#${h.avgOrder || 0}</span>
        <span class="shadow-host-score">${(score * 100).toFixed(0)}</span>
      </label>`
  }).join('')

  // ⭐ v1.8.0：新增 host 列表表头行
  return `
    <div class="shadow-platform">
      <div class="shadow-platform-header">
        <span class="shadow-platform-name">${escapeHtml(platform)}</span>
        <span class="shadow-platform-actions">
          <a href="javascript:void(0)" data-shadow-action="all-usable" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">仅保留可用</a>
          <a href="javascript:void(0)" data-shadow-action="all" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">全选</a>
          <a href="javascript:void(0)" data-shadow-action="none" data-file="${escapeHtml(file)}" data-platform="${escapeHtml(platform)}">全不选</a>
        </span>
      </div>
      <div class="shadow-host-list">
        <div class="shadow-host-header">
          <span></span>
          <span></span>
          <span class="shadow-host-name">域名</span>
          <span class="shadow-host-num">调用</span>
          <span class="shadow-host-num">成功</span>
          <span class="shadow-host-num">贡献</span>
          <span class="shadow-host-num">贡献率</span>
          <span class="shadow-host-num">耗时</span>
          <span class="shadow-host-num">顺序</span>
          <span class="shadow-host-score">评分</span>
        </div>
        ${rows}
      </div>
    </div>`
}

function findShadowEntry(file, platform, host) {
  if (!hostScores || !hostScores.byFile) return null
  const f = hostScores.byFile[file]
  if (!f || !f.byPlatform || !f.byPlatform[platform]) return null
  return f.byPlatform[platform][host] || null
}

function bindShadowPanelEvents() {
  document.querySelectorAll('.shadow-host-cb').forEach((cb) => {
    if (cb.dataset.bound === '1') return
    cb.dataset.bound = '1'
    cb.addEventListener('change', () => {})
  })
  document.querySelectorAll('[data-shadow-action]').forEach((btn) => {
    if (btn.dataset.bound === '1') return
    btn.dataset.bound = '1'
    btn.addEventListener('click', (e) => {
      e.preventDefault()
      const action = btn.dataset.shadowAction
      const file = btn.dataset.file
      const platform = btn.dataset.platform
      document.querySelectorAll(`.shadow-host-cb[data-file="${cssEscape(file)}"][data-platform="${cssEscape(platform)}"]`).forEach((cb) => {
        if (action === 'all') cb.checked = true
        else if (action === 'none') cb.checked = false
        else if (action === 'all-usable') {
          const s = findShadowEntry(file, platform, cb.dataset.host)
          cb.checked = s ? shouldKeepByScore(s) : true
        }
      })
    })
  })
}

/* ⭐ v2.2：按 (file, platform) 收集 keep / drop，保留平台维度 */
function collectShadowSelection() {
  const state = {}
  document.querySelectorAll('.shadow-host-cb').forEach((cb) => {
    const file = cb.dataset.file
    const platform = cb.dataset.platform
    const host = cb.dataset.host
    if (!file || !platform || !host) return
    if (!state[file]) state[file] = {}
    if (!state[file][platform]) state[file][platform] = { keep: new Set(), drop: new Set() }
    if (cb.checked) state[file][platform].keep.add(host)
    else state[file][platform].drop.add(host)
  })

  const keepByFilePlatform = {}
  const dropByFilePlatform = {}
  for (const [file, platforms] of Object.entries(state)) {
    for (const [platform, s] of Object.entries(platforms)) {
      if (s.keep.size > 0) {
        if (!keepByFilePlatform[file]) keepByFilePlatform[file] = {}
        keepByFilePlatform[file][platform] = [...s.keep]
      }
      if (s.drop.size > 0) {
        if (!dropByFilePlatform[file]) dropByFilePlatform[file] = {}
        dropByFilePlatform[file][platform] = [...s.drop]
      }
    }
  }
  return { keep: keepByFilePlatform, drop: dropByFilePlatform }
}

/* ═════════ 合并策略 ═════════ */
function getBackendMode() {
  const el = document.querySelector('input[name="backendMode"]:checked')
  const v = el ? el.value : 'blacklist'
  return (v === 'none' || v === 'blacklist' || v === 'score') ? v : 'blacklist'
}

function updateBackendModeStatus() {
  const mode = getBackendMode()
  const el = $('backendModeStatus')
  if (!el) return

  if (mode === 'none') {
    el.textContent = '🚫 无优化：不屏蔽任何后端，纯合并'
    el.style.color = '#007aff'
    return
  }

  if (mode === 'blacklist') {
    if (backendResults && backendResults.length > 0) {
      let total = 0
      for (const r of backendResults) {
        for (const hosts of Object.values(r.platforms || {})) total += hosts.length
      }
      el.textContent = `✓ 后端检测数据已就绪（${total} 个后端，按文件+平台生效）`
      el.style.color = '#34c759'
    } else {
      el.textContent = '⚠ 尚未运行后端检测，生成时将按「无优化」处理'
      el.style.color = '#ff9500'
    }
  } else {
    if (hostScores) {
      const globalScope = hostScores.global || hostScores
      const n = Object.keys(globalScope).length
      if (n > 0) {
        const meta = hostScores._meta || {}
        const roundInfo = meta.fullCoverage ? `，${meta.rounds} 轮全覆盖` : ''
        el.textContent = `✓ 影子测试数据已就绪（${n} 个 host 评分${roundInfo}）`
        el.style.color = '#34c759'
      } else {
        el.textContent = '⚠ 尚未运行影子测试，请先运行'
        el.style.color = '#ff9500'
      }
    } else {
      el.textContent = '⚠ 尚未运行影子测试，请先运行'
      el.style.color = '#ff9500'
    }
  }
}

document.querySelectorAll('input[name="backendMode"]').forEach((el) => {
  el.addEventListener('change', updateBackendModeStatus)
})

/* ═════════ 风险提示 ═════════ */
function renderRiskBadge(info) {
  const risk = info && info.risk
  if (!risk || risk.level === 'clean') return ''
  const map = {
    high:   { icon: '🔴', text: '高风险', cls: 'badge-risk-high' },
    medium: { icon: '🟡', text: '中风险', cls: 'badge-risk-medium' },
    low:    { icon: '🟢', text: '低风险', cls: 'badge-risk-low' },
  }
  const r = map[risk.level]
  if (!r) return ''
  const title = (risk.reasons || []).map(escapeHtml).join('\n')
  return `<span class="badge ${r.cls}" title="${title}">${r.icon} ${r.text}</span>`
}

function renderRiskPanel(info) {
  const risk = info && info.risk
  if (!risk || risk.level === 'clean') return ''
  const c = risk.categories || {}
  const rows = []

  if (c.hardcodedSecrets && c.hardcodedSecrets.count) {
    const samples = c.hardcodedSecrets.samples || []
    rows.push(`<div class="risk-item"><div class="risk-item-title">🔑 硬编码密钥（${c.hardcodedSecrets.count} 处）</div><ul>${samples.map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join('')}</ul></div>`)
  }
  if (c.readsUserCredentials && c.readsUserCredentials.fields && c.readsUserCredentials.fields.length) {
    rows.push(`<div class="risk-item"><div class="risk-item-title">👤 读取头部凭据</div><ul>${c.readsUserCredentials.fields.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul></div>`)
  }
  if (c.httpHosts && c.httpHosts.count) {
    const list = c.httpHosts.list || []
    const shown = list.slice(0, 10)
    rows.push(`<div class="risk-item"><div class="risk-item-title">🌐 非官方 HTTP 域名（${c.httpHosts.count} 个）</div><ul>${shown.map((h) => `<li><span class="status-fail">http://${escapeHtml(h)}</span></li>`).join('')}${list.length > 10 ? `<li>...及其他 ${list.length - 10} 个</li>` : ''}</ul></div>`)
  }
  if (c.untrustedHosts && c.untrustedHosts.count) {
    const list = c.untrustedHosts.list || []
    const shown = list.slice(0, 10)
    rows.push(`<div class="risk-item"><div class="risk-item-title">🌐 非官方 HTTPS 域名（${c.untrustedHosts.count} 个）</div><ul>${shown.map((h) => `<li>https://${escapeHtml(h)}</li>`).join('')}${list.length > 10 ? `<li>...及其他 ${list.length - 10} 个</li>` : ''}</ul></div>`)
  }
  if (c.containsExploit && c.containsExploit.keywords && c.containsExploit.keywords.length) {
    rows.push(`<div class="risk-item"><div class="risk-item-title">⚠️ 越权/破解逻辑</div><ul>${c.containsExploit.keywords.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ul></div>`)
  }
  if (!rows.length) return ''

  const lv = ({ high: { icon: '🔴', text: '高', cls: 'risk-high' }, medium: { icon: '🟡', text: '中', cls: 'risk-medium' }, low: { icon: '🟢', text: '低', cls: 'risk-low' } })[risk.level] || { icon: '🟢', text: '低', cls: 'risk-low' }
  const badgeCls = risk.level === 'high' ? 'badge-risk-high' : risk.level === 'medium' ? 'badge-risk-medium' : 'badge-risk-low'

  return `
    <details class="risk-panel ${lv.cls}" open>
      <summary class="risk-panel-summary">
        <span class="badge ${badgeCls}">${lv.icon} 风险等级：${lv.text}（评分 ${risk.score}）</span>
        <span class="risk-panel-hint">${escapeHtml((risk.reasons || []).join(' · '))}</span>
      </summary>
      <div class="risk-panel-body">${rows.join('')}</div>
    </details>`
}

function updateRiskSummary() {
  const counts = { high: 0, medium: 0, low: 0, clean: 0 }
  document.querySelectorAll('.api-card:not(.standalone-backend-card)').forEach((card) => {
    const level = card.dataset.riskLevel || 'clean'
    if (counts[level] !== undefined) counts[level]++
    else counts.clean++
  })
  $('riskCountHigh').textContent = counts.high
  $('riskCountMedium').textContent = counts.medium
  $('riskCountLow').textContent = counts.low
  $('riskCountClean').textContent = counts.clean
}

function applyAllFilters() {
  const onlyPlain = $('filterPlainOnly').checked
  const lowRiskOnly = $('filterLowRiskOnly').checked
  const noExploit = $('filterNoExploit').checked

  document.querySelectorAll('.api-card:not(.standalone-backend-card)').forEach((card) => {
    const isPlain = card.dataset.plain === 'true'
    const riskLevel = card.dataset.riskLevel || 'clean'
    const hasExploit = card.dataset.hasExploit === 'true'

    let visible = true
    if (onlyPlain && !isPlain) visible = false
    if (lowRiskOnly && riskLevel !== 'clean' && riskLevel !== 'low') visible = false
    if (noExploit && hasExploit) visible = false

    card.classList.toggle('filtered-out', !visible)
  })

  updateMergeButtonState()
  scheduleSharedHint()
}

function updateMergeButtonState() {
  const anyChecked = document.querySelectorAll('.api-card:not(.filtered-out) .merge-checkbox:checked').length > 0
  $('btnGenerateMerge').disabled = !analyzedFiles || !anyChecked
}

/* ═════════ 生成合并音源 ═════════ */
$('btnGenerateMerge').addEventListener('click', async () => {
  if (!analyzedFiles) return alert('请先完成测试')

  const mode = getBackendMode()

  // ⭐ v1.6.1：评分模式前置校验
  if (mode === 'score') {
    if (!hostScores) {
      return alert('评分模式需要先运行「影子测试」并获取到至少一个 host 的评分数据')
    }
    const globalScope = hostScores.global || hostScores
    if (Object.keys(globalScope).length === 0) {
      return alert('评分模式需要先运行「影子测试」并获取到至少一个 host 的评分数据')
    }
  }

  const checkboxes = document.querySelectorAll('.api-card:not(.filtered-out) .merge-checkbox')
  const fileIndexMap = new Map()
  analyzedFiles.forEach((f, idx) => fileIndexMap.set(f.name, idx))

  const selection = {}
  const skippedInitReq = []

  for (const cb of checkboxes) {
    if (!cb.checked) continue
    const file = cb.dataset.file
    const source = cb.dataset.source
    const idx = fileIndexMap.get(file)
    if (idx === undefined) continue

    const analyzed = analyzedFiles[idx]
    if (analyzed && analyzed.hasInitRequests) {
      if (!skippedInitReq.includes(file)) skippedInitReq.push(file)
      continue
    }

    if (!selection[idx]) selection[idx] = []
    if (!selection[idx].includes(source)) selection[idx].push(source)
  }

  if (skippedInitReq.length > 0) {
    const listText = skippedInitReq.slice(0, 10).join('\n')
    const more = skippedInitReq.length > 10 ? `\n...及其他 ${skippedInitReq.length - 10} 个` : ''
    const ok = confirm(
      `以下 ${skippedInitReq.length} 个子源会在初始化阶段发起网络请求，合并时已自动排除，避免整体初始化失败：\n\n${listText}${more}\n\n继续生成？`
    )
    if (!ok) return
  }

  if (Object.keys(selection).length === 0) {
    return alert('没有可参与合并的子源（可能全部被初始化请求排除）')
  }

  let blockedHosts = []
  let blockedHostsByFilePlatform = {}
  let shadowKeep = []
  let shadowDrop = []

  // ⭐ v1.7.0 P10：三态模式处理
  if (mode === 'none') {
    // 无优化
  } else if (mode === 'blacklist') {
    blockedHostsByFilePlatform = collectBlockedHostsByFilePlatform()

    let totalBlocked = 0
    for (const platforms of Object.values(blockedHostsByFilePlatform)) {
      for (const hosts of Object.values(platforms)) {
        totalBlocked += hosts.length
      }
    }

    if (totalBlocked === 0) {
      const ok = confirm('黑名单模式下没有要屏蔽的后端，将按「无优化」生成。继续？')
      if (!ok) return
    } else {
      const samples = []
      outer:
      for (const [file, platforms] of Object.entries(blockedHostsByFilePlatform)) {
        for (const [platform, hosts] of Object.entries(platforms)) {
          for (const host of hosts) {
            samples.push(`${file} / ${platform} / ${host}`)
            if (samples.length >= 10) break outer
          }
        }
      }
      const ok = confirm(
        `检测到 ${totalBlocked} 条后端屏蔽规则（按文件+平台生效）：\n` +
        samples.join('\n') +
        (totalBlocked > 10 ? '\n...' : '') +
        `\n\n继续生成？`
      )
      if (!ok) return
    }
  } else if (mode === 'score') {
    const shadow = collectShadowSelection()
    shadowKeep = shadow.keep
    shadowDrop = shadow.drop
  }

  $('btnGenerateMerge').disabled = true

  let modeText = '正在生成（裁剪 + 排序 + 合并'
  if (mode === 'score') modeText += ' + 按平台评分注入'
  else if (mode === 'blacklist') modeText += ' + 黑名单（按文件+平台）'
  else modeText += ' + 无优化'
  modeText += ' + 共享后端检测）...'
  $('mergeStatus').textContent = modeText
  $('mergeStatus').style.color = '#007aff'

  try {
    const r = await window.api.mergeSources({
      files: analyzedFiles,
      selection,
      report: lastReport,
      backendMode: mode,
      blockedHosts,
      blockedHostsByFilePlatform,
      hostScores,
      shadowKeep,
      shadowDrop,
    })
    if (r && r.ok) {
      $('mergeStatus').textContent = '已生成: ' + r.path
      $('mergeStatus').style.color = '#34c759'
      alert('合并音源已保存到：\n' + r.path)
    } else {
      $('mergeStatus').textContent = '生成失败: ' + (r && r.error ? r.error : '未知错误')
      $('mergeStatus').style.color = '#ff3b30'
    }
  } catch (err) {
    $('mergeStatus').textContent = '生成失败: ' + (err.message || err)
    $('mergeStatus').style.color = '#ff3b30'
  } finally {
    updateMergeButtonState()
  }
})

/* ═════════ 工具函数 ═════════ */
function setRunning(running) {
  $('btnStart').disabled = running
  $('btnStart').textContent = running ? '测试中...' : '开始测试'
  $('btnSave').disabled = running || !lastReport
}

/* ═════════ 进度渲染 ═════════ */
// ⭐ 已移除 rAF 节流：之前会导致 file-progress 被后续 quality-start 覆盖，
//   导致进度条永远停留在 0%。现在所有进度事件都直接渲染，UI 显示正确。
function handleProgress(p) {
  if (!p || !p.type) return
  renderProgress(p)
}

function renderProgress(p) {
  if (!p) return
  if (p.type === 'file-progress') {
    // ⭐ 从 (current-1)/total 改为 current/total，首个文件也显示进度
    const pct = Math.round((p.current / p.total) * 100)
    $('progressText').textContent = `[${p.current}/${p.total}] ${p.file}`
    $('progressBar').style.width = pct + '%'
    $('progressPercent').textContent = pct + '%'
  } else if (p.type === 'platform-start') {
    $('progressText').textContent = `${p.file} · ${p.name}`
  } else if (p.type === 'quality-start') {
    $('progressText').textContent = `${p.file} · ${p.platform} · ${p.quality}`
  } else if (p.type === 'api-error') {
    $('progressText').textContent = `${p.file}: ${p.error}`
  } else if (p.type === 'memory-warning') {
    const mb = ((p.heapUsed || 0) / 1048576).toFixed(0)
    const pct = ((p.ratio || 0) * 100).toFixed(0)
    $('progressText').textContent = `⚠️ 内存占用 ${mb}MB (${pct}%)，已触发 GC`
  }
}

function renderResult(report) {
  const { summary, results } = report
  $('summary').style.display = 'grid'
  $('summary').innerHTML = `
    <div class="summary-item"><div class="num">${summary.totalApis}</div><div class="label">音源总数</div></div>
    <div class="summary-item"><div class="num">${summary.availableApis}</div><div class="label">可用音源</div></div>
    <div class="summary-item"><div class="num">${summary.availablePlatforms}/${summary.totalPlatforms}</div><div class="label">可用平台</div></div>
    <div class="summary-item"><div class="num">${summary.availableQualities}/${summary.totalQualities}</div><div class="label">可用音质</div></div>
    <div class="summary-item"><div class="num">${summary.downgradedQualities || 0}</div><div class="label">降级音质</div></div>
    <div class="summary-item"><div class="num">${summary.unplayableQualities || 0}</div><div class="label">不可播放</div></div>
  `
  $('results').innerHTML = results.map(renderApiCard).join('')

  document.querySelectorAll('.api-header').forEach((h) => {
    h.addEventListener('click', () => {
      const body = h.parentElement.querySelector('.api-body')
      const icon = h.querySelector('.icon')
      const hidden = body.style.display === 'none'
      body.style.display = hidden ? 'block' : 'none'
      icon.textContent = hidden ? '▼' : '▶'
    })
  })

  document.querySelectorAll('.merge-checkbox').forEach((cb) => {
    cb.addEventListener('change', () => {
      updateMergeButtonState()
      scheduleSharedHint()
    })
  })

  updateRiskSummary()
  applyAllFilters()

  if (backendResults && backendResults.length) {
    injectBackendPanels(backendResults)
  }
  if (hostScores) {
    injectShadowPanels(hostScores)
  }
}

function renderPlainBadge(info) {
  if (!info) return ''
  if (info.plainKind === 'weak') {
    const title = info.plainReason ? escapeHtml(info.plainReason) : '疑似混淆'
    return `<span class="badge badge-encrypted" title="${title}">⚠️ 疑似混淆</span>`
  }
  if (info.plain === false) {
    const title = info.plainReason ? '未采用明文：' + escapeHtml(info.plainReason) : '未采用明文'
    return `<span class="badge badge-encrypted" title="${title}">🔒 非明文</span>`
  }
  return ''
}

function renderApiCard(api) {
  const avail = api.platforms.some((p) => p.available)
  const info = api.info || {}
  const meta = [info.name, info.version, info.author].filter(Boolean).join(' · ')

  const plainBadge = renderPlainBadge(info)
  const riskBadge = renderRiskBadge(info)
  const riskPanel = renderRiskPanel(info)

  const isPlain = info.plain !== false
  const riskLevel = (info.risk && info.risk.level) || 'clean'
  const hasExploit = !!(info.risk && info.risk.hasExploit)
  const hasInitReq = !!(api.info && api.info.hasInitRequests)

  let body
  if (api.error) {
    body = `<div class="api-error">${escapeHtml(api.error)}</div>`
  } else if (!api.platforms.length) {
    body = '<div class="api-error">没有平台被测试</div>'
  } else {
    body = api.platforms.map((p) => renderPlatform(p, api.file)).join('')
  }

  return `
    <div class="api-card"
         data-file="${escapeHtml(api.file)}"
         data-plain="${isPlain ? 'true' : 'false'}"
         data-plain-kind="${escapeHtml(info.plainKind || '')}"
         data-risk-level="${riskLevel}"
         data-has-exploit="${hasExploit ? 'true' : 'false'}"
         data-has-init-requests="${hasInitReq ? 'true' : 'false'}">
      <div class="api-header">
        <div class="api-title">
          <span class="icon">▼</span>
          <span>${avail ? '✅' : '❌'} ${escapeHtml(api.file)}${plainBadge}${riskBadge}</span>
          <span class="api-meta">${escapeHtml(meta)}</span>
        </div>
      </div>
      <div class="api-body">${riskPanel}${body}</div>
    </div>`
}

function renderPlatform(p, apiFile) {
  const rows = p.qualities.map((q) => {
    let actualCell
    if (!q.urlAccessible) {
      actualCell = '<span class="status-fail">—</span>'
    } else if (q.downgrade) {
      actualCell = `<span class="status-warn">${escapeHtml(q.actualQuality || '?')}</span>`
    } else if (q.actualQuality) {
      actualCell = `<span class="status-ok">${escapeHtml(q.actualQuality)}</span>`
    } else {
      actualCell = '<span style="color:#999">未知</span>'
    }

    let playableCell
    if (q.playable === true) {
      playableCell = '<span class="status-ok">✅</span>'
    } else if (q.playable === false) {
      playableCell = `<span class="status-fail" title="${escapeHtml(q.playableError || '')}">❌</span>`
    } else {
      playableCell = '<span style="color:#999">—</span>'
    }

    const rowClass = q.downgrade
      ? 'row-downgrade'
      : (q.urlAccessible && q.playable === false ? 'row-unplayable' : '')

    return `
    <tr class="${rowClass}">
      <td>${escapeHtml(q.quality)}</td>
      <td>${q.declared ? '✅' : '—'}</td>
      <td class="${q.urlObtained ? 'status-ok' : 'status-fail'}">${q.urlObtained ? '✅' : '❌'}</td>
      <td class="${q.urlAccessible ? 'status-ok' : 'status-fail'}">${q.urlAccessible ? '✅' : '❌'}</td>
      <td>${playableCell}</td>
      <td>${actualCell}</td>
      <td>${q.duration}ms</td>
      <td class="url-cell" title="${escapeHtml(q.url || q.error || '')}">${escapeHtml(q.url || q.error || '—')}</td>
    </tr>`
  }).join('')

  const downgradeText = p.downgradedCount ? `降级: <span class="status-warn">${p.downgradedCount}</span> ` : ''
  const unplayableText = p.unplayableCount ? `不可播: <span class="status-fail">${p.unplayableCount}</span> ` : ''

  return `
    <div class="platform">
      <div class="platform-header">
        <div class="platform-name">
          <input type="checkbox"
                 class="merge-checkbox"
                 data-file="${escapeHtml(apiFile)}"
                 data-source="${escapeHtml(p.source)}"
                 ${p.available ? 'checked' : ''}>
          ${p.available ? '✅' : '❌'} ${escapeHtml(p.name)} (${escapeHtml(p.source)})
          ${p.bestQuality ? `<span class="best-tag">实际最高音质: ${escapeHtml(p.bestQuality)}</span>` : ''}
        </div>
        <div class="platform-stats">
          通过: <span class="status-ok">${p.passedCount}</span> ${downgradeText}${unplayableText}/ 错误: <span class="status-fail">${p.failedCount}</span>
        </div>
      </div>
      <table class="quality-table">
        <thead>
          <tr><th>请求音质</th><th>声明</th><th>获取URL</th><th>可访问</th><th>可播</th><th>实际音质</th><th>耗时</th><th>URL / 错误</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`
}

function findCardByFile(file) {
  let card = document.querySelector(`.api-card[data-file="${cssEscape(file)}"]`)
  if (card) return card
  return [...document.querySelectorAll('.api-card')].find((c) => {
    const title = c.querySelector('.api-title')?.textContent || ''
    return title.includes(file)
  }) || null
}

function escapeHtml(s) {
  if (s == null) return ''
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/* ═════════ 标签页切换 ═════════ */
;(function initTabs() {
  const tabs = document.querySelectorAll('.tabs .tab')
  const panels = document.querySelectorAll('.tab-content .tab-panel')
  if (!tabs.length || !panels.length) return

  let discoverInitialized = false

  function activate(name) {
    tabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === name))
    panels.forEach((p) => p.classList.toggle('active', p.dataset.tab === name))
    if (name === 'discover' && !discoverInitialized) {
      discoverInitialized = true
      if (typeof window.initDiscoverTab === 'function') {
        try {
          window.initDiscoverTab()
        } catch (err) {
          console.error('[discover] 初始化失败', err)
        }
      }
    }
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => activate(t.dataset.tab))
  })
})()

/* ⭐ v1.6.1：初始化时根据当前数据自动选择最合适的合并模式 */
;(function autoSelectModeOnInit() {
  const hasBackend = backendResults && backendResults.length > 0
  const hasScore = hostScores && Object.keys(hostScores.global || hostScores).length > 0

  const none = document.querySelector('input[name="backendMode"][value="none"]')
  const black = document.querySelector('input[name="backendMode"][value="blacklist"]')
  const score = document.querySelector('input[name="backendMode"][value="score"]')

  if (hasScore) {
    if (score) score.checked = true
  } else if (hasBackend) {
    if (black) black.checked = true
  } else {
    if (none) none.checked = true
  }
})()

/* ═════════ 初始化：更新策略状态提示 ═════════ */
updateBackendModeStatus()
