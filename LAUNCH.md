# NotePlanner 启动方式

NotePlanner 是一个本地优先的 Electron 桌面应用，笔记以 `.md` 文件存于 `workspace/` 目录，数据完全归用户所有。

## 方法一：双击启动（推荐）

直接双击 `start.bat`，脚本会自动安装 Electron 并启动主窗口。

> 若网络访问官方源慢，`start.bat` 已配置 `ELECTRON_MIRROR` 走国内镜像。

## 方法二：命令行启动

```bash
cd H:\NotePlanner
npm install        # 首次需安装依赖（electron）
npm start          # 启动应用
# 或 npm run dev  进入开发模式
```
