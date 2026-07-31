const notes = [
  {title:'关于个人知识管理的一些思考', type:'思考', text:'信息不等于知识，知识也不等于智慧。建立属于自己的第二大脑...', date:'今天 09:42', tag:'工作', color:'coral-bg', favorite:true},
  {title:'2025 年第二季度目标', type:'计划', text:'重新审视目标，把注意力放在真正重要的事情上。少做一点，但做深...', date:'昨天 18:20', tag:'工作', color:'coral-bg', favorite:false},
  {title:'读《置身事内》', type:'阅读', text:'理解中国经济运行的微观基础，记录一些触动我的章节和观点。', date:'6 月 10 日', tag:'阅读', color:'blue-bg', favorite:true},
  {title:'周末去看展', type:'生活', text:'很久没有留出一整天给自己了。看看展览，走走路，或许会有新的发现。', date:'6 月 08 日', tag:'生活', color:'green-bg', favorite:false},
  {title:'产品灵感：日历式笔记', type:'灵感', text:'如果笔记可以像日历一样被回顾，或许更容易发现想法之间的连接。', date:'6 月 06 日', tag:'灵感', color:'purple-bg', favorite:true},
  {title:'和朋友聊到的好点子', type:'灵感', text:'给每个项目设置一个“暂停区”，保留那些还没成熟但值得等待的想法。', date:'6 月 03 日', tag:'灵感', color:'purple-bg', favorite:false},
  {title:'晨间写作练习', type:'日记', text:'今天的阳光很好。规律地记录，是和自己保持联系的一种方式。', date:'5 月 29 日', tag:'生活', color:'green-bg', favorite:false},
  {title:'设计系统学习笔记', type:'学习', text:'好的设计系统不是限制创造力，而是让团队把精力用在更重要的地方。', date:'5 月 27 日', tag:'工作', color:'coral-bg', favorite:false},
  {title:'东京旅行清单', type:'计划', text:'想去代官山的书店，也想在清晨去一次筑地市场。', date:'5 月 24 日', tag:'生活', color:'green-bg', favorite:false}
];
const grid = document.querySelector('#notes-grid');
const empty = document.querySelector('#empty-state');
const toast = document.querySelector('#toast');
let currentNotes = [...notes];
function render(list = currentNotes) { grid.innerHTML = list.map((note, index) => `<article class="note-card"><div class="note-top"><span class="note-type">${note.type}</span><button class="favorite ${note.favorite ? 'active' : ''}" data-index="${index}" aria-label="收藏">${note.favorite ? '★' : '☆'}</button></div><h2>${note.title}</h2><p>${note.text}</p><div class="note-bottom"><span class="note-date">${note.date}</span><span class="note-tag ${note.color}">${note.tag}</span></div></article>`).join(''); empty.classList.toggle('hidden', list.length > 0); }
function showToast(message) { toast.textContent = message; toast.classList.add('show'); setTimeout(() => toast.classList.remove('show'), 1800); }
document.querySelector('#search-input').addEventListener('input', (event) => { const keyword = event.target.value.trim().toLowerCase(); currentNotes = notes.filter(note => [note.title, note.text, note.tag, note.type].some(value => value.toLowerCase().includes(keyword))); render(currentNotes); });
document.querySelector('#new-note').addEventListener('click', () => showToast('新建笔记功能即将上线')); document.addEventListener('keydown', (event) => { if (event.key.toLowerCase() === 'n' && document.activeElement.tagName !== 'INPUT') document.querySelector('#new-note').click(); if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); document.querySelector('#search-input').focus(); } });
grid.addEventListener('click', (event) => { const button = event.target.closest('.favorite'); if (!button) return; const note = currentNotes[Number(button.dataset.index)]; note.favorite = !note.favorite; button.textContent = note.favorite ? '★' : '☆'; button.classList.toggle('active', note.favorite); showToast(note.favorite ? '已加入收藏' : '已取消收藏'); });
const menu = document.querySelector('#filter-menu'); document.querySelector('#filter-button').addEventListener('click', () => menu.classList.toggle('hidden')); menu.addEventListener('click', event => { if (!event.target.dataset.sort) return; const sort = event.target.dataset.sort; currentNotes.sort((a,b) => sort === 'az' ? a.title.localeCompare(b.title, 'zh') : sort === 'oldest' ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date)); render(currentNotes); menu.classList.add('hidden'); });
document.querySelector('#theme-toggle').addEventListener('click', () => { document.body.classList.toggle('dark'); showToast(document.body.classList.contains('dark') ? '已切换深色模式' : '已切换浅色模式'); }); document.querySelector('#view-toggle').addEventListener('click', () => { grid.classList.toggle('list-view'); grid.style.gridTemplateColumns = grid.classList.contains('list-view') ? '1fr' : ''; showToast(grid.classList.contains('list-view') ? '已切换列表视图' : '已切换网格视图'); });
render();
