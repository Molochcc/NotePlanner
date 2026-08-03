#!/usr/bin/env python3
"""NotePlanner Workspace Server
提供工作区扫描、同步、迁移和设置API。
"""

import json
import os
import shutil
import re
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='.', static_url_path='')

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SETTINGS_FILE = os.path.join(BASE_DIR, '.workspace.json')

def load_settings():
    if os.path.exists(SETTINGS_FILE):
        with open(SETTINGS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"workspacePath": os.path.join(BASE_DIR, "workspace"), "trashLimit": 30}

def save_settings(data):
    with open(SETTINGS_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def get_workspace_path():
    return load_settings().get("workspacePath", os.path.join(BASE_DIR, "workspace"))

def safe_filename(name):
    return re.sub(r'[\\/:*?"<>|]', '_', name)

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

def read_file(path):
    if not os.path.exists(path):
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return f.read()

def parse_md(content):
    meta = {}
    body = content
    if content.startswith('---'):
        parts = content.split('---', 2)
        if len(parts) >= 3:
            try:
                meta = json.loads(parts[1].strip())
                body = parts[2].strip()
            except:
                pass
    title = body.split('\n')[0].replace('#', '').strip() if body else 'Untitled'
    return {"title": title, "content": body, **meta}

def format_md(note):
    meta = {k: v for k, v in note.items() if k not in ('title', 'content')}
    front = json.dumps(meta, ensure_ascii=False, indent=2)
    return f"---\n{front}\n---\n\n{note.get('content', '')}"

# ==================== API ====================

@app.route('/api/workspace/path')
def api_workspace_path():
    return jsonify({"path": get_workspace_path()})

@app.route('/api/workspace', methods=['GET'])
def api_scan():
    """扫描工作区目录，返回前端数据模型"""
    root = get_workspace_path()
    os.makedirs(root, exist_ok=True)

    groups = []
    loose_notes = []
    trash_items = []

    # 扫描组
    for name in sorted(os.listdir(root)):
        group_path = os.path.join(root, name)
        if not os.path.isdir(group_path) or name.startswith('.') or name in ('回收站',):
            continue

        is_loose = name == '零散笔记'
        group_meta = {}
        group_meta_path = os.path.join(group_path, '.group-meta.json')
        if os.path.exists(group_meta_path):
            try:
                group_meta = json.loads(read_file(group_meta_path) or '{}')
            except:
                group_meta = {}

        if is_loose:
            # 零散笔记：.md 文件直接放在目录下
            for fname in sorted(os.listdir(group_path)):
                if not fname.endswith('.md') or fname.startswith('.'):
                    continue
                fpath = os.path.join(group_path, fname)
                content = read_file(fpath) or ''
                parsed = parse_md(content)
                loose_notes.append({
                    "id": parsed.get('id', f"loose-{fname}"),
                    "title": parsed.get('title', fname.replace('.md', '')),
                    "content": parsed.get('content', ''),
                    "favorite": parsed.get('favorite', False)
                })
            continue

        # 普通组：子目录是聚合体
        collections = []
        for cname in sorted(os.listdir(group_path)):
            col_path = os.path.join(group_path, cname)
            if not os.path.isdir(col_path) or cname.startswith('.'):
                continue

            col_meta = {}
            col_meta_path = os.path.join(col_path, '.collection-meta.json')
            if os.path.exists(col_meta_path):
                try:
                    col_meta = json.loads(read_file(col_meta_path) or '{}')
                except:
                    col_meta = {}

            notes = []
            for fname in sorted(os.listdir(col_path)):
                if not fname.endswith('.md'):
                    continue
                fpath = os.path.join(col_path, fname)
                content = read_file(fpath) or ''
                parsed = parse_md(content)
                notes.append({
                    "id": parsed.get('id', f"note-{fname}"),
                    "title": parsed.get('title', fname.replace('.md', '')),
                    "content": parsed.get('content', ''),
                    "favorite": parsed.get('favorite', False)
                })

            if notes:
                collections.append({
                    "id": col_meta.get('id', f"col-{cname}"),
                    "title": cname,
                    "description": col_meta.get('description', ''),
                    "color": col_meta.get('color', 'coral'),
                    "notesExpanded": col_meta.get('notesExpanded', True),
                    "updated": col_meta.get('updated', ''),
                    "notes": notes
                })

        if collections:
            groups.append({
                "id": group_meta.get('id', f"g-{name}"),
                "title": name,
                "expanded": group_meta.get('expanded', True),
                "pinned": group_meta.get('pinned', False),
                "collections": collections
            })

    # 扫描回收站
    trash_dir = os.path.join(root, '回收站')
    if os.path.exists(trash_dir):
        trash_meta_path = os.path.join(trash_dir, '.trash-meta.json')
        trash_meta = {}
        if os.path.exists(trash_meta_path):
            try:
                trash_meta = json.loads(read_file(trash_meta_path) or '{}')
            except:
                trash_meta = {}

        for fname in sorted(os.listdir(trash_dir)):
            if not fname.endswith('.md'):
                continue
            fpath = os.path.join(trash_dir, fname)
            source_path = os.path.join(trash_dir, f"{fname.replace('.md', '')}.source.json")
            source = {}
            if os.path.exists(source_path):
                try:
                    source = json.loads(read_file(source_path) or '{}')
                except:
                    source = {}

            content = read_file(fpath) or ''
            parsed = parse_md(content)
            trash_items.append({
                "id": parsed.get('id', f"trash-{fname}"),
                "title": parsed.get('title', fname.replace('.md', '')),
                "content": parsed.get('content', ''),
                "source": source.get('source', '未知'),
                "deletedAt": source.get('deletedAt', '')
            })

    return jsonify({"groups": groups, "looseNotes": loose_notes, "trash": trash_items})

@app.route('/api/workspace', methods=['POST'])
def api_sync():
    """接收前端数据，写入工作区目录"""
    data = request.get_json() or {}
    root = get_workspace_path()
    os.makedirs(root, exist_ok=True)

    groups = data.get('groups', [])
    loose_notes = data.get('looseNotes', [])
    trash = data.get('trash', [])

    # 写入组
    for group in groups:
        gdir = os.path.join(root, safe_filename(group['title']))
        os.makedirs(gdir, exist_ok=True)
        write_file(os.path.join(gdir, '.group-meta.json'), json.dumps({
            "id": group.get('id', ''),
            "expanded": group.get('expanded', True),
            "pinned": group.get('pinned', False)
        }, ensure_ascii=False, indent=2))

        for col in group.get('collections', []):
            cdir = os.path.join(gdir, safe_filename(col['title']))
            os.makedirs(cdir, exist_ok=True)
            write_file(os.path.join(cdir, '.collection-meta.json'), json.dumps({
                "id": col.get('id', ''),
                "description": col.get('description', ''),
                "color": col.get('color', 'coral'),
                "notesExpanded": col.get('notesExpanded', True),
                "updated": col.get('updated', '')
            }, ensure_ascii=False, indent=2))

            for note in col.get('notes', []):
                fname = safe_filename(note['title']) + '.md'
                write_file(os.path.join(cdir, fname), format_md(note))

    # 写入零散笔记
    if loose_notes:
        loose_dir = os.path.join(root, '零散笔记')
        os.makedirs(loose_dir, exist_ok=True)
        for note in loose_notes:
            fname = safe_filename(note['title']) + '.md'
            write_file(os.path.join(loose_dir, fname), format_md(note))

    # 写入回收站
    if trash:
        trash_dir = os.path.join(root, '回收站')
        os.makedirs(trash_dir, exist_ok=True)
        for item in trash:
            fname = safe_filename(item['title']) + '.md'
            write_file(os.path.join(trash_dir, fname), format_md(item))
            write_file(os.path.join(trash_dir, f"{safe_filename(item['title'])}.source.json"), json.dumps({
                "source": item.get('source', '未知'),
                "deletedAt": item.get('deletedAt', '')
            }, ensure_ascii=False, indent=2))

    return jsonify({"ok": True})

@app.route('/api/migrate', methods=['POST'])
def api_migrate():
    """迁移到新工作区"""
    data = request.get_json() or {}
    new_path = data.get('newPath')
    transfer = data.get('transfer', False)

    if not new_path:
        return jsonify({"ok": False, "error": "未指定新路径"})

    old_path = get_workspace_path()
    os.makedirs(new_path, exist_ok=True)

    if transfer and os.path.exists(old_path):
        # 复制旧工作区内容到新路径
        for item in os.listdir(old_path):
            src = os.path.join(old_path, item)
            dst = os.path.join(new_path, item)
            if os.path.isdir(src):
                if os.path.exists(dst):
                    shutil.rmtree(dst)
                shutil.copytree(src, dst)
            else:
                shutil.copy2(src, dst)

    # 更新设置
    settings = load_settings()
    settings['workspacePath'] = new_path
    save_settings(settings)

    return jsonify({"ok": True, "newPath": new_path})

@app.route('/api/settings', methods=['GET', 'POST'])
def api_settings():
    if request.method == 'GET':
        return jsonify(load_settings())
    else:
        data = request.get_json() or {}
        settings = load_settings()
        settings.update(data)
        save_settings(settings)
        return jsonify({"ok": True})

# 静态文件服务
@app.route('/')
def index():
    return send_from_directory(BASE_DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    return send_from_directory(BASE_DIR, filename)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=4173, debug=False)
