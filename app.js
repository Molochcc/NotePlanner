const collections = [
  { id: 'product', title: '产品与工作', description: '工作中的思考、计划与复盘', color: 'coral', updated: '今天 09:42', notes: [
    { id: 'product-1', title: '关于个人知识管理的一些思考', content: '# 关于个人知识管理的一些思考\n\n信息不等于知识，知识也不等于智慧。建立属于自己的第二大脑，需要先从**记录真实问题**开始。\n\n## 我的三个原则\n\n- 让记录足够简单\n- 让回顾成为习惯\n- 让想法彼此连接', favorite: true },
    { id: 'product-2', title: '2025 年第二季度目标', content: '# 2025 年第二季度目标\n\n> 少做一点，但做深。\n\n## 重点方向\n\n- 完成产品新版本\n- 每周留出半天深度工作\n- 建立稳定的复盘习惯\n\n## 复盘\n\n还没有内容，等季度结束后补充。', favorite: false },
    { id: 'product-3', title: '设计系统学习笔记', content: '# 设计系统学习笔记\n\n好的设计系统不是限制创造力，而是让团队把精力用在更重要的地方。\n\n- 设计令牌\n- 组件与变体\n- 使用指南', favorite: false }
  ]},
  { id: 'reading', title: '阅读与输入', description: '书籍、文章和值得保留的观点', color: 'blue', updated: '6 月 10 日', notes: [
    { id: 'reading-1', title: '读《置身事内》', content: '# 读《置身事内》\n\n理解中国经济运行的微观基础，记录一些触动我的章节和观点。\n\n## 一个值得反复想的问题\n\n地方政府、企业与普通人的行动，是如何共同塑造我们身处的环境的？', favorite: true },
    { id: 'reading-2', title: '待读清单', content: '# 待读清单\n\n- 《纳瓦尔宝典》\n- 《有限与无限的游戏》\n- 《卡片笔记写作法》', favorite: false }
  ]},
  { id: 'life', title: '生活记录', description: '日记、旅行与生活中的小事', color: 'green', updated: '6 月 08 日', notes: [
    { id: 'life-1', title: '周末去看展', content: '# 周末去看展\n\n很久没有留出一整天给自己了。看看展览，走走路，或许会有新的发现。\n\n## 行程\n\n- 10:00 出发\n- 11:30 看展\n- 15:00 找一家咖啡店写字', favorite: false }
  ]}
];

let selectedCollection = collections[0];
let selectedNote = selectedCollection.notes[0];
let filteredCollections = [...collections];
const $ = (selector) => document.querySelector(selector);
const toast = $('#toast');

function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
function renderCollections(list = filteredCollections) {
  $('#collections-list').innerHTML = list.map(collection => `<article class="collection-card ${collection.id === selectedCollection.id ? 'selected' : ''}" data-collection="${collection.id}"><div class="collection-card-top"><span class="collection-icon ${collection.color}">◈</span><span class="collection-count">${collection.notes.length} 篇</span></div><h2>${collection.title}</h2><p>${collection.description}</p><div class="collection-notes">${collection.notes.map(note => `<button class="collection-note ${note.id === selectedNote.id ? 'active' : ''}" data-note="${note.id}"><span>${note.favorite ? '★' : '·'}</span>${note.title}</button>`).join('')}</div><div class="collection-meta"><span>${collection.updated}</span><span class="collection-dots">•••</span></div></article>`).join('');
  $('#collection-count').textContent = collections.length; $('#note-count').textContent = collections.reduce((count, collection) => count + collection.notes.length, 0);
}
function renderEditor() {
  $('#editor-title').textContent = selectedNote.title; $('#markdown-editor').value = selectedNote.content; updatePreview(); updateWordCount();
  document.querySelectorAll('.collection-card').forEach(card => card.classList.toggle('selected', card.dataset.collection === selectedCollection.id));
}
function markdownToHtml(markdown) {
  const safe = markdown.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return safe.split('\n').map(line => { if (line.startsWith('### ')) return `<h4>${line.slice(4)}</h4>`; if (line.startsWith('## ')) return `<h3>${line.slice(3)}</h3>`; if (line.startsWith('# ')) return `<h2>${line.slice(2)}</h2>`; if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`; if (line.startsWith('> ')) return `<blockquote>${line.slice(2)}</blockquote>`; return line ? `<p>${line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\*(.*?)\*/g, '<em>$1</em>')}</p>` : '<div class="md-spacer"></div>'; }).join('').replace(/(<li>.*?<\/li>)+/g, group => `<ul>${group}</ul>`);
}
function updatePreview() { $('#markdown-preview').innerHTML = markdownToHtml($('#markdown-editor').value); }
function updateWordCount() { $('#word-count').textContent = `${$('#markdown-editor').value.replace(/\s/g, '').length} 字`; }
function selectCollection(id) { selectedCollection = collections.find(collection => collection.id === id) || collections[0]; selectedNote = selectedCollection.notes[0]; renderCollections(); renderEditor(); }

$('#collections-list').addEventListener('click', event => { const noteButton = event.target.closest('.collection-note'); if (noteButton) { const collection = collections.find(item => item.notes.some(note => note.id === noteButton.dataset.note)); if (collection) { selectedCollection = collection; selectedNote = collection.notes.find(note => note.id === noteButton.dataset.note); renderCollections(); renderEditor(); } return; } const card = event.target.closest('.collection-card'); if (card) selectCollection(card.dataset.collection); });
$('#markdown-editor').addEventListener('input', event => { selectedNote.content = event.target.value; $('#save-status').textContent = '保存中…'; updatePreview(); updateWordCount(); clearTimeout(window.saveTimer); window.saveTimer = setTimeout(() => { $('#save-status').textContent = '已保存'; }, 500); });
$('#preview-toggle').addEventListener('click', () => { const editor = $('#markdown-editor'); const preview = $('#markdown-preview'); const previewing = !preview.classList.contains('hidden'); preview.classList.toggle('hidden', previewing); editor.classList.toggle('hidden', !previewing); $('#preview-toggle').textContent = previewing ? '预览' : '编辑'; });
$('#search-input').addEventListener('input', event => { const keyword = event.target.value.trim().toLowerCase(); filteredCollections = collections.map(collection => ({ ...collection, notes: collection.notes.filter(note => `${collection.title}${collection.description}${note.title}${note.content}`.toLowerCase().includes(keyword)) })).filter(collection => collection.notes.length || `${collection.title}${collection.description}`.toLowerCase().includes(keyword)); renderCollections(filteredCollections); });
$('#filter-button').addEventListener('click', () => $('#filter-menu').classList.toggle('hidden')); $('#filter-menu').addEventListener('click', event => { const sort = event.target.dataset.sort; if (!sort) return; filteredCollections.sort((a, b) => sort === 'az' ? a.title.localeCompare(b.title, 'zh') : sort === 'oldest' ? b.updated.localeCompare(a.updated) : a.updated.localeCompare(b.updated)); renderCollections(); $('#filter-menu').classList.add('hidden'); });
function createCollection() { const id = `new-${Date.now()}`; const collection = { id, title: '新的聚合体', description: '为新的主题建立一个清晰的起点', color: 'purple', updated: '刚刚', notes: ['概览', '待办事项', '灵感与资料'].map((title, index) => ({ id: `${id}-${index}`, title, content: `# ${title}\n\n在这里开始记录……`, favorite: false })) }; collections.unshift(collection); filteredCollections = [...collections]; selectedCollection = collection; selectedNote = collection.notes[0]; renderCollections(); renderEditor(); showToast('已创建聚合体，并预置 3 篇笔记'); }
$('#new-collection').addEventListener('click', createCollection); $('#add-collection').addEventListener('click', createCollection); document.addEventListener('keydown', event => { if (event.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') createCollection(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#search-input').focus(); } });
$('#theme-toggle').addEventListener('click', () => { document.body.classList.toggle('dark'); showToast(document.body.classList.contains('dark') ? '已切换深色模式' : '已切换浅色模式'); });
renderCollections(); renderEditor();
