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
    const
