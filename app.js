// ==================== 数据模型 ====================
const groups = [
  { id: 'g-work', title: '工作', expanded: true, pinned: false, collections: [
    { id: 'product', title: '产品与工作', description: '工作中的思考、计划与复盘', color: 'coral', notesExpanded: true, updated: '今天 09:42', notes: [
      { id: 'product-1', title: '关于个人知识管理的一些思考', content: '# 关于个人知识管理的一些思考\n\n信息不等于知识，知识也不等于智慧。\n\n## 我的三个原则\n\n- 让记录足够简单\n- 让回顾成为习惯\n- 让想法彼此连接', favorite: false },
      { id: 'product-2', title: '2025 年第二季度目标', content: '# 2025 年第二季度目标\n\n> 少做一点，但做深。\n\n## 重点方向\n\n- 完成产品新版本\n- 每周留出半天深度工作\n- 建立稳定的复盘习惯', favorite: false },
      { id: 'product-3', title: '设计系统学习笔记', content: '# 设计系统学习笔记\n\n好的设计系统不是限制创造力，而是让团队把精力用在更重要的地方。', favorite: false }
    ]}
  ]},
  { id: 'g-read', title: '阅读', expanded: true, pinned: false, collections: [
    { id: 'reading', title: '阅读与输入', description: '书籍、文章和值得保留的观点', color: 'blue', notesExpanded: true, updated: '6 月 10 日', notes: [
      { id: 'reading-1', title: '读《置身事内》', content: '# 读《置身事内》\n\n记录一些触动我的章节和观点。\n\n## 一个值得反复想的问题\n\n我们如何共同塑造身处的环境？', favorite: false },
      { id: 'reading-2', title: '待读清单', content: '# 待读清单\n\n- 《纳瓦尔宝典》\n- 《有限与无限的游戏》\n- 《卡片笔记写作法》', favorite: false }
    ]}
  ]},
  { id: 'g-life', title: '生活', expanded: true, pinned: false, collections: [
    { id: 'life', title: '生活记录', description: '日记、旅行与生活中的小事', color: 'green', notesExpanded: true, updated: '6 月 08 日', notes: [
      { id: 'life-1', title: '周末去看展', content: '# 周末去看展\n\n很久没有留出一整天给自己了。看看展览，走走路，或许会有新的发现。', favorite: false }
    ]}
  ]}
];

// 默认按首字母 A-Z 排序分组
function sortGroupsAZ() {
  groups.sort((a, b) => a.title.localeCompare(b.title, 'zh'));
  groups.forEach(g => g.collections.sort((a, b) => a.title.localeCompare(b.title, 'zh')));
}
sortGroupsAZ();

const looseNotes = [];
const trash = [];
const settings = { trashLimit: 30 };

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

// --- 新建聚合体弹窗 ---
function openCreateCollectionModal() {
  const groupOptions = groups.map(g => `<option value="${g.id}">${g.title}</option>`).join('');
  const body = `
    <label>聚合体名称<input id="mc-title" maxlength="40" placeholder="例如：产品研究" /></label>
    <label>描述<textarea id="mc-description" maxlength="100" placeholder="简单描述这个聚合体的用途"></textarea></label>
    <label>所属分组<select id="mc-group">${groupOptions}</select></label>
    <label>或新建分组<input id="mc-newgroup" maxlength="20" placeholder="输入新分组名称（可选）" /></label>
    <label>预置笔记模板<select id="mc-template"><option value="3">3 篇基础模板</option><option value="1">1 篇空白笔记</option><option value="0">暂不创建笔记</option></select></label>`;
  const footer = `<button class="cancel-button" id="mc-cancel">取消</button><button class="submit-button" id="mc-submit">创建聚合体</button>`;
  openModal('新建聚合体', body, footer);
  $('#mc-cancel').addEventListener('click', closeModal);
  $('#mc-submit').addEventListener('click', () => {
    const title = $('#mc-title').value.trim();
    if (!title) { showToast('请输入聚合体名称'); return; }
    const groupId = $('#mc-group').value;
    const newGroupName = $('#mc-newgroup').value.trim();
    const id = `collection-${Date.now()}`;
    const templateCount = Number($('#mc-template').value);
    const names = ['概览', '待办事项', '灵感与资料'].slice(0, templateCount);
    const collection = { id, title, description: $('#mc-description').value.trim(), color: 'purple', notesExpanded: true, updated: '刚刚', notes: names.map((n, i) => ({ id: `${id}-${i}`, title: n, content: `# ${n}\n\n在这里开始记录……`, favorite: false })) };
    let targetGroup;
    if (newGroupName) { targetGroup = { id: `g-${Date.now()}`, title: newGroupName, expanded: true, collections: [] }; groups.push(targetGroup); }
    else { targetGroup = groups.find(g => g.id === groupId) || groups[0]; }
    targetGroup.collections.unshift(collection);
    targetGroup.expanded = true;
    selectedGroup = targetGroup;
    selectedCollection = collection;
    selectedNote = collection.notes[0] || null;
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('聚合体已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mc-title').focus(), 50);
}

// --- 新建分组弹窗 ---
function openCreateGroupModal() {
  const body = `<label>分组名称<input id="mg-title" maxlength="20" placeholder="例如：学习" /></label>`;
  const footer = `<button class="cancel-button" id="mg-cancel">取消</button><button class="submit-button" id="mg-submit">创建分组</button>`;
  openModal('新建分组', body, footer);
  $('#mg-cancel').addEventListener('click', closeModal);
  $('#mg-submit').addEventListener('click', () => {
    const title = $('#mg-title').value.trim();
    if (!title) { showToast('请输入分组名称'); return; }
    const group = { id: `g-${Date.now()}`, title, expanded: true, pinned: false, collections: [] };
    groups.push(group);
    sortGroupsAZ();
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree();
    showToast('分组已创建');
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
    const title = $('#ml-title').value.trim() || '未命名笔记';
    const note = { id: `loose-${Date.now()}`, title, content: `# ${title}\n\n在这里开始记录……`, favorite: false };
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

// --- 新建笔记（聚合体内）弹窗 ---
function openCreateNoteModal() {
  const body = `<label>笔记标题<input id="mn-title" maxlength="40" placeholder="例如：灵感记录" /></label>`;
  const footer = `<button class="cancel-button" id="mn-cancel">取消</button><button class="submit-button" id="mn-submit">创建笔记</button>`;
  openModal('新建笔记', body, footer);
  $('#mn-cancel').addEventListener('click', closeModal);
  $('#mn-submit').addEventListener('click', () => {
    const title = $('#mn-title').value.trim() || '未命名笔记';
    if (!selectedCollection) return;
    const note = { id: `note-${Date.now()}`, title, content: `# ${title}\n\n在这里开始记录……`, favorite: false };
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

// --- 删除聚合体确认弹窗 ---
function openDeleteCollectionModal() {
  if (!selectedCollection) return;
  const noteCount = selectedCollection.notes.length;
  const body = `
    <p class="modal-text">确定删除聚合体 <b>"${escapeHtml(selectedCollection.title)}"</b> 吗？</p>
    <p class="modal-subtext">该聚合体包含 ${noteCount} 篇笔记。</p>
    <div class="modal-radio-group">
      <label class="modal-radio">将 ${noteCount} 篇笔记归入零散笔记 <input type="radio" name="del-col" value="loose" checked /></label>
      <label class="modal-radio">将 ${noteCount} 篇笔记移入回收站 <input type="radio" name="del-col" value="trash" /></label>
    </div>`;
  const footer = `<button class="cancel-button" id="dc-cancel">取消</button><button class="danger-button" id="dc-confirm">删除聚合体</button>`;
  openModal('删除聚合体', body, footer);
  $('#dc-cancel').addEventListener('click', closeModal);
  $('#dc-confirm').addEventListener('click', () => {
    const choice = document.querySelector('input[name="del-col"]:checked').value;
    const notes = selectedCollection.notes;
    if (choice === 'loose') {
      notes.forEach(n => looseNotes.unshift({ ...n, id: `loose-${Date.now()}-${n.id}` }));
    } else {
      notes.forEach(n => addToTrash(n, selectedCollection.title));
    }
    const group = groups.find(g => g.id === selectedGroup.id);
    const idx = group.collections.findIndex(c => c.id === selectedCollection.id);
    group.collections.splice(idx, 1);
    if (group.collections.length > 0) {
      selectedCollection = group.collections[Math.max(0, idx - 1)];
      selectedNote = selectedCollection.notes[0] || null;
    } else {
      const og = groups.find(g => g.collections.length > 0);
      if (og) { selectedGroup = og; selectedCollection = og.collections[0]; selectedNote = selectedCollection.notes[0] || null; }
      else { selectedCollection = null; selectedNote = null; }
    }
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(choice === 'loose' ? '聚合体已删除，笔记已归入零散笔记' : '聚合体已删除，笔记已移入回收站');
    scheduleSyncToWorkspace();
  });
}

// --- 删除分组确认弹窗 ---
function openDeleteGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const totalNotes = group.collections.reduce((t, c) => t + c.notes.length, 0);
  const body = `
    <p class="modal-text">确定删除分组 <b>"${escapeHtml(group.title)}"</b> 吗？</p>
    <p class="modal-subtext">该分组包含 ${group.collections.length} 个聚合体、${totalNotes} 篇笔记。</p>
    <div class="modal-radio-group">
      <label class="modal-radio">将 ${totalNotes} 篇笔记归入零散笔记 <input type="radio" name="del-grp" value="loose" checked /></label>
      <label class="modal-radio">将 ${totalNotes} 篇笔记移入回收站 <input type="radio" name="del-grp" value="trash" /></label>
    </div>`;
  const footer = `<button class="cancel-button" id="dg-cancel">取消</button><button class="danger-button" id="dg-confirm">删除分组</button>`;
  openModal('删除分组', body, footer);
  $('#dg-cancel').addEventListener('click', closeModal);
  $('#dg-confirm').addEventListener('click', () => {
    const choice = document.querySelector('input[name="del-grp"]:checked').value;
    group.collections.forEach(c => {
      if (choice === 'loose') { c.notes.forEach(n => looseNotes.unshift({ ...n, id: `loose-${Date.now()}-${n.id}` })); }
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
    showToast(choice === 'loose' ? '分组已删除，笔记已归入零散笔记' : '分组已删除，笔记已移入回收站');
    scheduleSyncToWorkspace();
  });
}

// --- 重命名分组弹窗 ---
function openRenameGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const body = `<label>分组名称<input id="rg-title" maxlength="20" value="${escapeHtml(group.title)}" /></label>`;
  const footer = `<button class="cancel-button" id="rg-cancel">取消</button><button class="submit-button" id="rg-submit">保存</button>`;
  openModal('重命名分组', body, footer);
  $('#rg-cancel').addEventListener('click', closeModal);
  $('#rg-submit').addEventListener('click', () => {
    const title = $('#rg-title').value.trim();
    if (!title) { showToast('请输入名称'); return; }
    group.title = title;
    sortGroupsAZ();
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('分组已重命名');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#rg-title').focus(), 50);
}

// --- 置顶/取消置顶分组 ---
function togglePinGroup(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  group.pinned = !group.pinned;
  filteredGroups = getSortedGroups();
  renderGroupTree();
  showToast(group.pinned ? '分组已置顶' : '已取消置顶');
  scheduleSyncToWorkspace();
}

// --- 在分组内新增聚合体弹窗 ---
function openAddCollectionToGroupModal(groupId) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  const body = `
    <label>聚合体名称<input id="mcg-title" maxlength="40" placeholder="例如：产品研究" /></label>
    <label>描述<textarea id="mcg-description" maxlength="100" placeholder="简单描述这个聚合体的用途"></textarea></label>
    <label>预置笔记模板<select id="mcg-template"><option value="3">3 篇基础模板</option><option value="1">1 篇空白笔记</option><option value="0">暂不创建笔记</option></select></label>`;
  const footer = `<button class="cancel-button" id="mcg-cancel">取消</button><button class="submit-button" id="mcg-submit">创建聚合体</button>`;
  openModal('在「' + group.title + '」内新增聚合体', body, footer);
  $('#mcg-cancel').addEventListener('click', closeModal);
  $('#mcg-submit').addEventListener('click', () => {
    const title = $('#mcg-title').value.trim();
    if (!title) { showToast('请输入聚合体名称'); return; }
    const id = `collection-${Date.now()}`;
    const templateCount = Number($('#mcg-template').value);
    const names = ['概览', '待办事项', '灵感与资料'].slice(0, templateCount);
    const collection = { id, title, description: $('#mcg-description').value.trim(), color: 'purple', notesExpanded: true, updated: '刚刚', notes: names.map((n, i) => ({ id: `${id}-${i}`, title: n, content: `# ${n}\n\n在这里开始记录……`, favorite: false })) };
    group.collections.unshift(collection);
    sortGroupsAZ();
    group.expanded = true;
    selectedGroup = group;
    selectedCollection = collection;
    selectedNote = collection.notes[0] || null;
    filteredGroups = getSortedGroups();
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('聚合体已创建');
    scheduleSyncToWorkspace();
  });
  setTimeout(() => $('#mcg-title').focus(), 50);
}

// --- 获取排序后的分组（置顶优先，其余按首字母） ---
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

async function loadWorkspacePath() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    workspacePath = data.workspacePath || '';
  } catch (e) {
    workspacePath = '';
  }
}

function openSettingsModal() {
  loadWorkspacePath().then(() => {
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
        }
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
    const res = await fetch('/api/workspace');
    if (!res.ok) throw new Error('扫描失败');
    const data = await res.json();
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
      const res = await fetch('/api/migrate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({newPath, transfer})
      });
      const data = await res.json();
      if (data.ok) {
        workspacePath = newPath;
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
  trash.unshift({ id: `trash-${Date.now()}-${note.id}`, title: note.title, content: note.content, source: source || '未知', deletedAt: new Date().toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) });
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
  looseNotes.unshift({ id: `loose-${Date.now()}`, title: item.title, content: item.content, favorite: false });
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
    $('#breadcrumbs').innerHTML = '<span>我的空间</span><i>/</i><b>聚合体</b>';
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
  }
}

// ==================== 组树渲染 ====================
function renderGroupTree(list = filteredGroups) {
  const tree = $('#group-tree');
  tree.innerHTML = list.map(group => {
    const isParentOfSelected = selectedGroup && group.id === selectedGroup.id;
    const collectionsHtml = group.expanded ? group.collections.map(col => {
      const isSelected = col.id === selectedCollection?.id;
      return `<div class="tree-collection-wrapper ${isSelected ? 'selected' : ''}">
        <button class="tree-collection" data-collection="${col.id}" data-group="${group.id}">
          <span class="collection-icon ${col.color}">◈</span>
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
        <span class="tree-group-menu" data-group="${group.id}" title="更多操作">⋯</span>
      </button>
      <div class="tree-children ${group.expanded ? '' : 'collapsed'}">
        ${collectionsHtml}
      </div>
    </div>`;
  }).join('');
  updateNavCounts();
}

// ==================== 聚合体面板渲染 ====================
function renderCollections() {
  const list = $('#collections-list');
  if (!selectedCollection) {
    list.innerHTML = '<div class="empty-state">请从左侧组视图中选择一个聚合体</div>';
    return;
  }
  const col = selectedCollection;
  const expanded = col.notesExpanded !== false;
  list.innerHTML = `<article class="collection-card selected">
    <div class="collection-card-top">
      <span class="collection-icon ${col.color}">◈</span>
      <span class="collection-count">${col.notes.length} 篇</span>
    </div>
    <div class="collection-title-row">
      <h2>${escapeHtml(col.title)}</h2>
      <div class="collection-actions">
        <button class="collection-menu-btn" data-action="open-menu" title="更多操作">⋯</button>
      </div>
    </div>
    <p>${escapeHtml(col.description || '暂无描述')}</p>
    <div class="collection-notes ${expanded ? '' : 'collapsed'}">
      <button class="notes-toggle" data-action="toggle-notes">
        <span class="notes-toggle-chevron ${expanded ? 'expanded' : ''}">▶</span>
        <span>笔记列表 (${col.notes.length})</span>
      </button>
      <div class="notes-list ${expanded ? '' : 'hidden'}">
        ${col.notes.map(note => `<button class="collection-note ${note.id === selectedNote?.id ? 'active' : ''}" data-note="${note.id}">
          <span class="note-bullet">${note.favorite ? '★' : '·'}</span>
          <span class="note-title-text">${escapeHtml(note.title)}</span>
          <i data-action="delete-note" data-note="${note.id}" title="删除笔记">×</i>
        </button>`).join('')}
      </div>
    </div>
    <div class="collection-meta"><span>${col.updated}</span></div>
  </article>`;
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
    bc.innerHTML = '<span>我的空间</span><i>/</i><b>聚合体</b>';
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
      <button class="loose-note-item ${note.id === selectedLooseNote?.id ? 'active' : ''}" data-note="${note.id}">
        <span class="note-bullet">${note.favorite ? '★' : '·'}</span>
        <span class="note-title-text">${escapeHtml(note.title)}</span>
        <span class="loose-note-menu" data-action="open-loose-menu" data-note="${note.id}" title="更多操作">⋯</span>
      </button>`).join('');
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
  if (trash.length === 0) {
    container.innerHTML = '<div class="empty-state">回收站为空</div>';
  } else if (list.length === 0) {
    container.innerHTML = '<div class="empty-state">没有匹配的笔记</div>';
  } else {
    container.innerHTML = list.map(item => `
      <div class="trash-item">
        <div class="trash-item-info">
          <span class="trash-item-title">${escapeHtml(item.title)}</span>
          <span class="trash-item-meta">来源：${escapeHtml(item.source)} · 删除于 ${item.deletedAt}</span>
        </div>
        <div class="trash-item-actions">
          <button data-action="open-trash-menu" data-id="${item.id}" title="更多操作">⋯</button>
        </div>
      </div>`).join('');
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

// ==================== 导航计数 ====================
function updateNavCounts() {
  $('#note-count').textContent = countAllNotes();
}

// ==================== 事件绑定 ====================

// 导航切换
$('#nav-collections').addEventListener('click', e => { e.preventDefault(); switchView('collections'); });
$('#nav-loose').addEventListener('click', e => { e.preventDefault(); switchView('loose'); });
$('#nav-trash').addEventListener('click', e => { e.preventDefault(); switchView('trash'); });

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

// 聚合体面板
$('#collections-list').addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'delete-note') { e.stopPropagation(); openDeleteNoteModal(e.target.dataset.note, 'collection'); return; }
  if (action === 'toggle-notes') {
    if (selectedCollection) { selectedCollection.notesExpanded = !selectedCollection.notesExpanded; renderCollections(); }
    return;
  }
  if (action === 'open-menu') { e.stopPropagation(); openCollectionContextMenu(e.target); return; }
  const noteBtn = e.target.closest('.collection-note');
  if (noteBtn) {
    selectedNote = selectedCollection.notes.find(n => n.id === noteBtn.dataset.note);
    renderCollections(); renderEditor();
    return;
  }
});

// --- 移动到聚合体弹窗（零散笔记） ---
function openMoveLooseToCollectionModal(note) {
  const groupOptions = getSortedGroups().map(g => 
    `<optgroup label="${escapeHtml(g.title)}">` +
    g.collections.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('') +
    `</optgroup>`
  ).join('');
  const body = `
    <p class="modal-text">将 <b>"${escapeHtml(note.title)}"</b> 移动到指定聚合体</p>
    <label>选择目标聚合体<select id="mlt-collection">${groupOptions}</select></label>`;
  const footer = `<button class="cancel-button" id="mlt-cancel">取消</button><button class="submit-button" id="mlt-confirm">移动</button>`;
  openModal('移动笔记', body, footer);
  $('#mlt-cancel').addEventListener('click', closeModal);
  $('#mlt-confirm').addEventListener('click', () => {
    const collectionId = $('#mlt-collection').value;
    const targetCollection = findCollectionById(collectionId);
    if (!targetCollection) { showToast('目标聚合体不存在'); return; }
    const idx = looseNotes.findIndex(n => n.id === note.id);
    if (idx < 0) return;
    looseNotes.splice(idx, 1);
    targetCollection.notes.unshift({ id: `note-${Date.now()}`, title: note.title, content: note.content, favorite: false });
    targetCollection.updated = '刚刚';
    targetCollection.notesExpanded = true;
    closeModal();
    renderLooseNotes(); renderLooseEditor(); renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(`笔记已移动到「${targetCollection.title}」`);
    scheduleSyncToWorkspace();
  });
}

// --- 分组三点菜单 ---
function openLooseNoteContextMenu(btn) {
  const noteId = btn.dataset.note;
  const note = looseNotes.find(n => n.id === noteId);
  if (!note) return;
  closeAllContextMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-ctx-action="move-to-collection">移动到聚合体…</button>
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
      openMoveLooseToCollectionModal(note);
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
    <button data-ctx-action="add-collection" data-ctx-group="${groupId}">在该分组内新增聚合体</button>
    <button data-ctx-action="rename" data-ctx-group="${groupId}">重命名分组</button>
    <button data-ctx-action="pin" data-ctx-group="${groupId}">${group.pinned ? '取消置顶' : '置顶分组'}</button>
    <button data-ctx-action="delete" data-ctx-group="${groupId}" class="ctx-danger">删除分组</button>
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
  menu.innerHTML = `
    <button data-ctx-action="restore-to">恢复到指定聚合体…</button>
    <button data-ctx-action="restore-loose">恢复到零散笔记</button>
    <button data-ctx-action="perm-delete" class="ctx-danger">永久删除</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    if (!ctxAction) return;
    closeAllContextMenus();
    if (ctxAction === 'restore-to') openRestoreToCollectionModal(trashId);
    else if (ctxAction === 'restore-loose') restoreNote(trashId);
    else if (ctxAction === 'perm-delete') permanentDelete(trashId);
  });
}

// --- 恢复到指定聚合体弹窗 ---
function openRestoreToCollectionModal(trashId) {
  const item = trash.find(t => t.id === trashId);
  if (!item) return;
  const groupOptions = getSortedGroups().map(g => 
    `<optgroup label="${escapeHtml(g.title)}">` +
    g.collections.map(c => `<option value="${c.id}">${escapeHtml(c.title)}</option>`).join('') +
    `</optgroup>`
  ).join('');
  const body = `
    <p class="modal-text">将 <b>"${escapeHtml(item.title)}"</b> 恢复到指定聚合体</p>
    <label>选择目标聚合体<select id="rt-collection">${groupOptions}</select></label>`;
  const footer = `<button class="cancel-button" id="rt-cancel">取消</button><button class="submit-button" id="rt-confirm">恢复</button>`;
  openModal('恢复笔记', body, footer);
  $('#rt-cancel').addEventListener('click', closeModal);
  $('#rt-confirm').addEventListener('click', () => {
    const collectionId = $('#rt-collection').value;
    const targetCollection = findCollectionById(collectionId);
    if (!targetCollection) { showToast('目标聚合体不存在'); return; }
    const idx = trash.findIndex(t => t.id === trashId);
    if (idx < 0) return;
    const item = trash[idx];
    trash.splice(idx, 1);
    targetCollection.notes.unshift({ id: `note-${Date.now()}`, title: item.title, content: item.content, favorite: false });
    targetCollection.updated = '刚刚';
    targetCollection.notesExpanded = true;
    closeModal();
    renderTrash(); renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(`笔记已恢复到「${targetCollection.title}」`);
    scheduleSyncToWorkspace();
  });
}

// --- 聚合体三点菜单 ---
function openCollectionContextMenu(btn) {
  if (!selectedCollection) return;
  closeAllContextMenus();
  const menu = document.createElement('div');
  menu.className = 'context-menu';
  menu.innerHTML = `
    <button data-ctx-action="add-note">新增笔记</button>
    <button data-ctx-action="rename">重命名聚合体</button>
    <button data-ctx-action="delete" class="ctx-danger">删除聚合体</button>
  `;
  positionContextMenu(menu, btn);
  document.body.appendChild(menu);
  menu.addEventListener('click', e => {
    const ctxAction = e.target.dataset.ctxAction;
    if (!ctxAction) return;
    closeAllContextMenus();
    if (ctxAction === 'add-note') openCreateNoteModal();
    else if (ctxAction === 'rename') renameCollection();
    else if (ctxAction === 'delete') openDeleteCollectionModal();
  });
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
  const body = `<label>聚合体名称<input id="rn-title" maxlength="40" value="${escapeHtml(selectedCollection.title)}" /></label>`;
  const footer = `<button class="cancel-button" id="rn-cancel">取消</button><button class="submit-button" id="rn-submit">保存</button>`;
  openModal('重命名聚合体', body, footer);
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

// 编辑器（聚合体）
let saveSyncTimer = null;
function scheduleSyncToWorkspace() {
  clearTimeout(saveSyncTimer);
  saveSyncTimer = setTimeout(syncToWorkspace, 3000);
}
async function syncToWorkspace() {
  try {
    await fetch('/api/workspace', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({groups, looseNotes, trash})
    });
  } catch (e) {
    // 静默失败，不打扰用户
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

// 零散笔记搜索
$('#loose-search').addEventListener('input', e => {
  const kw = e.target.value.trim().toLowerCase();
  filteredLooseNotes = kw ? looseNotes.filter(n => `${n.title}${n.content}`.toLowerCase().includes(kw)) : looseNotes;
  renderLooseNotes(filteredLooseNotes);
});
// 回收站搜索
$('#trash-search').addEventListener('input', e => {
  const kw = e.target.value.trim().toLowerCase();
  filteredTrash = kw ? trash.filter(t => `${t.title}${t.content}`.toLowerCase().includes(kw)) : trash;
  renderTrash(filteredTrash);
});

// 聚合体搜索
$('#search-input').addEventListener('input', e => {
  const kw = e.target.value.trim().toLowerCase();
  if (!kw) { filteredGroups = getSortedGroups(); renderGroupTree(); return; }
  filteredGroups = getSortedGroups().map(g => ({ ...g, expanded: true, collections: g.collections.filter(c => `${c.title}${c.description}${c.notes.map(n => n.title + n.content).join('')}`.toLowerCase().includes(kw)) })).filter(g => g.collections.length > 0);
  renderGroupTree();
});

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

// 深色模式
$('#theme-toggle').addEventListener('click', () => {
  document.body.classList.toggle('dark');
  showToast(document.body.classList.contains('dark') ? '已切换深色模式' : '已切换浅色模式');
});

// 键盘快捷键
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    const activeView = document.querySelector('.view.active');
    const search = activeView?.querySelector('input[type="search"]');
    if (search) search.focus();
  }
});

// ==================== 初始化 ====================
renderGroupTree();
renderCollections();
renderEditor();
updateNavCounts();
