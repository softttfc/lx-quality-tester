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

/* ═════════ 自动搜索 ID（不再写入任何输入框） ═════════ */
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
    version: '1.7.0',
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
  } catch (err) {
    $('mergeStatus').textContent = '分析失败: ' + (err.message || err)
    $('mergeStatus').style.color = '#ff3b30'
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

/* ═════════ v2.0：测试互斥锁 ═════════ */
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

/* ═════════ 后端检测（保留原功能，仅加互斥锁） ═════════ */
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

  const blockedSet = new Set(blocked.map((cb) => cb.dataset.host))
  let el = document.getElementById('blockedHostsSummary')
  if (!el) {
    el = document.createElement('div')
    el.id = 'blockedHostsSummary'
    el.className = 'blocked-hosts-summary'
    $('backendSummary').appendChild(el)
  }
  if (blockedSet.size > 0) {
    el.style.display = 'block'
    el.innerHTML = `⚠️ 已屏蔽 ${blockedSet.size} 个域名：
      <div class="blocked-hosts-list">${[...blockedSet].map((h) => `<code>${escapeHtml(h)}</code>`).join('')}</div>`
  } else {
    el.style.display = 'none'
    el.innerHTML = ''
  }
}

function cssEscape(s) {
  return String(s).replace(/["\\]/g, '\\$&')
}

function collectBlockedHosts() {
  const blocked = new Set()
  document.querySelectorAll('.backend-host-cb').forEach((cb) => {
    if (!cb.checked) blocked.add(cb.dataset.host)
  })
  return [...blocked]
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
    // 支持 "歌名 - 歌手" / "歌名|歌手" / "歌名—歌手" / "歌名 – 歌手"
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

  $('btnRunShadowTest').textContent = '影子测试中...'
  $('shadowStatus').textContent = '正在搜索歌曲 ID...'
  $('shadowStatus').style.color = '#007aff'
  $('shadowSummary').style.display = 'none'

  shadowUnsubscribe = window.api.onShadowProgress((p) => {
    if (p.type === 'shadow-run') {
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
    // 1. 对每首歌搜索各平台 ID
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

    // 2. 运行影子测试
    $('shadowStatus').textContent = `开始影子测试，共 ${songs.length} 首歌曲 × ${availableFiles.length} 个音源`
    $('shadowStatus').style.color = '#007aff'

    const r = await window.api.runShadowTest({
      files: availableFiles,
      songs,
      options: { platforms: ['kw', 'kg', 'tx', 'wy', 'mg'], timeout: 15000 },
    })

    if (!r.ok) {
      $('shadowStatus').textContent = '影子测试失败: ' + (r.error || '未知错误')
      $('shadowStatus').style.color = '#ff3b30'
      return
    }

    hostScores = r.hostScores
    renderShadowScorePanel(r.hostScores)
    const hostCount = Object.keys(r.hostScores).filter(k => k !== '_meta').length
    $('shadowStatus').textContent = `完成：收集到 ${hostCount} 个 host 的评分数据`
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

function computeScore(s) {
  if (!s || typeof s !== 'object') return 0
  const rate = typeof s.rate === 'number' ? s.rate : 0
  const speedScore = Math.max(0, 1 - (s.avgMs || 0) / 5000)
  const orderScore = Math.max(0, 1 - (s.avgOrder || 0) / 10)
  return rate * 0.6 + speedScore * 0.3 + orderScore * 0.1
}

function renderShadowScorePanel(hostScores) {
  if (!hostScores) return
  const entries = Object.entries(hostScores).filter(([k]) => k !== '_meta')
  if (entries.length === 0) {
    $('shadowSummary').style.display = 'block'
    $('shadowSummary').innerHTML = '<div style="color:#999;text-align:center;padding:8px">未收集到任何 host 数据</div>'
    return
  }

  // 按综合评分降序
  entries.sort((a, b) => computeScore(b[1]) - computeScore(a[1]))

  const shown = entries.slice(0, 50)
  const rows = shown.map(([host, s]) => {
    const score = computeScore(s)
    const icon = score >= 0.8 ? '🟢' : score >= 0.5 ? '🟡' : '🔴'
    const rate = ((s.rate || 0) * 100).toFixed(0)
    return `
      <div class="shadow-score-row" title="${escapeHtml(host)}">
        <span class="shadow-score-icon">${icon}</span>
        <span class="shadow-score-host">${escapeHtml(host)}</span>
        <span class="shadow-score-num">${s.calls || 0}</span>
        <span class="shadow-score-num">${rate}%</span>
        <span class="shadow-score-num">${s.avgMs || 0}ms</span>
        <span class="shadow-score-num">#${s.avgOrder || 0}</span>
        <span class="shadow-score-score">${(score * 100).toFixed(0)}</span>
      </div>`
  }).join('')

  const meta = hostScores._meta || {}
  const metaText = meta.testSongCount
    ? `（${meta.testSongCount} 首歌曲 × ${meta.testFileCount} 个音源）`
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
      <span class="shadow-score-num">耗时</span>
      <span class="shadow-score-num">顺序</span>
      <span class="shadow-score-score">评分</span>
    </div>
    <div class="shadow-score-list">${rows}</div>
  `
}

/* ═════════ v2.0：合并策略 ═════════ */
function getBackendMode() {
  const el = document.querySelector('input[name="backendMode"]:checked')
  return el ? el.value : 'blacklist'
}

function updateBackendModeStatus() {
  const mode = getBackendMode()
  const el = $('backendModeStatus')
  if (!el) return

  if (mode === 'blacklist') {
    if (backendResults && backendResults.length > 0) {
      let total = 0
      for (const r of backendResults) {
        for (const hosts of Object.values(r.platforms || {})) total += hosts.length
      }
      el.textContent = `✓ 后端检测数据已就绪（${total} 个后端）`
      el.style.color = '#34c759'
    } else {
      el.textContent = '⚠ 尚未运行后端检测，生成时将不屏蔽任何后端'
      el.style.color = '#ff9500'
    }
  } else {
    if (hostScores && Object.keys(hostScores).length > 1) {
      const n = Object.keys(hostScores).filter((k) => k !== '_meta').length
      el.textContent = `✓ 影子测试数据已就绪（${n} 个 host 评分）`
      el.style.color = '#34c759'
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
}

function updateMergeButtonState() {
  const anyChecked = document.querySelectorAll('.api-card:not(.filtered-out) .merge-checkbox:checked').length > 0
  $('btnGenerateMerge').disabled = !analyzedFiles || !anyChecked
}

/* ═════════ 生成合并音源（⭐ v2.0：按策略收集参数） ═════════ */
$('btnGenerateMerge').addEventListener('click', async () => {
  if (!analyzedFiles) return alert('请先完成测试')

  const mode = getBackendMode()

  // 评分模式：必须已有影子数据
  if (mode === 'score') {
    if (!hostScores || Object.keys(hostScores).filter(k => k !== '_meta').length === 0) {
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

  // 根据模式收集参数
  let blockedHosts = []
  if (mode === 'blacklist') {
    blockedHosts = collectBlockedHosts()
    if (blockedHosts.length > 0) {
      const ok = confirm(
        `检测到 ${blockedHosts.length} 个后端将被屏蔽：\n` +
        blockedHosts.slice(0, 10).join('\n') +
        (blockedHosts.length > 10 ? '\n...' : '') +
        `\n\n继续生成？`
      )
      if (!ok) return
    }
  }

  $('btnGenerateMerge').disabled = true
  $('mergeStatus').textContent = mode === 'score'
    ? '正在生成（裁剪 + 排序 + 合并 + 评分注入）...'
    : '正在生成（裁剪 + 排序 + 合并 + 黑名单）...'
  $('mergeStatus').style.color = '#007aff'

  try {
    const r = await window.api.mergeSources({
      files: analyzedFiles,
      selection,
      report: lastReport,
      backendMode: mode,
      blockedHosts,
      hostScores,
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

function handleProgress(p) {
  if (p.type === 'file-progress') {
    const pct = Math.round(((p.current - 1) / p.total) * 100)
    $('progressText').textContent = `[${p.current}/${p.total}] ${p.file}`
    $('progressBar').style.width = pct + '%'
    $('progressPercent').textContent = pct + '%'
  } else if (p.type === 'platform-start') {
    $('progressText').textContent = `${p.file} · ${p.name}`
  } else if (p.type === 'quality-start') {
    $('progressText').textContent = `${p.file} · ${p.platform} · ${p.quality}`
  } else if (p.type === 'api-error') {
    $('progressText').textContent = `${p.file}: ${p.error}`
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
    cb.addEventListener('change', updateMergeButtonState)
  })

  updateRiskSummary()
  applyAllFilters()

  if (backendResults && backendResults.length) {
    injectBackendPanels(backendResults)
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

/* ═════════ 初始化：更新策略状态提示 ═════════ */
updateBackendModeStatus()
