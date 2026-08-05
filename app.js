// ==================== 数据模型 ====================
const groups = [
  { id: 'g-work', title: '工作', expanded: true, pinned: false, collections: [
    { id: 'product', title: '产品与工作', description: '工作中的思考、计划与复盘', color: 'coral', notesExpanded: true, updated: '今天 09:42', notes: [
      { id: 'product-1', title: '关于个人知识管理的一些思考', content: '# 关于个人知识管理的一些思考\n\n信息不等于知识，知识也不等于智慧。\n\n## 我的三个原则\n\n- 让记录足够简单\n- 让回顾成为习惯\n- 让想法彼此连接' },
      { id: 'product-2', title: '2025 年第二季度目标', content: '# 2025 年第二季度目标\n\n> 少做一点，但做深。\n\n## 重点方向\n\n- 完成产品新版本\n- 每周留出半天深度工作\n- 建立稳定的复盘习惯' },
      { id: 'product-3', title: '设计系统学习笔记', content: '# 设计系统学习笔记\n\n好的设计系统不是限制创造力，而是让团队把精力用在更重要的地方。' }
    ]}
  ]},
  { id: 'g-read', title: '阅读', expanded: true, pinned: false, collections: [
    { id: 'reading', title: '阅读与输入', description: '书籍、文章和值得保留的观点', color: 'blue', notesExpanded: true, updated: '6 月 10 日', notes: [
      { id: 'reading-1', title: '读《置身事内》', content: '# 读《置身事内》\n\n记录一些触动我的章节和观点。\n\n## 一个值得反复想的问题\n\n我们如何共同塑造身处的环境？' },
      { id: 'reading-2', title: '待读清单', content: '# 待读清单\n\n- 《纳瓦尔宝典》\n- 《有限与无限的游戏》\n- 《卡片笔记写作法》' }
    ]}
  ]},
  { id: 'g-life', title: '生活', expanded: true, pinned: false, collections: [
    { id: 'life', title: '生活记录', description: '日记、旅行与生活中的小事', color: 'green', notesExpanded: true, updated: '6 月 08 日', notes: [
      { id: 'life-1', title: '周末去看展', content: '# 周末去看展\n\n很久没有留出一整天给自己了。看看展览，走走路，或许会有新的发现。' }
    ]}
  ]}
];

// 默认按首字母 A-Z 排序主题
function sortGroupsAZ() {
  groups.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  groups.forEach(g => g.collections.sort((a, b) => a.title.localeCompare(b.title, 'zh')));
}
sortGroupsAZ();

const looseNotes = [];
const trash = [];
const settings = { theme: 'light', trashLimit: 30, workspacePath: '', panelCollapsed: { group: false, collection: false, loose: false } };

// ==================== 状态 ====================
let currentView = 'collections';
let selectedGroup = groups[0];
let selectedCollection = groups[0].collections[0];
let selectedNote = selectedCollection.notes[0];
let selectedLooseNote = null;
let filteredGroups = getSortedGroups();
let filteredLooseNotes = looseNotes;
let filteredTrash = trash;
const $ = selector => document.querySelector(selector);
const $$ = selector => document.querySelectorAll(selector);
const toast = $('#toast');

// ==================== 工具函数 ====================
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function escapeHtml(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
function countAllNotes() { return groups.reduce((t, g) => t + g.collections.reduce((tt, c) => tt + c.notes.length, 0), 0) + looseNotes.length; }
function countAllCollections() { return groups.reduce((t, g) => t + g.collections.length, 0); }
function findGroupOfCollection(collectionId) { for (const g of groups) { if (g.collections.some(c => c.id === collectionId)) return g; } return null; }
function findCollectionById(id) { for (const g of groups) { const f = g.collections.find(c => c.id === id); if (f) return f; } return null; }

// ==================== 统一弹窗系统 ====================
function openModal(title, bodyHtml, footerHtml) {
  const container = $('#modal-container');
  container.innerHTML = `
    <div class="modal-header"><h2>${title}</h2><button type="button" class="modal-close" id="modal-close-btn">×</button></div>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-footer">${footerHtml || ''}</div>`;
  $('#modal-backdrop').classList.remove('hidden');
  const closeBtn = $('#modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);
}
function closeModal() { $('#modal-backdrop').classList.add('hidden'); }
$('#modal-backdrop').addEventListener('click', e => { if (e.target.id === 'modal-backdrop') closeModal(); });

// --- 新建笔记集弹窗 ---
function openCreateCollectionModal() {
  const groupOptions = groups.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  const body = `
    <label>笔记集名称<input id="mc-title" maxlength="40" placeholder="例如：产品研究" /></label>
    <label>描述<textarea id="mc-description" maxlength="100" placeholder="简单描述这个笔记集的用途"></textarea></label>
    <label>所属主题<select id="mc-group">${groupOptions}</select></label>
    <label>或新建主题<input id="mc-newgroup" maxlength="20" placeholder="输入新主题名称（可选）" /></label>
    <label>预置笔记模板<select id="mc-template"><option value="3">3 篇基础模板</option><option value="1">1 篇空白笔记</option><option value="0">暂不创建笔记</option></select></label>`;
  const footer = `<button class="cancel-button" id="mc-cancel">取消</button><button class="submit-button" id="mc-submit">创建笔记集</button>`;
  openModal('新建笔记集', body, footer);
  $('#mc-cancel').addEventListener('click', closeModal);
  $('#mc-submit').addEventListener('click', () => {
    const rawTitle = $('#mc-title').value.trim();
    if (!rawTitle) { showToast('请输入笔记集名称'); return; }
    const groupId = $('#mc-group').value;
    const newGroupName = $('#mc-newgroup').value.trim();
    const id = genId('collection');
    const templateCount = Number($('#mc-template').value);
    const names = ['概览', '待办事项', '灵感与资料'].slice(0, templateCount);
    let targetGroup;
    if (newGroupName) { targetGroup = { id: genId('group'), title: newGroupName, expanded: true, collections: [] }; groups.push(targetGroup); }
    else { targetGroup = groups.find(g => g.id === groupId) || groups[0]; }
    const title = makeUniqueTitle(rawTitle, targetGroup.collections.map(c => c.title));
    const collection = { id, title, description: $('#mc-description').value.trim(), color: 'purple', notesExpanded: true, updated: '刚刚', notes: names.map((n, i) => ({ id: `${id}-${i}`, title: n, content: `# ${n}\n\n在这里开始记录……` })) };
    targetGroup.collections.unshift(collection);
    targetGroup.expanded = true;
    selectedGroup = targetGroup;
    selectedCollection = collection;
    selectedNote = collection.notes[0] || null;
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('笔记集已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mc-title').focus(), 50);
}

// --- 新建主题弹窗 ---
function openCreateGroupModal() {
  const body = `<label>主题名称<input id="mg-title" maxlength="20" placeholder="例如：学习" /></label>`;
  const footer = `<button class="cancel-button" id="mg-cancel">取消</button><button class="submit-button" id="mg-submit">创建主题</button>`;
  openModal('新建主题', body, footer);
  $('#mg-cancel').addEventListener('click', closeModal);
  $('#mg-submit').addEventListener('click', () => {
    const title = makeUniqueTitle($('#mg-title').value.trim(), groups.map(g => g.title));
    if (!title) { showToast('请输入主题名称'); return; }
    const group = { id: genId('group'), title, expanded: true, pinned: false, collections: [] };
    groups.push(group);
    sortGroupsAZ();
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree();
    showToast('主题已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mg-title').focus(), 50);
}

// --- 新建零散笔记弹窗 ---
function openCreateLooseNoteModal() {
  const body = `<label>笔记标题<input id="ml-title" maxlength="40" placeholder="例如：今天的灵感" /></label>`;
  const footer = `<button class="cancel-button" id="ml-cancel">取消</button><button class="submit-button" id="ml-submit">创建笔记</button>`;
  openModal('新建笔记', body, footer);
  $('#ml-cancel').addEventListener('click', closeModal);
  $('#ml-submit').addEventListener('click', () => {
    const title = makeUniqueTitle($('#ml-title').value.trim() || '未命名笔记', looseNotes.map(n => n.title));
    const note = { id: genId('loose'), title, content: `# ${title}\n\n在这里开始记录……` };
    looseNotes.unshift(note);
    selectedLooseNote = note;
    closeModal();
    switchView('loose');
    renderLooseNotes(); renderLooseEditor();
    showToast('笔记已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#ml-title').focus(), 50);
}

// --- 新建笔记（笔记集内）弹窗 ---
function openCreateNoteModal() {
  const body = `<label>笔记标题<input id="mn-title" maxlength="40" placeholder="例如：灵感记录" /></label>`;
  const footer = `<button class="cancel-button" id="mn-cancel">取消</button><button class="submit-button" id="mn-submit">创建笔记</button>`;
  openModal('新建笔记', body, footer);
  $('#mn-cancel').addEventListener('click', closeModal);
  $('#mn-submit').addEventListener('click', () => {
    const title = makeUniqueTitle($('#mn-title').value.trim() || '未命名笔记', selectedCollection.notes.map(n => n.title));
    if (!selectedCollection) return;
    const note = { id: genId('note'), title, content: `# ${title}\n\n在这里开始记录……` };
    selectedCollection.notes.push(note);
    selectedCollection.updated = '刚刚';
    selectedCollection.notesExpanded = true;
    selectedNote = note;
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('笔记已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mn-title').focus(), 50);
}

// --- 删除笔记确认弹窗 ---
function openDeleteNoteModal(noteId, source) {
  const note = source === 'loose' ? looseNotes.find(n => n.id === noteId) : selectedCollection?.notes.find(n => n.id === noteId);
  if (!note) return;
  const body = `<p class="modal-text">确定删除笔记 <b>"${escapeHtml(note.title)}"</b> 吗？</p><p class="modal-subtext">删除后可在回收站找到，最多保留 ${settings.trashLimit} 篇。</p>`;
  const footer = `<button class="cancel-button" id="dn-cancel">取消</button><button class="danger-button" id="dn-confirm">删除</button>`;
  openModal('删除笔记', body, footer);
  $('#dn-cancel').addEventListener('click', closeModal);
  $('#dn-confirm').addEventListener('click', () => {
    addToTrash(note, source === 'loose' ? '零散笔记' : selectedCollection.title);
    if (source === 'loose') {
      const idx = looseNotes.findIndex(n => n.id === noteId);
      looseNotes.splice(idx, 1);
      selectedLooseNote = looseNotes[0] || null;
      closeModal();
      renderLooseNotes(); renderLooseEditor(); updateNavCounts();
    } else {
      const idx = selectedCollection.notes.findIndex(n => n.id === noteId);
      selectedCollection.notes.splice(idx, 1);
      if (selectedCollection.notes.length === 0) {
        selectedNote = null;
      } else {
        selectedNote = selectedCollection.notes[Math.max(0, idx - 1)];
      }
      closeModal();
      renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    }
    showToast('笔记已移入回收站');
    scheduleSyncToWorkspace();
  });
}

// --- 删除笔记集确认弹窗 ---
function openDeleteCollectionModal() {
  if (!selectedCollection) return;
  const noteCount = selectedCollection.notes.length;
  const body = `
    <p class="modal-text">确定删除笔记集 <b>"${escapeHtml(selectedCollection.title)}"</b> 吗？</p>
    <p class="modal-subtext">该笔记集包含 ${noteCount} 篇笔记。</p>
    <div class="modal-radio-group">
      <label class="modal-radio">将 ${noteCount} 篇笔记归入零散笔记 <input type="radio" name="del-col" value="loose" checked /></label>
      <label class="modal-radio">将 ${noteCount} 篇笔记移入回收站 <input type="radio" name="del-col" value="trash" /></label>
      <label class="modal-radio">将整个笔记集放入回收站（保留结构） <input type="radio" name="del-col" value="trash-collection" /></label>
    </div>`;
  const footer = `<button class="cancel-button" id="dc-cancel">取消</button><button class="danger-button" id="dc-confirm">删除笔记集</button>`;
  openModal('删除笔记集', body, footer);
  $('#dc-cancel').addEventListener('click', closeModal);
  $('#dc-confirm').addEventListener('click', () => {
    if (!selectedCollection) return;
    const choice = document.querySelector('input[name="del-col"]:checked').value;
    const notes = selectedCollection.notes;
    if (choice === 'loose') {
      notes.forEach(n => looseNotes.unshift({ id: genId('loose'), title: n.title, content: n.content }));
    } else if (choice === 'trash') {
      notes.forEach(n => addToTrash(n, selectedCollection.title));
    } else {
      // 整集放入回收站：保留笔记集结构，恢复时可还原为笔记集
      trash.unshift({
        id: genId('trash'),
        title: selectedCollection.title,
        content: '',
        type: 'collection',
        collection: {
          title: selectedCollection.title,
          description: selectedCollection.description || '',
          color: selectedCollection.color || 'coral',
          sourceGroup: selectedGroup ? selectedGroup.title : '',
          notes: selectedCollection.notes.map(n => ({ title: n.title, content: n.content }))
        },
        source: selectedGroup ? selectedGroup.title : '未知',
        deletedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      });
    }
    // 用 id 反查真实所属主题，避免 selectedGroup 与当前笔记集不匹配导致删错主题/删不掉（需刷新才生效的根因）
    const group = findGroupOfCollection(selectedCollection.id);
    if (!group) return;
    selectedGroup = group;
    const idx = group.collections.findIndex(c => c.id === selectedCollection.id);
    if (idx >= 0) group.collections.splice(idx, 1);
    if (group.collections.length > 0) {
      selectedCollection = group.collections[Math.max(0, idx - 1)];
      selectedNote = selectedCollection.notes[0] || null;
    } else {
      const og = groups.find(g => g.collections.length > 0);
      if (og) { selectedGroup = og; selectedCollection = og.collections[0]; selectedNote = selectedCollection.notes[0] || null; }
      else { selectedGroup = groups[0] || null; selectedCollection = null; selectedNote = null; }
    }
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor(); renderTrash(); renderLooseNotes(); updateNavCounts();
    const toastMsg = choice === 'loose' ? '笔记集已删除，笔记已归入零散笔记'
      : choice === 'trash' ? '笔记集已删除，笔记已移入回收站'
      : '笔记集已放入回收站（保留结构，可恢复为笔记集）';
    showToast(toastMsg);
    scheduleSyncToWorkspace();
  });
}

// --- 删除主题确认弹窗 ---
function openDeleteGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const totalNotes = group.collections.reduce((t, c) => t + c.notes.length, 0);
  const body = `
    <p class="modal-text">确定删除主题 <b>"${escapeHtml(group.title)}"</b> 吗？</p>
    <p class="modal-subtext">该主题包含 ${group.collections.length} 个笔记集、${totalNotes} 篇笔记。</p>
    <div class="modal-radio-group">
      <label class="modal-radio">将 ${totalNotes} 篇笔记归入零散笔记 <input type="radio" name="del-grp" value="loose" checked /></label>
      <label class="modal-radio">将 ${totalNotes} 篇笔记移入回收站 <input type="radio" name="del-grp" value="trash" /></label>
    </div>`;
  const footer = `<button class="cancel-button" id="dg-cancel">取消</button><button class="danger-button" id="dg-confirm">删除主题</button>`;
  openModal('删除主题', body, footer);
  $('#dg-cancel').addEventListener('click', closeModal);
  $('#dg-confirm').addEventListener('click', () => {
    const choice = document.querySelector('input[name="del-grp"]:checked').value;
    group.collections.forEach(c => {
      if (choice === 'loose') { c.notes.forEach(n => looseNotes.unshift({ id: genId('loose'), title: n.title, content: n.content })); }
      else { c.notes.forEach(n => addToTrash(n, c.title)); }
    });
    const idx = groups.findIndex(g => g.id === groupId);
    groups.splice(idx, 1);
    if (groups.length > 0) {
      selectedGroup = groups[0];
      selectedCollection = groups[0].collections[0] || null;
      selectedNote = selectedCollection?.notes[0] || null;
    } else {
      selectedGroup = null; selectedCollection = null; selectedNote = null;
    }
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(choice === 'loose' ? '主题已删除，笔记已归入零散笔记' : '主题已删除，笔记已移入回收站');
    scheduleSyncToWorkspace();
  });
}

// --- 重命名主题弹窗 ---
function openRenameGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const body = `<label>主题名称<input id="rg-title" maxlength="20" value="${escapeHtml(group.title)}" /></label>`;
  const footer = `<button class="cancel-button" id="rg-cancel">取消</button><button class="submit-button" id="rg-submit">保存</button>`;
  openModal('重命名主题', body, footer);
  $('#rg-cancel').addEventListener('click', closeModal);
  $('#rg-submit').addEventListener('click', () => {
    const title = $('#rg-title').value.trim();
    if (!title) { showToast('请输入名称'); return; }
    group.title = title;
    sortGroupsAZ();
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('主题已重命名');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#rg-title').focus(), 50);
}

// --- 置顶/取消置顶主题 ---
function togglePinGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  group.pinned = !group.pinned;
  filteredGroups = getSortedGroups();
  renderGroupTree();
  showToast(group.pinned ? '主题已置顶' : '已取消置顶');
  scheduleSyncToWorkspace();
}

// --- 在主题内新增笔记集弹窗 ---
function openAddCollectionToGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const body = `
    <label>笔记集名称<input id="mcg-title" maxlength="40" placeholder="例如：产品研究" /></label>
    <label>描述<textarea id="mcg-description" maxlength="100" placeholder="简单描述这个笔记集的用途"></textarea></label>
    <label>预置笔记模板<select id="mcg-template"><option value="3">3 篇基础模板</option><option value="1">1 篇空白笔记</option><option value="0">暂不创建笔记</option></select></label>`;
  const footer = `<button class="cancel-button" id="mcg-cancel">取消</button><button class="submit-button" id="mcg-submit">创建笔记集</button>`;
  openModal('在「' + group.title + '」内新增笔记集', body, footer);
  $('#mcg-cancel').addEventListener('click', closeModal);
  $('#mcg-submit').addEventListener('click', () => {
    const title = makeUniqueTitle($('#mcg-title').value.trim(), group.collections.map(c => c.title));
    if (!title) { showToast('请输入笔记集名称'); return; }
    const id = genId('collection');
    const templateCount = Number($('#mcg-template').value);
    const names = ['概览', '待办事项', '灵感与资料'].slice(0, templateCount);
    const collection = { id, title, description: $('#mcg-description').value.trim(), color: 'purple', notesExpanded: true, updated: '刚刚', notes: names.map((n, i) => ({ id: `${id}-${i}`, title: n, content: `# ${n}\n\n在这里开始记录……` })) };
    group.collections.unshift(collection);
    sortGroupsAZ();
    group.expanded = true;
    selectedGroup = group;
    selectedCollection = collection;
    selectedNote = collection.notes[0] || null;
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('笔记集已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mcg-title').focus(), 50);
}

// --- 获取排序后的主题（置顶优先，其余按首字母） ---
function getSortedGroups() {
  return [...groups].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return a.title.localeCompare(b.title, 'zh');
  });
}

// --- 关闭所有三点菜单 ---
function closeAllContextMenus() {
  document.querySelectorAll('.context-menu').forEach(m => m.remove());
}

// --- 设置弹窗 ---
let settingsActiveTab = 'general';
let workspacePath = '';

async function loadSettingsState() {
  try {
    const d = await window.api.loadSettings();
    settings.theme = d.theme || 'light';
    settings.trashLimit = d.trashLimit || 30;
    settings.workspacePath = d.workspacePath || '';
  } catch (e) {}
  workspacePath = settings.workspacePath;
  applyTheme();
  applyPanelState();
}

// 主题与面板折叠的本地应用 + 持久化
function applyTheme() {
  const dark = settings.theme === 'dark';
  document.body.classList.toggle('dark', dark);
  const t = $('#theme-toggle');
  if (t) t.textContent = dark ? '☀' : '☾';
}
// 三栏级联折叠（§4.7）：底部圆形开关 + 渐进式显隐。
// 顺序约束：必须先收起主题树，才能收起笔记集。
const COLLAPSE_ORDER = ['group', 'collection'];
let collapseStack = []; // 当前已收起的面板（按收起顺序）

function canCollapsePanel(p) {
  if (p === 'collection') return collapseStack.includes('group');
  return true;
}
function nextCollapsible() {
  return COLLAPSE_ORDER.find(p => !collapseStack.includes(p) && canCollapsePanel(p)) || null;
}
function applyPanelState() {
  const ws = $('.workspace');
  if (ws) {
    ws.classList.toggle('group-collapsed', collapseStack.includes('group'));
    ws.classList.toggle('collection-collapsed', collapseStack.includes('collection'));
  }
  const dock = $('#collapse-dock');
  if (dock) dock.classList.toggle('show', currentView === 'collections');
  renderCollapseDock();
}
function renderCollapseDock() {
  const dock = $('#collapse-dock');
  if (!dock) return;
  const next = nextCollapsible();
  const cb = $('#dock-collapse');
  const eb = $('#dock-expand');
  if (cb) cb.style.display = next ? 'grid' : 'none';
  if (eb) eb.style.display = collapseStack.length ? 'grid' : 'none';
}
function dockCollapse() {
  const next = nextCollapsible();
  if (!next) return;
  collapseStack.push(next);
  applyPanelState();
}
function dockExpand() {
  if (!collapseStack.length) return;
  collapseStack.pop();
  applyPanelState();
}
async function persistSettings() {
  try { await window.api.saveSettings(settings); } catch (e) {}
}

function openSettingsModal() {
  loadSettingsState().then(() => {
    const container = $('#modal-container');
    container.innerHTML = `
      <div class="settings-modal">
        <div class="settings-header"><h2>设置</h2><button type="button" class="modal-close" id="modal-close-btn">×</button></div>
        <div class="settings-body">
          <nav class="settings-nav">
            <button class="settings-nav-item ${settingsActiveTab === 'general' ? 'active' : ''}" data-tab="general">通用</button>
            <button class="settings-nav-item ${settingsActiveTab === 'workspace' ? 'active' : ''}" data-tab="workspace">工作区</button>
          </nav>
          <div class="settings-content">
            ${settingsActiveTab === 'general' ? renderGeneralSettings() : renderWorkspaceSettings()}
          </div>
        </div>
      </div>`;
    $('#modal-backdrop').classList.remove('hidden');
    $('#modal-close-btn').addEventListener('click', closeModal);

    // 导航切换
    $$('.settings-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        settingsActiveTab = btn.dataset.tab;
        openSettingsModal();
      });
    });

    // 通用设置事件
    if (settingsActiveTab === 'general') {
      $('#set-trash-limit').addEventListener('change', () => {
        const val = parseInt($('#set-trash-limit').value);
        if (!isNaN(val) && val >= 1) {
          settings.trashLimit = val;
          enforceTrashLimit();
          updateNavCounts(); renderTrash();
          persistSettings();
        }
      });
      $$('#set-theme button').forEach(btn => {
        btn.addEventListener('click', () => {
          settings.theme = btn.dataset.theme;
          applyTheme();
          $$('#set-theme button').forEach(b => b.classList.toggle('active', b === btn));
          persistSettings();
          showToast(settings.theme === 'dark' ? '已切换深色模式' : '已切换浅色模式');
        });
      });
    }

    // 工作区设置事件
    if (settingsActiveTab === 'workspace') {
      $('#ws-change-btn').addEventListener('click', openChangeWorkspaceModal);
      $('#ws-refresh-btn').addEventListener('click', refreshFromWorkspace);
    }
  });
}

function renderGeneralSettings() {
  return `
    <div class="settings-section">
      <h3>偏好设置</h3>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">外观</div>
            <div class="settings-desc">浅色或深色主题，重启后保持</div>
          </div>
          <div class="seg" id="set-theme">
            <button data-theme="light" class="${settings.theme !== 'dark' ? 'active' : ''}">浅色</button>
            <button data-theme="dark" class="${settings.theme === 'dark' ? 'active' : ''}">深色</button>
          </div>
        </div>
        <div class="settings-row">
          <div>
            <div class="settings-label">回收站保留数量</div>
            <div class="settings-desc">超出此数量的最早删除笔记将被永久清除</div>
          </div>
          <input type="number" id="set-trash-limit" min="1" max="200" value="${settings.trashLimit}" class="settings-input-sm" />
        </div>
      </div>
    </div>`;
}

function renderWorkspaceSettings() {
  return `
    <div class="settings-section">
      <h3>工作区</h3>
      <div class="settings-card">
        <div class="settings-row">
          <div>
            <div class="settings-label">工作区位置</div>
            <div class="settings-desc">${escapeHtml(workspacePath || 'H:\\NotePlanner\\workspace')}</div>
          </div>
          <button class="settings-action-btn" id="ws-change-btn">更改</button>
        </div>
        <div class="settings-row" style="margin-top:12px">
          <button class="settings-action-btn primary" id="ws-refresh-btn">从工作区刷新</button>
          <span class="settings-desc" style="margin-left:12px">扫描本地文件并更新视图</span>
        </div>
      </div>
    </div>`;
}

async function refreshFromWorkspace() {
  try {
    showToast('正在扫描工作区…');
    const data = await window.api.scan();
    if (data.error) throw new Error(data.error);
    groups.length = 0;
    if (data.groups) data.groups.forEach(g => groups.push(g));
    sortGroupsAZ();
    looseNotes.length = 0;
    if (data.looseNotes) data.looseNotes.forEach(n => looseNotes.push(n));
    trash.length = 0;
    if (data.trash) data.trash.forEach(t => trash.push(t));
    // 重置选中状态
    selectedGroup = groups[0] || null;
    selectedCollection = selectedGroup?.collections?.[0] || null;
    selectedNote = selectedCollection?.notes?.[0] || null;
    selectedLooseNote = looseNotes[0] || null;
    if (currentView === 'collections') { renderGroupTree(); renderCollections(); renderEditor(); }
    else if (currentView === 'loose') { renderLooseNotes(); renderLooseEditor(); }
    else if (currentView === 'trash') { renderTrash(); }
    updateNavCounts();
    showToast('已从工作区刷新');
  } catch (e) {
    showToast('刷新失败：' + e.message);
  }
}

function openChangeWorkspaceModal() {
  const body = `
    <p class="modal-text">选择新的工作区目录</p>
    <label>目录路径<input id="ws-path" placeholder="例如：D:\\Documents\\Notes" value="${escapeHtml(workspacePath || '')}" /></label>
    <label class="modal-radio"><input type="checkbox" id="ws-transfer" checked /> 转移现有内容到新工作区</label>`;
  const footer = `<button class="cancel-button" id="ws-cancel">取消</button><button class="submit-button" id="ws-confirm">更改</button>`;
  openModal('更改工作区', body, footer);
  $('#ws-cancel').addEventListener('click', closeModal);
  $('#ws-confirm').addEventListener('click', async () => {
    const newPath = $('#ws-path').value.trim();
    if (!newPath) { showToast('请输入目录路径'); return; }
    const transfer = $('#ws-transfer').checked;
    try {
      const data = await window.api.migrate({newPath, transfer});
      if (data.ok) {
        workspacePath = newPath; settings.workspacePath = newPath;
        closeModal();
        showToast('工作区已更改');
        // 刷新以加载新工作区内容
        refreshFromWorkspace();
      } else {
        showToast(data.error || '更改失败');
      }
    } catch (e) {
      showToast('更改失败：' + e.message);
    }
  });
}

// --- 清空回收站弹窗 ---
function openEmptyTrashModal() {
  if (trash.length === 0) { showToast('回收站已为空'); return; }
  const body = `<p class="modal-text">确定清空回收站吗？</p><p class="modal-subtext">${trash.length} 篇笔记将被永久删除，无法恢复。</p>`;
  const footer = `<button class="cancel-button" id="et-cancel">取消</button><button class="danger-button" id="et-confirm">永久清空</button>`;
  openModal('清空回收站', body, footer);
  $('#et-cancel').addEventListener('click', closeModal);
  $('#et-confirm').addEventListener('click', () => {
    trash.length = 0;
    closeModal();
    renderTrash(); updateNavCounts();
    showToast('回收站已清空');
    scheduleSyncToWorkspace();
  });
}

// ==================== 回收站逻辑 ====================
function addToTrash(note, source) {
  trash.unshift({ id: genId('trash'), title: note.title, content: note.content, source: source || '未知', deletedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) });
  enforceTrashLimit();
}
function enforceTrashLimit() {
  while (trash.length > settings.trashLimit) trash.pop();
}
function restoreNote(trashId) {
  const idx = trash.findIndex(t => t.id === trashId);
  if (idx < 0) return;
  const item = trash[idx];
  trash.splice(idx, 1);
  looseNotes.unshift({ id: genId('loose'), title: item.title, content: item.content });
  renderTrash(); renderLooseNotes(); updateNavCounts();
  showToast('笔记已恢复到零散笔记');
  scheduleSyncToWorkspace();
}
function permanentDelete(trashId) {
  const idx = trash.findIndex(t => t.id === trashId);
  if (idx < 0) return;
  const body = `<p class="modal-text">确定永久删除 <b>"${escapeHtml(trash[idx].title)}"</b> 吗？</p><p class="modal-subtext">此操作无法撤销。</p>`;
  const footer = `<button class="cancel-button" id="pd-cancel">取消</button><button class="danger-button" id="pd-confirm">永久删除</button>`;
  openModal('永久删除', body, footer);
  $('#pd-cancel').addEventListener('click', closeModal);
  $('#pd-confirm').addEventListener('click', () => {
    trash.splice(idx, 1);
    closeModal();
    renderTrash(); updateNavCounts();
    showToast('已永久删除');
    scheduleSyncToWorkspace();
  });
}

// ==================== 视图切换 ====================
function switchView(view) {
  currentView = view;
  $$('.view').forEach(v => v.classList.remove('active'));
  $$('.nav-item').forEach(n => n.classList.remove('active'));
  if (view === 'collections') {
    $('#view-collections').classList.add('active');
    $('#nav-collections').classList.add('active');
    $('#breadcrumbs').innerHTML = '<span>我的空间</span><i>/</i><b>笔记集</b>';
  } else if (view === 'loose') {
    $('#view-loose').classList.add('active');
    $('#nav-loose').classList.add('active');
    $('#breadcrumbs').innerHTML = '<span>我的空间</span><i>/</i><b>零散笔记</b>';
    renderLooseNotes(); renderLooseEditor();
  } else if (view === 'trash') {
    $('#view-trash').classList.add('active');
    $('#nav-trash').classList.add('active');
    $('#breadcrumbs').innerHTML = '<span>我的空间</span><i>/</i><b>回收站</b>';
    renderTrash();
  } else if (view === 'search') {
    $('#view-search').classList.add('active');
    $('#nav-search').classList.add('active');
    $('#breadcrumbs').innerHTML = '<span>我的空间</span><i>/</i><b>搜索</b>';
    runSearch($('#global-search').value);
  }
  const dock = $('#collapse-dock');
  if (dock) dock.classList.toggle('show', view === 'collections');
  renderCollapseDock();
}

// ==================== 组树渲染 ====================
// 在已有标题集合中为 base 生成唯一标题，避免同名文件互相覆盖
function makeUniqueTitle(base, existingTitles) {
  const has = existingTitles || [];
  if (!has.includes(base)) return base;
  let i = 2;
  while (has.includes(`${base} (${i})`)) i++;
  return `${base} (${i})`;
}

// 生成全局唯一 id：Date.now(36) + 自增序号 + 随机串，避免快速创建时 id 撞车导致“笔记无法打开”
let _idSeq = 0;
function genId(prefix) {
  _idSeq = (_idSeq + 1) % 1000000;
  return `${prefix}-${Date.now().toString(36)}${_idSeq.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

function renderGroupTree(list = filteredGroups) {
  const tree = $('#group-tree');
  tree.innerHTML = list.map(group => {
    const isParentOfSelected = selectedGroup && group.id === selectedGroup.id;
    const collectionsHtml = group.expanded ? group.collections.map(col => {
      const isSelected = col.id === selectedCollection?.id;
      return `<div class="tree-collection-wrapper ${isSelected ? 'selected' : ''}">
        <button class="tree-collection" data-collection="${col.id}" data-group="${group.id}">
          <span class="tree-collection-name">${escapeHtml(col.title)}</span>
          <span class="tree-collection-count">${col.notes.length}</span>
        </button>
      </div>`;
    }).join('') : '';
    return `<div class="tree-group ${isParentOfSelected ? 'highlighted' : ''} ${group.pinned ? 'pinned' : ''}" data-group="${group.id}">
      <button class="tree-group-header" data-group="${group.id}">
        <span class="tree-chevron ${group.expanded ? 'expanded' : ''}">▶</span>
        ${group.pinned ? '<span class="tree-pin-icon">📌</span>' : ''}
        <span class="tree-group-title">${escapeHtml(group.title)}</span>
        <span class="tree-group-menu" data-group="${group.id}" title="更多操作"></span>
      </button>
      <div class="tree-children ${group.expanded ? '' : 'collapsed'}">
        ${collectionsHtml}
      </div>
    </div>`;
  }).join('');
  updateNavCounts();
}

// ==================== 笔记集面板渲染 ====================
// 选定主题后，笔记集栏位展示该主题下的【所有】笔记集（逻辑修正：之前只渲染单个 selectedCollection）
function renderCollections() {
  const list = $('#collections-list');
  if (!selectedGroup) {
    list.innerHTML = '<div class="empty-state">请从左侧主题视图中选择一个主题</div>';
    return;
  }
  const cols = selectedGroup.collections;
  if (!cols.length) {
    list.innerHTML = '<div class="empty-state">该主题下还没有笔记集</div>';
    return;
  }
  list.innerHTML = cols.map(col => {
    const expanded = col.notesExpanded !== false;
    const isSel = col.id === selectedCollection?.id;
    const notes = col.notes || [];
    return `<article class="collection-card ${isSel ? 'selected' : ''}" data-collection="${col.id}">
      <div class="collection-card-top">
        <span class="collection-count">${notes.length} 篇</span>
      </div>
      <div class="collection-title-row">
        <h2>${escapeHtml(col.title)}</h2>
        <div class="collection-actions">
          <button class="collection-menu-btn" data-action="open-menu" data-collection="${col.id}" title="更多操作"></button>
        </div>
      </div>
      <p>${escapeHtml(col.description || '暂无描述')}</p>
      <div class="collection-notes ${expanded ? '' : 'collapsed'}">
        <button class="notes-toggle" data-action="toggle-notes" data-collection="${col.id}">
          <span class="notes-toggle-chevron ${expanded ? 'expanded' : ''}">▶</span>
          <span>笔记列表 (${notes.length})</span>
        </button>
        <div class="notes-list ${expanded ? '' : 'hidden'}" data-collection="${col.id}">
          ${notes.map(note => `<button class="collection-note ${note.id === selectedNote?.id ? 'active' : ''}" data-note="${note.id}" data-collection="${col.id}">
            <span class="note-bullet">·</span>
            <span class="note-title-text">${escapeHtml(note.title)}</span>
            <i data-action="delete-note" data-note="${note.id}" data-collection="${col.id}" title="删除笔记">×</i>
          </button>`).join('')}
        </div>
      </div>
      <div class="collection-meta"><span>${col.updated}</span></div>
    </article>`;
  }).join('');
}

// ==================== 编辑器渲染 ====================
function renderEditor() {
  $('#editor-title').textContent = selectedNote ? selectedNote.title : '选择一篇笔记';
  $('#markdown-editor').value = selectedNote ? selectedNote.content : '';
  updatePreview(); updateWordCount(); updateBreadcrumbs();
}
function updateBreadcrumbs() {
  if (currentView !== 'collections') return;
  const bc = $('#breadcrumbs');
  if (selectedGroup && selectedCollection) {
    bc.innerHTML = `<span>我的空间</span><i>/</i><span>${escapeHtml(selectedGroup.title)}</span><i>/</i><b>${escapeHtml(selectedCollection.title)}</b>`;
  } else {
    bc.innerHTML = '<span>我的空间</span><i>/</i><b>笔记集</b>';
  }
}

// ==================== 零散笔记渲染 ====================
function renderLooseNotes(list = filteredLooseNotes) {
  const container = $('#loose-notes-list');
  if (looseNotes.length === 0) {
    container.innerHTML = '<div class="empty-state">还没有零散笔记，点击右上角创建</div>';
  } else if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">没有匹配的笔记</div>';
  } else {
    container.innerHTML = list.map(note => `
      <div class="loose-note-item ${note.id === selectedLooseNote?.id ? 'active' : ''}" data-note="${note.id}">
        <span class="note-bullet">·</span>
        <span class="note-title-text">${escapeHtml(note.title)}</span>
        <button class="loose-note-menu" data-action="open-loose-menu" data-note="${note.id}" title="更多操作" aria-label="更多操作"></button>
      </div>`).join('');
  }
}
function renderLooseEditor() {
  $('#loose-editor-title').textContent = selectedLooseNote ? selectedLooseNote.title : '选择一篇笔记';
  $('#loose-markdown-editor').value = selectedLooseNote ? selectedLooseNote.content : '';
  $('#loose-markdown-preview').innerHTML = selectedLooseNote ? markdownToHtml(selectedLooseNote.content) : '';
  $('#loose-word-count').textContent = `${(selectedLooseNote?.content || '').replace(/\s/g, '').length} 字`;
}

// ==================== 回收站渲染 ====================
function renderTrash(list = filteredTrash) {
  const container = $('#trash-list');
  const cnt = $('#trash-count');
  if (cnt) cnt.textContent = trash.length;
  if (trash.length === 0) {
    container.innerHTML = '<div class="empty-state">回收站为空</div>';
  } else if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">没有匹配的笔记</div>';
  } else {
    container.innerHTML = list.map(item => {
      const isCol = item.type === 'collection';
      const n = isCol && item.collection ? item.collection.notes.length : 0;
      return `
      <div class="trash-item ${isCol ? 'trash-item-collection' : ''}">
        <div class="trash-item-info">
          <span class="trash-item-title">${isCol ? '<span class="trash-badge">笔记集</span>' : ''}${escapeHtml(item.title)}</span>
          <span class="trash-item-meta">${isCol ? `含 ${n} 篇笔记 · 来源：${escapeHtml(item.source)}` : `来源：${escapeHtml(item.source)} · 删除于 ${item.deletedAt}`}</span>
        </div>
        <div class="trash-item-actions">
          <button data-action="open-trash-menu" data-id="${item.id}" title="更多操作"></button>
        </div>
      </div>`;
    }).join('');
  }
}

// ==================== Markdown ====================
function markdownToHtml(markdown) {
  if (!markdown) return '';
  const safe = escapeHtml(markdown);
  return safe.split('\n').map(line => {
    if (line.startsWith('### ')) return `<h4>${line.slice(4)}</h4>`;
    if (line.startsWith('## ')) return `<h3>${line.slice(3)}</h3>`;
    if (line.startsWith('# ')) return `<h2>${line.slice(2)}</h2>`;
    if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
    if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`;
    return line ? `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>` : '<div class="md-spacer"></div>';
  }).join('').replace(/(<li>.*?<\/li>)+/g, g => `<ul>${g}</ul>`);
}
function updatePreview() { $('#markdown-preview').innerHTML = markdownToHtml($('#markdown-editor').value); }
function updateWordCount() { $('#word-count').textContent = `${$('#markdown-editor').value.replace(/\s/g, '').length} 字`; }

// ==================== 选择操作 ====================
function selectCollection(id) {
  const col = findCollectionById(id);
  if (!col) return;
  selectedCollection = col;
  selectedGroup = findGroupOfCollection(id);
  selectedNote = col.notes[0] || null;
  if (selectedGroup) selectedGroup.expanded = true;
  renderGroupTree(); renderCollections(); renderEditor();
}

function selectGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  selectedGroup = group;
  group.expanded = true;
  if (group.collections.length > 0) {
    selectedCollection = group.collections[0];
    selectedNote = selectedCollection.notes[0] || null;
  } else {
    selectedCollection = null;
    selectedNote = null;
  }
  if (currentView !== 'collections') {
    switchView('collections');
  } else {
    renderGroupTree(); renderCollections(); renderEditor();
  }
}

// 选中笔记集内的某篇笔记：仅切换高亮，不重建整个面板，
// 避免长笔记列表（>5 条可滚动）浏览后选中靠后笔记时滚动位置被重置回置顶
function selectNoteInCollection(noteId, collectionId) {
  const col = findCollectionById(collectionId);
  if (!col) return;
  selectedCollection = col;
  selectedNote = col.notes.find(n => n.id === noteId) || null;
  $$('.collection-card').forEach(card => card.classList.toggle('selected', card.dataset.collection === collectionId));
  $$('.collection-note').forEach(btn => btn.classList.toggle('active', btn.dataset.note === noteId && btn.dataset.collection === collectionId));
  renderEditor();
}

// ==================== 导航计数 ====================
// 底部页脚"已同步 / 共 N 篇笔记"已移除；若日后恢复页脚，此函数会安全更新计数
function updateNavCounts() {
  const el = $('#note-count');
  if (el) el.textContent = countAllNotes();
}

// ==================== 搜索（独立视图） ====================
let searchResults = [];

// 在已转义的安全文本内，将关键词（大小写不敏感）包裹为 <mark>
function highlight(text, kw) {
  if (!kw) return escapeHtml(text);
  const lower = text.toLowerCase();
  const kl = kw.toLowerCase();
  let result = '', i = 0;
  while (i < text.length) {
    const found = lower.indexOf(kl, i);
    if (found < 0) { result += escapeHtml(text.slice(i)); break; }
    result += escapeHtml(text.slice(i, found));
    result += '<mark>' + escapeHtml(text.slice(found, found + kl.length)) + '</mark>';
    i = found + kl.length;
  }
  return result;
}

// 去除 Markdown 标记后的片段，命中关键词时截取命中上下文并高亮
function snippet(text, kw) {
  const plain = text.replace(/[#>*~_`\-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!kw) {
    const s = plain.slice(0, 120);
    return escapeHtml(s) + (plain.length > 120 ? '…' : '');
  }
  const lower = plain.toLowerCase();
  const kl = kw.toLowerCase();
  const idx = lower.indexOf(kl);
  if (idx < 0) {
    const s = plain.slice(0, 120);
    return escapeHtml(s) + (plain.length > 120 ? '…' : '');
  }
  const start = Math.max(0, idx - 30);
  const end = Math.min(plain.length, idx + kl.length + 90);
  const windowText = (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
  return highlight(windowText, kw);
}

function runSearch(rawKw) {
  const kw = (rawKw || '').trim();
  const results = [];
  if (kw) {
    const lkw = kw.toLowerCase();
    for (const g of groups) {
      for (const c of g.collections) {
        for (const n of c.notes) {
          if ((n.title + '\n' + n.content).toLowerCase().includes(lkw)) {
            results.push({ type: 'collection', groupId: g.id, collectionId: c.id, noteId: n.id, title: n.title, path: `${g.title} › ${c.title}`, content: n.content });
          }
        }
      }
    }
    for (const n of looseNotes) {
      if ((n.title + '\n' + n.content).toLowerCase().includes(lkw)) {
        results.push({ type: 'loose', noteId: n.id, title: n.title, path: '零散笔记', content: n.content });
      }
    }
  }
  searchResults = results;
  renderSearchResults(kw);
}

function renderSearchResults(kw) {
  const container = $('#search-results');
  const stats = $('#search-stats');
  if (!kw.trim()) {
    stats.textContent = '';
    container.innerHTML = '<div class="search-empty"><span class="se-icon">⌕</span><span>输入关键词，跨所有笔记（标题与正文）搜索</span></div>';
    return;
  }
  if (searchResults.length === 0) {
    stats.textContent = '';
    container.innerHTML = '<div class="search-empty"><span class="se-icon">∅</span><span>没有匹配的笔记</span></div>';
    return;
  }
  stats.textContent = `找到 ${searchResults.length} 条结果`;
  container.innerHTML = searchResults.map((r, i) => `
    <button class="search-result-card" data-index="${i}">
      <div class="search-result-head">
        <span class="search-result-title">${highlight(r.title, kw)}</span>
        <span class="search-result-path">${escapeHtml(r.path)}</span>
      </div>
      <div class="search-result-snippet">${snippet(r.content, kw)}</div>
    </button>`).join('');
}

function jumpToSearchResult(r) {
  if (!r) return;
  if (r.type === 'collection') {
    const group = groups.find(g => g.id === r.groupId);
    const col = group?.collections.find(c => c.id === r.collectionId);
    const note = col?.notes.find(n => n.id === r.noteId);
    if (!group || !col || !note) { showToast('该笔记已不存在'); return; }
    selectedGroup = group; group.expanded = true;
    selectedCollection = col; col.notesExpanded = true;
    selectedNote = note;
    switchView('collections');
    renderGroupTree(); renderCollections(); renderEditor();
  } else {
    const note = looseNotes.find(n => n.id === r.noteId);
    if (!note) { showToast('该笔记已不存在'); return; }
    selectedLooseNote = note;
    switchView('loose');
    renderLooseNotes(); renderLooseEditor();
  }
}

// ==================== 事件绑定 ====================

// 导航切换
$('#nav-collections').addEventListener('click', e => { e.preventDefault(); switchView('collections'); });
$('#nav-loose').addEventListener('click', e => { e.preventDefault(); switchView('loose'); });
$('#nav-trash').addEventListener('click', e => { e.preventDefault(); switchView('trash'); });
$('#nav-search').addEventListener('click', e => { e.preventDefault(); switchView('search'); $('#global-search').focus(); });

// 组树
$('#group-tree').addEventListener('click', e => {
  const menuBtn = e.target.closest('.tree-group-menu');
  if (menuBtn) { e.stopPropagation(); openGroupContextMenu(menuBtn, menuBtn.dataset.group); return; }
  const chevron = e.target.closest('.tree-chevron');
  if (chevron) { e.stopPropagation(); const group = groups.find(g => g.id === chevron.closest('.tree-group-header').dataset.group); if (group) { group.expanded = !group.expanded; renderGroupTree(); } return; }
  const header = e.target.closest('.tree-group-header');
  if (header) { selectGroup(header.dataset.group); return; }
  const colBtn = e.target.closest('.tree-collection');
  if (colBtn) { selectCollection(colBtn.dataset.collection); return; }
});

// 笔记集面板（每屏展示所选主题下的全部笔记集，点击卡片即选中该笔记集）
$('#collections-list').addEventListener('click', e => {
  const card = e.target.closest('.collection-card');
  const colId = card ? card.dataset.collection : null;
  const col = colId ? findCollectionById(colId) : selectedCollection;
  const action = e.target.dataset.action;
  if (action === 'delete-note') { e.stopPropagation(); if (col) selectedCollection = col; openDeleteNoteModal(e.target.dataset.note, 'collection'); return; }
  if (action === 'toggle-notes') {
    if (col) { col.notesExpanded = !col.notesExpanded; renderCollections(); }
    return;
  }
  if (action === 'open-menu') { e.stopPropagation(); if (col) selectedCollection = col; openCollectionContextMenu(e.target); return; }
  const noteBtn = e.target.closest('.collection-note');
  if (noteBtn) {
    if (col) selectedCollection = col;
    selectNoteInCollection(noteBtn.dataset.note, noteBtn.dataset.collection || col.id);
    return;
  }
  if (card) { selectCollection(colId); }
});

// --- 选择目标笔记集弹窗：两个联动下拉框（主题 → 笔记集） ---
function openPickCollectionModal({ title, message, onPick }) {
  const groupsSorted = getSortedGroups();
  const defaultGroup = (selectedGroup && groupsSorted.some(g => g.id === selectedGroup.id))
    ? selectedGroup
    : groupsSorted[0];
  const groupOptions = groupsSorted.map(g => `<option value="${g.id}">${escapeHtml(g.title)}</option>`).join('');
  const body = `
    <p class="modal-text">${message}</p>
    <label>目标主题<select id="pick-group">${groupOptions}</select></label>
    <label>目标笔记集<select id="pick-collection"></select></label>
    <p class="pick-hint" id="pick-hint"></p>`;
  const footer = `<button type="button" class="cancel-button" id="pick-cancel">取消</button><button type="button" class="submit-button" id="pick-confirm">确定</button>`;
  openModal(title, body, footer);
  const groupSel = $('#pick-group');
  const colSel = $('#pick-collection');
  const hint = $('#pick-hint');

  function refreshCollections() {
    const g = groups.find(x => x.id === groupSel.value);
    if (!g || g.collections.length === 0) {
      colSel.innerHTML = `<option value="" disabled selected>该主题下还没有笔记集</option>`;
      colSel.disabled = true;
      hint.textContent = '该主题下暂无笔记集，请选择其他主题';
    } else {
      colSel.disabled = false;
      colSel.innerHTML = g.collections.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('');
      hint.textContent = '';
    }
  }

  $('#pick-cancel').addEventListener('click', closeModal);
  groupSel.addEventListener('change', refreshCollections);
  groupSel.value = defaultGroup ? defaultGroup.id : (groupsSorted[0] ? groupsSorted[0].id : '');
  refreshCollections();

  $('#pick-confirm').addEventListener('click', () => {
    const collectionId = colSel.value;
    if (!collectionId) { showToast('请选择目标笔记集'); return; }
    const target = findCollectionById(collectionId);
    if (!target) { showToast('目标笔记集不存在'); return; }
    closeModal();
    onPick(target);
  });
}

// 零散笔记 → 指定笔记集（两步式）
function moveLooseNoteToCollection(note, targetCollection) {
  const idx = looseNotes.findIndex(n => n.id === note.id);
  if (idx < 0) return;
  looseNotes.splice(idx, 1);
  targetCollection.notes.unshift({ id: genId('note'), title: note.title, content: note.content });
  targetCollection.updated = '刚刚';
  targetCollection.notesExpanded = true;
  selectedLooseNote = looseNotes[0] || null;
  renderLooseNotes(); renderLooseEditor(); renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
  showToast(`笔记已移动到「${targetCollection.title}」`);
  scheduleSyncToWorkspace();
}

// --- 主题三点菜单 ---
function openLooseNoteContextMenu(btn) {
  const noteId = btn.dataset.note;
  const note = looseNotes.find(n => n.id === noteId);
  if (!note) return;
  closeAllContextMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-ctx-action="move-to-collection">移动到笔记集…</button>
    <button data-ctx-action="move-to-trash" data-ctx-note="${noteId}">移入回收站</button>
    <button data-ctx-action="delete" data-ctx-note="${noteId}" class="ctx-danger">彻底删除</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    const nid = e.target.dataset.ctxNote;
    if (!ctxAction) return;
    closeAllContextMenus();
    if (ctxAction === 'move-to-collection') {
      openPickCollectionModal({
        title: '移动笔记',
        message: `将 <b>"${escapeHtml(note.title)}"</b> 移动到指定笔记集`,
        onPick: target => moveLooseNoteToCollection(note, target)
      });
    } else if (ctxAction === 'move-to-trash') {
      addToTrash(note, '零散笔记');
      const idx = looseNotes.findIndex(n => n.id === nid);
      looseNotes.splice(idx, 1);
      selectedLooseNote = looseNotes[0] || null;
      renderLooseNotes(); renderLooseEditor(); updateNavCounts();
      showToast('笔记已移入回收站');
    scheduleSyncToWorkspace();
    } else if (ctxAction === 'delete') {
      openDeleteLoosePermanentlyModal(note);
    }
  });
}

function openDeleteLoosePermanentlyModal(note) {
  const body = `<p class="modal-text">确定彻底删除 <b>"${escapeHtml(note.title)}"</b> 吗？</p><p class="modal-subtext">此操作无法撤销，笔记将被永久删除。</p>`;
  const footer = `<button class="cancel-button" id="dlp-cancel">取消</button><button class="danger-button" id="dlp-confirm">彻底删除</button>`;
  openModal('彻底删除', body, footer);
  $('#dlp-cancel').addEventListener('click', closeModal);
  $('#dlp-confirm').addEventListener('click', () => {
    const idx = looseNotes.findIndex(n => n.id === note.id);
    looseNotes.splice(idx, 1);
    selectedLooseNote = looseNotes[0] || null;
    closeModal();
    renderLooseNotes(); renderLooseEditor(); updateNavCounts();
      showToast('笔记已彻底删除');
      scheduleSyncToWorkspace();
  });
}

function openGroupContextMenu(btn, groupId) {
  closeAllContextMenus();
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-ctx-action="add-collection" data-ctx-group="${groupId}">在该主题内新增笔记集</button>
    <button data-ctx-action="rename" data-ctx-group="${groupId}">重命名主题</button>
    <button data-ctx-action="pin" data-ctx-group="${groupId}">${group.pinned ? '取消置顶' : '置顶主题'}</button>
    <button data-ctx-action="delete" data-ctx-group="${groupId}" class="ctx-danger">删除主题</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    if (!ctxAction) return;
    const gid = e.target.dataset.ctxGroup;
    closeAllContextMenus();
    if (ctxAction === 'add-collection') openAddCollectionToGroupModal(gid);
    else if (ctxAction === 'rename') openRenameGroupModal(gid);
    else if (ctxAction === 'pin') togglePinGroup(gid);
    else if (ctxAction === 'delete') openDeleteGroupModal(gid);
  });
}

// --- 回收站笔记三点菜单 ---
function openTrashNoteContextMenu(btn) {
  const trashId = btn.dataset.id;
  const item = trash.find(t => t.id === trashId);
  if (!item) return;
  closeAllContextMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = item.type === 'collection'
    ? `
    <button data-ctx-action="restore-collection">恢复为笔记集…</button>
    <button data-ctx-action="perm-delete" class="ctx-danger">永久删除</button>
  `
    : `
    <button data-ctx-action="restore-to">恢复到指定笔记集…</button>
    <button data-ctx-action="restore-loose">恢复到零散笔记</button>
    <button data-ctx-action="perm-delete" class="ctx-danger">永久删除</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    if (!ctxAction) return;
    closeAllContextMenus();
    if (ctxAction === 'restore-to') openPickCollectionModal({
      title: '恢复笔记',
      message: `将 <b>"${escapeHtml(item.title)}"</b> 恢复到指定笔记集`,
      onPick: target => restoreTrashToCollection(item, target)
    });
    else if (ctxAction === 'restore-loose') restoreNote(trashId);
    else if (ctxAction === 'restore-collection') openRestoreCollectionToGroup(item);
    else if (ctxAction === 'perm-delete') permanentDelete(trashId);
  });
}

// 回收站笔记 → 指定笔记集（两步式）
function restoreTrashToCollection(item, targetCollection) {
  const idx = trash.findIndex(t => t.id === item.id);
  if (idx < 0) return;
  trash.splice(idx, 1);
  targetCollection.notes.unshift({ id: genId('note'), title: item.title, content: item.content });
  targetCollection.updated = '刚刚';
  targetCollection.notesExpanded = true;
  renderTrash(); renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
  showToast(`笔记已恢复到「${targetCollection.title}」`);
  scheduleSyncToWorkspace();
}

// 回收站「整集」→ 选主题恢复为笔记集
function openRestoreCollectionToGroup(item) {
  if (item.type !== 'collection' || !item.collection) { showToast('该条目不是笔记集'); return; }
  const groupOptions = getSortedGroups().map(g => `<option value="${g.id}">${escapeHtml(g.title)}</option>`).join('');
  const body = `
    <p class="modal-text">将笔记集 <b>"${escapeHtml(item.collection.title)}"</b> 恢复为笔记集，放入：</p>
    <label>选择目标主题<select id="rc-group">${groupOptions}</select></label>`;
  const footer = `<button class="cancel-button" id="rc-cancel">取消</button><button class="submit-button" id="rc-confirm">恢复</button>`;
  openModal('恢复笔记集', body, footer);
  $('#rc-cancel').addEventListener('click', closeModal);
  $('#rc-confirm').addEventListener('click', () => {
    const gid = $('#rc-group').value;
    const group = groups.find(g => g.id === gid);
    if (!group) { showToast('目标主题不存在'); return; }
    restoreTrashCollection(item, group);
    closeModal();
  });
}
function restoreTrashCollection(item, group) {
  const col = item.collection;
  let title = col.title;
  if (group.collections.some(c => c.title === title)) title = `${col.title} (恢复)`;
  const newCol = {
    id: genId('col'),
    title,
    description: col.description || '',
    color: col.color || 'coral',
    notesExpanded: true,
    updated: '刚刚',
    notes: (col.notes || []).map(n => ({ id: genId('note'), title: n.title, content: n.content }))
  };
  group.collections.unshift(newCol);
  const idx = trash.findIndex(t => t.id === item.id);
  if (idx >= 0) trash.splice(idx, 1);
  selectedGroup = group;
  selectedCollection = newCol;
  selectedNote = newCol.notes[0] || null;
  filteredGroups = getSortedGroups();
  renderGroupTree(); renderCollections(); renderEditor(); renderTrash(); updateNavCounts();
  showToast(`笔记集「${title}」已恢复到「${group.title}」`);
  scheduleSyncToWorkspace();
}

// --- 笔记集三点菜单 ---
function openCollectionContextMenu(btn) {
  if (!selectedCollection) return;
  closeAllContextMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-ctx-action="add-note">新增笔记</button>
    <button data-ctx-action="move-loose">移入零散笔记</button>
    <button data-ctx-action="rename">重命名笔记集</button>
    <button data-ctx-action="delete" class="ctx-danger">删除笔记集</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    if (!ctxAction) return;
    closeAllContextMenus();
    if (ctxAction === 'add-note') openCreateNoteModal();
    else if (ctxAction === 'move-loose') moveCollectionToLoose();
    else if (ctxAction === 'rename') renameCollection();
    else if (ctxAction === 'delete') openDeleteCollectionModal();
  });
}

// --- 将整个笔记集的笔记移入零散笔记，并移除该笔记集 ---
function moveCollectionToLoose() {
  if (!selectedCollection) return;
  const col = selectedCollection;
  const count = col.notes.length;
  const group = findGroupOfCollection(col.id);
  if (!group) return;
  col.notes.forEach(n => looseNotes.unshift({ id: genId('loose'), title: n.title, content: n.content }));
  const idx = group.collections.findIndex(c => c.id === col.id);
  if (idx >= 0) group.collections.splice(idx, 1);
  // 重新选择：优先同主题下的相邻笔记集
  if (group.collections.length > 0) {
    selectedCollection = group.collections[Math.max(0, idx - 1)];
    selectedNote = selectedCollection.notes[0] || null;
  } else {
    const og = groups.find(g => g.collections.length > 0);
    if (og) { selectedGroup = og; selectedCollection = og.collections[0]; selectedNote = selectedCollection.notes[0] || null; }
    else { selectedCollection = null; selectedNote = null; }
  }
  filteredGroups = getSortedGroups();
  renderGroupTree(); renderCollections(); renderEditor(); renderLooseNotes(); renderLooseEditor(); updateNavCounts();
  showToast(`「${col.title}」已移入零散笔记（${count} 篇）`);
  scheduleSyncToWorkspace();
}

// --- 菜单位置定位 ---
function positionContextMenu(menu, anchor) {
  menu.style.visibility = 'hidden';
  document.body.appendChild(menu);
  const rect = anchor.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  let left = rect.right - menuRect.width;
  let top = rect.bottom + 4;
  if (left < 8) left = 8;
  if (top + menuRect.height > window.innerHeight - 8) top = rect.top - menuRect.height - 4;
  menu.remove();
  menu.style.left = left + 'px';
  menu.style.top = top + 'px';
  menu.style.visibility = 'visible';
}

// 点击空白处关闭三点菜单
document.addEventListener('click', e => {
  if (!e.target.closest('.context-menu') && !e.target.closest('.tree-group-menu') && !e.target.closest('.collection-menu-btn')) {
    closeAllContextMenus();
  }
});

function renameCollection() {
  if (!selectedCollection) return;
  const body = `<label>笔记集名称<input id="rn-title" maxlength="40" value="${escapeHtml(selectedCollection.title)}" /></label>`;
  const footer = `<button class="cancel-button" id="rn-cancel">取消</button><button class="submit-button" id="rn-submit">保存</button>`;
  openModal('重命名笔记集', body, footer);
  $('#rn-cancel').addEventListener('click', closeModal);
  $('#rn-submit').addEventListener('click', () => {
    const title = $('#rn-title').value.trim();
    if (!title) { showToast('请输入名称'); return; }
    selectedCollection.title = title;
    selectedCollection.updated = '刚刚';
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('名称已修改');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#rn-title').focus(), 50);
}

// 编辑器（笔记集）
let saveSyncTimer = null;
function scheduleSyncToWorkspace() {
  clearTimeout(saveSyncTimer);
  saveSyncTimer = setTimeout(syncToWorkspace, 3000);
}
async function syncToWorkspace() {
  try {
    await window.api.sync({groups, looseNotes, trash});
  } catch (e) {
    console.error('Workspace sync error:', e);
  }
}
$('#markdown-editor').addEventListener('input', e => {
  if (!selectedNote) return;
  selectedNote.content = e.target.value;
  $('#save-status').textContent = '编辑中…';
  updatePreview(); updateWordCount();
  clearTimeout(window.saveTimer);
  window.saveTimer = setTimeout(() => { $('#save-status').textContent = '已保存'; }, 500);
  scheduleSyncToWorkspace();
});
$('#preview-toggle').addEventListener('click', () => {
  const editor = $('#markdown-editor');
  const preview = $('#markdown-preview');
  const previewing = !preview.classList.contains('hidden');
  preview.classList.toggle('hidden', previewing);
  editor.classList.toggle('hidden', !previewing);
  $('#preview-toggle').textContent = previewing ? '预览' : '编辑';
});

// 零散笔记列表
$('#loose-notes-list').addEventListener('click', e => {
  if (e.target.dataset.action === 'open-loose-menu') { e.stopPropagation(); openLooseNoteContextMenu(e.target); return; }
  const item = e.target.closest('.loose-note-item');
  if (item) {
    selectedLooseNote = looseNotes.find(n => n.id === item.dataset.note);
    renderLooseNotes(); renderLooseEditor();
  }
});
$('#loose-markdown-editor').addEventListener('input', e => {
  if (!selectedLooseNote) return;
  selectedLooseNote.content = e.target.value;
  $('#loose-save-status').textContent = '编辑中…';
  $('#loose-markdown-preview').innerHTML = markdownToHtml(e.target.value);
  $('#loose-word-count').textContent = `${e.target.value.replace(/\s/g, '').length} 字`;
  clearTimeout(window.looseSaveTimer);
  window.looseSaveTimer = setTimeout(() => { $('#loose-save-status').textContent = '已保存'; }, 500);
  scheduleSyncToWorkspace();
});
$('#loose-preview-toggle').addEventListener('click', () => {
  const editor = $('#loose-markdown-editor');
  const preview = $('#loose-markdown-preview');
  const previewing = !preview.classList.contains('hidden');
  preview.classList.toggle('hidden', previewing);
  editor.classList.toggle('hidden', !previewing);
  $('#loose-preview-toggle').textContent = previewing ? '预览' : '编辑';
});

// 回收站
$('#trash-list').addEventListener('click', e => {
  if (e.target.dataset.action === 'open-trash-menu') { e.stopPropagation(); openTrashNoteContextMenu(e.target); return; }
});
$('#btn-empty-trash').addEventListener('click', openEmptyTrashModal);

// 零散笔记 / 回收站不再内置搜索框（独立搜索视图已覆盖 §4.1）

// 全局搜索（独立视图）
$('#global-search').addEventListener('input', e => runSearch(e.target.value));
$('#global-search').addEventListener('keydown', e => {
  if (e.key === 'Enter' && searchResults.length) { e.preventDefault(); jumpToSearchResult(searchResults[0]); }
});
$('#search-results').addEventListener('click', e => {
  const card = e.target.closest('.search-result-card');
  if (card) { const idx = Number(card.dataset.index); jumpToSearchResult(searchResults[idx]); }
});

// 笔记集视图不再内置搜索框（已有独立搜索视图 §4.1），相关过滤逻辑已移除

// 按钮
$('#add-collection').addEventListener('click', openCreateCollectionModal);
$('#add-group').addEventListener('click', openCreateGroupModal);
$('#add-loose-note').addEventListener('click', openCreateLooseNoteModal);
$('#btn-settings').addEventListener('click', openSettingsModal);

// 侧边栏收起/展开
$('#btn-collapse').addEventListener('click', () => {
  $('#sidebar').classList.add('collapsed');
  $('#sidebar-fab').classList.add('visible');
});
$('#sidebar-fab').addEventListener('click', () => {
  $('#sidebar').classList.remove('collapsed');
  $('#sidebar-fab').classList.remove('visible');
});

// 三栏级联折叠（§4.7）：主题树 → 笔记集 → 编辑器，笔记集折叠须以主题树已折叠为前提
// 三栏级联折叠（§4.7）：底部圆形开关 + 渐进式显隐
$('#dock-collapse').addEventListener('click', dockCollapse);
$('#dock-expand').addEventListener('click', dockExpand);

// 深色模式（持久化）
$('#theme-toggle').addEventListener('click', () => {
  settings.theme = document.body.classList.contains('dark') ? 'light' : 'dark';
  applyTheme();
  persistSettings();
  showToast(settings.theme === 'dark' ? '已切换深色模式' : '已切换浅色模式');
});

// 键盘快捷键
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    switchView('search');
    setTimeout(() => $('#global-search').focus(), 0);
  }
  // 三栏折叠快捷键（§4.7，受顺序约束）
  if (e.altKey && (e.key === '1' || e.key === '!')) { e.preventDefault(); dockCollapse(); }
  if (e.altKey && (e.key === '2' || e.key === '@')) { e.preventDefault(); dockExpand(); }
});

// ==================== 初始化 ====================
async function init() {
  await loadSettingsState();
  try {
    const data = await window.api.scan();
    if (data.error) throw new Error(data.error);
    const hasData = (data.groups && data.groups.length > 0) ||
                    (data.looseNotes && data.looseNotes.length > 0) ||
                    (data.trash && data.trash.length > 0);
    if (hasData) {
      groups.length = 0;
      if (data.groups) data.groups.forEach(g => groups.push(g));
      sortGroupsAZ();
      looseNotes.length = 0;
      if (data.looseNotes) data.looseNotes.forEach(n => looseNotes.push(n));
      trash.length = 0;
      if (data.trash) data.trash.forEach(t => trash.push(t));
    } else {
      await syncToWorkspace();
    }
  } catch (e) {
    console.error('Init: workspace scan failed, using demo data');
  }

  // 设置初始选中状态
  selectedGroup = groups[0] || null;
  selectedCollection = selectedGroup?.collections?.[0] || null;
  selectedNote = selectedCollection?.notes?.[0] || null;
  selectedLooseNote = looseNotes[0] || null;
  filteredGroups = getSortedGroups();

  renderGroupTree();
  renderCollections();
  renderEditor();
  updateNavCounts();

  // 监听外部文件变更（agent 写文件 / 其它进程改工作区）→ 重新扫描并刷新界面。
  // main.js sync() 已加固：仅删“有侧车且模型已移除”的文件/目录，外部 agent 新增内容会被保留。
  if (window.api.onWorkspaceChanged) {
    window.api.onWorkspaceChanged(async () => {
      try {
        // 先把还停在内存、未落盘的编辑写回磁盘，避免 rescan 用旧磁盘内容覆盖当前输入
        if (saveSyncTimer) { clearTimeout(saveSyncTimer); await syncToWorkspace(); }
        const data = await window.api.scan();
        if (data.error) return;
        if (data.groups) { groups.length = 0; data.groups.forEach(g => groups.push(g)); sortGroupsAZ(); }
        if (data.looseNotes) { looseNotes.length = 0; data.looseNotes.forEach(n => looseNotes.push(n)); }
        if (data.trash) { trash.length = 0; data.trash.forEach(t => trash.push(t)); }
        filteredLooseNotes = looseNotes;
        filteredTrash = trash;
        filteredGroups = getSortedGroups();
        // 重解析选中态：arrays 已被替换，旧引用失效，按 id 尽量保持原选中项
        selectedGroup = groups.find(g => g.id === (selectedGroup && selectedGroup.id)) || groups[0] || null;
        selectedCollection = selectedGroup
          ? (selectedGroup.collections.find(c => c.id === (selectedCollection && selectedCollection.id)) || selectedGroup.collections[0] || null)
          : null;
        selectedNote = selectedCollection
          ? (selectedCollection.notes.find(n => n.id === (selectedNote && selectedNote.id)) || selectedCollection.notes[0] || null)
          : null;
        selectedLooseNote = looseNotes.find(n => n.id === (selectedLooseNote && selectedLooseNote.id)) || null;
        // 按当前视图刷新对应面板（避免只刷新笔记集视图而漏掉零散/回收站）
        renderGroupTree();
        renderCollections();
        renderEditor();
        if (currentView === 'loose') { renderLooseNotes(); renderLooseEditor(); }
        else if (currentView === 'trash') { renderTrash(); }
        updateNavCounts();
      } catch (e) { console.error('workspace-changed handler error:', e); }
    });
  }
}

init();
