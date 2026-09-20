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

  if (matched.wy) { $('songIdWy').value = matched.wy.id || ''; selectedIds.wy = matched.wy }
  if (matched.tx) { $('songIdTx').value = matched.tx.songmid || ''; selectedIds.tx = matched.tx }
  if (matched.kw) { $('songIdKw').value = matched.kw.songmid || ''; selectedIds.kw = matched.kw }
  if (matched.kg) { $('songIdKg').value = matched.kg.hash || ''; selectedIds.kg = matched.kg }
  if (matched.mg) { $('songIdMg').value = matched.mg.copyrightId || matched.mg.id || ''; selectedIds.mg = matched.mg }

  $('idDetails').open = true

  const found = Object.keys(matched).length
  $('searchStatus').textContent = `找到 ${found}/5 个平台匹配 (网易:${counts.wy||0} QQ:${counts.tx||0} 酷我:${counts.kw||0} 酷狗:${counts.kg||0} 咪咕:${counts.mg||0})`
  $('searchStatus').style.color = found > 0 ? '#34c759' : '#ff3b30'
})

$('btnStart').addEventListener('click', async () => {
  if (!currentDir) return alert('请先选择音源目录')
  if (!availableFiles.length) return alert('目录下没有音源文件')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请填写歌曲名')

  const ids = {
    wy: selectedIds.wy || parseIdFromInput('songIdWy'),
    tx: selectedIds.tx || { songmid: $('songIdTx').value.trim() },
    kw: selectedIds.kw || { songmid: $('songIdKw').value.trim() },
    kg: selectedIds.kg || { hash: $('songIdKg').value.trim() },
    mg: selectedIds.mg || { copyrightId: $('songIdMg').value.trim() },
  }

  if ($('songIdWy').value.trim() && $('songIdWy').value.trim() !== (selectedIds.wy && selectedIds.wy.id || '')) {
    ids.wy = { id: $('songIdWy').value.trim() }
  }
  if ($('songIdTx').value.trim() && $('songIdTx').value.trim() !== (selectedIds.tx && selectedIds.tx.songmid || '')) {
    ids.tx = { songmid: $('songIdTx').value.trim() }
  }
  if ($('songIdKw').value.trim() && $('songIdKw').value.trim() !== (selectedIds.kw && selectedIds.kw.songmid || '')) {
    ids.kw = { songmid: $('songIdKw').value.trim() }
  }
  if ($('songIdKg').value.trim() && $('songIdKg').value.trim() !== (selectedIds.kg && selectedIds.kg.hash || '')) {
    ids.kg = { hash: $('songIdKg').value.trim() }
  }
  if ($('songIdMg').value.trim() && $('songIdMg').value.trim() !== (selectedIds.mg && (selectedIds.mg.copyrightId || selectedIds.mg.id) || '')) {
    ids.mg = { copyrightId: $('songIdMg').value.trim() }
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
    version: '1.6.0',
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
    $('mergeStatus').textContent = `已分析 ${ok}/${analyzedFiles.length} 个音源，可勾选平台后生成`
    $('mergeStatus').style.color = ok > 0 ? '#34c759' : '#ff3b30'
    updateMergeButtonState()
  } catch (err) {
    $('mergeStatus').textContent = '分析失败: ' + (err.message || err)
    $('mergeStatus').style.color = '#ff3b30'
  }
}

// ═══════════════════════════════════════════════════════
// 后端检测（v1.6 新增）
// ═══════════════════════════════════════════════════════

$('btnTestBackends').addEventListener('click', async () => {
  if (!availableFiles.length) return alert('请先选择音源目录')
  const songName = $('songName').value.trim()
  if (!songName) return alert('请先填写歌曲名（用于发起测试请求）')

  const song = {
    name: songName,
    singer: $('singer').value.trim(),
    albumName: $('albumName').value.trim(),
    interval: '04:30',
    ids: {
      wy: selectedIds.wy || { id: $('songIdWy').value.trim() },
      tx: selectedIds.tx || { songmid: $('songIdTx').value.trim() },
      kw: selectedIds.kw || { songmid: $('songIdKw').value.trim() },
      kg: selectedIds.kg || { hash: $('songIdKg').value.trim() },
      mg: selectedIds.mg || { copyrightId: $('songIdMg').value.trim() },
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

/**
 * 把后端面板注入到对应的 API 卡片内。
 * 若右侧还没有任何 API 卡片（未运行音质测试），则独立渲染。
 */
function injectBackendPanels(results) {
  // 清除旧面板（两种形式都要清）
  document.querySelectorAll('.backend-panel').forEach((el) => el.remove())
  document.querySelectorAll('.standalone-backend-card').forEach((el) => el.remove())

  let anyInjected = false

  for (const r of results) {
    // ⭐ 优先用 data-file 精确匹配；退化到标题文本匹配
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

  // ⭐ 若一个卡片都没匹配到（例如还没跑"开始测试"），独立渲染
  if (!anyInjected) {
    renderBackendPanelsStandalone(results)
  }

  bindBackendPanelEvents()
  updateBackendSummary()
}

/**
 * 无匹配卡片时，独立把后端清单渲染到 #results
 */
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

  if (!cardsHtml) {
    // 完全没有后端信息，也不清空（避免把已有结果清掉）
    return
  }
  container.innerHTML = cardsHtml

  // 绑定折叠事件
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

/**
 * 统一绑定后端面板事件（防重复绑定）
 */
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

// ═══════════════════════════════════════════════════════
// 风险提示模块
// ═══════════════════════════════════════════════════════

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
    rows.push(`
      <div class="risk-item">
        <div class="risk-item-title">🔑 硬编码密钥（${c.hardcodedSecrets.count} 处）</div>
        <ul>${samples.map((s) => `<li><code>${escapeHtml(s)}</code></li>`).join('')}</ul>
      </div>`)
  }

  if (c.readsUserCredentials && c.readsUserCredentials.fields && c.readsUserCredentials.fields.length) {
    rows.push(`
      <div class="risk-item">
        <div class="risk-item-title">👤 读取头部凭据</div>
        <ul>${c.readsUserCredentials.fields.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
      </div>`)
  }

  if (c.httpHosts && c.httpHosts.count) {
    const list = c.httpHosts.list || []
    const shown = list.slice(0, 10)
    rows.push(`
      <div class="risk-item">
        <div class="risk-item-title">🌐 非官方 HTTP 域名（${c.httpHosts.count} 个）</div>
        <ul>
          ${shown.map((h) => `<li><span class="status-fail">http://${escapeHtml(h)}</span></li>`).join('')}
          ${list.length > 10 ? `<li>...及其他 ${list.length - 10} 个</li>` : ''}
        </ul>
      </div>`)
  }

  if (c.untrustedHosts && c.untrustedHosts.count) {
    const list = c.untrustedHosts.list || []
    const shown = list.slice(0, 10)
    rows.push(`
      <div class="risk-item">
        <div class="risk-item-title">🌐 非官方 HTTPS 域名（${c.untrustedHosts.count} 个）</div>
        <ul>
          ${shown.map((h) => `<li>https://${escapeHtml(h)}</li>`).join('')}
          ${list.length > 10 ? `<li>...及其他 ${list.length - 10} 个</li>` : ''}
        </ul>
      </div>`)
  }

  if (c.containsExploit && c.containsExploit.keywords && c.containsExploit.keywords.length) {
    rows.push(`
      <div class="risk-item">
        <div class="risk-item-title">⚠️ 越权/破解逻辑</div>
        <ul>${c.containsExploit.keywords.map((k) => `<li>${escapeHtml(k)}</li>`).join('')}</ul>
      </div>`)
  }

  if (!rows.length) return ''

  const levelMap = {
    high:   { icon: '🔴', text: '高', cls: 'risk-high' },
    medium: { icon: '🟡', text: '中', cls: 'risk-medium' },
    low:    { icon: '🟢', text: '低', cls: 'risk-low' },
  }
  const lv = levelMap[risk.level] || levelMap.low
  const badgeCls = risk.level === 'high' ? 'badge-risk-high'
    : risk.level === 'medium' ? 'badge-risk-medium'
    : 'badge-risk-low'

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
  // ⭐ 只统计真正的 API 卡片，跳过 standalone 后端卡片
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

  // ⭐ 跳过 standalone-backend-card（它们没有明文/风险标签）
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
  const anyChecked = document.querySelectorAll(
    '.api-card:not(.filtered-out) .merge-checkbox:checked'
  ).length > 0
  $('btnGenerateMerge').disabled = !analyzedFiles || !anyChecked
}

$('btnGenerateMerge').addEventListener('click', async () => {
  if (!analyzedFiles) return alert('请先完成测试')

  const checkboxes = document.querySelectorAll(
    '.api-card:not(.filtered-out) .merge-checkbox'
  )
  const fileIndexMap = new Map()
  analyzedFiles.forEach((f, idx) => fileIndexMap.set(f.name, idx))

  const selection = {}
  for (const cb of checkboxes) {
    if (!cb.checked) continue
    const file = cb.dataset.file
    const source = cb.dataset.source
    const idx = fileIndexMap.get(file)
    if (idx === undefined) continue
    if (!selection[idx]) selection[idx] = []
    if (!selection[idx].includes(source)) selection[idx].push(source)
  }

  if (Object.keys(selection).length === 0) return alert('至少勾选一个平台')

  const blockedHosts = collectBlockedHosts()
  if (blockedHosts.length > 0) {
    const ok = confirm(`检测到 ${blockedHosts.length} 个后端将被屏蔽：\n${blockedHosts.slice(0, 10).join('\n')}${blockedHosts.length > 10 ? '\n...' : ''}\n\n继续生成？`)
    if (!ok) return
  }

  $('btnGenerateMerge').disabled = true
  $('mergeStatus').textContent = '正在生成（裁剪 + 排序 + 合并 + 后端屏蔽）...'
  $('mergeStatus').style.color = '#007aff'

  try {
    const r = await window.api.mergeSources({
      files: analyzedFiles,
      selection,
      report: lastReport,
      blockedHosts,
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

function parseIdFromInput(inputId) {
  const v = $(inputId).value.trim()
  return v ? { id: v, songmid: v, hash: v, copyrightId: v } : null
}

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

  // ⭐ 若之前已检测过后端，重新把面板注入新渲染的卡片
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
    const title = info.plainReason
      ? '未采用明文：' + escapeHtml(info.plainReason)
      : '未采用明文'
    return `<span class="badge badge-encrypted" title="${title}">🔒 非明文</span>`
  }

  return ''
}

function renderApiCard(api) {
  const avail = api.platforms.some((p) => p.available)
  const info = api.info || {}
  const meta = [info.name, info.version, info.author]
    .filter(Boolean)
    .join(' · ')

  const plainBadge = renderPlainBadge(info)
  const riskBadge = renderRiskBadge(info)
  const riskPanel = renderRiskPanel(info)

  const isPlain = info.plain !== false
  const riskLevel = (info.risk && info.risk.level) || 'clean'
  const hasExploit = !!(info.risk && info.risk.hasExploit)

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
         data-has-exploit="${hasExploit ? 'true' : 'false'}">
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
  const rows = p.qualities
    .map((q) => {
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
    })
    .join('')

  const downgradeText = p.downgradedCount
    ? `降级: <span class="status-warn">${p.downgradedCount}</span> `
    : ''
  const unplayableText = p.unplayableCount
    ? `不可播: <span class="status-fail">${p.unplayableCount}</span> `
    : ''

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

// ═══════════════════════════════════════════════════════
// ⭐ 新增：标签页切换（音源质量测试 / 音源检索）
//   仅切换 display，不重排、不销毁原有质量测试 DOM；
//   首次进入检索页时调用 window.initDiscoverTab() 做懒初始化。
// ═══════════════════════════════════════════════════════
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
