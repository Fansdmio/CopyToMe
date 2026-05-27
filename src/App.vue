<template>
  <div id="app">
    <el-container class="app-container">
      <!-- 侧边栏 -->
      <el-aside width="236px" class="sidebar">
        <div class="sidebar-inner">
          <div class="logo-container">
            <div class="logo-mark">
              <img src="/src/assets/logo.png" alt="CopyToMe" />
            </div>
            <div>
              <h2>CopyToMe</h2>
            </div>
          </div>

          <el-menu :default-active="activeMenu" class="sidebar-menu" @select="handleMenuSelect">
            <el-menu-item v-for="item in navItems" :key="item.index" :index="item.index">
              <span class="nav-icon-wrap" aria-hidden="true">
                <svg class="nav-icon" viewBox="0 0 24 24" fill="none">
                  <path v-for="path in item.paths" :key="path" :d="path" />
                </svg>
              </span>
              <span>{{ item.label }}</span>
            </el-menu-item>
          </el-menu>
        </div>
      </el-aside>

      <!-- 主内容区域 -->
      <el-main class="main-content">
        <!-- 主页 -->
        <div v-show="activeMenu === 'home'" class="page-container">
          <HomePage
            ref="homeRef"
            @open-api-key-settings="openApiKeySettings"
            @update-shortcuts="handleUpdateShortcuts"
          />
        </div>

        <!-- 问答记录页面 -->
        <div v-show="activeMenu === 'history'" class="page-container">
          <HistoryPage />
        </div>

        <!-- 教程页面 -->
        <div v-show="activeMenu === 'tutorial'" class="page-container">
          <TutorialPage ref="tutorialRef" @update-shortcuts="handleUpdateShortcuts" />
        </div>

        <!-- 设置页面 -->
        <div v-show="activeMenu === 'settings'" class="page-container">
          <SettingPage ref="settingRef" @update-shortcuts="handleUpdateShortcuts" />
        </div>

        <!-- 关于 -->
        <div v-show="activeMenu === 'about'" class="page-container">
          <AboutPage />
        </div>
      </el-main>
    </el-container>

    <Update></Update>
  </div>
</template>

<script setup>
import { h, ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ElButton, ElMessage, ElNotification } from 'element-plus'
import { enable, disable } from '@tauri-apps/plugin-autostart'
import HomePage from './components/Home.vue'
import TutorialPage from './components/Tutorial.vue'
import HistoryPage from './components/History.vue'
import SettingPage from './components/Setting.vue'
import AboutPage from './components/About.vue'
import { invoke } from '@tauri-apps/api/core'
import { debounceAfter, debounce } from './utils/common.js'
import { useShortcuts } from './composables/useShortcuts.js'
import { handleWxInput, removeThinkingTags } from './utils/textProcessing.js'
import { listen } from '@tauri-apps/api/event';
import aiMg from "./composables/aiMg.js";
import setMg from "./composables/setMg.js";
import mitt from './utils/mitt.js'
import { info, error } from '@tauri-apps/plugin-log';
import Update from './components/Update.vue';
import { toggleTrayIcon, isTrayIconVisible, hideTrayIcon, showTrayIcon } from './main.js';

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
const tutorialRef = ref(null)
const settingRef = ref(null)

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

// 初始化设置为默认值, 会在 onBeforeMount 中更新为实际值
const settings = setMg.settings

// 当前激活的菜单
const activeMenu = ref('home')
let adminPrompt = null
let clipboardWatchTimer = null
let lastClipboardSnapshot = ''
let clipboardQuestionProcessing = false
let clipboardReadWarningShown = false

// 侧栏使用克制的线性图标，避免 Element Plus 默认图标带来的强组件库质感。
const navItems = [
  {
    index: 'home',
    label: '主页',
    paths: [
      'M4.5 11.4 12 5l7.5 6.4',
      'M6.5 10.8v7.7h4v-4.3h3v4.3h4v-7.7'
    ]
  },
  {
    index: 'history',
    label: '问答记录',
    paths: [
      'M6.5 6.5h11v8.2H10l-3.5 3.1V6.5Z',
      'M9 9.2h6',
      'M9 12h4.2'
    ]
  },
  {
    index: 'tutorial',
    label: '教程',
    paths: [
      'M6.5 5.7h8.8a2.2 2.2 0 0 1 2.2 2.2v10.4H8.7a2.2 2.2 0 0 1-2.2-2.2V5.7Z',
      'M9.4 9h5.2',
      'M9.4 12h4.2',
      'M6.5 16.1H5.2a1.7 1.7 0 0 1-1.7-1.7V7.6'
    ]
  },
  {
    index: 'settings',
    label: '设置',
    paths: [
      'M12 8.2a3.8 3.8 0 1 1 0 7.6 3.8 3.8 0 0 1 0-7.6Z',
      'M12 4.5v2.1M12 17.4v2.1M18.5 12h-2.1M7.6 12H5.5M16.6 7.4l-1.5 1.5M8.9 15.1l-1.5 1.5M16.6 16.6l-1.5-1.5M8.9 8.9 7.4 7.4'
    ]
  },
  {
    index: 'about',
    label: '关于',
    paths: [
      'M12 19.2a7.2 7.2 0 1 0 0-14.4 7.2 7.2 0 0 0 0 14.4Z',
      'M12 10.7v4.5',
      'M12 8.2h.01'
    ]
  }
]


// 菜单选择处理
const handleMenuSelect = async (index) => {
  info(`App.vue: 菜单切换 -> ${index}`)
  if (activeMenu.value === 'tutorial' && index !== 'tutorial') {
    await tutorialRef.value?.handleLeaveTutorial?.()
  }

  activeMenu.value = index

  if (index === 'tutorial') {
    await nextTick()
    tutorialRef.value?.resetTutorial()
  }
}

const openApiKeySettings = async () => {
  info('App.vue: 从主页跳转到 API Key 配置')
  activeMenu.value = 'settings'
  await nextTick()
  settingRef.value?.focusApiKeyField()
}

const clearTextCache = () => {
  typingState.value.cachedText = ''
  typingState.value.currentPosition = 0
}

const exitInputAndClearCache = async () => {
  await exitInputMode()
  clearTextCache()
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

const checkAndLoadCache = async () => {
  // 如果缓存区已有内容, 则不重复加载
  if (typingState.value.cachedText.trim()) {
    return true
  }
  return await loadTextToCache()
}

listen('text_handled', async () => {
  info("App.vue: 模拟输入完成");
  await exitInputAndClearCache()
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
  // 如果已经在模拟输入模式, 则退出模式
  if (typingState.value.inputMode) {
    info("App.vue: 退出模拟输入模式");
    await exitInputMode()
    return
  }

  // 进入模拟输入模式
  info("App.vue: 进入模拟输入模式");
  typingState.value.inputMode = true
  mitt.emit('typing-mode-changed', {
    inputMode: true,
    isTyping: typingState.value.isTyping
  })
  await checkAndLoadCache()

  // 注册 J、K、L 键
  await registerJKey(handleJKey)
  await registerKKey(handleKKey)
  await registerLKey(handleLKey)

  //如果处于快速输入模式下, 则直接调用 J 键处理函数
  if (settings.quickInput) {
    handleJKey()
  }

}
// 监听缓存区变化, 如果缓存区为空则注销 K 键
watch(() => typingState.value.cachedText, (newVal) => {
  if (!newVal) {
    unregisterKKey()
  }
})

// 退出模拟输入模式
const exitInputMode = async () => {
  info("App.vue: 退出模拟输入模式（保留状态）");

  // 如果正在输入, 先停止
  if (typingState.value.isTyping) {
    await invoke('stop_typing')
  }

  // 改变模式状态和停止输入状态
  typingState.value.inputMode = false
  typingState.value.isTyping = false
  mitt.emit('typing-mode-changed', {
    inputMode: false,
    isTyping: false
  })

  // 注销 J、L 键
  await unregisterJKey()
  await unregisterLKey()
}

// J键: 开始/停止模拟输入
const handleJKey = async () => {
  info("App.vue: 触发 J 键 - 开始/停止模拟输入");

  if (!typingState.value.inputMode) {
    info("App.vue: 不在模拟输入模式, 忽略 J 键");
    return
  }

  // 如果正在输入, 则停止
  if (typingState.value.isTyping) {
    //停止模拟输入
    await invoke('stop_typing')
    typingState.value.isTyping = false
    // 进入0.5秒冷却期
    typingState.value.jKeyCooldown = true
    setTimeout(() => {
      typingState.value.jKeyCooldown = false
    }, 500)
    return
  }

  // 如果在冷却期, 无法启动
  if (typingState.value.jKeyCooldown && !typingState.value.isTyping) {
    return
  }


  // 开始模拟输入
  info(`App.vue: 开始模拟输入, 从位置 ${typingState.value.currentPosition} 开始`);
  typingState.value.isTyping = true

  await new Promise(resolve => setTimeout(resolve, 500));
  invoke('handle_text', {
    text: typingState.value.cachedText,
    startPosition: typingState.value.currentPosition
  })
}

// K键: 退出并清空缓存区
const handleKKey = async () => {
  await exitInputAndClearCache()
  if (!typingState.value.cachedText.trim()) {
    unregisterKKey()
  }
}

// L键: 逐字输出
const handleLKey = async () => {
  info("App.vue: 触发 L 键 - 逐字输出");

  if (!typingState.value.inputMode) {
    info("App.vue: 不在模拟输入模式, 忽略 L 键");
    return
  }

  // 如果在冷却期, 直接返回
  if (typingState.value.lKeyCooldown) {
    info("App.vue: L键在冷却期, 忽略本次按键");
    return
  }

  // 如果正在模拟输入(J键触发的), 则忽略
  if (typingState.value.isTyping) {
    info("App.vue: 正在进行模拟输入, 忽略 L 键");
    return
  }
  // 输出单个字符
  try {
    const newPosition = await invoke('type_single_char', {
      text: typingState.value.cachedText,
      position: typingState.value.currentPosition
    })
    typingState.value.currentPosition = newPosition

    // 检查是否输出完成
    if (newPosition >= typingState.value.cachedText.length) {
      typingState.value.lKeyCooldown = true
      setTimeout(async () => {
        typingState.value.lKeyCooldown = false
        await exitInputAndClearCache()
      }, 1500)
    }
  } catch (e) {
    error(`App.vue: 单字符输出失败: ${e}`);
    ElMessage.error('字符输出失败')
  }
}

const shouldAutoAskClipboard = (text) => {
  const normalizedText = text?.trim()
  return normalizedText?.endsWith('?') || normalizedText?.endsWith('？')
}

const removeTrailingQuestionMarks = (text = '') => {
  // AI 答案写回剪贴板前去掉末尾问号，避免被剪贴板监听误判成新问题。
  return text.replace(/[?？]+(\s*)$/u, '$1')
}

const safeReadClipboardText = async (source = 'clipboard') => {
  try {
    const text = await readText()
    clipboardReadWarningShown = false
    return typeof text === 'string' ? text : ''
  } catch (e) {
    // 剪贴板里可能是图片、文件或其他非文本格式，这是正常状态，直接跳过处理。
    if (!clipboardReadWarningShown) {
      info(`App.vue: ${source} 未读取到可处理文本: ${e}`)
      clipboardReadWarningShown = true
    }
    return ''
  }
}

const processAiQuestion = async (question, source = 'shortcut') => {
  if (!settings.aiQAEnabled) {
    info("App.vue: AI问答功能已禁用");
    ElMessage.warning('AI 问答功能已禁用,请在设置中启用')
    return
  }

  if (!question?.trim()) return

  info(`App.vue: 处理${source === 'clipboard' ? '剪贴板监听' : '快捷键'}问题: ${question.substring(0, 50)}...`)

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
  let clipboardAnswer = removeTrailingQuestionMarks(removeThinkingTags(answer))
  info(`App.vue: 去除思考标签后,长度: ${clipboardAnswer.length}`);

  // 微信输入法模式处理
  if (settings.wxInputMode) {
    info("App.vue: 应用微信输入法模式(去除换行)");
    clipboardAnswer = removeTrailingQuestionMarks(handleWxInput(clipboardAnswer))
  }

  await writeText(clipboardAnswer)
  lastClipboardSnapshot = clipboardAnswer
  info("App.vue: AI回答已写入剪贴板");
  mitt.emit('ai-answer-completed', {
    question: question.trim(),
    source
  })

  // 调用后端全局改变鼠标样式（仅Windows）
  try {
    await invoke('change_cursor_globally', { durationMs: 500 })
  } catch (e) {
    error(`App.vue: 全局光标更改失败: ${e}`);
  }

  ElMessage.success('AI 回答已复制到剪贴板')
}

// AI 问答快捷键处理函数
const handleQuestion = debounce(async () => {
  info("App.vue: 触发AI问答快捷键");
  const question = await safeReadClipboardText('快捷键读取剪贴板')
  info(`App.vue: 读取到问题,长度: ${question?.length || 0}`);
  await processAiQuestion(question)
})

const stopClipboardQuestionWatcher = () => {
  if (!clipboardWatchTimer) return

  clearInterval(clipboardWatchTimer)
  clipboardWatchTimer = null
  info("App.vue: 已停止监听剪贴板问题")
}

const checkClipboardQuestion = async () => {
  if (!settings.clipboardQuestionEnabled || clipboardQuestionProcessing) return

  try {
    const text = await safeReadClipboardText('剪贴板监听')
    if (text === lastClipboardSnapshot) return

    lastClipboardSnapshot = text || ''
    if (!shouldAutoAskClipboard(text)) return

    clipboardQuestionProcessing = true
    info("App.vue: 检测到剪贴板问题, 自动触发 AI 问答")
    await processAiQuestion(text, 'clipboard')
  } catch (e) {
    error(`App.vue: 监听剪贴板问题失败: ${e}`)
  } finally {
    clipboardQuestionProcessing = false
  }
}

const startClipboardQuestionWatcher = async () => {
  if (clipboardWatchTimer || !settings.clipboardQuestionEnabled) return

  lastClipboardSnapshot = await safeReadClipboardText('初始化剪贴板监听快照')

  // Tauri 剪贴板没有变化事件，这里使用轻量轮询检测用户复制的新问题。
  clipboardWatchTimer = setInterval(checkClipboardQuestion, 900)
  info("App.vue: 已启动监听剪贴板问题")
}

// 托盘图标显示/隐藏切换处理函数
const handleToggleWindow = async () => {
  info("App.vue: 触发托盘图标显示/隐藏快捷键");
  try {
    const wasVisible = isTrayIconVisible();
    await toggleTrayIcon();
    const isVisible = isTrayIconVisible();

    if (isVisible && !wasVisible) {
      info("App.vue: 托盘图标已显示");
    } else if (!isVisible && wasVisible) {
      info("App.vue: 托盘图标已隐藏");
    }
  } catch (e) {
    error(`App.vue: 托盘图标显示/隐藏切换失败: ${e}`);
    // ElMessage.error('托盘图标操作失败: ' + e.message);
  }
}

// 更新快捷键处理
const handleUpdateShortcuts = async () => {
  info(`App.vue: 更新快捷键 - 文本:${settings.textKey}(${settings.textProcessEnabled}), 问答:${settings.questionKey}(${settings.aiQAEnabled}), 托盘图标切换:${settings.toggleWindowKey}(${settings.toggleWindowEnabled})`);

  // 模拟输入被保护模式禁用时，主动退出当前输入态，避免 J/K/L 临时键继续生效。
  if (!settings.textProcessEnabled && typingState.value.inputMode) {
    await exitInputAndClearCache()
  }

  await updateShortcuts(
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
    info('App.vue: 托盘图标切换快捷键已禁用, 跳过注册')
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

const relaunchWithAdmin = async () => {
  try {
    adminPrompt?.close()
    info("App.vue: 请求以管理员身份重启");
    await invoke('relaunch_as_admin')
  } catch (e) {
    error(`App.vue: 管理员重启失败: ${e}`)
    ElMessage.error('管理员重启失败')
  }
}

const showAdminPrompt = () => {
  if (adminPrompt) return

  // 使用通知而不是模态框，避免打断用户进入应用后的正常操作。
  adminPrompt = ElNotification({
    title: '当前不是管理员权限',
    message: h('div', { class: 'admin-prompt' }, [
      h('p', { class: 'admin-prompt__text' }, '比 CopyToMe 权限高的应用,无法使用模拟输入功能'),
      h(ElButton, {
        type: 'primary',
        size: 'small',
        onClick: relaunchWithAdmin
      }, () => '以管理员身份重启')
    ]),
    duration: 0,
    position: 'bottom-right',
    onClose: () => {
      adminPrompt = null
    }
  })
}

const checkAdminPrivilege = async () => {
  try {
    const isAdmin = await invoke('is_running_as_admin')
    info(`App.vue: 当前管理员权限状态: ${isAdmin}`)
    if (isAdmin) return

    if (settings.runAsAdmin) {
      await relaunchWithAdmin()
      return
    }

    showAdminPrompt()
  } catch (e) {
    error(`App.vue: 管理员权限检查失败: ${e}`)
  }
}

const applyStartupWindowVisibility = async () => {
  const appWindow = getCurrentWindow()

  try {
    if (setMg.get("hideWindow")) {
      info("App.vue: 启动设置为隐藏窗口");
      await appWindow.hide()
      return
    }

    // 主窗口在 Tauri 配置中默认不可见，等设置加载完成后再显示，避免启动时先闪窗再隐藏。
    info("App.vue: 启动设置为显示窗口");
    await appWindow.show()
  } catch (e) {
    error(`App.vue: 启动窗口显示状态应用失败: ${e}`);
  }
}

// 初始化
onMounted(async () => {
  info("App.vue: 开始初始化");
  try {
    //等待 AI 模块初始化完成
    await aiMg.init()
    info("App.vue: AI模块初始化完成");
    await applyStartupWindowVisibility()
    await checkAdminPrivilege()
  } catch (e) {
    error(`App.vue: AI模块初始化失败: ${e}`);
    await getCurrentWindow().show()
    ElMessage.error('初始化失败, 请重启应用');
  }
  info("发送历史更新事件")
  mitt.emit("history-update")

  info("发送检查更新事件")
  mitt.emit("check-update")

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
    () => settings.quickInput,
    () => settings.runAsAdmin
  ], () => setMg.save())

  // 时间范围变化（需要防抖）
  watch(() => settings.timeRange, updateTimeRangeDebounce)

  // 自启动设置
  watch(() => settings.autoStart, saveAutoStart)

  watch(() => settings.clipboardQuestionEnabled, async (enabled) => {
    await setMg.save()
    if (enabled) {
      await startClipboardQuestionWatcher()
    } else {
      stopClipboardQuestionWatcher()
    }
  })

  // 自动隐藏托盘图标（需要额外逻辑）
  watch(() => settings.autoHideTray, async (val) => {
    info(`App.vue: 自动隐藏托盘图标设置变更: ${val}`);
    await setMg.save()

    if (val) {
      await hideTrayIcon()
      ElMessage.success('托盘图标已隐藏, 可通过快捷键恢复显示')
    } else {
      await showTrayIcon()
      // ElMessage.success('托盘图标已显示')
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
    ElMessage.warning('快捷键注册失败, 但应用可以继续使用');
  }

  // 注册托盘图标切换快捷键
  try {
    if (settings.toggleWindowEnabled) {
      info(`App.vue: 注册托盘图标切换快捷键: ${settings.toggleWindowKey}`);
      await registerToggleWindowKey(settings.toggleWindowKey, handleToggleWindow)
      info("App.vue: 托盘图标切换快捷键注册成功");
    } else {
      info('App.vue: 托盘图标切换快捷键已禁用, 跳过注册');
    }
  } catch (e) {
    error(`App.vue: 托盘图标切换快捷键注册失败: ${e}`);
    ElMessage.warning('托盘图标切换快捷键注册失败, 但应用可以继续使用');
  }

  await startClipboardQuestionWatcher()
  info("App.vue: 初始化完成");
})

onUnmounted(() => {
  stopClipboardQuestionWatcher()
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
  position: relative;
  font-family: var(--ctm-font);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  height: 100vh;
  overflow: hidden;
}

.app-container {
  position: relative;
  z-index: 1;
  height: 100vh;
  background: transparent;
  padding: 14px;
  gap: 14px;
}

/* 侧边栏样式 */
.sidebar {
  flex: 0 0 236px;
  width: 236px !important;
  background: var(--ctm-glass-strong);
  backdrop-filter: blur(24px) saturate(1.2);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  border: 1px solid var(--ctm-border);
  box-shadow: var(--ctm-shadow-subtle);
  height: auto;
  min-height: 0;
  margin: 0;
  border-radius: var(--ctm-radius-lg);
  overflow: hidden;
}

.sidebar-inner {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  height: 100%;
  min-height: 0;
}

.logo-container {
  padding: 18px 16px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  border-bottom: 1px solid var(--ctm-border);
}

.logo-mark {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: var(--ctm-surface-muted);
  border: 1px solid var(--ctm-border);
}

.logo-mark img {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.logo-container h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  color: var(--ctm-text);
  letter-spacing: 0;
}

.sidebar-menu {
  border-right: none;
  padding: 16px 18px !important;
  background: transparent;
  min-height: 0;
  overflow: hidden;
}

.sidebar-menu .el-menu-item {
  position: relative;
  display: flex;
  width: 100% !important;
  min-width: 0;
  border-radius: 14px;
  margin: 0 0 8px !important;
  padding: 0 14px !important;
  height: 44px;
  line-height: 44px;
  font-size: 14px;
  color: var(--ctm-text-soft);
  gap: 10px;
  box-sizing: border-box;
  overflow: hidden;
  transform: none !important;
}

.sidebar-menu .el-menu-item:hover {
  background: var(--ctm-surface-muted);
  color: var(--ctm-text);
}

.sidebar-menu .el-menu-item.is-active {
  background: rgba(255, 255, 255, 0.78);
  color: var(--ctm-text) !important;
  font-weight: 700;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.07);
}

.nav-icon-wrap {
  width: 28px;
  height: 28px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 28px;
  border-radius: 10px;
  color: var(--ctm-text-muted);
  transition: background-color var(--ctm-transition), color var(--ctm-transition);
}

.nav-icon {
  width: 18px;
  height: 18px;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar-menu .el-menu-item:hover .nav-icon-wrap,
.sidebar-menu .el-menu-item.is-active .nav-icon-wrap {
  background: rgba(0, 0, 0, 0.055);
  color: var(--ctm-text);
}

/* 主内容区域 */
.main-content {
  background: var(--ctm-glass-strong);
  backdrop-filter: blur(24px) saturate(1.18);
  -webkit-backdrop-filter: blur(24px) saturate(1.18);
  border: 1px solid var(--ctm-border);
  padding: 18px;
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-gutter: stable;
  height: auto;
  min-height: 0;
  margin: 0;
  border-radius: var(--ctm-radius-lg);
  box-shadow: var(--ctm-shadow-soft);
}

.page-container {
  max-width: 100%;
  margin: 0 auto;
  padding-bottom: 34px;
}

/* 响应式布局 */
@media (min-width: 1400px) {
  .page-container {
    max-width: 1180px;
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
    flex-basis: 200px;
    width: 200px !important;
  }
}

@media (max-width: 768px) {
  .sidebar {
    flex-basis: 180px;
    width: 180px !important;
  }

  .main-content {
    padding: 10px;
  }

  .logo-container h2 {
    font-size: 16px;
  }
}

/* 卡片样式 */
.welcome-card,
.about-card {
  border-radius: var(--ctm-radius-lg);
  overflow: hidden;
}

.about-card :deep(.el-card__body) {
  padding: 16px;
}

.about-card :deep(.el-card__header) {
  padding: 12px 16px;
}

/* 滚动条样式 */
.main-content::-webkit-scrollbar {
  width: 8px;
}

.main-content::-webkit-scrollbar-track {
  background: transparent;
}

.main-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.18);
  border-radius: 4px;
}

.main-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.28);
}

.admin-prompt {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.admin-prompt__text {
  margin: 0;
  color: var(--ctm-text-soft);
  line-height: 1.5;
}
</style>
