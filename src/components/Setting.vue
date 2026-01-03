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
              <RefreshLeft/>
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
                <Operation/>
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
                @click="startCapture(shortcut.key)">
                <template #prepend>
                  <el-icon>
                    <component :is="shortcut.icon"/>
                  </el-icon>
                </template>
                <template #append>
                  <el-button-group>
                    <el-button 
                      :type="capturingKey === shortcut.key ? 'primary' : 'default'"
                      @click.stop="toggleCapture(shortcut.key)">
                      {{ capturingKey === shortcut.key ? '取消' : '捕获' }}
                    </el-button>
                    <!-- 状态按钮：显示启用/禁用状态 -->
                    <el-button 
                      :class="['status-toggle-button', settings[shortcut.enableKey] ? 'status-enabled' : 'status-disabled']"
                      @click.stop="toggleFeature(shortcut.key, shortcut.enableKey, shortcut.enableLabel)">
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

        <el-divider style="margin: 12px 0"/>

        <!-- AI 配置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Cpu/>
              </el-icon>
              <span>AI 配置</span>
            </div>
            <el-button type="primary" @click="saveAiSettingHandler">
              保存AI设置
            </el-button>
          </h3>

          <el-form label-width=" 120px" label-position="left">
            <el-form-item v-for="field in aiConfigFields" :key="field.key" :label="field.label">
              <!-- 文本输入框 -->
              <el-input v-if="field.type !== 'switch'" v-model="settings[field.key]" :placeholder="field.placeholder" 
                        :type="field.type"
                        :show-password="field.showPassword" :rows="field.type === 'textarea' ? 4 : null"
                        :clearable="field.type !== 'textarea'">
                <template #prepend>
                  <el-icon>
                    <component :is="field.icon"/>
                  </el-icon>
                </template>
              </el-input>
              <!-- 开关控件 -->
              <div v-else class="switch-container">
                <el-switch v-model="settings[field.key]" size="large" active-text="启用" inactive-text="关闭"/>
              </div>
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

        <el-divider style="margin: 8px 0"/>

        <!-- 自定义AI设置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Setting/>
              </el-icon>
              <span>自定义AI设置</span>
            </div>
            <el-button type="primary" @click="saveAiSettingHandler">
              保存设置
            </el-button>
          </h3>

          <el-form label-width="120px" label-position="left">
            <!-- 启用自定义AI -->
            <el-form-item label="启用自定义AI">
              <div class="switch-container">
                <el-switch v-model="settings.useCustomAI" size="large" active-text="启用" inactive-text="关闭"/>
                <el-text size="small" type="info" style="margin-left: 12px">
                  启用后将使用自定义AI端点，而不是DeepSeek
                </el-text>
              </div>
            </el-form-item>

            <!-- 自定义AI配置（仅在启用时显示） -->
            <template v-if="settings.useCustomAI">
              <el-form-item label="API端点">
                <el-input v-model="settings.customAIEndpoint" placeholder="例如: https://api.openai.com/v1 或 https://qwen.uuyo.fun/v1">
                  <template #prepend>
                    <el-icon><Link/></el-icon>
                  </template>
                </el-input>
                <el-text size="small" type="info">只需填写到 /v1，会自动补全 /chat/completions</el-text>
              </el-form-item>

              <el-form-item label="模型名称">
                <el-space direction="vertical" style="align-items: flex-start;" :size="8">
                  <div style="display: flex; gap: 8px; width: 100%;">
                    <el-select 
                      v-if="availableModels.length > 0"
                      v-model="settings.customAIModel" 
                      placeholder="选择模型" 
                      filterable
                      allow-create
                      style="flex: 1; min-width: 0;"
                    >
                      <el-option
                        v-for="model in availableModels"
                        :key="model"
                        :label="model"
                        :value="model"
                      />
                    </el-select>
                    <el-input 
                      v-else
                      v-model="settings.customAIModel" 
                      placeholder="例如: gpt-3.5-turbo 或 gemini-pro"
                      style="flex: 1; min-width: 0;"
                    >
                      <template #prepend>
                        <el-icon><Cpu/></el-icon>
                      </template>
                    </el-input>
                    <el-button 
                      @click="fetchModels" 
                      :loading="loadingModels"
                      :disabled="!settings.customAIEndpoint"
                    >
                      <el-icon v-if="!loadingModels"><Refresh/></el-icon>
                      {{ availableModels.length > 0 ? '刷新' : '获取模型' }}
                    </el-button>
                  </div>
                  <el-text size="small" type="info" style="text-align: left; display: block;">
                    {{ availableModels.length > 0 ? `已获取 ${availableModels.length} 个可用模型` : '点击"获取模型"按钮自动获取可用模型列表' }}
                  </el-text>
                </el-space>
              </el-form-item>

              <el-form-item label="API格式">
                <el-radio-group v-model="settings.customAIFormat">
                  <el-radio value="openai">OpenAI格式</el-radio>
                  <el-radio value="google">Google格式</el-radio>
                </el-radio-group>
              </el-form-item>

              <el-form-item label="API Key">
                <el-input v-model="settings.customAIKey" type="password" show-password placeholder="自定义AI的API Key">
                  <template #prepend>
                    <el-icon><Key/></el-icon>
                  </template>
                </el-input>
              </el-form-item>
            </template>

            <!-- 高级设置（可折叠） -->
            <el-form-item>
              <el-button @click="showAdvancedSettings = !showAdvancedSettings" text>
                <el-icon><CaretRight v-if="!showAdvancedSettings"/><CaretBottom v-else/></el-icon>
                高级设置
              </el-button>
            </el-form-item>

            <!-- 高级参数（折叠区域） -->
            <el-collapse-transition>
              <div v-show="showAdvancedSettings" class="advanced-settings">
                <el-form-item label="Temperature">
                  <el-slider v-model="settings.aiTemperature" :min="0" :max="2" :step="0.1" show-input :marks="{0: '0', 1: '1', 2: '2'}" style="margin-bottom: -8px;"/>
                  <el-text size="small" type="info" style="margin-top: 16px; display: block;">控制输出的随机性，值越高越随机</el-text>
                </el-form-item>

                <el-form-item label="Top P">
                  <el-slider v-model="settings.aiTopP" :min="0" :max="1" :step="0.05" show-input :marks="{0: '0', 0.5: '0.5', 1: '1'}" style="margin-bottom: -8px;"/>
                  <el-text size="small" type="info" style="margin-top: 16px; display: block;">控制采样范围，与temperature配合使用</el-text>
                </el-form-item>

                <el-form-item label="最大Tokens">
                  <el-input-number v-model="settings.aiMaxTokens" :min="100" :max="8000" :step="100" style="width: 100%; margin-bottom: -8px;"/>
                  <el-text size="small" type="info" style="margin-top: 16px; display: block;">限制AI回答的最大长度</el-text>
                </el-form-item>

                <el-form-item label="频率惩罚">
                  <el-slider v-model="settings.aiFrequencyPenalty" :min="-2" :max="2" :step="0.1" show-input :marks="{'-2': '-2', 0: '0', 2: '2'}" style="margin-bottom: -8px;"/>
                  <el-text size="small" type="info" style="margin-top: 16px; display: block;">减少重复内容的出现频率</el-text>
                </el-form-item>

                <el-form-item label="存在惩罚">
                  <el-slider v-model="settings.aiPresencePenalty" :min="-2" :max="2" :step="0.1" show-input :marks="{'-2': '-2', 0: '0', 2: '2'}" style="margin-bottom: -8px;"/>
                  <el-text size="small" type="info" style="margin-top: 16px; display: block;">鼓励谈论新话题</el-text>
                </el-form-item>
              </div>
            </el-collapse-transition>
          </el-form>
        </div>

        <el-divider style="margin: 8px 0"/>

        <!-- 功能设置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Tools/>
              </el-icon>
              <span>功能设置</span>
            </div>
          </h3>

          <el-form label-width="120px" label-position="left">
            <el-form-item v-for="feature in featureToggles.filter(f => f.key !== 'textProcessEnabled' && f.key !== 'aiQAEnabled')" :key="feature.key" :label="feature.label">
              <div class="switch-container">
                <el-switch v-model="settings[feature.key]" size="large" active-text="启用" inactive-text="关闭"/>
                <el-text size="small" type="info" style="margin-left: 12px">
                  {{ feature.description }}
                </el-text>
              </div>
            </el-form-item>
            <!-- 时间范围 -->
            <el-form-item :label="TEXT_PROCESSING_CONFIG.timeRange.label">
              <el-slider v-model="settings.timeRange" range show-stops :min="TEXT_PROCESSING_CONFIG.timeRange.min"
                         :max="TEXT_PROCESSING_CONFIG.timeRange.max" :step="TEXT_PROCESSING_CONFIG.timeRange.step"
                         :marks="TEXT_PROCESSING_CONFIG.timeRange.marks"/>
            </el-form-item>
          </el-form>
        </div>


        <el-divider style="margin: 12px 0"/>

        <!-- DLL 注入配置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Upload/>
              </el-icon>
              <span>DLL 注入配置</span>
              <el-tag v-if="injected" type="success" size="small">
                <div style="display: flex;align-items: center;justify-content: center;height: 100%;">
                  已注入
                </div>
              </el-tag>
              <el-tag v-else type="info" size="small">
                <div style="display: flex;align-items: center;justify-content: center;height: 100%;">
                  未注入
                </div>
              </el-tag>
            </div>
            <div class=" action-buttons">
              <el-button v-if="injected" type="danger" @click="handleRemoveInjection" :loading="removing">
                取消注入
              </el-button>
              <el-button type="primary" @click="handleInjectDll" :loading="injecting" :disabled="!canInject">
                {{ injected ? '重新注入' : '注入 DLL' }}
              </el-button>
            </div>
          </h3>

          <el-form label-width="120px" label-position="left">
            <el-form-item label="目标程序路径">
              <el-input v-model="settings.targetProgramPath" placeholder="请选择目标程序 (.exe)" clearable>
                <template #prepend>
                  <el-icon>
                    <Document/>
                  </el-icon>
                </template>
                <template #append>
                  <el-button @click="selectTargetProgram">
                    <el-icon>
                      <FolderOpened/>
                    </el-icon>
                    浏览
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="DLL 文件路径">
              <el-input v-model="settings.dllPath"
                        placeholder="请选择 DLL 文件或输入下载 URL (http://... 或 https://...)"
                        clearable>
                <template #prepend>
                  <el-icon>
                    <DocumentCopy/>
                  </el-icon>
                </template>
                <template #append>
                  <el-button @click="selectDllFile">
                    <el-icon>
                      <FolderOpened/>
                    </el-icon>
                    浏览
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="解锁密码">
              <el-input v-model="settings.dllPassword" 
                        type="password" 
                        show-password 
                        placeholder="默认为空，功能解锁密码" 
                        clearable>
                <template #prepend>
                  <el-icon>
                    <Key/>
                  </el-icon>
                </template>
              </el-input>
            </el-form-item>
          </el-form>

          <el-alert type="primary" :closable="false">
            <div class="shortcut-tips">
              <p>• 必须填写 DeepSeek API 才能进行注入操作</p>
              <p>• DLL 路径支持本地文件路径或 HTTP/HTTPS URL</p>
            </div>
          </el-alert>
        </div>


      </div>
    </el-space>
  </el-card>
</template>

<script setup>
import {ref, computed, onMounted, onUnmounted, watch} from 'vue'
import {ElMessage, ElMessageBox} from 'element-plus'
import {open} from '@tauri-apps/plugin-dialog'
import {copyFile, writeTextFile, writeFile, exists, remove, readFile} from '@tauri-apps/plugin-fs'
import {dirname, join, appCacheDir, appDataDir} from '@tauri-apps/api/path'
import {fetch} from '@tauri-apps/plugin-http'
import {invoke} from '@tauri-apps/api/core'

import {
  Cpu,
  Operation,
  RefreshLeft,
  Tools,
  Upload,
  Document,
  DocumentCopy,
  FolderOpened,
  Setting,
  Link,
  Key,
  CaretRight,
  CaretBottom,
  Refresh,
  CircleCheckFilled,
  CircleCloseFilled
} from '@element-plus/icons-vue'

import {validateShortcutKey} from '../utils/textProcessing.js'
import {
  SHORTCUT_FIELDS,
  AI_CONFIG_FIELDS,
  FEATURE_TOGGLES,
  AI_TIPS,
  TEXT_PROCESSING_CONFIG
} from '../constants/config.js'
import setMg from "../composables/setMg.js";
import aiMg from "../composables/aiMg.js";
import mitt from '../utils/mitt.js';
import {info, error} from '@tauri-apps/plugin-log';
// Props 和 Emits
const emit = defineEmits(['update-shortcuts'])
// 表单数据 (绑定到响应式状态)
const settings = setMg.settings
// 保存状态
const showAdvancedSettings = ref(false)

// 快捷键捕获状态
const capturingKey = ref(null) // 当前正在捕获的快捷键字段
const pressedKeys = ref(new Set()) // 当前按下的按键集合

// 自定义AI相关状态
const availableModels = ref([])
const loadingModels = ref(false)

// DLL 注入相关状态
const injecting = ref(false)
const injected = ref(false)
const removing = ref(false)

// 使用配置常量
const shortcutFields = SHORTCUT_FIELDS
const aiConfigFields = AI_CONFIG_FIELDS
const featureToggles = FEATURE_TOGGLES
const aiTips = AI_TIPS

// 检查是否可以注入
const canInject = computed(() => {
  return settings.deepseekApi &&
      settings.deepseekApi.trim() !== '' &&
      settings.targetProgramPath &&
      settings.dllPath
})
// 检查目标目录下是否存在已注入的文件
const checkInjectedFiles = async () => {
  info("Setting: 检查注入文件状态");
  if (!settings.targetProgramPath || !settings.dllPath) {
    info("Setting: 路径未配置,跳过检查");
    const oldValue = injected.value;
    injected.value = false
    if (oldValue !== injected.value) {
      mitt.emit('injection-update'); // 状态变化，通知 Home
    }
    return
  }

  try {
    const targetDir = await dirname(settings.targetProgramPath)

    // 获取 DLL 文件名
    let dllFileName = settings.dllPath.split(/[/\\]/).pop()

    // 如果是URL，需要从URL中提取文件名
    if (isURL(settings.dllPath)) {
      const urlPath = new URL(settings.dllPath).pathname
      dllFileName = urlPath.split('/').pop() || 'downloaded.dll'
    }

    const targetDllPath = await join(targetDir, dllFileName)
    const apiFilePath = await join(targetDir, 'eat_rice.txt')

    // 检查两个文件是否都存在
    const dllExists = await exists(targetDllPath)
    const apiExists = await exists(apiFilePath)

    const oldValue = injected.value;
    injected.value = dllExists && apiExists
    info(`Setting: 注入状态检查完成 - DLL存在:${dllExists}, API文件存在:${apiExists}, 注入状态:${injected.value}`);
    
    // 如果状态发生变化，通知 Home 页面
    if (oldValue !== injected.value) {
      info(`Setting: 注入状态变化 ${oldValue} -> ${injected.value}, 发送更新事件`);
      mitt.emit('injection-update');
    }
  } catch (err) {
    error(`Setting: 检查注入文件失败: ${err}`);
    const oldValue = injected.value;
    injected.value = false
    if (oldValue !== injected.value) {
      mitt.emit('injection-update'); // 状态变化，通知 Home
    }
  }
}

// 选择目标程序
const selectTargetProgram = async () => {
  info("Setting: 打开目标程序选择对话框");
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: '可执行文件',
        extensions: ['exe']
      }]
    })

    if (selected) {
      info(`Setting: 选择目标程序: ${selected}`);
      settings.targetProgramPath = selected
      await setMg.save()
      await checkInjectedFiles() // 检查是否已注入
      ElMessage.success('已选择目标程序')
    }
  } catch (err) {
    error(`Setting: 选择目标程序失败: ${err}`);
    ElMessage.error('选择目标程序失败')
  }
}

// 选择 DLL 文件
const selectDllFile = async () => {
  info("Setting: 打开DLL文件选择对话框");
  try {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'DLL 文件',
        extensions: ['dll']
      }]
    })

    if (selected) {
      info(`Setting: 选择DLL文件: ${selected}`);
      settings.dllPath = selected
      await setMg.save()
      await checkInjectedFiles() // 检查是否已注入
      ElMessage.success('已选择 DLL 文件')
    }
  } catch (err) {
    error(`Setting: 选择DLL文件失败: ${err}`);
    ElMessage.error('选择 DLL 文件失败')
  }
}

// 判断是否是URL
const isURL = (str) => {
  try {
    const url = new URL(str)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

// 计算文件的 SHA-256 哈希值
const getFileHash = async (filePath) => {
  try {
    const fileContent = await readFile(filePath)
    const hashBuffer = await crypto.subtle.digest('SHA-256', fileContent)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return hashHex
  } catch (err) {
    error(`Setting: 计算文件哈希失败: ${err}`)
    return null
  }
}

// 比较两个文件是否相同（通过哈希值比较）
const areFilesIdentical = async (file1Path, file2Path) => {
  try {
    // 检查两个文件是否都存在
    const file1Exists = await exists(file1Path)
    const file2Exists = await exists(file2Path)

    if (!file1Exists || !file2Exists) {
      return false
    }

    // 计算两个文件的哈希值
    const hash1 = await getFileHash(file1Path)
    const hash2 = await getFileHash(file2Path)

    if (!hash1 || !hash2) {
      return false
    }

    // 比较哈希值
    const identical = hash1 === hash2
    info(`Setting: 文件哈希比较 - 文件1:${hash1.substring(0, 16)}... 文件2:${hash2.substring(0, 16)}... 相同:${identical}`)

    return identical
  } catch (err) {
    error(`Setting: 比较文件失败: ${err}`)
    return false
  }
}

// 从URL下载DLL
const downloadDll = async (url) => {
  info(`Setting: 开始下载DLL: ${url}`);
  try {
    ElMessage.info('正在下载 DLL 文件...')

    // 使用 fetch 下载文件
    const response = await fetch(url, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error(`下载失败: ${response.status}`)
    }

    // 获取二进制数据
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // 获取缓存目录
    const cacheDir = await appCacheDir()

    // 从URL中提取文件名，如果没有则使用默认名
    const urlPath = new URL(url).pathname
    const fileName = urlPath.split('/').pop() || 'downloaded.dll'

    // 保存到缓存目录
    const localPath = await join(cacheDir, fileName)
    await writeFile(localPath, uint8Array)

    info(`Setting: DLL下载成功,保存到: ${localPath}`);
    // ElMessage.success('DLL 下载成功')
    return localPath
  } catch (err) {
    error(`Setting: 下载DLL失败: ${err}`);
  }
}

// 处理 DLL 注入
const handleInjectDll = async () => {
  info("Setting: 开始DLL注入");
  // 验证 DeepSeek API
  if (!settings.deepseekApi || settings.deepseekApi.trim() === '') {
    info("Setting: DeepSeek API未配置");
    ElMessage.error('请先填写 DeepSeek API 才能进行注入')
    return
  }

  // 验证路径
  if (!settings.targetProgramPath || !settings.dllPath) {
    info("Setting: 目标程序或DLL路径未配置");
    ElMessage.error('请先选择目标程序和 DLL 文件路径')
    return
  }

  try {
    await setMg.save()
    injecting.value = true

    // 获取应用数据目录（保存准备注入的文件）
    const appDir = await appDataDir()
    const injectDir = await join(appDir, 'inject_files')
    info(`Setting: 应用数据目录: ${injectDir}`);

    // 确保目录存在
    try {
      await invoke('create_directory', {path: injectDir})
    } catch (e) {
      // 目录可能已存在，忽略错误
    }

    let sourceDllPath = settings.dllPath

    // 检查是否是URL，如果是则先下载
    if (isURL(settings.dllPath)) {
      info("Setting: DLL路径是URL,开始下载");
      sourceDllPath = await downloadDll(settings.dllPath)
    }

    // 获取 DLL 文件名
    const dllFileName = sourceDllPath.split(/[/\\]/).pop()

    // 第一步：复制 DLL 到应用程序目录
    const appDllPath = await join(injectDir, dllFileName)
    await copyFile(sourceDllPath, appDllPath)
    info(`Setting: DLL已复制到应用目录: ${appDllPath}`);

    // 第二步：创建 eat_rice.txt 到应用程序目录
    const appApiFilePath = await join(injectDir, 'eat_rice.txt')
    // 如果有密码，写入第二行
    let apiContent = settings.deepseekApi
    if (settings.dllPassword && settings.dllPassword.trim() !== '') {
      apiContent += '\n' + settings.dllPassword.trim()
      info(`Setting: API文件包含密码`)
    }
    await writeTextFile(appApiFilePath, apiContent)
    info(`Setting: API文件已创建到应用目录: ${appApiFilePath}`);

    // 第三步：准备目标路径
    const targetDir = await dirname(settings.targetProgramPath)
    const targetDllPath = await join(targetDir, dllFileName)
    const targetApiFilePath = await join(targetDir, 'eat_rice.txt')

    // 检查目标 DLL 是否已存在且与新 DLL 相同
    const targetDllExists = await exists(targetDllPath)
    if (targetDllExists) {
      info("Setting: 检测到目标路径下已存在DLL,开始比较文件");
      const isIdentical = await areFilesIdentical(appDllPath, targetDllPath)
      if (isIdentical) {
        info("Setting: 目标DLL与新DLL完全相同");
        ElMessage.warning('目标路径下已存在相同的 DLL 文件')
      }
    }

    // 第四步：尝试复制到目标程序目录
    try {
      await copyFile(appDllPath, targetDllPath)
      await copyFile(appApiFilePath, targetApiFilePath)
      info(`Setting: 文件已自动复制到目标目录: ${targetDir}`);
      injected.value = true
      mitt.emit('injection-update'); // 通知 Home 页面更新注入状态
      ElMessage.success('DLL 注入成功！')
    } catch (err) {
      error(`Setting: 自动复制失败: ${err}`);
      // 自动复制失败，引导用户手动复制
      info("Setting: 提示用户手动复制文件");

      await ElMessageBox.alert(
          `由于权限限制，无法自动复制文件到目标目录。\n\n请手动完成以下操作：\n\n1. 打开文件夹: ${injectDir}\n2. 复制以下两个文件：\n   - ${dllFileName}\n   - eat_rice.txt\n3. 粘贴到目标程序目录: ${targetDir}\n\n文件已准备好，点击"打开文件夹"按钮即可查看。`,
          '需要手动复制文件',
          {
            confirmButtonText: '打开文件夹',
            type: 'warning',
            dangerouslyUseHTMLString: false
          }
      )

      // 打开文件夹
      try {
        await invoke('open_folder', {path: injectDir})
      } catch (e) {
        error(`Setting: 打开文件夹失败: ${e}`);
      }
    }

  } catch (err) {
    if (err !== 'cancel') {
      error(`Setting: DLL注入失败: ${err}`);
      ElMessage.error(`DLL 注入失败: ${err.message || err}`)
    }
  } finally {
    injecting.value = false
    await checkInjectedFiles()
  }
}

// 取消注入（删除已注入的文件）
const handleRemoveInjection = async () => {
  info("Setting: 开始取消注入");
  if (!settings.targetProgramPath || !settings.dllPath) {
    info("Setting: 路径未配置");
    ElMessage.error('无法确定要删除的文件')
    return
  }

  try {
    await ElMessageBox.confirm(
        '确定要删除已注入的 DLL 和配置文件吗？',
        '取消注入',
        {
          confirmButtonText: '确定删除',
          cancelButtonText: '取消',
          type: 'warning',
        }
    )

    removing.value = true

    const targetDir = await dirname(settings.targetProgramPath)

    // 获取 DLL 文件名
    let dllFileName = settings.dllPath.split(/[/\\]/).pop()

    // 如果是URL，需要从URL中提取文件名
    if (isURL(settings.dllPath)) {
      const urlPath = new URL(settings.dllPath).pathname
      dllFileName = urlPath.split('/').pop() || 'downloaded.dll'
    }

    const targetDllPath = await join(targetDir, dllFileName)
    const apiFilePath = await join(targetDir, 'eat_rice.txt')

    // 删除文件
    const deletedFiles = []

    if (await exists(targetDllPath)) {
      await remove(targetDllPath)
      deletedFiles.push(dllFileName)
      info(`Setting: 已删除DLL: ${targetDllPath}`);
    }

    if (await exists(apiFilePath)) {
      await remove(apiFilePath)
      deletedFiles.push('eat_rice.txt')
      info(`Setting: 已删除API文件: ${apiFilePath}`);
    }

    if (deletedFiles.length > 0) {
      injected.value = false
      mitt.emit('injection-update'); // 通知 Home 页面更新注入状态
      info(`Setting: 删除完成: ${deletedFiles.join(', ')}`);
      ElMessage.success(`已删除: ${deletedFiles.join(', ')}`)
    } else {
      info("Setting: 没有找到需要删除的文件");
      ElMessage.info('没有找到需要删除的文件')
    }

  } catch (err) {
    if (err !== 'cancel') {
      error(`Setting: 删除注入文件失败: ${err}`);
      ElMessage.error(`删除失败: ${err.message || '未知错误'}`)
    }
  } finally {
    removing.value = false
    await checkInjectedFiles()
  }
}

// 重置设置
const resetSettingsHandler = () => {
  info("Setting: 重置所有设置");
  setMg.reset();
}

// 获取可用模型列表
const fetchModels = async () => {
  info("Setting: 获取可用模型列表");
  if (!settings.customAIEndpoint) {
    ElMessage.warning('请先填写API端点');
    return;
  }
  
  loadingModels.value = true;
  try {
    const models = await aiMg.fetchAvailableModels();
    if (models && models.length > 0) {
      availableModels.value = models;
      ElMessage.success(`成功获取 ${models.length} 个可用模型`);
    } else {
      availableModels.value = [];
      ElMessage.info('未获取到可用模型');
    }
  } catch (e) {
    error(`Setting: 获取模型失败: ${e}`);
    ElMessage.error('获取模型失败');
  } finally {
    loadingModels.value = false;
  }
}

//保存ai设置
const saveAiSettingHandler = async () => {
  info("Setting: 保存AI设置");
  // 验证 AI 配置
  if (!settings.deepseekApi && !settings.userName) {
    ElMessage.warning('请至少填写 DeepSeek API 或用户名')
  }
  if (!settings.userName.trim()) {
    aiMg.cachedApi = ""
  }

  // 更新设置
  await setMg.save()
  // 如果只有用户名,获取 API
  if (!settings.deepseekApi && settings.userName) {
    info("Setting: 从服务器获取API");
    ElMessage.info('正在从服务器获取 API...')
    const isSuccee = await aiMg.fetchAPIFromServer()
    if (isSuccee) {
      ElMessage.success('成功获取 API')
    } else {
      ElMessage.error('获取 API 失败')
    }
  }
  // 更新设置
  if (settings.deepseekApi) {
    ElMessage.success('AI 设置已保存')
  }
}

// 按键映射表
const keyMapping = {
  'Control': 'Ctrl',
  'Meta': 'Super',
  'ArrowUp': 'Up',
  'ArrowDown': 'Down',
  'ArrowLeft': 'Left',
  'ArrowRight': 'Right',
  ' ': 'Space'
}

// 标准化按键名称
const normalizeKey = (key) => {
  return keyMapping[key] || key
}

// 开始捕获快捷键
const startCapture = async (key) => {
  if (capturingKey.value !== key) {
    // 注销所有快捷键，避免在捕获过程中触发原有功能
    try {
      const { unregister } = await import('@tauri-apps/plugin-global-shortcut')
      
      // 注销所有已注册的快捷键
      for (const field of shortcutFields) {
        if (settings[field.key]) {
          try {
            await unregister(settings[field.key])
            info(`Setting: 已注销快捷键: ${settings[field.key]}`)
          } catch (err) {
            // 忽略已注销的错误
          }
        }
      }
    } catch (err) {
      error(`Setting: 注销快捷键失败: ${err}`)
    }
    
    capturingKey.value = key
    pressedKeys.value.clear()
  }
}

// 切换捕获状态
const toggleCapture = (key) => {
  if (capturingKey.value === key) {
    stopCapture()
  } else {
    startCapture(key)
  }
}

// 切换功能状态
const toggleFeature = async (shortcutKey, enableKey, enableLabel) => {
  const newState = !settings[enableKey]
  settings[enableKey] = newState
  await setMg.save()
  
  if (newState) {
    // 启用：重新注册所有快捷键
    emit('update-shortcuts')
    ElMessage.success(`${enableLabel}已启用`)
  } else {
    // 关闭：直接调用更新快捷键（会根据状态选择性注册）
    emit('update-shortcuts')
    ElMessage.warning(`${enableLabel}已关闭`)
  }
}

// 停止捕获
const stopCapture = () => {
  capturingKey.value = null
  pressedKeys.value.clear()
  
  // 重新注册快捷键（如果用户取消了捕获）
  emit('update-shortcuts')
}

// 处理按键按下
const handleKeyDown = async (event) => {
  if (!capturingKey.value) return
  
  event.preventDefault()
  event.stopPropagation()
  
  const key = event.key
  
  // 如果只按了 Escape，取消捕获
  if (key === 'Escape' && pressedKeys.value.size === 0) {
    stopCapture()
    return
  }
  
  // 忽略单独的修饰键
  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return
  }
  
  // 收集所有按下的键
  const keys = []
  
  // Windows/Linux 使用 Ctrl，Mac 使用 Command
  if (event.ctrlKey || event.metaKey) {
    keys.push('CmdOrControl')
  }
  if (event.altKey) {
    keys.push('Alt')
  }
  if (event.shiftKey) {
    keys.push('Shift')
  }
  
  // 添加主键
  const mainKey = normalizeKey(key)
  if (mainKey.length === 1) {
    keys.push(mainKey.toUpperCase())
  } else {
    keys.push(mainKey)
  }
  
  // 至少需要一个修饰键或特殊键
  if (keys.length < 2 && !['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12'].includes(mainKey)) {
    return
  }
  
  // 构建快捷键字符串
  const shortcutString = keys.join('+')
  
  // 检查是否与其他快捷键重复
  const otherKeys = shortcutFields.filter(f => f.key !== capturingKey.value)
  const isDuplicate = otherKeys.some(field => settings[field.key] === shortcutString)
  
  if (isDuplicate) {
    ElMessage.warning('该快捷键已被使用')
    return
  }
  
  // 设置快捷键
  settings[capturingKey.value] = shortcutString
  
  // 停止捕获状态
  capturingKey.value = null
  pressedKeys.value.clear()
  
  // 自动保存并注册（会重新注册所有快捷键）
  await setMg.save()
  emit('update-shortcuts')
  
  // 提示成功
  ElMessage.success(`已设置快捷键: ${shortcutString}`)
}

// 处理按键释放
const handleKeyUp = (event) => {
  if (!capturingKey.value) return
  event.preventDefault()
  event.stopPropagation()
}

// 组件挂载时检查是否已注入
onMounted(() => {
  info("Setting: 组件挂载");
  checkInjectedFiles()
  // 添加键盘事件监听
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
})

// 组件卸载时移除事件监听
onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
})

// 监听路径变化，自动检查注入状态
watch(
    () => [settings.targetProgramPath, settings.dllPath],
    () => {
      checkInjectedFiles()
    }
)

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

.section-title .section-icon {
  flex: 1;
}

.action-buttons {
  display: flex;
  gap: 8px;
  align-items: center;
}

.section-title span {
  display: inline-block;
}

.shortcut-input {
  max-width: 500px;
}

/* 状态按钮样式 */
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

/* 启用状态 - 绿色 */
.status-enabled {
  background-color: #67c23a !important;
  border-color: #67c23a !important;
  color: #ffffff !important;
}

.status-enabled:hover {
  background-color: #85ce61 !important;
  border-color: #85ce61 !important;
}

.status-enabled .el-icon {
  color: #ffffff !important;
}

/* 禁用状态 - 红色 */
.status-disabled {
  background-color: #f56c6c !important;
  border-color: #f56c6c !important;
  color: #ffffff !important;
}

.status-disabled:hover {
  background-color: #f78989 !important;
  border-color: #f78989 !important;
}

.status-disabled .el-icon {
  color: #ffffff !important;
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

/* 高级设置样式 */
.advanced-settings {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-top: 12px;
}

.advanced-settings .el-form-item {
  margin-bottom: 20px;
}

.advanced-settings .el-text {
  display: block;
  margin-top: 4px;
}

/* 模型选择框样式优化 */
:deep(.el-select) {
  text-align: left;
}

:deep(.el-select .el-input__inner) {
  text-align: left;
}

:deep(.el-select-dropdown__item) {
  text-align: left;
  white-space: normal;
  height: auto;
  min-height: 34px;
  line-height: 1.5;
  padding: 8px 20px;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  :deep(.el-form-item__label) {
    font-size: 13px;
  }
}
</style>