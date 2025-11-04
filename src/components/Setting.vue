<template>
  <el-card class="settings-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <div>
          <h2>设置</h2>
        </div>
        <div>
          <el-button @click="resetSettingsHandler">
            <el-icon>
              <RefreshLeft />
            </el-icon>
            重置
          </el-button>

        </div>
      </div>
    </template>

    <el-space direction="vertical" :size="12" style="width: 100%;">
      <div style="display: flex;gap:10px;flex-direction: column;">
        <!-- 快捷键设置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Operation />
              </el-icon>
              <span>快捷键设置</span>
            </div>
            <el-button type="primary" @click="saveShortcutKeySettingsHandler">
              保存快捷键设置
            </el-button>
          </h3>

          <el-form :model="settingsForm" label-width="120px" label-position="left">
            <el-form-item v-for="shortcut in shortcutFields" :key="shortcut.key" :label="shortcut.label">
              <el-input v-model="settingsForm[shortcut.key]" :placeholder="shortcut.placeholder" class="shortcut-input">
                <template #prepend>
                  <el-icon>
                    <component :is="shortcut.icon" />
                  </el-icon>
                </template>
                <template #append>
                  <el-button @click="showKeyboardHelp = true">
                    <el-icon>
                      <QuestionFilled />
                    </el-icon>
                  </el-button>
                </template>
              </el-input>
            </el-form-item>
          </el-form>
        </div>

        <el-divider style="margin: 12px 0" />

        <!-- AI 配置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Cpu />
              </el-icon>
              <span>AI 配置</span>
            </div>
            <el-button type="primary" @click="saveAiSettringHandler">
              保存AI设置
            </el-button>
          </h3>

          <el-form label-width=" 120px" label-position="left">
            <el-form-item v-for="field in aiConfigFields" :key="field.key" :label="field.label">
              <el-input v-model="settingsForm[field.key]" :placeholder="field.placeholder" :type="field.type"
                :show-password="field.showPassword" clearable>
                <template #prepend>
                  <el-icon>
                    <component :is="field.icon" />
                  </el-icon>
                </template>
              </el-input>
              <template #extra>
                <el-text size="small" type="info">
                  {{ field.hint }}
                </el-text>
              </template>
            </el-form-item>
          </el-form>
          <el-alert type="primary" :closable="false">
            <div class="shortcut-tips">
              <p v-for="(tip, index) in aiTips" :key="index">• {{ tip }}</p>
            </div>
          </el-alert>

        </div>

        <el-divider style="margin: 8px 0" />

        <!-- 功能设置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Tools />
              </el-icon>
              <span>功能设置</span>
            </div>
          </h3>

          <el-form label-width="120px" label-position="left">
            <el-form-item v-for="feature in featureToggles" :key="feature.key" :label="feature.label">
              <div class="switch-container">
                <el-switch v-model="settingsForm[feature.key]" size="large" active-text="启用" inactive-text="关闭" />
                <el-text size="small" type="info" style="margin-left: 12px">
                  {{ feature.description }}
                </el-text>
              </div>
            </el-form-item>
            <!-- 时间范围 -->
            <el-form-item :label="TEXT_PROCESSING_CONFIG.timeRange.label">
              <el-slider v-model="settingsForm.timeRange" range show-stops :min="TEXT_PROCESSING_CONFIG.timeRange.min"
                :max="TEXT_PROCESSING_CONFIG.timeRange.max" :step="TEXT_PROCESSING_CONFIG.timeRange.step"
                :marks="TEXT_PROCESSING_CONFIG.timeRange.marks" />
            </el-form-item>
          </el-form>
        </div>


        <el-divider style="margin: 12px 0" />
        <!-- 预设快捷键模板 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Collection />
              </el-icon>
              <span>快捷键预设模板</span>
            </div>
          </h3>

          <el-space wrap :size="12">
            <el-card v-for="preset in presets" :key="preset.name" class="preset-card"
              :class="{ active: isCurrentPreset(preset) }" shadow="hover" @click="applyPreset(preset)">
              <div class="preset-content">
                <h4>{{ preset.name }}</h4>
                <el-space direction="vertical" :size="4">
                  <el-tag size="small">文本: {{ preset.textKey }}</el-tag>
                  <el-tag size="small">问答: {{ preset.questionKey }}</el-tag>
                </el-space>
              </div>
            </el-card>
          </el-space>
        </div>
      </div>



      <!-- 设置信息 -->
      <el-alert v-if="lastSavedTime" :title="`💾 上次保存: ${lastSavedTime}`" type="success" :closable="false" show-icon />
    </el-space>
  </el-card>

  <!-- 快捷键帮助对话框 -->
  <el-dialog v-model="showKeyboardHelp" title="快捷键帮助" width="600px">
    <el-table :data="keyboardHelpData" stripe>
      <el-table-column prop="key" label="键名" width="180" />
      <el-table-column prop="description" label="说明" />
      <el-table-column prop="example" label="示例" width="150" />
    </el-table>
  </el-dialog>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { enable, disable } from '@tauri-apps/plugin-autostart'
import {
  Check,
  Collection,
  Cpu,
  Operation,
  QuestionFilled,
  RefreshLeft,
  Tools,
} from '@element-plus/icons-vue'

import { useSettings } from '../composables/useSettings.js'
import { useAI } from '../composables/useAI.js'
import { validateShortcutKey } from '../utils/textProcessing.js'
import {
  SHORTCUT_FIELDS,
  AI_CONFIG_FIELDS,
  FEATURE_TOGGLES,
  SHORTCUT_PRESETS,
  KEYBOARD_HELP_DATA,
  AI_TIPS,
  TEXT_PROCESSING_CONFIG
} from '../constants/config.js'
import { invoke } from '@tauri-apps/api/core'
import { debounce } from '../utils/common.js'
// Props 和 Emits
const emit = defineEmits(['update-shortcuts'])

// 使用 Composables
const { settings, aiConfig, saveSettings, saveAIConfig, getLastUpdated, resetSettings: resetToDefault } = useSettings()
const { fetchAPIFromServer } = useAI()

// 表单数据 (绑定到响应式状态)
const settingsForm = reactive({
  ...settings.value,
  deepseekApi: aiConfig.value.deepseekApi,
  userName: aiConfig.value.userName,
  timeRange: settings.value.timeRange
})

// 保存状态
const saving = ref(false)
const showKeyboardHelp = ref(false)
const lastSavedTime = ref('')

// 使用配置常量
const shortcutFields = SHORTCUT_FIELDS
const aiConfigFields = AI_CONFIG_FIELDS
const featureToggles = FEATURE_TOGGLES
const presets = SHORTCUT_PRESETS
const keyboardHelpData = KEYBOARD_HELP_DATA
const aiTips = AI_TIPS

// 检查是否是当前预设
const isCurrentPreset = (preset) => {
  return settingsForm.textKey === preset.textKey && settingsForm.questionKey === preset.questionKey
}

// 应用预设
const applyPreset = (preset) => {
  settingsForm.textKey = preset.textKey
  settingsForm.questionKey = preset.questionKey
  settings.value.textKey = preset.textKey
  settings.value.questionKey = preset.questionKey
  // 通知父组件更新快捷键
  emit('update-shortcuts')
  ElMessage.success(`已应用 ${preset.name}`)
}

// 重置设置
const resetSettingsHandler = () => {
  Object.assign(settingsForm, {
    textKey: 'CmdOrControl+K',
    questionKey: 'CmdOrControl+J',
    wxInputMode: false,
    textProcessEnabled: true,
    aiQAEnabled: true,
    deepseekApi: '',
    userName: '',
    hideWindow: false,
    autoStart: false,
    timeRange: [1, 5]
  })
  ElMessage.info('已重置为默认设置,请点击保存应用')
}

const updateTimeRange = async (val) => {
  console.log("timeRange: ", val);
  settings.value.timeRange = val;
  // 调用 Rust 后端更新时间范围
  try {
    await invoke('update_time_range', {
      left: val[0],
      right: val[1]
    })
  } catch (error) {
    console.error('更新时间范围失败:', error)
    ElMessage.warning('时间范围更新失败,但设置已保存')
  }
}
const updateTimeRangeDebounce = debounce(updateTimeRange, 500);

//监听时间范围按钮
watch(() => settingsForm.timeRange, (val) => {
  updateTimeRangeDebounce(val);
})
//监听自启动按钮
watch(() => settingsForm.autoStart, (val) => {
  settings.value.autoStart = val;
  // 处理自启动
  if (settings.value.autoStart) {
    enable()
  } else {
    try {
      disable()
    } catch (e) {
      console.error('禁用自启动失败:', e)
    }
  }
})

//监听更改 
watch([
  () => settingsForm.hideWindow,
  () => settingsForm.wxInputMode,
  () => settingsForm.textProcessEnabled,
  () => settingsForm.aiQAEnabled
], ([newHideWindow, newWxInputMode, newTextProcessEnabled, newAiQAEnabled]) => {
  settings.value.hideWindow = newHideWindow;
  settings.value.wxInputMode = newWxInputMode;
  settings.value.textProcessEnabled = newTextProcessEnabled;
  settings.value.aiQAEnabled = newAiQAEnabled;

  console.log("监听变化为:", [newHideWindow, newWxInputMode, newTextProcessEnabled, newAiQAEnabled]);
})

//保存ai设置
const saveAiSettringHandler = async () => {
  // 验证 AI 配置
  if (!settingsForm.deepseekApi && !settingsForm.userName) {
    ElMessage.warning('请至少填写 DeepSeek API 或用户名')
  }

  // 更新 AI 配置
  aiConfig.value.deepseekApi = settingsForm.deepseekApi
  aiConfig.value.userName = settingsForm.userName
  if (!aiConfig.value.userName.trim()) {
    aiConfig.value.cachedApi = ""
  }

  // 如果只有用户名,获取 API
  if (!settingsForm.deepseekApi && settingsForm.userName) {
    ElMessage.info('正在从服务器获取 API...')
    const fetchedApi = await fetchAPIFromServer(settingsForm.userName)
    if (fetchedApi) {
      aiConfig.value.cachedApi = fetchedApi
      ElMessage.success('成功获取 API')
    } else {
      ElMessage.error('获取 API 失败')
    }
  }
  saveAIConfig()
  if (settingsForm.deepseekApi) {
    ElMessage.success('AI 设置已保存')
  }
}

// 保存快捷键设置
const saveShortcutKeySettingsHandler = async () => {
  // 验证快捷键
  if (!validateShortcutKey(settingsForm.textKey)) {
    ElMessage.error('模拟输入快捷键格式不正确')
    return
  }
  if (!validateShortcutKey(settingsForm.questionKey)) {
    ElMessage.error('AI 问答快捷键格式不正确')
    return
  }
  if (settingsForm.textKey === settingsForm.questionKey) {
    ElMessage.error('两个快捷键不能相同')
    return
  }
  saving.value = true

  try {
    const oldTextKey = settings.value.textKey
    const oldQuestionKey = settings.value.questionKey

    // 更新应用设置
    Object.assign(settings.value, {
      textKey: settingsForm.textKey,
      questionKey: settingsForm.questionKey,
    })

    // 通知父组件更新快捷键
    emit('update-shortcuts', oldTextKey, oldQuestionKey)

    setTimeout(() => {
      saving.value = false
      ElMessage.success('设置已保存')
      lastSavedTime.value = getLastUpdated()
    }, 500)
  } catch (error) {
    saving.value = false
    console.error('保存失败:', error)
    ElMessage.error('保存失败: ' + error.message)
  }
}

// 初始化
onMounted(() => {
  lastSavedTime.value = getLastUpdated()
})
</script>

<style scoped>
.settings-card {
  border-radius: 12px;
  overflow: hidden;
}

.section-icon {
  display: flex;
  align-items: center;
  gap: 8px;
}

.settings-card :deep(.el-card__body) {
  padding: 16px;
}

.settings-card :deep(.el-card__header) {
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

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 0;
}

.section-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-title span {
  display: inline-block;
}

.shortcut-input {
  max-width: 500px;
}

.shortcut-tips {
  font-size: 12px;
  line-height: 1.6;
}

.shortcut-tips p {
  margin: 2px 0;
}

.switch-container {
  display: flex;
  align-items: center;
}

/* 预设卡片 */
.preset-card {
  width: 180px;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.preset-card :deep(.el-card__body) {
  padding: 12px;
}

.preset-card:hover {
  transform: translateY(-2px);
  border-color: #409EFF;
}

.preset-card.active {
  border-color: #409EFF;
  background: linear-gradient(135deg, #409EFF10 0%, #66b1ff10 100%);
}

.preset-content h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #303133;
  font-weight: 600;
}

/* Element Plus 表单样式优化 */
:deep(.el-form-item) {
  margin-bottom: 14px;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

:deep(.el-input-group__prepend) {
  background-color: #f5f7fa;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-alert) {
  padding: 8px 12px;
}

:deep(.el-alert__title) {
  font-size: 13px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .preset-card {
    width: 100%;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
  }
}
</style>