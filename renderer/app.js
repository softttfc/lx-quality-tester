const $ = (id) => document.getElementById(id)

let currentDir = null
let availableFiles = []
let lastReport = null
let analyzedFiles = null
let unsubscribe = null
let selectedIds = { wy: null, tx: null, kw: null, kg: null, mg: null }
let backendResults = null
let backendUnsubscribe = null

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

  // ⭐ v1.7：不再写入 DOM 输入框，只保存到 selectedIds
  if (matched.wy) selectedIds.wy = matched.wy
  if (matched.tx) selectedIds.tx = matched.tx
  if (matched.kw) selectedIds.kw = matched.kw
  if (matched.kg) selectedIds.kg = matched.kg
  if (matched.mg) selectedIds.mg = matched.mg

  const found = Object.keys(matched).length
  $('searchStatus').textContent = `找到 ${found}/5 个平台匹配 (网易:${counts.wy||0} QQ:${counts.tx||0} 酷我:${counts.kw||0} 酷狗:${counts.kg||0} 咪咕:${counts.mg||0})`
  $('searchStatus').style.color = found > 0 ? '#34c759' : '#ff3b30'
})

$('btnStart').addEventListener('click', async () => {
  if (!currentDir) return alert('请先选择音源目录')
  if (!availableFiles.length) return alert('目录下没有音源文件')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请填写歌曲名')

  // ⭐ v1.7：必须先自动搜索得到 ID（不再支持手动输入）
  const anyId = selectedIds.wy || selectedIds.tx || selectedIds.kw || selectedIds.kg || selectedIds.mg
  if (!anyId) {
    return alert('请先点击「🔍 自动搜索各平台 ID」获取歌曲 ID')
  }

  // ⭐ v1.7：ids 直接来自自动搜索结果
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
      (selectedIds.mg && selectedIds.mg.albumName) ||
      '',
    interval: (selectedIds.wy && selectedIds.wy.interval) ||
      (selectedIds.tx && selectedIds.tx.interval) ||
      (selectedIds.kw && selectedIds.kw.interval) ||
      (selectedIds.kg && selectedIds.kg.interval) ||
      (selectedIds.mg && selectedIds.mg.interval) ||
      '04:30',
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

$('btnSave').addEventListener('click', async () => {
  if (!lastReport) return
  const data = {
    ...lastReport,
    tool: 'lx-quality-tester',
    version: '1.7.0',
    exportedAt: new Date().toISOString(),
  }
  const r = await window.api.saveReport(JSON.stringify(data, null, 2))
  if (r && r.ok) {
    alert('报告已保存到：\n' + r.path)
  }
})

$('filterPlainOnly').addEventListener('change', applyAllFilters)
$('filterLowRiskOnly').addEventListener('change', applyAllFilters)
$('filterNoExploit').addEventListener('change', applyAllFilters)

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

    // ⭐ v1.7：在卡片上追加「初始化发请求」标记
    refreshInitRequestFlags()

    updateMergeButtonState()
  } catch (err) {
    $('mergeStatus').textContent = '分析失败: ' + (err.message || err)
    $('mergeStatus').style.color = '#ff3b30'
  }
}

// ⭐ v1.7 新增：给卡片追加初始化请求标记
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

// ═══════════════════════════════════════════════════════
// 后端检测
// ═══════════════════════════════════════════════════════

$('btnTestBackends').addEventListener('click', async () => {
  if (!availableFiles.length) return alert('请先选择音源目录')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请先填写歌曲名（用于发起测试请求）')

  // ⭐ v1.7：必须先自动搜索得到 ID
  const anyId = selectedIds.wy || selectedIds.tx || selectedIds.kw || selectedIds.kg || selectedIds.mg
  if (!anyId) {
    return alert('请先点击「🔍 自动搜索各平台 ID」获取歌曲 ID')
  }

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

  $('btnTestBackends').disabled = true
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
  } catch (err) {
    $('backendStatus').textContent = '检测失败: ' + (err.message || err)
    $('backendStatus').style.color = '#ff3b30'
  } finally {
    $('btnTestBackends').disabled = false
    $('btnTestBackends').textContent = '🎯 检测所有平台后端'
    if (backendUnsubscribe) backendUnsubscribe()
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

  if (!anyInjected) {
    renderBackendPanelsStandalone(results)
  }

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
      <div class="backend-host-list">
