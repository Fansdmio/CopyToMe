# AI 代理项目指南：CopyToMeAndTauri

本指南旨在为 AI 代理提供 `CopyToMeAndTauri` 项目的深度解析，以便快速理解项目的功能、架构和代码实现，从而高效地进行后续开发与维护。

## 1. 项目总览

`CopyToMeAndTauri` 是一个基于 Tauri (Rust 后端) 和 Vue.js (前端) 构建的桌面剪贴板增强工具。它的核心定位是作为用户剪贴板和其它应用程序之间的智能“中间人”，通过注册全局快捷键来触发一系列特殊的“粘贴”行为。

**主要目标:**

1.  **绕过粘贴限制**: 通过模拟真实的人类按键输入，将文本粘贴到那些禁用了标准粘贴命令（如 `Ctrl+V`）的应用程序或网站中。
2.  **AI 文本处理**: 集成多种 AI 服务（如 DeepSeek、自定义 OpenAI/Google API），允许用户将剪贴板中的文本（如问题）发送给 AI，然后将 AI 的回答自动复制回剪贴板。

## 2. 核心功能详解

应用的两大核心功能均通过全局快捷键激活。

### a. 模拟输入

-   **功能描述**: 此功能读取剪贴板中的文本，然后逐字模拟键盘按键输入。为了使其行为更像人类，每次按键之间会有一个可配置的随机延迟。
-   **使用场景**: 在一些考试软件、网页表单或远程桌面环境中，常规的粘贴操作可能被禁用，此功能可以有效规避该限制。
-   **触发方式**: 默认快捷键 `CmdOrControl+K`。
-   **技术实现**:
    -   **后端**: 核心逻辑位于 Rust 后端 `src-tauri/src/lib.rs` 中的 `handle_text` 函数。
    -   **输入模拟**: 使用 `enigo` 这个 Rust 库来跨平台地模拟键盘和鼠标事件。
    -   **异步执行**: `handle_text` 在一个独立的线程中运行，避免阻塞 UI 主线程。
    -   **中断机制**: 用户在模拟输入过程中可以随时按下 `K` 键来中断操作。这是通过一个全局的原子布尔值 `STOP_FLAG` (类型为 `Arc<AtomicBool>`) 实现的。`stop_typing` 命令将其设置为 `true`，而 `handle_text` 线程中的循环会持续检查此标志。
    -   **延迟配置**: 输入延迟的时间范围（如 1-5ms）由前端通过 `update_time_range` 命令设置，并保存在后端的静态变量中。

### b. AI 问答

-   **功能描述**: 读取剪贴板中的文本作为一个问题，将其发送给配置好的 AI 模型，并将返回的答案写回剪贴板。
-   **使用场景**: 快速使用 AI 回答问题、润色文本、翻译等，无需离开当前工作窗口。
-   **触发方式**: 默认快捷键 `CmdOrControl+J`。
-   **技术实现**:
    -   **前端**: 此功能的绝大部分逻辑都在前端 `src/composables/aiMg.js` 中实现。
    -   **AI 服务抽象**: `aiMg.js` 封装了对不同 AI 服务的调用逻辑，目前支持：
        1.  **DeepSeek**: 默认服务，支持 `deepseek-chat` 和 `deepseek-reasoner` (深度思考) 模型。
        2.  **自定义 AI**: 支持任何与 OpenAI API 或 Google Gemini API 格式兼容的自定义端点。
    -   **API 密钥管理**:
        -   用户可以直接在设置中填入 DeepSeek API Key。
        -   如果 key 为空，但配置了用户名，程序会从一个中心服务器 `https://cp.uuyo.fun` 获取一个加密的 API Key，然后在本地使用 `crypto.js` 中的 `decryptGCM` 函数进行解密。这个解密后的 key 会被缓存，但不会被持久化。
    -   **历史记录**: AI 问答的历史记录会通过 `tauri-plugin-store`保存在本地的 `copytome_settings.json` 文件中。

## 3. 项目架构

### a. 前端 (Vue.js + Vite)

-   **目录**: `src/`
-   **UI 框架**: 使用 Vue 3 和 [Element Plus](https://element-plus.org/) 组件库。
-   **页面导航**: 应用是一个单页面应用 (SPA)，但没有使用 `vue-router`。页面切换是通过 `App.vue` 中的 `v-show` 指令来控制不同组件的显示和隐藏。当前激活的菜单项由 `activeMenu` 这个 ref 变量决定。
-   **状态管理**:
    -   项目的核心状态（所有用户配置）都存放在 `src/composables/setMg.js` 中的一个 `reactive` 对象 `settings` 中。
    -   使用 `tauri-plugin-store` 将 `settings` 对象持久化到本地的 JSON 文件中。`setMg.js` 封装了加载 (`init`) 和保存 (`save`) 的逻辑。
-   **核心逻辑**:
    -   **AI 相关**: `src/composables/aiMg.js` 是整个项目的“大脑”，负责处理所有与 AI 相关的逻辑。
    -   **快捷键**: `src/composables/useShortcuts.js` 封装了使用 `tauri-plugin-global-shortcut` 注册和更新全局快捷键的逻辑。

### b. 后端 (Tauri + Rust)

-   **目录**: `src-tauri/`
-   **主要职责**: 提供前端无法实现或性能较低的系统级功能。
-   **暴露的命令**: 通过 `#[tauri::command]` 宏，向前端暴露了以下核心命令：
    -   `handle_text`: 执行模拟输入。
    -   `stop_typing`: 中断模拟输入。
    -   `update_time_range`: 更新模拟输入的时间延迟范围。
    -   `create_directory`, `open_folder`: 文件系统操作，主要用于 DLL 注入功能。

## 4. 关键文件分析

理解以下文件对于开发至关重要：

-   `src-tauri/src/lib.rs`: **后端核心**。实现了模拟输入 `handle_text` 和中断机制。代码简洁、功能明确。
-   `src/composables/aiMg.js`: **AI 逻辑中心**。管理 API Key 的获取（包括从服务器解密）、支持多种 AI 服务 (DeepSeek/Custom)、构建请求、处理响应，并保存历史记录。是项目中最复杂的模块。
-   `src/composables/setMg.js`: **全局设置管理器**。定义了所有设置的默认值 (`DEFAULT_SETTINGS`)，并使用 `tauri-plugin-store` 进行持久化。任何配置的读取和修改都应通过此模块。
-   `src/App.vue`: **主组件**。应用的根组件，负责：
    -   构建基本 UI 布局（侧边栏和主内容区）。
    -   在 `onMounted` hook 中初始化应用，包括注册快捷键。
    -   定义快捷键的回调函数 `handleText` 和 `handleQuestion`，作为功能的入口点。
    -   管理不同页面组件的切换。
-   `src/components/Setting.vue`: **设置页面**。提供了所有用户可配置项的 UI 界面，包括快捷键、AI 配置、功能开关等。它通过 `emit('update-shortcuts')` 事件通知 `App.vue` 更新快捷键。
-   `src/components/Home.vue`: **主页**。作为应用的仪表盘，显示了功能状态、快捷键说明、AI 服务健康状态以及详细的使用指南。
-   `package.json`: **前端依赖与脚本**。定义了项目的前端依赖库（如 `vue`, `element-plus`, `@tauri-apps/api` 等）和核心开发脚本 (`tauri dev`, `tauri build`)。
-   `src-tauri/tauri.conf.json`: **Tauri 应用配置**。定义了应用的窗口行为、插件列表、允许的后端命令、图标、以及自动更新等关键信息。

## 5. 开发与构建

-   **开发模式**:
    ```bash
    npm run tauri dev
    ```
    此命令会同时启动前端的 Vite 开发服务器和后端的 Tauri 应用，并提供热重载功能。

-   **生产构建**:
    ```bash
    npm run tauri build
    ```
    此命令会打包整个应用，生成针对当前操作系统的可执行安装文件。