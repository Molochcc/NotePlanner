// preload.js — 安全桥接层：暴露受控 API 给渲染进程
// 设计准则：contextIsolation=true，不暴露 Node.js 给前端

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  // 工作区
  scan:        ()    => ipcRenderer.invoke('workspace:scan'),
  sync:        (data) => ipcRenderer.invoke('workspace:sync', data),
  migrate:     (opts) => ipcRenderer.invoke('workspace:migrate', opts),

  // 设置
  loadSettings: ()    => ipcRenderer.invoke('settings:load'),
  saveSettings: (data) => ipcRenderer.invoke('settings:save', data),

  // 文件变更监听
  onWorkspaceChanged: (callback) => {
    ipcRenderer.on('workspace-changed', () => callback());
    // 返回取消监听的函数
    return () => ipcRenderer.removeAllListeners('workspace-changed');
  },
});
