// main.js — Electron 主进程：窗口管理 + 文件 I/O + IPC

const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// ==================== 配置 ====================
const BASE_DIR = __dirname;
const SETTINGS_FILE = path.join(BASE_DIR, '.workspace.json');
let mainWindow = null;

function loadSettings() {
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8')); }
  catch { return { workspacePath: path.join(BASE_DIR, 'workspace'), trashLimit: 30 }; }
}
function saveSettings(d) { fs.writeFileSync(SETTINGS_FILE, JSON.stringify(d, null, 2), 'utf-8'); }
function wsPath() { return loadSettings().workspacePath || path.join(BASE_DIR, 'workspace'); }
function safeName(n) { return n.replace(/[\\/:*?"<>|]/g, '_'); }
function ensureDir(d) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true }); }
function rmDirDeep(d) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { console.error('rmDirDeep failed:', e.message); } }

function parseMd(content, fileName) {
  let meta = {}, body = content;
  if (content.startsWith('---')) {
    // 注意：split 的第二个参数是“结果上限”，传 2 只会返回 2 段、永远到不了第 3 段，
    // 旧实现因此从未剥离 front matter。这里不带上限拆分，并校验首段为空（即正文确实以 --- 开头）。
    const parts = content.split('---');
    if (parts.length >= 3 && parts[0].trim() === '') {
      try { meta = JSON.parse(parts[1].trim()); body = parts.slice(2).join('---').trim(); } catch {}
    }
  }
  delete meta.favorite;
  // 标题以本地文件名为准（去掉 .md 扩展名），而非正文首行 —— 与前端“标题=文件名”保持一致
  const fileTitle = fileName ? fileName.replace(/\.md$/i, '') : '';
  const title = fileTitle || meta.title || 'Untitled';
  delete meta.title;
  return { title, content: body, ...meta };
}

// 笔记正文只写纯 Markdown，结构化元数据（id 等）改存同名 .meta.json 侧车文件，
// 不再以 front matter 形式塞进笔记正文开头（避免"开头一串未知信息"出现在内容里）。
function fmtMd(n) {
  const { content } = n;
  return content || '';
}

// 读取单条笔记：正文取自 .md（parseMd 会剥离遗留 front matter），结构化 id 取自同名 .meta.json 侧车
function loadNote(dir, file, idPrefix = 'note') {
  const raw = fs.readFileSync(path.join(dir, file), 'utf-8') || '';
  const p = parseMd(raw, file);
  const mp = path.join(dir, file + '.meta.json');
  let mid = null;
  if (fs.existsSync(mp)) { try { mid = JSON.parse(fs.readFileSync(mp, 'utf-8') || '{}').id; } catch {} }
  return { id: mid || p.id || `${idPrefix}-${file}`, title: p.title, content: p.content };
}
// 读取回收站笔记：正文取自 .md，来源/删除时间/ id 取自同名 .source.json 侧车
function loadTrashNote(dir, file) {
  const raw = fs.readFileSync(path.join(dir, file), 'utf-8') || '';
  const p = parseMd(raw, file);
  const sp = path.join(dir, file.replace('.md', '.source.json'));
  let src = {};
  if (fs.existsSync(sp)) { try { src = JSON.parse(fs.readFileSync(sp, 'utf-8') || '{}'); } catch {} }
  return { id: src.id || p.id || `trash-${file}`, title: p.title, content: p.content, source: src.source || '未知', deletedAt: src.deletedAt || '', type: src.type || 'note', collection: src.type === 'collection' ? src.collection : null };
}

function copyDirSync(src, dest) {
  ensureDir(dest);
  for (const e of fs.readdirSync(src)) {
    const sp = path.join(src, e), dp = path.join(dest, e);
    if (fs.statSync(sp).isDirectory()) copyDirSync(sp, dp);
    else fs.copyFileSync(sp, dp);
  }
}

// ==================== 扫 workspace → 兼容旧字段 groups/collections/looseNotes ====================
function scan() {
  const root = wsPath(); ensureDir(root);
  const groups = [], looseNotes = [], trash = [];
  for (const name of fs.readdirSync(root).sort()) {
    const gp = path.join(root, name);
    if (!fs.statSync(gp).isDirectory() || name.startsWith('.') || name === '回收站') continue;
    if (name === '零散笔记') {
      for (const f of fs.readdirSync(gp).sort()) {
        if (!f.endsWith('.md') || f.startsWith('.')) continue;
        looseNotes.push(loadNote(gp, f, 'loose'));
      }
      continue;
    }
    let gm = {};
    const gmp = path.join(gp, '.group-meta.json');
    if (fs.existsSync(gmp)) { try { gm = JSON.parse(fs.readFileSync(gmp, 'utf-8') || '{}'); } catch {} }
    const collections = [];
    for (const cn of fs.readdirSync(gp).sort()) {
      const cp = path.join(gp, cn);
      if (!fs.statSync(cp).isDirectory() || cn.startsWith('.')) continue;
      let cm = {};
      const cmp = path.join(cp, '.collection-meta.json');
      if (fs.existsSync(cmp)) { try { cm = JSON.parse(fs.readFileSync(cmp, 'utf-8') || '{}'); } catch {} }
      const notes = [];
      for (const f of fs.readdirSync(cp).sort()) {
        if (!f.endsWith('.md') || f.startsWith('.')) continue;
        notes.push(loadNote(cp, f, 'note'));
      }
      if (notes.length) collections.push({
        id: cm.id || `col-${cn}`, title: cn, description: cm.description || '',
        color: cm.color || 'coral', notesExpanded: cm.notesExpanded !== false,
        updated: cm.updated || '', notes
      });
    }
    if (collections.length) groups.push({
      id: gm.id || `g-${name}`, title: name,
      expanded: gm.expanded !== false, pinned: gm.pinned || false, collections
    });
  }
  const td = path.join(root, '回收站');
  if (fs.existsSync(td)) {
    for (const f of fs.readdirSync(td).sort()) {
      if (!f.endsWith('.md')) continue;
      trash.push(loadTrashNote(td, f));
    }
  }
  return { groups, looseNotes, trash };
}

// ==================== 同步 → 写 workspace ====================
function sync(data) {
  const { groups, looseNotes, trash } = data;
  const root = wsPath(); ensureDir(root);
  for (const g of (groups || [])) {
    const gd = path.join(root, safeName(g.title)); ensureDir(gd);
    fs.writeFileSync(path.join(gd, '.group-meta.json'), JSON.stringify({ id: g.id, expanded: g.expanded !== false, pinned: g.pinned || false }, null, 2), 'utf-8');
    for (const col of (g.collections || [])) {
      const cd = path.join(gd, safeName(col.title)); ensureDir(cd);
      fs.writeFileSync(path.join(cd, '.collection-meta.json'), JSON.stringify({ id: col.id, description: col.description || '', color: col.color || 'coral', notesExpanded: col.notesExpanded !== false, updated: col.updated || '' }, null, 2), 'utf-8');
      const written = new Set();
      for (const note of (col.notes || [])) {
        const fn = safeName(note.title) + '.md';
        written.add(fn);
        fs.writeFileSync(path.join(cd, fn), fmtMd(note), 'utf-8');
        // 结构化元数据（id）存独立侧车，不进 .md 正文
        fs.writeFileSync(path.join(cd, fn + '.meta.json'), JSON.stringify({ id: note.id }, null, 2), 'utf-8');
      }
      // 孤儿清理（安全版）：仅删除"本应用管理过（有 .meta.json 侧车）且已从模型移除"的 .md，
      // 保留外部 agent 新增的 .md（无 .meta.json 侧车）。模型笔记始终带侧车，故可用侧车有无区分两者。
      for (const f of fs.readdirSync(cd)) {
        if (f.startsWith('.')) continue;
        if (f.endsWith('.meta.json')) continue; // 先处理 .md，再清理孤儿侧车
        if (!f.endsWith('.md')) continue;
        if (written.has(f)) continue; // 模型已写入，保留
        const mp = path.join(cd, f + '.meta.json');
        if (fs.existsSync(mp)) {
          // 有侧车 = 曾被本应用管理：模型已无此文件 → 用户删除/重命名 → 真正删除
          try { fs.unlinkSync(path.join(cd, f)); } catch {}
          try { fs.unlinkSync(mp); } catch {}
        }
        // 无侧车 = 外部 agent 新增 → 保留，不删
      }
      // 清理孤儿 .meta.json（无对应 .md 者）
      for (const f of fs.readdirSync(cd)) {
        if (f.startsWith('.') || !f.endsWith('.meta.json')) continue;
        const base = f.slice(0, -'.meta.json'.length);
        if (!fs.existsSync(path.join(cd, base))) { try { fs.unlinkSync(path.join(cd, f)); } catch {} }
      }
    }
  }
  // 零散笔记：始终确保目录存在并清理孤儿（即使已删空），避免删最后一条时整段被跳过导致残留
  if (looseNotes) {
    const ld = path.join(root, '零散笔记'); ensureDir(ld);
    const written = new Set();
    for (const n of looseNotes) {
      const fn = safeName(n.title) + '.md';
      written.add(fn);
      fs.writeFileSync(path.join(ld, fn), fmtMd(n), 'utf-8');
      fs.writeFileSync(path.join(ld, fn + '.meta.json'), JSON.stringify({ id: n.id }, null, 2), 'utf-8');
    }
    // 安全清理：仅删"有 .meta.json 侧车且模型已移除"的 .md；无侧车=外部新增，保留
    for (const f of fs.readdirSync(ld)) {
      if (f.startsWith('.') || !f.endsWith('.md')) continue;
      if (written.has(f)) continue;
      const mp = path.join(ld, f + '.meta.json');
      if (fs.existsSync(mp)) {
        try { fs.unlinkSync(path.join(ld, f)); } catch {}
        try { fs.unlinkSync(mp); } catch {}
      }
      // 无侧车 → 外部 agent 新增 → 保留
    }
  }
  // 回收站：始终确保目录存在并清理孤儿，避免永久删除后磁盘残留导致下次扫描"复活"
  if (trash) {
    const td = path.join(root, '回收站'); ensureDir(td);
    const keptIds = new Set((trash || []).map(t => t.id));
    const written = new Set();
    for (const item of (trash || [])) {
      const fn = safeName(item.title) + '.md';
      written.add(fn);
      fs.writeFileSync(path.join(td, fn), fmtMd(item), 'utf-8');
      fs.writeFileSync(path.join(td, safeName(item.title) + '.source.json'), JSON.stringify({
        source: item.source || '未知', deletedAt: item.deletedAt || '', id: item.id,
        type: item.type || 'note',
        collection: item.type === 'collection' ? item.collection : undefined
      }, null, 2), 'utf-8');
    }
    // 孤儿清理：回收站里"有 .source.json 侧车且 id 不在当前 trash"的项 = 已永久删除/移出 → 真正删除；
    // 无 .source.json（极旧/外部）= 保留，与"安全清理"一致，避免误删 agent 或旧数据
    for (const f of fs.readdirSync(td)) {
      if (f.startsWith('.') || !f.endsWith('.md')) continue;
      const sp = path.join(td, f.replace('.md', '.source.json'));
      if (!fs.existsSync(sp)) continue;
      let sid = null;
      try { const s = JSON.parse(fs.readFileSync(sp, 'utf-8') || '{}'); sid = s.id; } catch {}
      if (sid && !keptIds.has(sid)) {
        try { fs.unlinkSync(path.join(td, f)); } catch {}
        try { fs.unlinkSync(sp); } catch {}
      }
    }
  }
  // 目录清理（安全版）：仅删除"被本应用管理（有 .group-meta.json / .collection-meta.json 侧车）
  // 且已从模型移除 / 路径已变（重命名残留）"的目录；无侧车的目录视为外部 agent 新增，保留。
  // 这样 agent 新建的主题/笔记集不会被误删，同时用户在 UI 内的删除、重命名仍能正确落到磁盘。
  const groupPathById = new Map((groups || []).map(g => [g.id, path.join(root, safeName(g.title))]));
  for (const name of fs.readdirSync(root)) {
    if (name.startsWith('.') || name === '零散笔记' || name === '回收站') continue;
    const gd = path.join(root, name);
    let isDir = false; try { isDir = fs.statSync(gd).isDirectory(); } catch { continue; }
    if (!isDir) continue;
    let gid = null;
    try { const gmp = path.join(gd, '.group-meta.json'); if (fs.existsSync(gmp)) gid = JSON.parse(fs.readFileSync(gmp, 'utf-8') || '{}').id; } catch {}
    if (!gid) continue; // 无侧车 = 外部 agent 新增主题 → 保留
    const expectedGPath = groupPathById.get(gid);
    if (expectedGPath && expectedGPath === gd) {
      // 模型持有且路径一致 → 清理其下"已删除 / 重命名残留"的笔记集目录
      const group = (groups || []).find(g => g.id === gid);
      if (group) {
        const colPathById = new Map((group.collections || []).map(c => [c.id, path.join(gd, safeName(c.title))]));
        for (const cn of fs.readdirSync(gd)) {
          if (cn.startsWith('.')) continue;
          const cd = path.join(gd, cn);
          let cIsDir = false; try { cIsDir = fs.statSync(cd).isDirectory(); } catch { continue; }
          if (!cIsDir) continue;
          let cid = null;
          try { const cmp = path.join(cd, '.collection-meta.json'); if (fs.existsSync(cmp)) cid = JSON.parse(fs.readFileSync(cmp, 'utf-8') || '{}').id; } catch {}
          if (!cid) continue; // 无侧车 = 外部 agent 新增笔记集 → 保留
          const expectedCPath = colPathById.get(cid);
          if (expectedCPath && expectedCPath === cd) continue; // 模型持有且路径一致 → 保留
          rmDirDeep(cd); // UI 删除 或 重命名残留 → 删
        }
      }
    } else {
      rmDirDeep(gd); // gid 不在模型（UI 删除主题）或路径已变（重命名残留）→ 删
    }
  }
  return { ok: true };
}

// ==================== 文件监听 ====================
let watcher = null, watchTimer = null;
function startWatch() {
  const root = wsPath(); ensureDir(root);
  try {
    if (watcher) watcher.close();
    watcher = fs.watch(root, { recursive: true }, (_, fname) => {
      if (!fname || fname.includes('.git') || fname.startsWith('~')) return;
      clearTimeout(watchTimer);
      watchTimer = setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('workspace-changed');
      }, 300);
    });
  } catch (e) { console.error('fs.watch:', e.message); }
}

// ==================== IPC ====================
function setupIPC() {
  ipcMain.handle('workspace:scan', () => { try { return scan(); } catch (e) { return { error: e.message }; } });
  ipcMain.handle('workspace:sync', (_, d) => { try { return sync(d); } catch (e) { return { error: e.message }; } });
  ipcMain.handle('settings:load', () => loadSettings());
  ipcMain.handle('settings:save', (_, d) => { try { saveSettings(d); return { ok: true }; } catch (e) { return { error: e.message }; } });
  ipcMain.handle('workspace:migrate', (_, { newPath, transfer }) => {
    try {
      const old = wsPath();
      if (transfer && fs.existsSync(old)) copyDirSync(old, newPath);
      const s = loadSettings(); s.workspacePath = newPath; saveSettings(s);
      return { ok: true, newPath };
    } catch (e) { return { error: e.message }; }
  });
}

// ==================== 窗口 ====================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400, height: 860, minWidth: 900, minHeight: 550,
    title: 'NotePlanner',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  mainWindow.loadFile('index.html');
  startWatch();
  mainWindow.on('closed', () => { if (watcher) watcher.close(); });
}

app.whenReady().then(() => { setupIPC(); createWindow(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
