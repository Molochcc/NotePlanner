// ==================== 数据模型 ====================
const groups = [
  { id: 'g-work', title: '工作', expanded: true, collections: [
    { id: 'product', title: '产品与工作', description: '工作中的思考、计划与复盘', color: 'coral', notesExpanded: true, updated: '今天 09:42', notes: [
      { id: 'product-1', title: '关于个人知识管理的一些思考', content: '# 关于个人知识管理的一些思考\n\n信息不等于知识，知识也不等于智慧。\n\n## 我的三个原则\n\n- 让记录足够简单\n- 让回顾成为习惯\n- 让想法彼此连接', favorite: false },
      { id: 'product-2', title: '2025 年第二季度目标', content: '# 2025 年第二季度目标\n\n> 少做一点，但做深。\n\n## 重点方向\n\n- 完成产品新版本\n- 每周留出半天深度工作\n- 建立稳定的复盘习惯', favorite: false },
      { id: 'product-3', title: '设计系统学习笔记', content: '# 设计系统学习笔记\n\n好的设计系统不是限制创造力，而是让团队把精力用在更重要的地方。', favorite: false }
    ]}
  ]},
  { id: 'g-read', title: '阅读', expanded: true, collections: [
    { id: 'reading', title: '阅读与输入', description: '书籍、文章和值得保留的观点', color: 'blue', notesExpanded: true, updated: '6 月 10 日', notes: [
      { id: 'reading-1', title: '读《置身事内》', content: '# 读《置身事内》\n\n记录一些触动我的章节和观点。\n\n## 一个值得反复想的问题\n\n我们如何共同塑造身处的环境？', favorite: false },
      { id: 'reading-2', title: '待读清单', content: '# 待读清单\n\n- 《纳瓦尔宝典》\n- 《有限与无限的游戏》\n- 《卡片笔记写作法》', favorite: false }
    ]}
  ]},
  { id: 'g-life', title: '生活', expanded: true, collections: [
    { id: 'life', title: '生活记录', description: '日记、旅行与生活中的小事', color: 'green', notesExpanded: true, updated: '6 月 08 日', notes: [
      { id: 'life-1', title: '周末去看展', content: '# 周末去看展\n\n很久没有留出一整天给自己了。看看展览，走走路，或许会有新的发现。', favorite: false }
    ]}
  ]}
];

const looseNotes = [];
const trash = [];
const settings = { trashLimit: 30 };

// ==================== 状态 ====================
let currentView = 'collections';
let selectedGroup = groups[0];
let selectedCollection = groups[0].collections[0];
let selectedNote = selectedCollection.notes[0];
let selectedLooseNote = null;
let filteredGroups = groups;
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
function openModal(title, eyebrow, bodyHtml, footerHtml) {
  const container = $('#modal-container');
  container.innerHTML = `
    <div class="modal-header"><div><p class="eyebrow">${eyebrow || ''}</p><h2>${title}</h2></div><button type="button" class="modal-close" id="modal-close-btn">×</button></div>
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
  openModal('新建聚合体', 'NEW COLLECTION', body, footer);
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
    filteredGroups = groups;
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('聚合体已创建');
  });
  setTimeout(() => $('#mc-title').focus(), 50);
}

// --- 新建分组弹窗 ---
function openCreateGroupModal() {
  const body = `<label>分组名称<input id="mg-title" maxlength="20" placeholder="例如：学习" /></label>`;
  const footer = `<button class="cancel-button" id="mg-cancel">取消</button><button class="submit-button" id="mg-submit">创建分组</button>`;
  openModal('新建分组', 'NEW GROUP', body, footer);
  $('#mg-cancel').addEventListener('click', closeModal);
  $('#mg-submit').addEventListener('click', () => {
    const title = $('#mg-title').value.trim();
    if (!title) { showToast('请输入分组名称'); return; }
    const group = { id: `g-${Date.now()}`, title, expanded: true, collections: [] };
    groups.push(group);
    filteredGroups = groups;
    closeModal();
    renderGroupTree();
    showToast('分组已创建');
  });
  setTimeout(() => $('#mg-title').focus(), 50);
}

// --- 新建零散笔记弹窗 ---
function openCreateLooseNoteModal() {
  const body = `<label>笔记标题<input id="ml-title" maxlength="40" placeholder="例如：今天的灵感" /></label>`;
  const footer = `<button class="cancel-button" id="ml-cancel">取消</button><button class="submit-button" id="ml-submit">创建笔记</button>`;
  openModal('新建笔记', 'NEW NOTE', body, footer);
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
  });
  setTimeout(() => $('#ml-title').focus(), 50);
}

// --- 新建笔记（聚合体内）弹窗 ---
function openCreateNoteModal() {
  const body = `<label>笔记标题<input id="mn-title" maxlength="40" placeholder="例如：灵感记录" /></label>`;
  const footer = `<button class="cancel-button" id="mn-cancel">取消</button><button class="submit-button" id="mn-submit">创建笔记</button>`;
  openModal('新建笔记', 'NEW NOTE', body, footer);
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
  });
  setTimeout(() => $('#mn-title').focus(), 50);
}

// --- 删除笔记确认弹窗 ---
function openDeleteNoteModal(noteId, source) {
  const note = source === 'loose' ? looseNotes.find(n => n.id === noteId) : selectedCollection?.notes.find(n => n.id === noteId);
  if (!note) return;
  const body = `<p class="modal-text">确定删除笔记 <b>"${escapeHtml(note.title)}"</b> 吗？</p><p class="modal-subtext">删除后可在回收站找到，最多保留 ${settings.trashLimit} 篇。</p>`;
  const footer = `<button class="cancel-button" id="dn-cancel">取消</button><button class="danger-button" id="dn-confirm">删除</button>`;
  openModal('删除笔记', 'DELETE NOTE', body, footer);
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
      <label class="modal-radio"><input type="radio" name="del-col" value="loose" checked /> 将 ${noteCount} 篇笔记归入零散笔记</label>
      <label class="modal-radio"><input type="radio" name="del-col" value="trash" /> 将 ${noteCount} 篇笔记移入回收站</label>
    </div>`;
  const footer = `<button class="cancel-button" id="dc-cancel">取消</button><button class="danger-button" id="dc-confirm">删除聚合体</button>`;
  openModal('删除聚合体', 'DELETE COLLECTION', body, footer);
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
    filteredGroups = groups;
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(choice === 'loose' ? '聚合体已删除，笔记已归入零散笔记' : '聚合体已删除，笔记已移入回收站');
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
      <label class="modal-radio"><input type="radio" name="del-grp" value="loose" checked /> 将 ${totalNotes} 篇笔记归入零散笔记</label>
      <label class="modal-radio"><input type="radio" name="del-grp" value="trash" /> 将 ${totalNotes} 篇笔记移入回收站</label>
    </div>`;
  const footer = `<button class="cancel-button" id="dg-cancel">取消</button><button class="danger-button" id="dg-confirm">删除分组</button>`;
  openModal('删除分组', 'DELETE GROUP', body, footer);
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
    filteredGroups = groups;
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor(); updateNavCounts();
    showToast(choice === 'loose' ? '分组已删除，笔记已归入零散笔记' : '分组已删除，笔记已移入回收站');
  });
}

// --- 设置弹窗 ---
function openSettingsModal() {
  const body = `
    <label>回收站保留数量<input type="number" id="set-trash-limit" min="1" max="200" value="${settings.trashLimit}" /></label>
    <p class="modal-subtext">超出此数量的最早删除笔记将被永久清除。</p>`;
  const footer = `<button class="cancel-button" id="set-cancel">取消</button><button class="submit-button" id="set-save">保存设置</button>`;
  openModal('设置', 'SETTINGS', body, footer);
  $('#set-cancel').addEventListener('click', closeModal);
  $('#set-save').addEventListener('click', () => {
    const val = parseInt($('#set-trash-limit').value);
    if (isNaN(val) || val < 1) { showToast('请输入有效数字'); return; }
    settings.trashLimit = val;
    enforceTrashLimit();
    closeModal();
    updateNavCounts(); renderTrash();
    showToast('设置已保存');
  });
}

// --- 清空回收站弹窗 ---
function openEmptyTrashModal() {
  if (trash.length === 0) { showToast('回收站已为空'); return; }
  const body = `<p class="modal-text">确定清空回收站吗？</p><p class="modal-subtext">${trash.length} 篇笔记将被永久删除，无法恢复。</p>`;
  const footer = `<button class="cancel-button" id="et-cancel">取消</button><button class="danger-button" id="et-confirm">永久清空</button>`;
  openModal('清空回收站', 'EMPTY TRASH', body, footer);
  $('#et-cancel').addEventListener('click', closeModal);
  $('#et-confirm').addEventListener('click', () => {
    trash.length = 0;
    closeModal();
    renderTrash(); updateNavCounts();
    showToast('回收站已清空');
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
}
function permanentDelete(trashId) {
  const idx = trash.findIndex(t => t.id === trashId);
  if (idx < 0) return;
  const body = `<p class="modal-text">确定永久删除 <b>"${escapeHtml(trash[idx].title)}"</b> 吗？</p><p class="modal-subtext">此操作无法撤销。</p>`;
  const footer = `<button class="cancel-button" id="pd-cancel">取消</button><button class="danger-button" id="pd-confirm">永久删除</button>`;
  openModal('永久删除', 'PERMANENT DELETE', body, footer);
  $('#pd-cancel').addEventListener('click', closeModal);
  $('#pd-confirm').addEventListener('click', () => {
    trash.splice(idx, 1);
    closeModal();
    renderTrash(); updateNavCounts();
    showToast('已永久删除');
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
        <button class="tree-collection-delete" data-group="${group.id}" data-collection="${col.id}" title="删除聚合体">×</button>
      </div>`;
    }).join('') : '';
    return `<div class="tree-group ${isParentOfSelected ? 'highlighted' : ''}" data-group="${group.id}">
      <button class="tree-group-header" data-group="${group.id}">
        <span class="tree-chevron ${group.expanded ? 'expanded' : ''}">▶</span>
        <span class="tree-group-title">${escapeHtml(group.title)}</span>
        <span class="tree-group-count">${group.collections.length}</span>
        <span class="tree-group-delete" data-group="${group.id}" title="删除分组">×</span>
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
        <button data-action="add-note" title="新增笔记">＋</button>
        <button data-action="rename" title="重命名">✎</button>
        <button data-action="delete" title="删除聚合体">×</button>
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
        <i data-action="delete-loose" data-note="${note.id}" title="删除">×</i>
      </button>`).join('');
  }
  $('#loose-note-count').textContent = looseNotes.length;
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
  $('#trash-limit-display').textContent = settings.trashLimit;
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
          <button data-action="restore" data-id="${item.id}" title="恢复">恢复</button>
          <button data-action="perm-delete" data-id="${item.id}" title="永久删除">×</button>
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

// ==================== 导航计数 ====================
function updateNavCounts() {
  $('#nav-collection-count').textContent = countAllCollections();
  $('#nav-loose-count').textContent = looseNotes.length;
  $('#nav-trash-count').textContent = trash.length;
  $('#note-count').textContent = countAllNotes();
  $('#collection-count').textContent = countAllCollections();
  $('#trash-count-heading').textContent = trash.length;
}

// ==================== 事件绑定 ====================

// 导航切换
$('#nav-collections').addEventListener('click', e => { e.preventDefault(); switchView('collections'); });
$('#nav-loose').addEventListener('click', e => { e.preventDefault(); switchView('loose'); });
$('#nav-trash').addEventListener('click', e => { e.preventDefault(); switchView('trash'); });

// 组树
$('#group-tree').addEventListener('click', e => {
  const delGroup = e.target.closest('.tree-group-delete');
  if (delGroup) { e.stopPropagation(); openDeleteGroupModal(delGroup.dataset.group); return; }
  const delCol = e.target.closest('.tree-collection-delete');
  if (delCol) { e.stopPropagation(); selectCollection(delCol.dataset.collection); openDeleteCollectionModal(); return; }
  const header = e.target.closest('.tree-group-header');
  if (header) {
    const group = groups.find(g => g.id === header.dataset.group);
    if (group) { group.expanded = !group.expanded; renderGroupTree(); }
    return;
  }
  const colBtn = e.target.closest('.tree-collection');
  if (colBtn) { selectCollection(colBtn.dataset.collection); return; }
});

// 聚合体面板
$('#collections-list').addEventListener('click', e => {
  const action = e.target.dataset.action;
  if (action === 'delete-note') { e.stopPropagation(); openDeleteNoteModal(e.target.dataset.note, 'collection'); return; }
  if (action === 'delete-loose') { e.stopPropagation(); openDeleteNoteModal(e.target.dataset.note, 'loose'); return; }
  if (action === 'toggle-notes') {
    if (selectedCollection) { selectedCollection.notesExpanded = !selectedCollection.notesExpanded; renderCollections(); }
    return;
  }
  if (action === 'add-note') { e.stopPropagation(); openCreateNoteModal(); return; }
  if (action === 'rename') { e.stopPropagation(); renameCollection(); return; }
  if (action === 'delete') { e.stopPropagation(); openDeleteCollectionModal(); return; }
  const noteBtn = e.target.closest('.collection-note');
  if (noteBtn) {
    selectedNote = selectedCollection.notes.find(n => n.id === noteBtn.dataset.note);
    renderCollections(); renderEditor();
    return;
  }
});

function renameCollection() {
  if (!selectedCollection) return;
  const body = `<label>聚合体名称<input id="rn-title" maxlength="40" value="${escapeHtml(selectedCollection.title)}" /></label>`;
  const footer = `<button class="cancel-button" id="rn-cancel">取消</button><button class="submit-button" id="rn-submit">保存</button>`;
  openModal('重命名聚合体', 'RENAME', body, footer);
  $('#rn-cancel').addEventListener('click', closeModal);
  $('#rn-submit').addEventListener('click', () => {
    const title = $('#rn-title').value.trim();
    if (!title) { showToast('请输入名称'); return; }
    selectedCollection.title = title;
    selectedCollection.updated = '刚刚';
    closeModal();
    renderGroupTree(); renderCollections(); renderEditor();
    showToast('名称已修改');
  });
  setTimeout(() => $('#rn-title').focus(), 50);
}

// 编辑器（聚合体）
$('#markdown-editor').addEventListener('input', e => {
  if (!selectedNote) return;
  selectedNote.content = e.target.value;
  $('#save-status').textContent = '保存中…';
  updatePreview(); updateWordCount();
  clearTimeout(window.saveTimer);
  window.saveTimer = setTimeout(() => { $('#save-status').textContent = '已保存'; }, 500);
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
  if (e.target.dataset.action === 'delete-loose') { e.stopPropagation(); openDeleteNoteModal(e.target.dataset.note, 'loose'); return; }
  const item = e.target.closest('.loose-note-item');
  if (item) {
    selectedLooseNote = looseNotes.find(n => n.id === item.dataset.note);
    renderLooseNotes(); renderLooseEditor();
  }
});
$('#loose-markdown-editor').addEventListener('input', e => {
  if (!selectedLooseNote) return;
  selectedLooseNote.content = e.target.value;
  $('#loose-save-status').textContent = '保存中…';
  $('#loose-markdown-preview').innerHTML = markdownToHtml(e.target.value);
  $('#loose-word-count').textContent = `${e.target.value.replace(/\s/g, '').length} 字`;
  clearTimeout(window.looseSaveTimer);
  window.looseSaveTimer = setTimeout(() => { $('#loose-save-status').textContent = '已保存'; }, 500);
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
  if (e.target.dataset.action === 'restore') { restoreNote(e.target.dataset.id); return; }
  if (e.target.dataset.action === 'perm-delete') { permanentDelete(e.target.dataset.id); return; }
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
  if (!kw) { filteredGroups = groups; renderGroupTree(); return; }
  filteredGroups = groups.map(g => ({ ...g, expanded: true, collections: g.collections.filter(c => `${c.title}${c.description}${c.notes.map(n => n.title + n.content).join('')}`.toLowerCase().includes(kw)) })).filter(g => g.collections.length > 0);
  renderGroupTree();
});

// 排序
$('#filter-button').addEventListener('click', () => $('#filter-menu').classList.toggle('hidden'));
$('#filter-menu').addEventListener('click', e => {
  const sort = e.target.dataset.sort;
  if (!sort) return;
  groups.forEach(g => g.collections.sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title, 'zh') : sort === 'oldest' ? b.updated.localeCompare(a.updated) : a.updated.localeCompare(b.updated)));
  filteredGroups = groups;
  renderGroupTree();
  $('#filter-menu').classList.add('hidden');
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
