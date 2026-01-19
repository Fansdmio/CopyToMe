<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 侧边栏 -->
      <el-aside width="240px" class="sidebar">
        <div class="logo-container">
          <img src="/src/assets/logo.png" style="width: 40px;"></img>
          <h2>CopyToMe</h2>
        </div>

        <el-menu :default-active="activeMenu" class="sidebar-menu" @select="handleMenuSelect">
          <el-menu-item index="home">
            <el-icon>
              <HomeFilled />
            </el-icon>
            <span>主页</span>
          </el-menu-item>
          <el-menu-item index="history">
            <el-icon>
              <ChatDotRound />
            </el-icon>
            <span>问答记录</span>
          </el-menu-item>
          <el-menu-item index="settings">
            <el-icon>
              <Setting />
            </el-icon>
            <span>设置</span>
          </el-menu-item>
          <el-menu-item index="notifications">
            <el-icon>
              <BellFilled />
            </el-icon>
            <span>通知中心</span>
          </el-menu-item>
          <el-menu-item index="about">
            <el-icon>
              <InfoFilled />
            </el-icon>
            <span>关于</span>
          </el-menu-item>
        </el-menu>

        <div class="sidebar-footer">
          <el-text size="small" type="info">20251103</el-text>
        </div>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="main-content">
        <!-- 主页 -->
        <div v-show="activeMenu === 'home'" class="page-container">
          <HomePage ref="homeRef" />
        </div>

        <!-- 问答记录页面 -->
        <div v-show="activeMenu === 'history'" class="page-container">
          <HistoryPage />
        </div>

        <!-- 设置页面 -->
        <div v-show="activeMenu === 'settings'" class="page-container">
          <SettingPage @update-shortcuts="handleUpdateShortcuts" />
        </div>

        <!-- 通知中心 -->
        <div v-show="activeMenu === 'notifications'" class="page-container">
          <NotificationsPage />
        </div>

        <!-- 关于 -->
        <div v-show="activeMenu === 'about'" class="page-container">
          <AboutPage />
        </div>
      </el-main>
    </el-container>

    <!-- 通知视图组件 -->
    <NotificationView :notification="activeNotification" />

    <Update></Update>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, h } from 'vue'
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ElMessage, ElNotification } from 'element-plus'
import { HomeFilled, Setting, InfoFilled, ChatDotRound, BellFilled } from '@element-plus/icons-vue'
import { enable, disable } from '@tauri-apps/plugin-autostart'
import HomePage from './components/Home.vue'
import HistoryPage from './components/History.vue'
import SettingPage from './components/Setting.vue'
import AboutPage from './components/About.vue'
import NotificationsPage from './components/Notifications.vue'
import NotificationView from './components/NotificationView.vue'
import { invoke } from '@tauri-apps/api/core'
import { debounceAfter, debounce, getFormattedDate } from './utils/common.js'
import { useShortcuts } from './composables/useShortcuts.js'
import { handleWxInput, removeThinkingTags } from './utils/textProcessing.js'
import { listen } from '@tauri-apps/api/event';
import aiMg from "./composables/aiMg.js";
import setMg from "./composables/setMg.js";
import mitt from './utils/mitt.js'
import { trace, info, error, attachConsole } from '@tauri-apps/plugin-log';
import Update from './components/Update.vue';
import { toggleTrayIcon, isTrayIconVisible, hideTrayIcon, showTrayIcon } from './main.js';
import { useNotifications } from './composables/notificationMg.js';

// const detach = await attachConsole();
info('App.vue: 应用启动');


// 使用 快捷键管理器
const {
  registerShortcuts,
  updateShortcuts,
  registerToggleWindowKey,
  unregisterToggleWindowKey,
  registerJKey,
  unregisterJKey,
  registerKKey,
  unregisterKKey,
  registerLKey,
  unregisterLKey
} = useShortcuts()
const homeRef = ref(null)

// 模拟输入状态管理
const typingState = ref({
  inputMode: false,       // 是否进入模拟输入模式
  isTyping: false,        // 是否正在输入（J键按下）
  cachedText: '',         // 缓存的文本
  currentPosition: 0,     // 当前输入位置
  jKeyRegistered: false,  // J键是否已注册
  kKeyRegistered: false,  // K键是否已注册
  lKeyRegistered: false,  // L键是否已注册
  lKeyCooldown: false,    // L键是否在冷却中
  jKeyCooldown: false     // J键是否在冷却中
})

// 使用通知管理器
const {
  activeNotification,
  loadStoredNotifications,
  checkAndShowNotifications
} = useNotifications()

// 初始化设置为默认值，会在 onBeforeMount 中更新为实际值
const settings = setMg.settings

// 当前激活的菜单
const activeMenu = ref('home')


// 菜单选择处理
const handleMenuSelect = (index) => {
  info(`App.vue: 菜单切换 -> ${index}`)
  activeMenu.value = index
}

// 辅助函数：检查并加载剪贴板文本到缓存区
const loadTextToCache = async () => {
  const text = await readText()
  info(`App.vue: 从剪贴板读取文本,长度: ${text?.length || 0}`);

  if (!text?.trim()) {
    ElMessage.warning('剪贴板为空')
    return false
  }

  typingState.value.cachedText = text
  typingState.value.currentPosition = 0
  info("App.vue: 缓存区已填充");
  return true
}

// 辅助函数：检查缓存区是否需要重新加载
const checkAndReloadCache = async () => {
  // 检查是否文本已输入完成
  if (typingState.value.cachedText &&
    typingState.value.currentPosition >= typingState.value.cachedText.length) {
    info("App.vue: 检测到文本已输入完成，重新从剪贴板加载");
    return await loadTextToCache()
  }

  // 如果缓存区为空
  if (!typingState.value.cachedText) {
    return await loadTextToCache()
  }

  return true
}

listen('text_handled', () => {
  info("App.vue: 模拟输入完成");
  typingState.value.isTyping = false
  typingState.value.currentPosition = typingState.value.cachedText.length
})

listen('text_paused', (event) => {
  const position = event.payload
  info(`App.vue: 模拟输入暂停,位置: ${position}`);
  typingState.value.isTyping = false
  typingState.value.currentPosition = position
})

// Ctrl+K: 进入模拟输入模式
const handleText = async () => {
  info("App.vue: 触发进入模拟输入模式快捷键");
  if (!settings.textProcessEnabled) {
    return
  }

  // 如果已经在模拟输入模式，则退出模式
  if (typingState.value.inputMode) {
    info("App.vue: 退出模拟输入模式");
    await exitInputMode()
    ElMessage.info('已退出模拟输入模式')
    return
  }

  // 进入模拟输入模式
  info("App.vue: 进入模拟输入模式");
  typingState.value.inputMode = true

  // 注册 J、K、L 键
  await registerJKey(handleJKey)
  await registerKKey(handleKKey)
  await registerLKey(handleLKey)

  ElMessage.success('已进入模拟输入模式 | J:开始/停止 | K:清空缓存 | L:逐字输出')
}

// 退出模拟输入模式
const exitInputMode = async () => {
  info("App.vue: 退出模拟输入模式（保留状态）");

  // 如果正在输入，先停止
  if (typingState.value.isTyping) {
    await invoke('stop_typing')
  }

  // 只改变模式状态和停止输入，保留缓存和位置
  typingState.value.inputMode = false
  typingState.value.isTyping = false
  // 保留 cachedText 和 currentPosition

  // 注销 J、K、L 键
  await unregisterJKey()
  await unregisterKKey()
  await unregisterLKey()
}

// J键: 开始/停止模拟输入
const handleJKey = async () => {
  info("App.vue: 触发 J 键 - 开始/停止模拟输入");

  if (!typingState.value.inputMode) {
    info("App.vue: 不在模拟输入模式，忽略 J 键");
    return
  }

  // 如果正在输入，则停止
  if (typingState.value.isTyping) {
    info("App.vue: 停止模拟输入");
    await invoke('stop_typing')
    typingState.value.isTyping = false
    ElMessage.info('已停止输入')

    // 进入0.5秒冷却期
    typingState.value.jKeyCooldown = true
    info("App.vue: J键进入0.5秒冷却期");
    setTimeout(() => {
      typingState.value.jKeyCooldown = false
      info("App.vue: J键冷却期结束");
    }, 500)
    return
  }

  // 如果在冷却期，无法启动
  if (typingState.value.jKeyCooldown && !typingState.value.isTyping) {
    return
  }

  // 检查并加载缓存区
  if (!await checkAndReloadCache()) {
    return
  }

  // 开始模拟输入
  info(`App.vue: 开始模拟输入，从位置 ${typingState.value.currentPosition} 开始`);
  typingState.value.isTyping = true

  await new Promise(resolve => setTimeout(resolve, 500));
  invoke('handle_text', {
    text: typingState.value.cachedText,
    startPosition: typingState.value.currentPosition
  })
}

// K键: 暂停并清空缓存区
const handleKKey = async () => {
  info("App.vue: 触发 K 键 - 暂停并清空缓存");

  if (!typingState.value.inputMode) {
    info("App.vue: 不在模拟输入模式，忽略 K 键");
    return
  }

  // 如果正在输入，发送停止信号
  if (typingState.value.isTyping) {
    await invoke('stop_typing')
    info("App.vue: 已发送停止信号");
  }

  // 清空缓存区
  typingState.value.cachedText = ''
  typingState.value.currentPosition = 0
  typingState.value.isTyping = false

  ElMessage.warning('已清空缓存区')
  info('App.vue: 缓存区已清空')
}

// L键: 逐字输出
const handleLKey = async () => {
  info("App.vue: 触发 L 键 - 逐字输出");

  if (!typingState.value.inputMode) {
    info("App.vue: 不在模拟输入模式，忽略 L 键");
    return
  }

  // 如果在冷却期，直接返回
  if (typingState.value.lKeyCooldown) {
    info("App.vue: L键在冷却期，忽略本次按键");
    return
  }

  // 如果正在模拟输入(J键触发的)，则忽略
  if (typingState.value.isTyping) {
    info("App.vue: 正在进行模拟输入，忽略 L 键");
    return
  }

  // 检查并加载缓存区
  if (!await checkAndReloadCache()) {
    return
  }

  // 输出单个字符
  try {
    const newPosition = await invoke('type_single_char', {
      text: typingState.value.cachedText,
      position: typingState.value.currentPosition
    })
    typingState.value.currentPosition = newPosition
    // info(`App.vue: 输出单个字符，新位置: ${newPosition}`);

    // 检查是否输出完成
    if (newPosition >= typingState.value.cachedText.length) {
      info("App.vue: 逐字输出完成,进入1.5秒冷却期");
      typingState.value.lKeyCooldown = true
      setTimeout(() => {
        typingState.value.lKeyCooldown = false
        info("App.vue: L键冷却期结束");
      }, 1500)
    }
  } catch (e) {
    error(`App.vue: 单字符输出失败: ${e}`);
    ElMessage.error('字符输出失败')
  }
}

// AI 问答快捷键处理函数
const handleQuestion = debounce(async () => {
  info("App.vue: 触发AI问答快捷键");
  if (!settings.aiQAEnabled) {
    info("App.vue: AI问答功能已禁用");
    ElMessage.warning('AI 问答功能已禁用,请在设置中启用')
    return
  }

  const question = await readText()
  info(`App.vue: 读取到问题,长度: ${question?.length || 0}`);
  if (!question?.trim()) return

  info(`App.vue: 处理问题: ${question.substring(0, 50)}...`)

  // 调用 AI
  let answer = await aiMg.askAi(question)
  if (!answer) {
    info("App.vue: AI未返回答案");
    return
  }

  info(`App.vue: AI返回答案,长度: ${answer.length}`);

  // 发送历史更新事件（历史记录已在 askAi 中保存）
  mitt.emit("history-update")

  // 准备写入剪贴板的内容（去除思考标签）
  let clipboardAnswer = removeThinkingTags(answer)
  info(`App.vue: 去除思考标签后,长度: ${clipboardAnswer.length}`);

  // 微信输入法模式处理
  if (settings.wxInputMode) {
    info("App.vue: 应用微信输入法模式(去除换行)");
    clipboardAnswer = handleWxInput(clipboardAnswer)
  }

  await writeText(clipboardAnswer)
  info("App.vue: AI回答已写入剪贴板");
  
  // 调用后端全局改变鼠标样式（仅Windows）
  try {
    await invoke('change_cursor_globally', { durationMs: 500 })
  } catch (e) {
    error(`App.vue: 全局光标更改失败: ${e}`);
  }
    
  ElMessage.success('AI 回答已复制到剪贴板')
})

// 托盘图标显示/隐藏切换处理函数
const handleToggleWindow = async () => {
  info("App.vue: 触发托盘图标显示/隐藏快捷键");
  try {
    const wasVisible = isTrayIconVisible();
    await toggleTrayIcon();
    const isVisible = isTrayIconVisible();

    if (isVisible && !wasVisible) {
      info("App.vue: 托盘图标已显示");
      ElMessage.success('托盘图标已显示');
    } else if (!isVisible && wasVisible) {
      info("App.vue: 托盘图标已隐藏");
      ElMessage.success('托盘图标已隐藏');
    }
  } catch (e) {
    error(`App.vue: 托盘图标显示/隐藏切换失败: ${e}`);
    ElMessage.error('托盘图标操作失败: ' + e.message);
  }
}

// 更新快捷键处理
const handleUpdateShortcuts = async () => {
  info(`App.vue: 更新快捷键 - 文本:${settings.textKey}(${settings.textProcessEnabled}), 问答:${settings.questionKey}(${settings.aiQAEnabled}), 托盘图标切换:${settings.toggleWindowKey}(${settings.toggleWindowEnabled})`);
  updateShortcuts(
    settings.textKey,
    settings.questionKey,
    handleText,
    handleQuestion,
    settings.textProcessEnabled,
    settings.aiQAEnabled
  )
  // 更新托盘图标切换快捷键
  await unregisterToggleWindowKey()
  if (settings.toggleWindowEnabled) {
    await registerToggleWindowKey(settings.toggleWindowKey, handleToggleWindow)
  } else {
    info('App.vue: 托盘图标切换快捷键已禁用，跳过注册')
  }
}

// 从服务器获取信息并显示通知
const fromServerGetInfo = async () => {
  try {
    info("App.vue: 开始检查服务器通知");
    await loadStoredNotifications();
    await checkAndShowNotifications();
    info("App.vue: 通知检查完成");
  } catch (e) {
    error(`App.vue: 检查通知失败: ${e}`);
  }
}

//更新时间范围
const updateTimeRange = async (val) => {
  info(`App.vue: 更新时间范围 [${val[0]}, ${val[1]}]`);
  //持久化保存
  await setMg.save();
  try {
    await invoke('update_time_range', {
      left: val[0],
      right: val[1]
    })
    info("App.vue: 时间范围更新成功");
  } catch (error) {
    error(`App.vue: 时间范围更新失败: ${error}`);
    ElMessage.warning('时间范围更新失败,但设置已保存')
  }
}
//进行防抖处理
const updateTimeRangeDebounce = debounceAfter(updateTimeRange, 500);


const saveAutoStart = async (val) => {
  info(`App.vue: 设置自启动: ${val}`);
  //持久化保存
  await setMg.save();
  if (val) {
    enable()
    info("App.vue: 已启用自启动");
  }
  else {
    try {
      disable()
      info("App.vue: 已禁用自启动");
    } catch (e) {
      error(`App.vue: 禁用自启动失败: ${e}`)
    }
  }
}

// 初始化
onMounted(async () => {
  info("App.vue: 开始初始化");
  try {
    //等待 AI 模块初始化完成
    await aiMg.init()
    info("App.vue: AI模块初始化完成");
  } catch (e) {
    error(`App.vue: AI模块初始化失败: ${e}`);
    ElMessage.error('初始化失败，请重启应用');
  }
  info("发送历史更新事件")
  mitt.emit("history-update")

  info("发送检查更新事件")
  mitt.emit("check-update")

  // 检查服务器通知
  await fromServerGetInfo()

  try {
    if (setMg.get("hideWindow")) {
      info("App.vue: 隐藏窗口");
      getCurrentWindow().hide()
    }
  } catch (e) {
    error(`App.vue: 窗口操作失败: ${e}`);
  }

  // 处理自动隐藏托盘图标
  try {
    if (setMg.get("autoHideTray")) {
      info("App.vue: 自动隐藏托盘图标");
      await hideTrayIcon()
    }
  } catch (e) {
    error(`App.vue: 托盘图标操作失败: ${e}`);
  }

  //检查AI健康
  try {
    info("App.vue: 开始检查AI健康状态");
    homeRef.value?.checkAi()
  } catch (e) {
    error(`App.vue: AI健康检查失败: ${e}`);
  }

  // 统一设置监听器
  // 普通设置项变化时保存
  watch([
    () => settings.wxInputMode,
    () => settings.textProcessEnabled,
    () => settings.aiQAEnabled,
    () => settings.hideWindow,
    () => settings.deepThinking
  ], () => setMg.save())

  // 时间范围变化（需要防抖）
  watch(() => settings.timeRange, updateTimeRangeDebounce)

  // 自启动设置
  watch(() => settings.autoStart, saveAutoStart)

  // 自动隐藏托盘图标（需要额外逻辑）
  watch(() => settings.autoHideTray, async (val) => {
    info(`App.vue: 自动隐藏托盘图标设置变更: ${val}`);
    await setMg.save()

    if (val) {
      await hideTrayIcon()
      ElMessage.success('托盘图标已隐藏，可通过快捷键恢复显示')
    } else {
      await showTrayIcon()
      ElMessage.success('托盘图标已显示')
    }
  })

  // 初始化时间范围到 Rust 后端
  try {
    await invoke('update_time_range', {
      left: settings.timeRange[0],
      right: settings.timeRange[1]
    })
    info(`App.vue: 已初始化时间范围: [${settings.timeRange[0]}, ${settings.timeRange[1]}]`);
  } catch (e) {
    error(`App.vue: 初始化时间范围失败: ${e}`);
  }

  // 注册快捷键 (不包括停止键)
  try {
    info(`App.vue: 注册快捷键 - 文本:${settings.textKey}(${settings.textProcessEnabled}), 问答:${settings.questionKey}(${settings.aiQAEnabled})`);
    await registerShortcuts(
      settings.textKey,
      settings.questionKey,
      handleText,
      handleQuestion,
      settings.textProcessEnabled,
      settings.aiQAEnabled
    )
    info("App.vue: 快捷键注册成功");
  } catch (e) {
    error(`App.vue: 快捷键注册失败: ${e}`);
    ElMessage.warning('快捷键注册失败，但应用可以继续使用');
  }

  // 注册托盘图标切换快捷键
  try {
    if (settings.toggleWindowEnabled) {
      info(`App.vue: 注册托盘图标切换快捷键: ${settings.toggleWindowKey}`);
      await registerToggleWindowKey(settings.toggleWindowKey, handleToggleWindow)
      info("App.vue: 托盘图标切换快捷键注册成功");
    } else {
      info('App.vue: 托盘图标切换快捷键已禁用，跳过注册');
    }
  } catch (e) {
    error(`App.vue: 托盘图标切换快捷键注册失败: ${e}`);
    ElMessage.warning('托盘图标切换快捷键注册失败，但应用可以继续使用');
  }

  info("App.vue: 初始化完成");
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body,
html {
  height: 100%;
  overflow: hidden;
}

#app {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  height: 100vh;
  background: #f5f7fa;
}

/* 侧边栏样式 */
.sidebar {
  background: #fff;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
  display: flex;
  flex-direction: column;
  height: 100vh;
  margin: 8px 4px 8px 8px;
  /* 右边距改为4px,增加与主内容的间隙 */
  border-radius: 12px;
}

.logo-container {
  padding: 20px 16px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid #e4e7ed;
}

.logo-container h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.sidebar-menu {
  flex: 1;
  border-right: none;
  padding: 8px 8px;
}

.sidebar-menu .el-menu-item {
  border-radius: 8px;
  margin-bottom: 2px;
  height: 44px;
  line-height: 44px;
  font-size: 14px;
}

.sidebar-menu .el-menu-item:hover {
  background: #ecf5ff;
}

.sidebar-menu .el-menu-item.is-active {
  background: linear-gradient(90deg, #409EFF 0%, #66b1ff 100%);
  color: #fff !important;
}

.sidebar-footer {
  padding: 12px 16px;
  text-align: center;
  border-top: 1px solid #e4e7ed;
}

/* 主内容区域 */
.main-content {
  background: #fff;
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - 16px);
  margin: 8px 8px 8px 4px;
  /* 左边距改为4px,增加与侧边栏的间隙 */
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}

.page-container {
  max-width: 100%;
  margin: 0 auto;
}

/* 响应式布局 */
@media (min-width: 1400px) {
  .page-container {
    max-width: 1200px;
  }

  .main-content {
    padding: 20px;
  }
}

@media (max-width: 1200px) {
  .main-content {
    padding: 12px;
  }

  .sidebar {
    width: 200px;
  }
}

@media (max-width: 768px) {
  .sidebar {
    width: 180px;
    margin: 4px 0 4px 4px;
  }

  .main-content {
    padding: 8px;
    margin: 4px 4px 4px 0;
  }

  .logo-container h2 {
    font-size: 16px;
  }
}

/* 卡片样式 */
.welcome-card,
.about-card {
  border-radius: 12px;
  overflow: hidden;
}

.about-card :deep(.el-card__body) {
  padding: 16px;
}

.about-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}


/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}
</style>