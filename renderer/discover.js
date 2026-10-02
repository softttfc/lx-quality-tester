;(function () {
  const $ = (id) => document.getElementById(id)

  let initialized = false
  let repos = []
  let allRecords = []           // ⭐ 扫描全量记录
  let currentView = []          // ⭐ 当前显示（可能被"只显示明文"过滤）
  let rawResult = null
  let scanning = false
  let plainOnly = false         // ⭐ 只显示明文开关
  let hideMalicious = false     // ⭐ 隐藏可疑/恶意开关
  const checkedKeys = new Set() // ⭐ 用记录键存储勾选，避免索引错位
  let unsubscribe = null

  // ⭐ 记录键：跨过滤/重绘稳定
  function recordKey(r) {
    if (!r) return ''
    return `${r.repo || ''}\u0001${r.path || ''}\u0001${r.name || ''}`
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
        <button id="discBtnEditRepos">编辑列表</button>
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
      <label>网络代理（仅音源检索）</label>
      <label class="checkbox" style="font-size:12px">
        <input type="checkbox" id="discProxyEnabled">
        使用代理访问 GitHub API / raw / jsDelivr
      </label>
      <div class="disc-row">
        <input id="discProxyUrl" placeholder="http://127.0.0.1:7897" disabled>
      </div>
      <div class="disc-hint" style="line-height:1.6">
        格式：<code>http://主机:端口</code>，例如 <code>http://127.0.0.1:7897</code>。<br>
        只作用于「音源检索」标签页的 GitHub API、raw 文件下载和 jsDelivr 请求；<br>
        <b>不影响「音源质量测试」标签页</b>。支持 HTTP / HTTPS，不支持 SOCKS。
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
        <button id="discBtnPlainOnly" style="flex:0 0 auto; width:auto">只显示明文</button>
        <button id="discBtnHideMalicious" style="flex:0 0 auto; width:auto">隐藏可疑/恶意</button>
        <span class="disc-hint" id="discPlainCount" style="margin-left:6px"></span>
      </div>
    </div>
    <div class="disc-result-wrap">
      <table class="disc-result-table">
        <thead>
          <tr>
            <th>选中</th><th>来源仓库</th><th>文件名</th><th>音源名称(@name)</th>
            <th>版本(@version)</th><th>状态</th><th>明文</th><th>安全</th><th>收录仓数</th>
            <th>作者(@author)</th><th>大小</th><th>已下载</th><th>备注</th>
          </tr>
        </thead>
        <tbody id="discResultTbody"></tbody>
      </table>
    </div>
    <div class="disc-log" id="discLog"></div>
  </main>
</div>
`

  // ---------------- 编辑列表弹窗 DOM（挂到 body，避免被容器裁切） ----------------
  const MODAL_HTML = `
<div class="disc-modal-mask" id="discEditModal" style="display:none">
  <div class="disc-modal">
    <div class="disc-modal-title">编辑候选仓库列表</div>
    <div class="disc-modal-hint">
      每行一个仓库，格式：<code>owner/repo</code> 或 <code>owner/repo#branch</code> 或完整 GitHub URL（可带 #branch）。
      已存在的仓库会保留其标签与备注；解析失败的行会被忽略。
    </div>
    <textarea id="discEditTextarea" spellcheck="false"></textarea>
    <div class="disc-modal-actions">
      <button id="discEditCancel">取消</button>
      <button id="discEditSave" class="primary">保存</button>
    </div>
  </div>
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
      proxyEnabled: $('discProxyEnabled') ? $('discProxyEnabled').checked : false,
      proxyUrl: $('discProxyUrl') ? $('discProxyUrl').value.trim() : '',
    }
  }

  async function persistConfig() {
    try {
      await window.api.discoverSaveRepos(collectConfig())
    } catch (_) {}
  }

  // ---------------- 明文单元格 ----------------
  function renderPlainCell(r) {
    if (r.status !== '已扫描') {
      const reason = r.plainReason || r.error || ''
      return `<span class="disc-plain-unknown" title="${escapeHtml(reason)}">—</span>`
    }
    if (r.plain === true) {
      return '<span class="disc-plain-ok">✅ 明文</span>'
    }
    if (r.plainKind === 'weak') {
      const reason = r.plainReason || '疑似混淆'
      return `<span class="disc-plain-warn" title="${escapeHtml(reason)}">⚠️ 疑似混淆</span>`
    }
    const reason = r.plainReason || ''
    return `<span class="disc-plain-fail" title="${escapeHtml(reason)}">🔒 非明文</span>`
  }

  // ⭐ 新增：安全单元格
  function renderSafeCell(r) {
    if (r.status !== '已扫描') {
      return '<span class="disc-safe-unknown">—</span>'
    }
    if (!r.malicious) {
      return '<span class="disc-safe-ok">✅ 安全</span>'
    }
    const reasons = (r.maliciousMatches || [])
      .filter((m) => m.severity === 'high' || m.severity === 'medium')
      .map((m) => `${m.reason} [${m.id}]`)
      .join('\n')
    const isHigh = r.maliciousSeverity === 'high'
    const cls = isHigh ? 'disc-safe-fail' : 'disc-safe-warn'
    const icon = isHigh ? '⛔' : '⚠️'
    const text = isHigh ? '恶意' : '可疑'
    return `<span class="${cls}" title="${escapeHtml(reasons)}">${icon} ${text}</span>`
  }

  // ---------------- 结果表格 ----------------
  function renderRows() {
    const tbody = $('discResultTbody')
    if (!tbody) return

    if (currentView.length === 0) {
      tbody.innerHTML = `<tr><td colspan="13" style="text-align:center;color:#999;padding:20px">${
        plainOnly && hideMalicious ? '没有符合条件的结果' :
        plainOnly ? '没有明文音源' :
        hideMalicious ? '没有非恶意音源' : '没有结果'
      }</td></tr>`
      return
    }

    tbody.innerHTML = currentView.map((r) => {
      const key = recordKey(r)
      const checkedAttr = checkedKeys.has(key) ? 'checked' : ''
      const downloaded = r.downloaded ? '✅' : ''
      const statusCls = r.status === '已扫描' ? 'disc-status-ok' : 'disc-status-fail'
      const rowCls = r.malicious ? 'disc-row-malicious' : ''
      return `<tr data-key="${escapeHtml(key)}" class="${rowCls}">
        <td><input type="checkbox" class="disc-cb" data-key="${escapeHtml(key)}" ${checkedAttr}></td>
        <td>${escapeHtml(r.repo || '')}</td>
        <td>${escapeHtml((r.path || '').split('/').pop() || '')}</td>
        <td>${escapeHtml(r.name || '')}</td>
        <td>${escapeHtml(r.version || '-')}</td>
        <td class="${statusCls}">${escapeHtml(r.status || '')}</td>
        <td>${renderPlainCell(r)}</td>
        <td>${renderSafeCell(r)}</td>
        <td>${r.repo_count || 1}</td>
        <td>${escapeHtml(r.author || '-')}</td>
        <td>${humanSize(r.size)}</td>
        <td>${downloaded}</td>
        <td title="${escapeHtml(r.note || r.error || '')}">${escapeHtml(r.note || r.error || '-')}</td>
      </tr>`
    }).join('')

    tbody.querySelectorAll('.disc-cb').forEach((cb) => {
      cb.addEventListener('change', () => {
        const key = cb.dataset.key
        if (cb.checked) checkedKeys.add(key)
        else checkedKeys.delete(key)
        updateDownloadButton()
      })
    })
  }

  function updatePlainOnlyButton() {
    const btn = $('discBtnPlainOnly')
    if (!btn) return
    btn.textContent = plainOnly ? '✓ 仅显示明文' : '只显示明文'
    btn.classList.toggle('active', plainOnly)
  }

  // ⭐ 新增：更新隐藏恶意按钮状态
  function updateHideMaliciousButton() {
    const btn = $('discBtnHideMalicious')
    if (!btn) return
    btn.textContent = hideMalicious ? '✓ 已隐藏可疑/恶意' : '隐藏可疑/恶意'
    btn.classList.toggle('active', hideMalicious)
  }

  function updatePlainCount() {
    const el = $('discPlainCount')
    if (!el) return
    if (!allRecords.length) { el.textContent = ''; return }
    const total = allRecords.length
    const plainCount = allRecords.filter((r) => r.plain === true).length
    const malCount = allRecords.filter((r) => r.malicious).length
    let text = `明文 ${plainCount}/${total}`
    if (malCount > 0) text += `，⚠️ 可疑/恶意 ${malCount}`
    el.textContent = text
  }

  function applyFilterAndRender() {
    currentView = allRecords.filter((r) => {
      if (plainOnly && r.plain !== true) return false
      if (hideMalicious && r.malicious) return false
      return true
    })
    renderRows()
    updatePlainOnlyButton()
    updateHideMaliciousButton()
    updatePlainCount()
    updateDownloadButton()
  }

  function updateDownloadButton() {
    const btn = $('discBtnDownload')
    if (!btn) return
    btn.disabled = checkedKeys.size === 0 || scanning
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
      proxyEnabled: $('discProxyEnabled').checked,
      proxyUrl: $('discProxyUrl').value.trim(),
    }

    scanning = true
    $('discBtnScan').disabled = true
    $('discBtnCancel').disabled = false
    checkedKeys.clear()
    setStatus('扫描中...')
    clearLog()

    if (unsubscribe) unsubscribe()
    unsubscribe = window.api.onDiscoverProgress((p) => {
      if (p.type === 'scan-start') log('info', `开始扫描 ${p.repos} 个仓库`)
      else if (p.type === 'repo-start') log('info', `>>> 扫描仓库 ${p.repo} (${p.branch})`)
      else if (p.type === 'repo-tree') log('info', `[${p.repo}] 文件树 ${p.totalFiles} 项，候选 ${p.candidates} 个`)
      else if (p.type === 'file-progress') {
        if (p.status === 'fail') {
          log('error', `  x ${p.repo}/${p.path}：${p.error || ''}`)
        } else if (p.status === 'ok' && p.malicious) {
          // ⭐ 恶意文件提示
          const sev = p.maliciousSeverity === 'high' ? '⛔ 恶意' : '⚠️ 可疑'
          log('warn', `  ${sev} ${p.repo}/${p.path}`)
        }
      } else if (p.type === 'notice') log('warn', `  · ${p.message}`)
      else if (p.type === 'repo-error') log('error', `  x ${p.repo}: ${p.error}`)
      else if (p.type === 'repo-done') log('info', `[${p.repo}] 完成，共 ${p.count} 条`)
      else if (p.type === 'scan-done') log('info', `扫描完成：原始 ${p.found} 条，显示 ${p.shown} 条，API ${p.apiCalls} 次`)
    })

    try {
      const r = await window.api.discoverScan(params)
      rawResult = r
      allRecords = r.records || []
      applyFilterAndRender()
      setStatus(`扫描完成：原始 ${r.found} 条，显示 ${r.shown} 条`)
      for (const m of (r.messages || [])) log('info', m)

      const plainCount = allRecords.filter((x) => x.plain === true).length
      const weakCount = allRecords.filter((x) => x.plainKind === 'weak').length
      const strongCount = allRecords.filter((x) => x.plainKind === 'strong').length
      log('info', `明文判读：明文 ${plainCount} 条，疑似混淆 ${weakCount} 条，强混淆/失败 ${strongCount} 条`)

      // ⭐ 恶意统计
      const malHigh = allRecords.filter((x) => x.maliciousSeverity === 'high').length
      const malMedium = allRecords.filter((x) => x.maliciousSeverity === 'medium').length
      if (malHigh > 0 || malMedium > 0) {
        log('warn', `⚠️ 安全检测：恶意 ${malHigh} 条，可疑 ${malMedium} 条（可在「安全」列查看详情）`)
      } else {
        log('info', '安全检测：未发现可疑/恶意音源')
      }
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
    if (!checkedKeys.size) return
    const targetDir = $('discDownloadDir').value.trim()
    if (!targetDir) { alert('请先设置下载目录'); return }

    const forceFailed = $('discForceFailed').checked
    const selected = allRecords.filter((r) => checkedKeys.has(recordKey(r)))
    if (!selected.length) return

    // ⭐ 恶意文件二次确认
    const maliciousSelected = selected.filter((r) => r.malicious)
    if (maliciousSelected.length > 0) {
      const list = maliciousSelected.slice(0, 8).map((r) => {
        const reasonText = (r.maliciousMatches || [])
          .filter((m) => m.severity === 'high' || m.severity === 'medium')
          .map((m) => m.reason)
          .join('；')
        return `  · ${r.name || r.path} —— ${reasonText}`
      }).join('\n')
      const more = maliciousSelected.length > 8 ? `\n  ...及其他 ${maliciousSelected.length - 8} 个` : ''
      const ok = confirm(
        `⚠️ 检测到 ${maliciousSelected.length} 个疑似恶意/可疑音源：\n\n${list}${more}\n\n` +
        `这些文件可能包含 OOM 攻击、防改名自毁或其他恶意代码。\n` +
        `建议取消后勾选其他版本，或仅在隔离环境测试。\n\n仍要下载？`
      )
      if (!ok) return
    }

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

      const okNames = new Set(s.details.filter((d) => d.status === 'ok').map((d) => d.name))
      const okFiles = new Map(s.details.filter((d) => d.status === 'ok').map((d) => [d.name, d.file]))
      for (const rec of selected) {
        if (rec.downloaded) continue
        if (okNames.has(rec.name)) {
          rec.downloaded = true
          rec.downloaded_file = okFiles.get(rec.name) || ''
        }
      }
      renderRows()
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
      filtered: { plainOnly, hideMalicious },
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

  // ---------------- 编辑列表 ----------------
  function openEditModal() {
    const modal = $('discEditModal')
    const ta = $('discEditTextarea')
    if (!modal || !ta) return
    ta.value = repos.map((r) => {
      const branch = r.branch || 'main'
      return branch && branch !== 'main'
        ? `${r.full_name}#${branch}`
        : r.full_name
    }).join('\n')
    modal.style.display = 'flex'
    ta.focus()
    ta.setSelectionRange(0, 0)
  }

  function closeEditModal() {
    const modal = $('discEditModal')
    if (modal) modal.style.display = 'none'
  }

  async function saveEditedRepoList() {
    const ta = $('discEditTextarea')
    if (!ta) return
    const lines = ta.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean)
    if (!lines.length) { alert('至少保留一个仓库'); return }

    const oldMap = new Map()
    for (const r of repos) oldMap.set(r.full_name.toLowerCase(), r)

    const next = []
    const seen = new Set()
    let skipped = 0
    for (const line of lines) {
      let parsed = null
      try {
        parsed = await window.api.discoverParseRepo(line)
      } catch (_) {}
      if (!parsed) { skipped++; continue }
      const key = parsed.full_name.toLowerCase()
      if (seen.has(key)) { skipped++; continue }
      seen.add(key)
      const old = oldMap.get(key)
      if (old) {
        parsed.tag = old.tag || ''
        parsed.note = old.note || parsed.note
      }
      next.push(parsed)
    }

    if (!next.length) { alert('没有可解析的仓库地址'); return }

    repos = next
    renderRepoList()
    closeEditModal()
    if (skipped > 0) {
      log('warn', `编辑列表：已忽略 ${skipped} 行无法解析或重复的条目`)
    }
    log('info', `编辑列表已保存，共 ${repos.length} 个仓库`)
    await persistConfig()
  }

  // ---------------- 初始化 ----------------
  async function init() {
    if (initialized) return
    const container = $('discoverContainer')
    if (!container) return
    initialized = true

    container.innerHTML = PANEL_HTML

    if (!$('discEditModal')) {
      const holder = document.createElement('div')
      holder.innerHTML = MODAL_HTML
      document.body.appendChild(holder.firstElementChild)
    }

    try {
      const cfg = await window.api.discoverLoadRepos()
      repos = cfg.repos || []
      $('discDownloadDir').value = cfg.downloadDir || ''
      $('discRepoWorkers').value = cfg.repoWorkers || 6
      $('discFileWorkers').value = cfg.fileWorkers || 8
      $('discLimit').value = cfg.limit || 40
      $('discTimeout').value = cfg.timeout || 8
      $('discProxyEnabled').checked = cfg.proxyEnabled === true
      $('discProxyUrl').value = cfg.proxyUrl || ''
      $('discProxyUrl').disabled = !$('discProxyEnabled').checked
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
    $('discBtnEditRepos').addEventListener('click', openEditModal)
    $('discBtnResetRepos').addEventListener('click', resetRepos)
    $('discBtnClearLog').addEventListener('click', clearLog)

    $('discEditCancel').addEventListener('click', closeEditModal)
    $('discEditSave').addEventListener('click', saveEditedRepoList)
    $('discEditModal').addEventListener('click', (e) => {
      if (e.target && e.target.id === 'discEditModal') closeEditModal()
    })
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && $('discEditModal') && $('discEditModal').style.display === 'flex') {
        closeEditModal()
      }
    })

    $('discBtnSelectAll').addEventListener('click', () => {
      currentView.forEach((r) => checkedKeys.add(recordKey(r)))
      renderRows()
      updateDownloadButton()
    })
    $('discBtnSelectNone').addEventListener('click', () => {
      checkedKeys.clear()
      renderRows()
      updateDownloadButton()
    })

    $('discBtnPlainOnly').addEventListener('click', () => {
      plainOnly = !plainOnly
      applyFilterAndRender()
    })

    // ⭐ 隐藏可疑/恶意按钮
    $('discBtnHideMalicious').addEventListener('click', () => {
      hideMalicious = !hideMalicious
      applyFilterAndRender()
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

    $('discProxyEnabled').addEventListener('change', () => {
      $('discProxyUrl').disabled = !$('discProxyEnabled').checked
      persistConfig()
    })

    for (const id of ['discDownloadDir', 'discRepoWorkers', 'discFileWorkers', 'discLimit', 'discTimeout', 'discProxyUrl']) {
      const el = $(id)
      if (el) el.addEventListener('change', persistConfig)
    }

    updatePlainOnlyButton()
    updateHideMaliciousButton()
    updatePlainCount()
    setStatus('就绪。添加候选仓库后点击“扫描仓库”。')
    log('info', '检索标签页已就绪。状态列只会出现「已扫描 / 抓取失败」。')
    log('info', '明文列为静态正则判读结果，仅供参考，不代表安全性。')
    log('info', '安全列为静态恶意代码检测，仅供参考；标红文件建议排除。')
    log('info', '若需访问 GitHub，可在「网络代理」中勾选并填写 http://127.0.0.1:7897（只作用于本标签页）。')
  }

  window.initDiscoverTab = init
})()
