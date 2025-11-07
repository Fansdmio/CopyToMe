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
          <HistoryPage :key="historyRefreshKey" />
        </div>

        <!-- 设置页面 -->
        <div v-show="activeMenu === 'settings'" class="page-container">
          <SettingPage @update-shortcuts="handleUpdateShortcuts" />
        </div>

        <!-- 关于 -->
        <div v-show="activeMenu === 'about'" class="page-container">
          <AboutPage />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, h } from 'vue'
import { readText, writeText } from '@tauri-apps/plugin-clipboard-manager'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { ElMessage, ElNotification } from 'element-plus'
import { HomeFilled, Setting, InfoFilled, ChatDotRound } from '@element-plus/icons-vue'
import { enable, disable } from '@tauri-apps/plugin-autostart'
import HomePage from './components/Home.vue'
import HistoryPage from './components/History.vue'
import SettingPage from './components/Setting.vue'
import AboutPage from './components/About.vue'
import { invoke } from '@tauri-apps/api/core'
import { debounceAfter } from './utils/common.js'
import { useShortcuts } from './composables/useShortcuts.js'
import { handleWxInput, debounce } from './utils/textProcessing.js'
import { listen } from '@tauri-apps/api/event';
import aiMg from "./composables/aiMg.js";
import setMg from "./composables/setMg.js";
import { fetch } from "@tauri-apps/plugin-http";
// 使用 快捷键管理器
const { registerShortcuts, updateShortcuts, registerStopKey, unregisterStopKey } = useShortcuts()
const homeRef = ref(null)

// 初始化设置为默认值，会在 onBeforeMount 中更新为实际值
const settings = setMg.settings

// 当前激活的菜单
const activeMenu = ref('home')

// 历史记录刷新key
const historyRefreshKey = ref(0)


// 菜单选择处理
const handleMenuSelect = (index) => {
  activeMenu.value = index
}

listen('text_handled', () => {
  console.log("模拟输入完成,注销k键");
  unregisterStopKey()
})

// 模拟输入快捷键处理函数
const handleText = debounce(async () => {
  console.log("触发ctrl+k");
  if (!settings.textProcessEnabled) {
    ElMessage.warning('模拟输入功能已禁用,请在设置中启用')
    return
  }

  const text = await readText()
  if (!text?.trim()) return

  // 确保之前的停止键已注销
  await unregisterStopKey()

  // 停止模拟输入处理函数
  const handleStopTyping = async () => {
    console.log('用户按下 K 键,发送停止信号')
    await invoke('stop_typing')
    // 立即注销停止键,防止重复触发
    await unregisterStopKey()
  }

  // 开始模拟输入前注册停止键
  const registered = await registerStopKey(handleStopTyping)
  if (!registered) {
    ElMessage.error('停止键注册失败')
    return
  }

  console.log('处理文本:', text)
  // 注意: handle_text 现在在后台线程运行,会立即返回
  await new Promise(resolve => setTimeout(resolve, 500));
  invoke('handle_text', { text })
  console.log('模拟输入已启动')
})

// AI 问答快捷键处理函数
const handleQuestion = debounce(async () => {
  if (!settings.aiQAEnabled) {
    ElMessage.warning('AI 问答功能已禁用,请在设置中启用')
    return
  }

  const question = await readText()
  if (!question?.trim()) return

  console.log('处理问题:', question)

  // 调用 AI
  let answer = await aiMg.askAi(question)
  if (!answer) return

  // 保存记录
  aiMg.saveQAHistory(question, answer)
  historyRefreshKey.value++

  // 微信输入法模式处理
  if (settings.wxInputMode) {
    answer = handleWxInput(answer)
  }

  await writeText(answer)
  ElMessage.success('AI 回答已复制到剪贴板')
})

// 更新快捷键处理
const handleUpdateShortcuts = async () => {
  updateShortcuts(
    settings.textKey,
    settings.questionKey,
    handleText,
    handleQuestion
  )
}

//TODO 从服务器获取信息并显示通知
const fromServerGetInfo = async () => {
  console.log("开始从服务器获取信息..");
  const response = await fetch(`http://172.28.193.23:28302/get_info?v=${setMg.version}`, {
    Method: 'GET'
  });
  const data = await response.json();
  if (!data) return;
  console.log("从服务器获取到的信息:");
  console.log(data)
  const { title, message, mold, duration, position } = data;
  //渲染数据

  const notificationMessage = h(
    message.tag,
    message.props,
    message.children
  )

  ElNotification({
    title: title,
    message: notificationMessage,
    type: mold,
    duration: duration,
    position: position
  });
}

//更新时间范围
const updateTimeRange = async (val) => {
  //持久化保存
  await setMg.save();
  try {
    await invoke('update_time_range', {
      left: val[0],
      right: val[1]
    })
  } catch (error) {
    ElMessage.warning('时间范围更新失败,但设置已保存')
  }
}
//进行防抖处理
const updateTimeRangeDebounce = debounceAfter(updateTimeRange, 500);


const saveAutoStart = async (val) => {
  //持久化保存
  await setMg.save();
  if (val) enable()
  else {
    try {
      disable()
    } catch (e) {
      console.error('禁用自启动失败:', e)
    }
  }
}

// 初始化
onMounted(async () => {
  //等待 AI 模块初始化完成
  await aiMg.init()

  if (setMg.get("hideWindow")) {
    getCurrentWindow().hide()
  }
  //检查AI健康
  homeRef.value.checkAi()
  //监听4个按钮变化
  watch([
    () => settings.wxInputMode,
    () => settings.textProcessEnabled,
    () => settings.aiQAEnabled,
    () => settings.hideWindow
  ], () => {
    setMg.save()
  })

  //监听时间范围变化
  watch(() => settings.timeRange, (val) => {
    updateTimeRangeDebounce(val);
  })

  //监听自启动按钮
  watch(() => settings.autoStart, (val) => {
    saveAutoStart(val)
  })

  // 初始化时间范围到 Rust 后端
  try {
    await invoke('update_time_range', {
      left: settings.timeRange[0],
      right: settings.timeRange[1]
    })
    console.log('已初始化时间范围:', settings.timeRange)
  } catch (error) {
    console.error('初始化时间范围失败:', error)
  }

  // 注册快捷键 (不包括停止键)
  await registerShortcuts(
    settings.textKey,
    settings.questionKey,
    handleText,
    handleQuestion
  )
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