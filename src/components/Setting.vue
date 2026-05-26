<template>
  <section class="settings-page" ref="settingsPageRef">
    <header class="settings-hero">
      <div>
        <h2>设置</h2>
        <p>调整快捷键、AI 接口和应用行为。所有选项都会自动保存。</p>
      </div>
        <el-button @click="resetSettingsHandler">
          <el-icon>
            <RefreshLeft />
          </el-icon>
          重置
        </el-button>
    </header>

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
              <div class="shortcut-control">
                <button
                  type="button"
                  :class="['key-field', { 'is-capturing': capturingKey === shortcut.key }]"
                  @click="startCapture(shortcut.key)"
                >
                  <span class="field-glyph" aria-hidden="true">{{ shortcutGlyphs[shortcut.key] }}</span>
                  <span class="key-value">
                    {{ capturingKey === shortcut.key ? '请按下快捷键...' : formatShortcutForDisplay(settings[shortcut.key]) || shortcut.placeholder }}
                  </span>
                </button>
                <el-button
                  class="capture-button"
                  :type="capturingKey === shortcut.key ? 'primary' : 'default'"
                  @click.stop="toggleCapture(shortcut.key)"
                >
                  {{ capturingKey === shortcut.key ? '取消' : '捕获' }}
                </el-button>
                <button
                  type="button"
                  :class="['state-pill', settings[shortcut.enableKey] ? 'is-enabled' : 'is-disabled']"
                  @click.stop="toggleFeature(shortcut.enableKey, shortcut.enableLabel)"
                >
                  <span class="state-dot"></span>
                  <span>{{ settings[shortcut.enableKey] ? '已启用' : '已禁用' }}</span>
                </button>
              </div>
            </el-form-item>
          </el-form>
        </div>

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
            <el-form-item
              v-for="field in aiConfigFields"
              :key="field.key"
              :label="field.label"
              :class="{ 'api-key-field': field.key === 'deepseekApi' }"
            >
              <el-input
                v-model="settings[field.key]"
                :placeholder="field.placeholder"
                :type="field.type"
                :show-password="field.showPassword"
                :class="['aesthetic-input', { 'is-api-key-input': field.key === 'deepseekApi' }]"
                clearable
              />
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
                  <el-input v-model="settings.customAIEndpoint" placeholder="https://api.deepseek.com" class="aesthetic-input" />
                </el-form-item>

                <el-form-item label="模型名称">
                  <div class="model-row">
                    <div v-if="availableModels.length > 0" class="model-select-wrapper model-input">
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
                    <el-input v-else v-model="settings.customAIModel" placeholder="deepseek-v4-flash" class="model-input aesthetic-input" />
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
  </section>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import {
  Cpu,
  Operation,
  RefreshLeft,
  Tools,
  CaretRight,
  CaretBottom,
  Refresh
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
import { formatShortcutForDisplay } from '../utils/shortcutFormat.js';

const emit = defineEmits(['update-shortcuts']);
const settings = setMg.settings;
const shortcutFields = SHORTCUT_FIELDS;
const aiConfigFields = AI_CONFIG_FIELDS;
const featureToggles = FEATURE_TOGGLES;

const showAdvancedSettings = ref(false);
const settingsPageRef = ref(null);
const capturingKey = ref(null);
const pressedKeys = ref(new Set());
const availableModels = ref([]);
const loadingModels = ref(false);

// 快捷键输入区使用字符标识，弱化图标存在感，让控件更接近系统设置面板。
const shortcutGlyphs = {
  textKey: 'T',
  questionKey: 'AI',
  toggleWindowKey: '⌘'
};

const resetSettingsHandler = async () => {
  info("Setting: 重置所有设置");
  try {
    await ElMessageBox.confirm('确定要恢复所有默认设置吗？当前快捷键、AI 配置和功能开关都会被重置。', '确认重置', {
      confirmButtonText: '重置',
      cancelButtonText: '取消',
      lockScroll: false,
      type: 'warning',
      // 重置确认属于高风险操作，使用专用类固定毛玻璃提示样式。
      customClass: 'ctm-glass-message-box',
    });

    await setMg.reset();
    emit('update-shortcuts');
    ElMessage.success('设置已重置');
  } catch {
    info("Setting: 用户取消重置设置");
  }
};

const focusApiKeyField = async () => {
  await nextTick();

  const apiKeyField = settingsPageRef.value?.querySelector('.api-key-field');
  const input = apiKeyField?.querySelector('input');

  // 从主页跳转过来时滚动到 API Key 输入区并聚焦，减少用户寻找成本。
  apiKeyField?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  setTimeout(() => input?.focus(), 220);
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
  ElMessage.success(`已设置快捷键: ${formatShortcutForDisplay(shortcutString)}`);
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

defineExpose({
  focusApiKeyField
});
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
}

.settings-content {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
  min-width: 0;
}

.settings-hero,
.section-title,
.section-icon,
.model-row,
.switch-container {
  display: flex;
  align-items: center;
}

.settings-hero {
  justify-content: space-between;
  gap: 14px;
  padding: 22px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-surface);
  box-shadow: var(--ctm-shadow-subtle);
}

.settings-hero h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--ctm-text);
}

.settings-hero p {
  margin: 6px 0 0;
  color: var(--ctm-text-muted);
  font-size: 13px;
}

.setting-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-lg);
  background: var(--ctm-surface);
  box-shadow: var(--ctm-shadow-subtle);
}

.feature-section {
  padding-bottom: 46px;
}

.section-title {
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 800;
  color: var(--ctm-text);
}

.section-icon {
  gap: 8px;
}

.shortcut-control {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 76px 92px;
  gap: 10px;
  width: 100%;
  max-width: 720px;
  min-width: 0;
}

.key-field,
.state-pill {
  border: 1px solid var(--ctm-border);
  background: var(--ctm-surface-raised);
  color: var(--ctm-text);
  transition: background-color var(--ctm-transition), border-color var(--ctm-transition), box-shadow var(--ctm-transition);
}

.key-field {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  height: 42px;
  padding: 0 13px;
  border-radius: 13px;
  text-align: left;
  cursor: text;
}

.key-field:hover,
.state-pill:hover {
  border-color: var(--ctm-border-strong);
  background: var(--ctm-surface-muted);
}

.key-field.is-capturing {
  border-color: var(--ctm-control);
  box-shadow: 0 0 0 3px var(--ctm-control-soft);
}

.field-glyph {
  width: 24px;
  height: 24px;
  display: inline-grid;
  place-items: center;
  flex: 0 0 24px;
  border-radius: 8px;
  color: var(--ctm-text-soft);
  background: var(--ctm-control-soft);
  font-size: 11px;
  font-weight: 800;
}

.key-value {
  overflow: hidden;
  color: var(--ctm-text);
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.capture-button {
  height: 42px;
  border-radius: 13px;
}

.state-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  height: 42px;
  border-radius: 13px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.state-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: var(--ctm-text-muted);
}

.state-pill.is-enabled .state-dot {
  background: var(--ctm-text);
}

.state-pill.is-disabled {
  color: var(--ctm-text-muted);
  background: var(--ctm-surface-muted);
}

.advanced-settings {
  padding: 18px 18px 4px;
  background: var(--ctm-surface-muted);
  border: 1px solid var(--ctm-border);
  border-radius: var(--ctm-radius-md);
  margin-top: 2px;
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
  color: var(--ctm-control);
  font-weight: 700;
}

.model-row {
  gap: 8px;
  width: 100%;
  max-width: 720px;
  min-width: 0;
}

.model-input {
  flex: 1 1 0;
  width: 0;
  min-width: 0;
}

.model-select-wrapper {
  display: flex;
  height: 42px;
  border: 1px solid var(--ctm-border);
  border-radius: 13px;
  overflow: hidden;
  background: var(--ctm-surface);
  max-width: 100%;
}

.model-select {
  flex: 1 1 0;
  width: 100%;
  min-width: 0;
}

.model-fetch-button {
  flex: 0 0 118px;
  width: 118px;
  height: 42px;
  border-radius: 13px;
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
  color: var(--ctm-text-soft);
  font-size: 14px;
}

:deep(.aesthetic-input) {
  width: 100%;
  max-width: 720px;
}

:deep(.aesthetic-input .el-input__wrapper),
:deep(.el-textarea__inner) {
  min-height: 42px;
  border-radius: 13px;
  padding-left: 14px;
  padding-right: 14px;
}

:deep(.el-form),
:deep(.el-form-item__content),
:deep(.el-input),
:deep(.el-select) {
  min-width: 0;
  max-width: 100%;
}

:deep(.model-select .el-select__wrapper) {
  height: 40px;
  min-height: 40px;
  width: 100%;
  min-width: 0;
  border-radius: 13px;
  box-shadow: none;
  background: transparent;
}

@media (max-width: 768px) {
  .shortcut-control {
    grid-template-columns: 1fr;
  }

  .model-row {
    flex-direction: column;
    align-items: stretch;
  }

  .model-select-wrapper {
    width: 100%;
  }

  .model-fetch-button {
    width: 100%;
    flex-basis: auto;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
  }
}
</style>
