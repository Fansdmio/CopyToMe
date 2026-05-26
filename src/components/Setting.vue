<template>
  <el-card class="settings-card" shadow="hover">
    <template #header>
      <div class="card-header">
        <h2>设置</h2>
        <el-button @click="resetSettingsHandler">
          <el-icon>
            <RefreshLeft />
          </el-icon>
          重置
        </el-button>
      </div>
    </template>

    <el-space direction="vertical" :size="12" style="width: 100%;">
      <div class="settings-content">
        <!-- 快捷键设置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Operation />
              </el-icon>
              <span>快捷键设置</span>
            </div>
          </h3>

          <el-form :model="settings" label-width="120px" label-position="left">
            <el-form-item v-for="shortcut in shortcutFields" :key="shortcut.key" :label="shortcut.label">
              <el-input
                :model-value="capturingKey === shortcut.key ? '' : settings[shortcut.key]"
                :placeholder="capturingKey === shortcut.key ? '请按下快捷键...' : shortcut.placeholder"
                class="shortcut-input"
                readonly
                @click="startCapture(shortcut.key)"
              >
                <template #prepend>
                  <el-icon>
                    <component :is="shortcut.icon" />
                  </el-icon>
                </template>
                <template #append>
                  <el-button-group>
                    <el-button
                      :type="capturingKey === shortcut.key ? 'primary' : 'default'"
                      @click.stop="toggleCapture(shortcut.key)"
                    >
                      {{ capturingKey === shortcut.key ? '取消' : '捕获' }}
                    </el-button>
                    <el-button
                      :class="['status-toggle-button', settings[shortcut.enableKey] ? 'status-enabled' : 'status-disabled']"
                      @click.stop="toggleFeature(shortcut.enableKey, shortcut.enableLabel)"
                    >
                      <el-icon>
                        <CircleCheckFilled v-if="settings[shortcut.enableKey]" />
                        <CircleCloseFilled v-else />
                      </el-icon>
                      <span class="status-text">{{ settings[shortcut.enableKey] ? '已启用' : '已禁用' }}</span>
                    </el-button>
                  </el-button-group>
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
            <el-button type="primary" @click="saveAiSettingHandler">保存 AI 设置</el-button>
          </h3>

          <el-form label-width="120px" label-position="left">
            <el-form-item v-for="field in aiConfigFields" :key="field.key" :label="field.label">
              <el-input
                v-model="settings[field.key]"
                :placeholder="field.placeholder"
                :type="field.type"
                :show-password="field.showPassword"
                clearable
              >
                <template #prepend>
                  <el-icon>
                    <component :is="field.icon" />
                  </el-icon>
                </template>
              </el-input>
              <template #extra>
                <el-text size="small" type="info">{{ field.hint }}</el-text>
              </template>
            </el-form-item>

            <el-form-item class="advanced-toggle-item">
              <el-button class="advanced-toggle" @click="showAdvancedSettings = !showAdvancedSettings" text>
                <el-icon>
                  <CaretRight v-if="!showAdvancedSettings" />
                  <CaretBottom v-else />
                </el-icon>
                高级设置
              </el-button>
            </el-form-item>

            <el-collapse-transition>
              <div v-show="showAdvancedSettings" class="advanced-settings">
                <el-form-item label="Base URL">
                  <el-input v-model="settings.customAIEndpoint" placeholder="https://api.deepseek.com">
                    <template #prepend>
                      <el-icon>
                        <Link />
                      </el-icon>
                    </template>
                  </el-input>
                </el-form-item>

                <el-form-item label="模型名称">
                  <div class="model-row">
                    <div v-if="availableModels.length > 0" class="model-select-wrapper model-input">
                      <div class="model-prefix">
                        <el-icon>
                          <Cpu />
                        </el-icon>
                      </div>
                      <el-select
                        v-model="settings.customAIModel"
                        placeholder="选择模型"
                        filterable
                        allow-create
                        class="model-select"
                      >
                        <el-option v-for="model in availableModels" :key="model" :label="model" :value="model" />
                      </el-select>
                    </div>
                    <el-input v-else v-model="settings.customAIModel" placeholder="v4-flash" class="model-input">
                      <template #prepend>
                        <el-icon>
                          <Cpu />
                        </el-icon>
                      </template>
                    </el-input>
                    <el-button class="model-fetch-button" @click="fetchModels" :disabled="loadingModels">
                      <el-icon :class="{ 'is-loading': loadingModels }">
                        <Refresh />
                      </el-icon>
                      {{ loadingModels ? '获取中' : availableModels.length > 0 ? '刷新' : '获取模型' }}
                    </el-button>
                  </div>
                </el-form-item>

                <el-form-item label="AI 提示词">
                  <el-input
                    v-model="settings.systemPrompt"
                    type="textarea"
                    :rows="4"
                    placeholder="请输入自定义的 AI 提示词"
                  />
                </el-form-item>
              </div>
            </el-collapse-transition>
          </el-form>

        </div>

        <el-divider style="margin: 8px 0" />

        <!-- 功能设置 -->
        <div class="setting-section feature-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Tools />
              </el-icon>
              <span>功能设置</span>
            </div>
          </h3>

          <el-form label-width="120px" label-position="left">
            <el-form-item
              v-for="feature in featureToggles.filter(f => f.key !== 'textProcessEnabled' && f.key !== 'aiQAEnabled')"
              :key="feature.key"
              :label="feature.label"
            >
              <div class="switch-container">
                <el-switch v-model="settings[feature.key]" size="large" active-text="启用" inactive-text="关闭" />
                <el-text size="small" type="info" style="margin-left: 12px">{{ feature.description }}</el-text>
              </div>
            </el-form-item>
            <el-form-item :label="TEXT_PROCESSING_CONFIG.timeRange.label">
              <el-slider
                v-model="settings.timeRange"
                range
                show-stops
                :min="TEXT_PROCESSING_CONFIG.timeRange.min"
                :max="TEXT_PROCESSING_CONFIG.timeRange.max"
                :step="TEXT_PROCESSING_CONFIG.timeRange.step"
                :marks="TEXT_PROCESSING_CONFIG.timeRange.marks"
              />
            </el-form-item>
          </el-form>
        </div>
      </div>
    </el-space>
  </el-card>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';
import {
  Cpu,
  Operation,
  RefreshLeft,
  Tools,
  Link,
  CaretRight,
  CaretBottom,
  Refresh,
  CircleCheckFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue';
import {
  SHORTCUT_FIELDS,
  AI_CONFIG_FIELDS,
  FEATURE_TOGGLES,
  TEXT_PROCESSING_CONFIG
} from '../constants/config.js';
import setMg from "../composables/setMg.js";
import aiMg from "../composables/aiMg.js";
import { info, error } from '@tauri-apps/plugin-log';

const emit = defineEmits(['update-shortcuts']);
const settings = setMg.settings;
const shortcutFields = SHORTCUT_FIELDS;
const aiConfigFields = AI_CONFIG_FIELDS;
const featureToggles = FEATURE_TOGGLES;

const showAdvancedSettings = ref(false);
const capturingKey = ref(null);
const pressedKeys = ref(new Set());
const availableModels = ref([]);
const loadingModels = ref(false);

const resetSettingsHandler = async () => {
  info("Setting: 重置所有设置");
  await setMg.reset();
  emit('update-shortcuts');
};

const fetchModels = async () => {
  info("Setting: 获取可用模型列表");
  loadingModels.value = true;
  try {
    const models = await aiMg.fetchAvailableModels();
    availableModels.value = models || [];
    if (availableModels.value.length > 0) {
      ElMessage.success(`成功获取 ${availableModels.value.length} 个可用模型`);
    } else {
      ElMessage.info('未获取到可用模型');
    }
  } catch (e) {
    error(`Setting: 获取模型失败: ${e}`);
    ElMessage.error('获取模型失败');
  } finally {
    loadingModels.value = false;
  }
};

const saveAiSettingHandler = async () => {
  info("Setting: 保存 AI 设置");
  if (!settings.deepseekApi?.trim()) {
    ElMessage.warning('请填写 API Key');
  }
  await setMg.save();
  if (settings.deepseekApi?.trim()) {
    ElMessage.success('AI 设置已保存');
  }
};

const keyMapping = {
  'Control': 'Ctrl',
  'Meta': 'Super',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
  ' ': 'Space'
};

const normalizeKey = (key) => {
  return keyMapping[key] || key;
};

const startCapture = async (key) => {
  if (capturingKey.value === key) return;

  try {
    const { unregister } = await import('@tauri-apps/plugin-global-shortcut');
    for (const field of shortcutFields) {
      if (settings[field.key]) {
        try {
          await unregister(settings[field.key]);
          info(`Setting: 已注销快捷键: ${settings[field.key]}`);
        } catch {
          // 快捷键可能已经由后端注销，这里保持静默。
        }
      }
    }
  } catch (err) {
    error(`Setting: 注销快捷键失败: ${err}`);
  }

  capturingKey.value = key;
  pressedKeys.value.clear();
};

const toggleCapture = (key) => {
  if (capturingKey.value === key) {
    stopCapture();
  } else {
    startCapture(key);
  }
};

const toggleFeature = async (enableKey, enableLabel) => {
  settings[enableKey] = !settings[enableKey];
  await setMg.save();
  emit('update-shortcuts');
  ElMessage[settings[enableKey] ? 'success' : 'warning'](`${enableLabel}${settings[enableKey] ? '已启用' : '已关闭'}`);
};

const stopCapture = () => {
  capturingKey.value = null;
  pressedKeys.value.clear();
  emit('update-shortcuts');
};

const handleKeyDown = async (event) => {
  if (!capturingKey.value) return;

  event.preventDefault();
  event.stopPropagation();

  const key = event.key;
  if (key === 'Escape' && pressedKeys.value.size === 0) {
    stopCapture();
    return;
  }

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return;
  }

  const keys = [];
  if (event.ctrlKey || event.metaKey) keys.push('CmdOrControl');
  if (event.altKey) keys.push('Alt');
  if (event.shiftKey) keys.push('Shift');

  const mainKey = normalizeKey(key);
  keys.push(mainKey.length === 1 ? mainKey.toUpperCase() : mainKey);

  if (keys.length < 2 && !['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(mainKey)) {
    return;
  }

  const shortcutString = keys.join('+');
  const otherKeys = shortcutFields.filter(field => field.key !== capturingKey.value);
  const isDuplicate = otherKeys.some(field => settings[field.key] === shortcutString);

  if (isDuplicate) {
    ElMessage.warning('该快捷键已被使用');
    return;
  }

  settings[capturingKey.value] = shortcutString;
  capturingKey.value = null;
  pressedKeys.value.clear();

  await setMg.save();
  emit('update-shortcuts');
  ElMessage.success(`已设置快捷键: ${shortcutString}`);
};

const handleKeyUp = (event) => {
  if (!capturingKey.value) return;
  event.preventDefault();
  event.stopPropagation();
};

onMounted(() => {
  info("Setting: 组件挂载");
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
});
</script>

<style scoped>
.settings-card {
  border-radius: 12px;
  overflow: hidden;
  /* 展开高级设置时，避免内部表单的最小内容宽度把页面横向撑开。 */
  width: 100%;
  min-width: 0;
}

.settings-card :deep(.el-card__body) {
  padding: 16px;
  min-width: 0;
}

.settings-card :deep(.el-card__header) {
  padding: 12px 16px;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.card-header,
.section-title,
.section-icon,
.model-row,
.switch-container {
  display: flex;
  align-items: center;
}

.card-header {
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
  width: 100%;
  min-width: 0;
}

.feature-section {
  padding-bottom: 36px;
}

.section-title {
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-icon {
  gap: 8px;
}

.shortcut-input {
  max-width: 520px;
}

.status-toggle-button {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 12px;
  border: 1px solid;
  transition: all 0.3s;
}

.status-toggle-button .status-text {
  font-size: 13px;
  font-weight: 500;
}

.status-enabled {
  background-color: #8dd466 !important;
  border-color: #8dd466 !important;
  color: #ffffff !important;
}

.status-disabled {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
}

.advanced-settings {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-top: 4px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.advanced-toggle-item {
  margin-bottom: 8px;
}

.advanced-toggle-item :deep(.el-form-item__content) {
  margin-left: 0 !important;
}

.advanced-toggle {
  padding-left: 0;
}

.model-row {
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
}

.model-input {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
}

.model-select-wrapper {
  display: flex;
  height: 40px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  max-width: 100%;
}

.model-prefix {
  width: 68px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  background: #f5f7fa;
  border-right: 1px solid #dcdfe6;
  flex-shrink: 0;
}

.model-select {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
}

.model-fetch-button {
  flex: 0 0 126px;
  width: 126px;
}

.model-fetch-button .el-icon {
  margin-right: 4px;
}

.model-fetch-button .is-loading {
  animation: rotating 1.2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

:deep(.el-form-item) {
  margin-bottom: 14px;
  min-width: 0;
}

:deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

:deep(.el-form-item__label) {
  font-weight: 500;
  color: #606266;
  font-size: 14px;
}

:deep(.el-form),
:deep(.el-form-item__content),
:deep(.el-input),
:deep(.el-select) {
  min-width: 0;
  max-width: 100%;
}

:deep(.el-input-group__prepend) {
  background-color: #f5f7fa;
}

:deep(.model-select .el-select__wrapper) {
  height: 38px;
  min-height: 38px;
  width: 100%;
  min-width: 0;
  border-radius: 0;
  box-shadow: none;
}

@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .model-row {
    flex-direction: column;
    align-items: stretch;
  }

  .model-select-wrapper {
    width: 100%;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
  }
}
</style>
