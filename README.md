# CopyToMeAndTauri

CopyToMeAndTauri 是一个基于 Tauri 2 + Vue 3 的 Windows 桌面剪贴板增强工具。它把“复制问题、等待回答、再把答案输入到目标应用”这一整套流程尽量压缩到最少操作。

## 核心功能

- 剪贴板监听问答：复制以 `?` 或 `？` 结尾的问题，会自动调用 AI，并把回答写回剪贴板。
- 模拟输入：使用全局快捷键把剪贴板内容逐字输入到当前光标位置，适合禁用粘贴的输入环境。
- AI 问答快捷键：也可以手动用快捷键把剪贴板问题发送给 AI。
- 问答记录：保留最近问答，默认折叠显示问题，展开后可复制回答或删除记录。
- 微信输入法兼容：检测到 WeType/微信输入法进程时，主页显示兼容开关，并同步去除换行符设置。
- DeepSeek 状态：使用 DeepSeek Base URL 时，主页 AI 状态会显示剩余余额。
- 管理员启动：可选择每次启动自动请求管理员权限，也可通过非侵入式提示手动重启为管理员。
- 自动更新：支持 Tauri updater 检查、下载、安装和跳过版本。

## 快速使用

1. 在设置页填写 OpenAI 兼容接口的 API Key。
2. 复制一个以问号结尾的问题，例如：`我美吗?`
3. 等待 AI 回答，鼠标光标变化代表回答完成。
4. 使用 `CTRL+K` 或你在设置里配置的模拟输入快捷键查看答案。

如果检测到微信输入法，并开启兼容模式，查看答案方式会变为：中文状态下依次按 `v`、`2`、空格。

## 默认配置

- 默认 Base URL：`https://api.deepseek.com`
- 默认模型：`deepseek-v4-flash`
- 模拟输入快捷键：`CTRL+K`
- AI 问答快捷键：`CTRL+J`
- 显示/隐藏托盘快捷键：`CTRL+Shift+Y`
- 剪贴板监听：默认开启，每 900ms 检查一次剪贴板变化

说明：内部跨平台快捷键配置仍使用 `CmdOrControl`，界面统一展示为 `CTRL`。

## 开发

```bash
npm install
npm run dev
npm run tauri -- dev
```

常用检查：

```bash
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
npm run tauri -- build
```

Tauri 开发端口固定为 `18928`。

## 发布

当前版本：`0.3.5`

发布前需要同步并确认：

- `package.json`
- `package-lock.json`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/tauri.conf.json`
- `src/composables/setMg.js`
- `md/UPDATE_LATEST.md`
- `latest.json`

构建安装包：

```bash
npm run tauri -- build
```

部署：

```bash
npm run deploy app
```

## 技术栈

- Tauri 2
- Rust
- Vue 3
- Vite
- Element Plus

