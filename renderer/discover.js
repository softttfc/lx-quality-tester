;(function () {
  const $ = (id) => document.getElementById(id)

  let initialized = false
  let repos = []
  let currentView = []
  let rawResult = null
  let scanning = false
  const checked = new Set()
  let unsubscribe = null

  function escapeHtml(s) {
    if (s == null) return ''
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  function humanSize(num) {
    const n = Number(num) || 0
    if (n < 1024) return n + ' B'
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB'
    if (n < 1024 * 1024 * 1024) return (n / 1048576).toFixed(1) + ' MB'
    return (n / 1073741824).toFixed(1) + ' GB'
  }

  function log(level, msg) {
    const box = $('discLog')
    if (!box) return
    const line = document.createElement('div')
    line.className = 'disc-log-line disc-log-' + (level || 'info')
    line.textContent = msg
    box.appendChild(line)
    box.scrollTop = box.scrollHeight
  }

  function clearLog() {
    const box = $('discLog')
    if (box) box.innerHTML = ''
  }

  function setStatus(text) {
    const el = $('discStatus')
    if (el) el.textContent = text
  }

  // ---------------- 面板 DOM ----------------
  const PANEL_HTML = `
<div class="discover-tab">
  <aside class="disc-sidebar">
    <div class="disc-panel">
      <label>候选仓库（持久化到 userData）</label>
      <div class="disc-repo-table-wrap">
        <table class="disc-repo-table">
          <thead>
            <tr><th>仓库</th><th>分支</th><th>标签</th><th>备注</th></tr>
          </thead>
          <tbody id="discRepoTbody"></tbody>
        </table>
      </div>
      <div class="disc-row" style="margin-top:6px">
        <input id="discNewRepo" placeholder="owner/repo 或 GitHub URL，可带 #branch">
      </div>
      <div class="disc-btn-row">
        <button id="discBtnAddRepo" class="secondary">添加</button>
        <button id="discBtnDelRepo">删除选中</button>
        <button id="discBtnMoveUp">上移</button>
        <button id="discBtnMoveDown">下移</button>
        <button id="discBtnResetRepos">恢复默认</button>
      </div>
    </div>

    <div class="disc-panel">
      <label>扫描参数</label>
      <div class="disc-row">
        <span class="disc-hint" style="flex:0 0 80px">每仓库上限</span>
        <input id="discLimit" type="number" min="1" max="200" value="40">
      </div>
      <div class="disc-row">
        <span class="disc-hint" style="flex:0 0 80px">超时(秒)</span>
        <input id="discTimeout" type="number" min="3" max="180" step="1" value="8">
      </div>
      <div class="disc-row">
        <span class="disc-hint" style="flex:0 0 80px">仓库并发</span>
        <input id="discRepoWorkers" type="number" min="1" max="32" value="6">
        <span class="disc-hint" style="flex:0 0 60px; margin-left:6px">文件并发</span>
        <input id="discFileWorkers" type="number" min="1" max="32" value="8">
      </div>
      <div class="disc-row">
        <span class="disc-hint" style="flex:0 0 80px">GitHub Token</span>
        <input id="discToken" type="password" placeholder="可选，仅内存">
      </div>
      <label>显示模式</label>
      <div class="disc-mode-row">
        <label><input type="radio" name="discMode" value="dedupe" checked> 去重显示</label>
        <label><input type="radio" name="discMode" value="all"> 显示全部</label>
      </div>
    </div>

    <div class="disc-panel">
      <label>下载</label>
      <div class="disc-row">
        <input id="discDownloadDir" placeholder="下载目录">
        <button id="discBtnPickDir" class="secondary" style="width:auto">浏览…</button>
      </div>
      <label class="checkbox" style="font-size:12px">
        <input type="checkbox" id="discForceFailed"> 强制下载抓取失败项（默认跳过）
      </label>
      <div class="disc-btn-row">
        <button id="discBtnDownload" class="primary" disabled>下载选中</button>
        <button id="discBtnExportJson">导出 JSON</button>
      </div>
    </div>

    <div class="disc-panel">
      <label>操作</label>
      <div class="disc-btn-row">
        <button id="discBtnScan" class="primary">扫描仓库</button>
        <button id="discBtnCancel" disabled>停止</button>
        <button id="discBtnClearLog">清空日志</button>
      </div>
      <div class="disc-status-bar" id="discStatus">尚未扫描。</div>
    </div>
  </aside>

  <main class="disc-main">
    <div class="disc-panel" style="padding:6px 10px">
      <div class="disc-btn-row" style="align-items:center">
        <span class="disc-hint">结果（首列勾选下载）</span>
        <button id="discBtnSelectAll" style="flex:0 0 auto; width:auto">全选</button>
        <button id="discBtnSelectNone" style="flex:0 0 auto; width:auto">全不选</button>
      </div>
    </div>
    <div class="disc-result-wrap">
      <table class="disc-result-table">
        <thead>
          <tr>
            <th>选中</th><th>来源仓库</th><th>文件名</th><th>音源名称(@name)</th>
            <th>版本(@version)</th><th>状态</th><th>收录仓数</th><th>作者(@author)</th>
            <th>大小</th><th>已下载</th><th>备注</th>
          </tr>
        </thead>
        <tbody id="discResultTbody"></tbody>
      </table>
    </div>
    <div class="disc-log" id="discLog"></div>
  </main>
</div>
`

  // ---------------- 仓库列表 ----------------
  function renderRepoList() {
    const tbody = $('discRepoTbody')
    if (!tbody) return
    tbody.innerHTML = repos.map((r, idx) => `
      <tr data-idx="${idx}">
        <td>${escapeHtml(r.full_name)}</td>
        <td>${escapeHtml(r.branch || 'main')}</td>
        <td>${escapeHtml(r.tag || '')}</td>
        <td>${escapeHtml(r.note || '')}</td>
      </tr>
    `).join('')
    tbody.querySelectorAll('tr').forEach((tr) => {
      tr.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach((x) => x.classList.remove('selected'))
        tr.classList.add('selected')
      })
    })
  }

  // ---------------- 参数持久化 ----------------
  function collectConfig() {
    return {
      repos,
      downloadDir: $('discDownloadDir') ? $('discDownloadDir').value.trim() : '',
      repoWorkers: parseInt($('discRepoWorkers').value, 10) || 6,
      fileWorkers: parseInt($('discFileWorkers').value, 10) || 8,
      limit: parseInt($('discLimit').value, 10) || 40,
      timeout: parseFloat($('discTimeout').value) || 8,
    }
  }

  async function persistConfig() {
    try {
      await window.api.discoverSaveRepos(collectConfig())
    } catch (_) {}
  }

  // ---------------- 结果表格 ----------------
  function renderResults(records) {
    currentView = records || []
    const tbody = $('discResultTbody')
    if (!tbody) return
    tbody.innerHTML = currentView.map((r, i) => {
      const checkedAttr = checked.has(i) ? 'checked' : ''
      const downloaded = r.downloaded ? '✅' : ''
      const statusCls = r.status === '已扫描' ? 'disc-status-ok' : 'disc-status-fail'
      return `<tr data-idx="${i}">
        <td><input type="checkbox" class="disc-cb" data-idx="${i}" ${checkedAttr}></td>
        <td>${escapeHtml(r.repo || '')}</td>
        <td>${escapeHtml((r.path || '').split('/').pop() || '')}</td>
        <td>${escapeHtml(r.name || '')}</td>
        <td>${escapeHtml(r.version || '-')}</td>
        <td class="${statusCls}">${escapeHtml(r.status || '')}</td>
        <td>${r.repo_count || 1}</td>
        <td>${escapeHtml(r.author || '-')}</td>
        <td>${humanSize(r.size)}</td>
        <td>${downloaded}</td>
        <td>${escapeHtml(r.note || r.error || '-')}</td>
      </tr>`
    }).join('')

    tbody.querySelectorAll('.disc-cb').forEach((cb) => {
      cb.addEventListener('change', () => {
        const idx = parseInt(cb.dataset.idx, 10)
        if (cb.checked) checked.add(idx)
        else checked.delete(idx)
        updateDownloadButton()
      })
    })
  }

  function updateDownloadButton() {
    const btn = $('discBtnDownload')
    if (!btn) return
    btn.disabled = checked.size === 0 || scanning
  }

  // ---------------- 扫描 ----------------
  async function doScan() {
    if (scanning) return
    if (!repos.length) { alert('候选仓库列表为空'); return }

    const mode = document.querySelector('input[name="discMode"]:checked')
    const noDedupe = mode && mode.value === 'all'

    const params = {
      repos,
      token: $('discToken').value.trim(),
      repoWorkers: parseInt($('discRepoWorkers').value, 10) || 6,
      fileWorkers: parseInt($('discFileWorkers').value, 10) || 8,
      limit: parseInt($('discLimit').value, 10) || 40,
      timeout: parseFloat($('discTimeout').value) || 8,
      noDedupe,
    }

    scanning = true
    $('discBtnScan').disabled = true
    $('discBtnCancel').disabled = false
    checked.clear()
    setStatus('扫描中...')
    clearLog()

    if (unsubscribe) unsubscribe()
    unsubscribe = window.api.onDiscoverProgress((p) => {
      if (p.type === 'scan-start') log('info', `开始扫描 ${p.repos} 个仓库`)
      else if (p.type === 'repo-start') log('info', `>>> 扫描仓库 ${p.repo} (${p.branch})`)
      else if (p.type === 'repo-tree') log('info', `[${p.repo}] 文件树 ${p.totalFiles} 项，候选 ${p.candidates} 个`)
      else if (p.type === 'file-progress') {
        if (p.status === 'fail') log('error', `  x ${p.repo}/${p.path}`)
      } else if (p.type === 'notice') log('warn', `  · ${p.message}`)
      else if (p.type === 'repo-error') log('error', `  x ${p.repo}: ${p.error}`)
      else if (p.type === 'repo-done') log('info', `[${p.repo}] 完成，共 ${p.count} 条`)
      else if (p.type === 'scan-done') log('info', `扫描完成：原始 ${p.found} 条，显示 ${p.shown} 条，API ${p.apiCalls} 次`)
    })

    try {
      const r = await window.api.discoverScan(params)
      rawResult = r
      renderResults(r.records)
      setStatus(`扫描完成：原始 ${r.found} 条，显示 ${r.shown} 条`)
      for (const m of (r.messages || [])) log('info', m)
    } catch (err) {
      log('error', '扫描失败：' + (err.message || err))
      setStatus('扫描失败：网络不可达，请检查代理或稍后重试')
    } finally {
      scanning = false
      $('discBtnScan').disabled = false
      $('discBtnCancel').disabled = true
      updateDownloadButton()
      if (unsubscribe) { unsubscribe(); unsubscribe = null }
    }
  }

  async function doCancel() {
    try {
      await window.api.discoverCancel()
      log('warn', '已请求取消扫描')
    } catch (_) {}
  }

  // ---------------- 下载 ----------------
  async function doDownload() {
    if (!checked.size) return
    const targetDir = $('discDownloadDir').value.trim()
    if (!targetDir) { alert('请先设置下载目录'); return }

    const forceFailed = $('discForceFailed').checked
    const selected = [...checked].map((i) => currentView[i]).filter(Boolean)

    if (!confirm(`即将下载 ${selected.length} 个音源到：\n${targetDir}\n\n继续？`)) return

    $('discBtnDownload').disabled = true
    setStatus('下载中...')

    try {
      const r = await window.api.discoverDownload({
        records: selected,
        targetDir,
        timeout: parseFloat($('discTimeout').value) || 8,
        forceFailed,
      })
      if (!r.ok) {
        log('error', '下载失败：' + (r.error || '未知'))
        setStatus('下载失败')
        return
      }
      const s = r.stats
      log('info', `下载完成：新增 ${s.ok} / 跳过 ${s.skipped} / 重复 ${s.duplicate} / 冲突 ${s.conflict} / 抓取失败跳过 ${s.deadSkipped} / 失败 ${s.failed}`)
      setStatus(`下载完成：新增 ${s.ok}，冲突 ${s.conflict}，失败 ${s.failed}`)

      // 标记已下载
      const okNames = new Set(s.details.filter((d) => d.status === 'ok').map((d) => d.name))
      const okFiles = new Map(s.details.filter((d) => d.status === 'ok').map((d) => [d.name, d.file]))
      for (const rec of selected) {
        if (rec.downloaded) continue
        if (okNames.has(rec.name)) {
          rec.downloaded = true
          rec.downloaded_file = okFiles.get(rec.name) || ''
        }
      }
      renderResults(currentView)
    } catch (err) {
      log('error', '下载异常：' + (err.message || err))
    } finally {
      updateDownloadButton()
    }
  }

  // ---------------- JSON 导出 ----------------
  async function doExportJson() {
    if (!rawResult) { alert('请先执行扫描'); return }
    const payload = {
      tool: 'lx-discover',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      repos: rawResult.repos,
      found: rawResult.found,
      shown: rawResult.shown,
      apiCalls: rawResult.apiCalls,
      records: currentView.map((r) => ({ ...r })),
    }
    try {
      const r = await window.api.discoverExportJson(JSON.stringify(payload, null, 2))
      if (r && r.ok) log('info', '已导出：' + r.path)
      else if (r && r.error) log('error', '导出失败：' + r.error)
      else log('warn', '已取消导出')
    } catch (err) {
      log('error', '导出失败：' + (err.message || err))
    }
  }

  // ---------------- 仓库操作 ----------------
  async function addRepo() {
    const input = $('discNewRepo').value.trim()
    if (!input) return
    let parsed = null
    try {
      parsed = await window.api.discoverParseRepo(input)
    } catch (_) {}
    if (!parsed) { alert('无法解析仓库地址，请输入 owner/repo 或完整 GitHub URL'); return }
    if (repos.some((r) => r.full_name.toLowerCase() === parsed.full_name.toLowerCase())) {
      alert('该仓库已在列表中')
      return
    }
    parsed.note = parsed.note || '手动添加'
    repos.push(parsed)
    $('discNewRepo').value = ''
    renderRepoList()
    await persistConfig()
  }

  async function delRepo() {
    const sel = $('discRepoTbody').querySelector('tr.selected')
    if (!sel) { alert('请先在列表中选择要删除的仓库'); return }
    const idx = parseInt(sel.dataset.idx, 10)
    repos.splice(idx, 1)
    renderRepoList()
    await persistConfig()
  }

  async function resetRepos() {
    if (!confirm('恢复为内置仓库列表？当前自定义列表会被覆盖。')) return
    try {
      const cfg = await window.api.discoverResetRepos()
      repos = cfg.repos || []
      renderRepoList()
      await persistConfig()
    } catch (_) {}
  }

  function moveRepo(dir) {
    const sel = $('discRepoTbody').querySelector('tr.selected')
    if (!sel) return
    const idx = parseInt(sel.dataset.idx, 10)
    const target = idx + dir
    if (target < 0 || target >= repos.length) return
    const tmp = repos[idx]
    repos[idx] = repos[target]
    repos[target] = tmp
    renderRepoList()
    const newSel = $('discRepoTbody').querySelector(`tr[data-idx="${target}"]`)
    if (newSel) newSel.classList.add('selected')
    persistConfig()
  }

  // ---------------- 初始化 ----------------
  async function init() {
    if (initialized) return
    const container = $('discoverContainer')
    if (!container) return
    initialized = true

    container.innerHTML = PANEL_HTML

    try {
      const cfg = await window.api.discoverLoadRepos()
      repos = cfg.repos || []
      $('discDownloadDir').value = cfg.downloadDir || ''
      $('discRepoWorkers').value = cfg.repoWorkers || 6
      $('discFileWorkers').value = cfg.fileWorkers || 8
      $('discLimit').value = cfg.limit || 40
      $('discTimeout').value = cfg.timeout || 8
      renderRepoList()
    } catch (err) {
      console.error('[discover] 初始化失败', err)
    }

    $('discBtnScan').addEventListener('click', doScan)
    $('discBtnCancel').addEventListener('click', doCancel)
    $('discBtnDownload').addEventListener('click', doDownload)
    $('discBtnExportJson').addEventListener('click', doExportJson)
    $('discBtnAddRepo').addEventListener('click', addRepo)
    $('discBtnDelRepo').addEventListener('click', delRepo)
    $('discBtnMoveUp').addEventListener('click', () => moveRepo(-1))
    $('discBtnMoveDown').addEventListener('click', () => moveRepo(1))
    $('discBtnResetRepos').addEventListener('click', resetRepos)
    $('discBtnClearLog').addEventListener('click', clearLog)

    $('discBtnSelectAll').addEventListener('click', () => {
      currentView.forEach((_, i) => checked.add(i))
      renderResults(currentView)
      updateDownloadButton()
    })
    $('discBtnSelectNone').addEventListener('click', () => {
      checked.clear()
      renderResults(currentView)
      updateDownloadButton()
    })

    $('discBtnPickDir').addEventListener('click', async () => {
      try {
        const dir = await window.api.selectSourcesDir()
        if (dir) {
          $('discDownloadDir').value = dir
          persistConfig()
        }
      } catch (_) {}
    })

    for (const id of ['discDownloadDir', 'discRepoWorkers', 'discFileWorkers', 'discLimit', 'discTimeout']) {
      const el = $(id)
      if (el) el.addEventListener('change', persistConfig)
    }

    setStatus('就绪。添加候选仓库后点击“扫描仓库”。')
    log('info', '检索标签页已就绪。状态列只会出现「已扫描 / 抓取失败」。')
  }

  window.initDiscoverTab = init
})()
