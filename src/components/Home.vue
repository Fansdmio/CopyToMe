<template>
  <section class="home-page">
    <header class="status-panel">
      <div :class="['status-card', `status-card--${aiStatus.healthy}`]" @click="handleStatusClick">
        <span class="status-dot"></span>
        <div>
          <span class="status-label">AI 状态</span>
          <strong>{{ aiStatus.message }}</strong>
          <small>{{ statusHint }}</small>
        </div>
        <div class="status-meta">
          <span>调用 {{ qaCount }} 次</span>
          <span v-if="balanceText">{{ balanceText }}</span>
        </div>
      </div>
    </header>

    <section class="guide-panel">
      <div class="guide-heading">
        <span>使用教程</span>
      </div>
      <ol class="guide-list">
        <li>
          <span>1</span>
          <p>想问的问题后面加上问号（中英文都可以）复制到剪切板中即可调用 AI。例如：我美吗？</p>
        </li>
        <li>
          <span>2</span>
          <p>等待 AI 回答（鼠标光标变化，代表回答完成）</p>
        </li>
        <li>
          <span>3</span>
          <p>{{ answerGuideText }}</p>
        </li>
      </ol>

      <div v-if="hasWeType" class="wetype-card">
        <div>
          <strong>本机有微信输入法</strong>
          <small>{{ weTypeModeHint }}</small>
        </div>
        <el-switch
          v-model="settings.wxInputMode"
          :before-change="beforeWeTypeModeChange"
          @change="syncWeTypeMode"
        />
      </div>
    </section>
  </section>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

import aiMg from "../composables/aiMg.js";
import setMg from "../composables/setMg.js";
import mitt from '../utils/mitt.js';
import { info, error } from '@tauri-apps/plugin-log';
import { formatShortcutForDisplay } from '../utils/shortcutFormat.js';

const emit = defineEmits(['open-api-key-settings', 'update-shortcuts'])
const settings = setMg.settings
const WETYPE_DISABLE_CONFIRM_TEXT = '我不会在中文模式下使用模拟输入'

const aiStatus = ref({
  healthy: "info",
  message: '检查AI服务中...'
})
const needApiKey = ref(false)

// 问答次数统计
const qaCount = ref(0)
// 微信输入法进程检测状态（由 App.vue 通过 mitt 事件通知）
const hasWeType = ref(false)
const deepSeekBalance = ref(null)

const statusHint = computed(() => needApiKey.value ? '点击前往设置 API Key' : '点击重新检查')

const balanceText = computed(() => {
  if (!deepSeekBalance.value) return ''

  const amount = deepSeekBalance.value.totalBalance.toFixed(2)
  return `余额 ${amount} ${deepSeekBalance.value.currency}`
})

const answerGuideText = computed(() => {
  if (hasWeType.value && settings.wxInputMode) {
    return '使用中文状态下依次点 v -> 2 -> 空格 查看答案'
  }

  return `使用 ${textShortcutText.value} 查看答案`
})

const textShortcutText = computed(() => formatShortcutForDisplay(settings.textKey))

const weTypeModeHint = computed(() => {
  if (settings.wxInputMode) {
    return `已强制启用兼容模式，并禁用模拟输入 ${textShortcutText.value}`
  }

  return `已确认风险，模拟输入 ${textShortcutText.value} 已恢复`
})

// 加载问答次数
const loadQACount = async () => {
  try {
    info("Home: 加载问答次数");
    qaCount.value = (await aiMg.getQAHistory()).length;
    info(`Home: 问答次数: ${qaCount.value}`);
  } catch (e) {
    error(`Home: 加载问答次数失败: ${e}`);
    qaCount.value = 0;
  }
}

const loadDeepSeekBalance = async () => {
  if (!settings.deepseekApi?.trim() || !aiMg.isDeepSeekEndpoint()) {
    deepSeekBalance.value = null
    return
  }

  deepSeekBalance.value = await aiMg.fetchDeepSeekBalance()
}

mitt.on('history-update', loadQACount);

const checkAi = async () => {
  try {
    if (!setMg.get("deepseekApi")?.trim()) {
      info("Home: 未配置 API Key");
      needApiKey.value = true
      aiStatus.value = {
        healthy: "danger",
        message: '未配置 API Key，请前往设置页面配置'
      }
      deepSeekBalance.value = null
      return
    }

    needApiKey.value = false
    info("Home: 开始检验AI状态");
    aiStatus.value = {
      healthy: "info",
      message: '检查AI服务中...'
    }

    const isHealth = await aiMg.checkHealth();
    info(`Home: AI健康检查结果: ${isHealth}`);

    if (isHealth) {
      aiStatus.value = {
        healthy: "success",
        message: 'AI 服务正常'
      }
      await loadDeepSeekBalance()
    } else {
      aiStatus.value = {
        healthy: "danger",
        message: 'AI 服务异常,点击我再次测试'
      }
      deepSeekBalance.value = null
    }
  } catch (e) {
    error(`Home: AI健康检查异常: ${e}`);
    aiStatus.value = {
      healthy: "danger",
      message: 'AI 服务检查失败'
    }
    deepSeekBalance.value = null
  }
}

const handleStatusClick = () => {
  if (needApiKey.value) {
    emit('open-api-key-settings')
    return
  }

  checkAi()
}

// 开启兼容模式前备份 singleLineOutput 原始值，关闭时恢复
let singleLineOutputBackup = false

const enableWeTypeProtectedMode = async () => {
  // 检测到微信输入法后进入保护模式，避免中文模式下模拟输入触发异常。
  singleLineOutputBackup = settings.singleLineOutput
  settings.wxInputMode = true
  settings.textProcessEnabled = false
  settings.singleLineOutput = true   // 开启去除换行符
  await setMg.save()
  emit('update-shortcuts')
}

const confirmDisableWeTypeMode = async () => {
  try {
    await ElMessageBox.prompt(
      `使用微信输入法中文模式下，使用模拟输入(${textShortcutText.value})会出现异常。`,
      '关闭微信输入法兼容模式',
      {
        confirmButtonText: '确认关闭',
        cancelButtonText: '取消',
        inputPlaceholder: WETYPE_DISABLE_CONFIRM_TEXT,
        inputValidator: (value) => value === WETYPE_DISABLE_CONFIRM_TEXT || `请输入：${WETYPE_DISABLE_CONFIRM_TEXT}`,
        type: 'warning',
        customClass: 'ctm-glass-message-box',
        lockScroll: false
      }
    )
    return true
  } catch (e) {
    return false
  }
}

const beforeWeTypeModeChange = async () => {
  const nextEnabled = !settings.wxInputMode

  // 关闭保护模式前先完成风险确认，确认失败时保持开关原状态。
  if (!nextEnabled) {
    return await confirmDisableWeTypeMode()
  }

  return true
}

const syncWeTypeMode = async (enabled) => {
  if (enabled) {
    settings.wxInputModeManuallyDisabled = false
    await enableWeTypeProtectedMode()
    return
  }

  // 用户明确确认风险后，关闭兼容模式并恢复模拟输入快捷键。
  settings.wxInputMode = false
  settings.textProcessEnabled = true
  settings.singleLineOutput = singleLineOutputBackup   // 恢复去除换行符原始状态
  settings.wxInputModeManuallyDisabled = true
  await setMg.save()
  emit('update-shortcuts')
  ElMessage.success(`已关闭兼容模式，模拟输入 ${textShortcutText.value} 已恢复`)
}

onMounted(() => {
  try {
    info("Home: 组件挂载");
    loadQACount()
    loadDeepSeekBalance()
  } catch (e) {
    error(`Home: 组件挂载失败: ${e}`);
  }
  // 监听 App.vue 的微信输入法进程检测结果
  mitt.on('wetype-detected', (detected) => {
    hasWeType.value = detected
  })
})

defineExpose({
  checkAi
})
</script>

<style scoped>
.home-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 8px;
}

.status-panel,
.guide-panel {
  border: 1px solid var(--ctm-border);
  background: var(--ctm-glass);
  backdrop-filter: blur(22px) saturate(1.25);
  -webkit-backdrop-filter: blur(22px) saturate(1.25);
  border-radius: var(--ctm-radius-lg);
  box-shadow: var(--ctm-shadow-subtle);
}

.status-panel {
  display: block;
  padding: 20px;
}

.status-card small {
  color: var(--ctm-text-muted);
}

.status-card {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 82px;
  padding: 16px;
  border-radius: var(--ctm-radius-md);
  border: 1px solid var(--ctm-border);
  background: rgba(255, 255, 255, 0.62);
  cursor: pointer;
  transition: background-color var(--ctm-transition), border-color var(--ctm-transition);
}

.status-card > div:first-of-type {
  min-width: 0;
}

.status-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  margin-left: auto;
  flex: 0 0 auto;
}

.status-meta span {
  min-height: 24px;
  padding: 0 10px;
  border: 1px solid var(--ctm-border);
  border-radius: 999px;
  color: var(--ctm-text-muted);
  background: rgba(255, 255, 255, 0.66);
  font-size: 12px;
  font-weight: 760;
  line-height: 22px;
  white-space: nowrap;
}

.status-card:hover {
  background: var(--ctm-control-soft);
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: var(--ctm-text-muted);
  box-shadow: 0 0 0 5px rgba(0, 0, 0, 0.05);
  flex: 0 0 auto;
}

.status-card--success .status-dot {
  background: var(--ctm-success);
  box-shadow: 0 0 0 5px var(--ctm-success-soft);
}

.status-card--danger .status-dot {
  background: var(--ctm-danger);
  box-shadow: 0 0 0 5px var(--ctm-danger-soft);
}

.status-label {
  color: var(--ctm-text-muted);
  font-size: 12px;
  font-weight: 700;
}

.status-card strong {
  display: block;
  margin: 4px 0 2px;
  color: var(--ctm-text);
  font-size: 16px;
}

.guide-panel {
  padding: 22px;
}

.guide-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.guide-heading span {
  color: var(--ctm-text);
  font-size: 18px;
  font-weight: 800;
}

.guide-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.guide-list li {
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-md);
  background: rgba(255, 255, 255, 0.62);
}

.guide-list li span {
  display: grid;
  place-items: center;
  width: 30px;
  height: 30px;
  border-radius: 999px;
  color: var(--ctm-text);
  background: var(--ctm-surface-muted);
  font-size: 13px;
  font-weight: 800;
}

.guide-list p {
  margin: 0;
  color: var(--ctm-text-soft);
  font-size: 14px;
  font-weight: 650;
  line-height: 1.65;
}

.wetype-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 14px;
  padding: 14px 16px;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: var(--ctm-radius-md);
  background: rgba(255, 255, 255, 0.74);
}

.wetype-card strong,
.wetype-card small {
  display: block;
}

.wetype-card strong {
  color: var(--ctm-text);
  font-size: 14px;
  font-weight: 760;
}

.wetype-card small {
  margin-top: 3px;
  color: var(--ctm-text-muted);
  font-size: 12px;
}

@media (max-width: 900px) {
  .status-panel {
    grid-template-columns: 1fr;
  }

  .guide-list li {
    grid-template-columns: 26px minmax(0, 1fr);
  }
}
</style>
