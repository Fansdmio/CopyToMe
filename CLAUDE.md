# CopyToMeAndTauri - AI 剪贴板助手

## 项目概述

CopyToMeAndTauri 是一个基于 Tauri 框架开发的跨平台桌面应用程序，旨在帮助用户绕过禁止粘贴的限制。该应用集成了 AI 问答功能和智能文本处理，通过快捷键实现剪贴板内容的智能输入和 AI 交互。

### 核心功能
- **绕过粘贴限制**: 通过模拟键盘输入的方式，将剪贴板内容输入到禁止粘贴的应用程序中
- **AI 问答集成**: 集成 DeepSeek API，支持通过快捷键调用 AI 问答功能
- **DLL 注入**: 支持向目标程序注入 DLL 文件以扩展功能
- **全局快捷键**: 可自定义的全局快捷键系统
- **微信输入模式**: 针对微信等应用优化的输入模式

## 技术栈

### 前端技术
- **Vue 3**: 主前端框架
- **Element Plus**: UI 组件库
- **Vite**: 构建工具
- **JavaScript/ES6+**: 主要编程语言

### 后端技术
- **Tauri 2.0**: Rust-based 桌面应用框架
- **Rust**: 系统级功能实现
- **Enigo**: 键盘模拟输入库

### 关键依赖
- **@tauri-apps/api**: Tauri 前端 API
- **@tauri-apps/plugin-clipboard-manager**: 剪贴板管理
- **@tauri-apps/plugin-global-shortcut**: 全局快捷键
- **@tauri-apps/plugin-http**: HTTP 请求
- **openai**: OpenAI API 客户端（用于 DeepSeek）
- **marked**: Markdown 解析
- **crypto-js**: 加密功能

## 项目架构

### 目录结构
```
CopyToMeAndTauri/
├── src/                      # 前端源代码
│   ├── components/           # Vue 组件
│   │   ├── Home.vue         # 主页组件
│   │   ├── History.vue      # 问答历史
│   │   ├── Setting.vue      # 设置页面
│   │   ├── About.vue        # 关于页面
│   │   └── Update.vue       # 更新组件
│   ├── composables/         # Vue Composables
│   │   ├── aiMg.js          # AI 管理
│   │   ├── setMg.js         # 设置管理
│   │   └── useShortcuts.js  # 快捷键管理
│   ├── utils/               # 工具函数
│   │   ├── crypto.js        # 加密解密
│   │   ├── textProcessing.js # 文本处理
│   │   └── common.js        # 通用工具
│   ├── assets/              # 静态资源
│   └── main.js              # 应用入口
├── src-tauri/               # Tauri 后端代码
│   ├── src/
│   │   ├── lib.rs          # 主要 Rust 代码
│   │   └── main.rs         # 应用入口
│   ├── Cargo.toml          # Rust 依赖配置
│   └── tauri.conf.json     # Tauri 配置
├── dist/                    # 构建输出
└── node_modules/            # Node.js 依赖
```

### 核心模块

#### 1. 前端核心模块

**AI 管理 (aiMg.js)**
- 管理 DeepSeek API 调用
- 支持本地 API Key 和服务器获取
- 问答历史记录管理
- 健康状态检查

**设置管理 (setMg.js)**
- 持久化设置存储
- 默认配置管理
- 设置变更监听

**快捷键管理 (useShortcuts.js)**
- 全局快捷键注册/注销
- 快捷键冲突处理
- 停止键管理

#### 2. 后端核心模块

**文本处理 (lib.rs)**
- 模拟键盘输入
- 随机延迟控制
- 停止信号处理
- 多线程执行

## 构建和开发

### 环境要求
- Node.js 16+
- Rust 1.70+
- Tauri CLI

### 安装依赖
```bash
npm install
```

### 开发模式
```bash
cargo tauri dev
```

### 构建应用
```bash
cargo tauri build
```

### Tauri 命令
```bash
cargo tauri dev    # 开发模式
cargo tauri build  # 构建生产版本
```

## 功能详解

### 1. 文本模拟输入
- **触发方式**: Cmd/Ctrl + K（可配置）
- **处理流程**: 读取剪贴板 → 逐字符模拟输入 → 随机延迟
- **停止机制**: 按 K 键可随时停止输入
- **时间范围**: 可配置的输入延迟范围 [1-5]ms

### 2. AI 问答功能
- **触发方式**: Cmd/Ctrl + J（可配置）
- **处理流程**: 读取剪贴板问题 → 调用 DeepSeek API → 写入回答到剪贴板
- **API 管理**: 支持本地配置和服务器获取 API Key
- **历史记录**: 自动保存问答历史（最多 200 条）

### 3. DLL 注入功能
- **目标**: 向指定程序注入 DLL 以扩展功能
- **流程**: 复制文件到应用目录 → 尝试自动复制到目标目录 → 失败则引导手动复制
- **安全**: 支持权限受限目录的处理

### 4. 全局快捷键系统
- **注册**: 应用启动时自动注册
- **冲突处理**: 友好的错误提示
- **动态更新**: 支持运行时修改快捷键
- **停止键**: 临时注册的单键停止功能

## 配置说明

### 默认快捷键
- **文本输入**: Cmd/Ctrl + K
- **AI 问答**: Cmd/Ctrl + J
- **停止输入**: K（仅在输入过程中有效）

### 可配置选项
- 微信输入模式（去除换行）
- 自动启动
- 窗口隐藏
- 输入时间范围
- DeepSeek API Key
- 用户名（用于服务器获取 API）

### 存储位置
- **设置文件**: `~/.config/com.uuyo.copytomeandtauri/copytome_settings.json`
- **日志文件**: `~/.config/com.uuyo.copytomeandtauri/logs/`
- **DLL 文件**: 应用数据目录下的 `inject_files/`

## 安全考虑

### API 安全
- API Key 加密存储
- 支持从服务器获取加密的 API Key
- 本地 API Key 优先使用

### 系统安全
- 最小权限原则
- 剪贴板访问权限控制
- 文件系统访问限制

### 输入安全
- 输入过程可随时停止
- 线程安全的停止机制
- 错误处理和恢复

## 部署和发布

### 构建配置
- **优化**: Release 模式下启用 LTO 和大小优化
- **平台**: 支持 Windows、macOS、Linux
- **更新**: 集成自动更新功能

### 发布流程
1. 版本号更新（前端 package.json 和 Cargo.toml）
2. 构建生产版本
3. 生成更新文件
4. 上传到更新服务器

## 开发规范

### 代码风格
- Vue 3 Composition API
- 中文注释和界面
- 详细的日志记录
- 错误边界处理

### 命名规范
- 组件: PascalCase
- 工具函数: camelCase
- 常量: UPPER_SNAKE_CASE
- 文件名: kebab-case

### 日志规范
- 使用 @tauri-apps/plugin-log
- 分级日志（trace, info, error）
- 中文日志内容
- 包含上下文信息

## 故障排除

### 常见问题
1. **快捷键注册失败**: 检查系统快捷键冲突
2. **API 调用失败**: 验证 API Key 和网络连接
3. **输入不流畅**: 调整时间范围设置
4. **DLL 注入失败**: 检查目标程序权限

### 调试方法
- 查看日志文件
- 使用开发者工具
- 检查系统权限
- 验证配置文件

## 更新和维护

### 自动更新
- 检查更新服务器
- 支持跳过版本
- 增量更新
- 回滚机制

### 维护建议
- 定期检查依赖更新
- 监控 API 服务状态
- 收集用户反馈
- 性能优化