const $ = (id) => document.getElementById(id)

let currentDir = null
let availableFiles = []
let lastReport = null
let unsubscribe = null
let selectedIds = { wy: null, tx: null, kw: null, kg: null, mg: null }

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
  }

  setRunning(true)
  $('results').innerHTML = ''
  $('summary').style.display = 'none'
  $('progress').style.display = 'block'

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
    version: '1.2.0',
    exportedAt: new Date().toISOString(),
  }
  const r = await window.api.saveReport(JSON.stringify(data, null, 2))
  if (r && r.ok) {
    alert('报告已保存到：\n' + r.path)
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
}

function renderApiCard(api) {
  const avail = api.platforms.some((p) => p.available)
  const meta = [api.info && api.info.name, api.info && api.info.version, api.info && api.info.author]
    .filter(Boolean)
    .join(' · ')

  let body
  if (api.error) {
    body = `<div class="api-error">${escapeHtml(api.error)}</div>`
  } else if (!api.platforms.length) {
    body = '<div class="api-error">没有平台被测试</div>'
  } else {
    body = api.platforms.map(renderPlatform).join('')
  }

  return `
    <div class="api-card">
      <div class="api-header">
        <div class="api-title">
          <span class="icon">▼</span>
          <span>${avail ? '✅' : '❌'} ${escapeHtml(api.file)}</span>
          <span class="api-meta">${escapeHtml(meta)}</span>
        </div>
      </div>
      <div class="api-body">${body}</div>
    </div>`
}

function renderPlatform(p) {
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

      return `
    <tr class="${q.downgrade ? 'row-downgrade' : ''}">
      <td>${escapeHtml(q.quality)}</td>
      <td>${q.declared ? '✅' : '—'}</td>
      <td class="${q.urlObtained ? 'status-ok' : 'status-fail'}">${q.urlObtained ? '✅' : '❌'}</td>
      <td class="${q.urlAccessible ? 'status-ok' : 'status-fail'}">${q.urlAccessible ? '✅' : '❌'}</td>
      <td>${actualCell}</td>
      <td>${q.duration}ms</td>
      <td class="url-cell" title="${escapeHtml(q.url || q.error || '')}">${escapeHtml(q.url || q.error || '—')}</td>
    </tr>`
    })
    .join('')

  const downgradeText = p.downgradedCount
    ? `降级: <span class="status-warn">${p.downgradedCount}</span> `
    : ''

  return `
    <div class="platform">
      <div class="platform-header">
        <div class="platform-name">
          ${p.available ? '✅' : '❌'} ${escapeHtml(p.name)} (${escapeHtml(p.source)})
          ${p.bestQuality ? `<span class="best-tag">实际最高音质: ${escapeHtml(p.bestQuality)}</span>` : ''}
        </div>
        <div class="platform-stats">
          通过: <span class="status-ok">${p.passedCount}</span> ${downgradeText}/ 错误: <span class="status-fail">${p.failedCount}</span>
        </div>
      </div>
      <table class="quality-table">
        <thead>
          <tr><th>请求音质</th><th>声明</th><th>获取URL</th><th>可访问</th><th>实际音质</th><th>耗时</th><th>URL / 错误</th></tr>
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
