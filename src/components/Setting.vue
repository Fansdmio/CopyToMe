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

          <el-form :model="settings" label-width="120px" label-position="left">
            <el-form-item v-for="shortcut in shortcutFields" :key="shortcut.key" :label="shortcut.label">
              <el-input v-model="settings[shortcut.key]" :placeholder="shortcut.placeholder" class="shortcut-input">
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
            <el-button type="primary" @click="saveAiSettingHandler">
              保存AI设置
            </el-button>
          </h3>

          <el-form label-width=" 120px" label-position="left">
            <el-form-item v-for="field in aiConfigFields" :key="field.key" :label="field.label">
              <el-input v-model="settings[field.key]" :placeholder="field.placeholder" :type="field.type"
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
                <el-switch v-model="settings[feature.key]" size="large" active-text="启用" inactive-text="关闭" />
                <el-text size="small" type="info" style="margin-left: 12px">
                  {{ feature.description }}
                </el-text>
              </div>
            </el-form-item>
            <!-- 时间范围 -->
            <el-form-item :label="TEXT_PROCESSING_CONFIG.timeRange.label">
              <el-slider v-model="settings.timeRange" range show-stops :min="TEXT_PROCESSING_CONFIG.timeRange.min"
                :max="TEXT_PROCESSING_CONFIG.timeRange.max" :step="TEXT_PROCESSING_CONFIG.timeRange.step"
                :marks="TEXT_PROCESSING_CONFIG.timeRange.marks" />
            </el-form-item>
          </el-form>
        </div>


        <el-divider style="margin: 12px 0" />

        <!-- DLL 注入配置 -->
        <div class="setting-section">
          <h3 class="section-title">
            <div class="section-icon">
              <el-icon>
                <Upload />
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
                    <Document />
                  </el-icon>
                </template>
                <template #append>
                  <el-button @click="selectTargetProgram">
                    <el-icon>
                      <FolderOpened />
                    </el-icon>
                    浏览
                  </el-button>
                </template>
              </el-input>
            </el-form-item>

            <el-form-item label="DLL 文件路径">
              <el-input v-model="settings.dllPath" placeholder="请选择 DLL 文件或输入下载 URL (http://... 或 https://...)"
                clearable>
                <template #prepend>
                  <el-icon>
                    <DocumentCopy />
                  </el-icon>
                </template>
                <template #append>
                  <el-button @click="selectDllFile">
                    <el-icon>
                      <FolderOpened />
                    </el-icon>
                    浏览
                  </el-button>
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
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { open } from '@tauri-apps/plugin-dialog'
import { copyFile, writeTextFile, writeFile, exists, remove, readFile } from '@tauri-apps/plugin-fs'
import { dirname, join, appCacheDir, appDataDir } from '@tauri-apps/api/path'
import { fetch } from '@tauri-apps/plugin-http'
import { invoke } from '@tauri-apps/api/core'

import {
  Collection,
  Cpu,
  Operation,
  QuestionFilled,
  RefreshLeft,
  Tools,
  Upload,
  Document,
  DocumentCopy,
  FolderOpened,
} from '@element-plus/icons-vue'

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
import setMg from "../composables/setMg.js";
import aiMg from "../composables/aiMg.js";
import { info, error } from '@tauri-apps/plugin-log';
// Props 和 Emits
const emit = defineEmits(['update-shortcuts'])
// 表单数据 (绑定到响应式状态)
const settings = setMg.settings
// 保存状态
const showKeyboardHelp = ref(false)

// DLL 注入相关状态
const injecting = ref(false)
const injected = ref(false)
const removing = ref(false)

// 使用配置常量
const shortcutFields = SHORTCUT_FIELDS
const aiConfigFields = AI_CONFIG_FIELDS
const featureToggles = FEATURE_TOGGLES
const presets = SHORTCUT_PRESETS
const keyboardHelpData = KEYBOARD_HELP_DATA
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
    injected.value = false
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

    injected.value = dllExists && apiExists
    info(`Setting: 注入状态检查完成 - DLL存在:${dllExists}, API文件存在:${apiExists}, 注入状态:${injected.value}`);
  } catch (err) {
    error(`Setting: 检查注入文件失败: ${err}`);
    injected.value = false
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
      await invoke('create_directory', { path: injectDir })
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
    await writeTextFile(appApiFilePath, settings.deepseekApi)
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
        await invoke('open_folder', { path: injectDir })
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

// 检查是否是当前预设
const isCurrentPreset = (preset) => {
  return settings.textKey === preset.textKey && settings.questionKey === preset.questionKey
}
// 应用预设
const applyPreset = async (preset) => {
  info(`Setting: 应用快捷键预设: ${preset.name}`);
  settings.textKey = preset.textKey
  settings.questionKey = preset.questionKey
  await setMg.save()
  // 通知父组件更新快捷键
  emit('update-shortcuts')
  ElMessage.success(`已应用 ${preset.name}`)
}

// 重置设置
const resetSettingsHandler = () => {
  info("Setting: 重置所有设置");
  setMg.reset();
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

// 保存快捷键设置
const saveShortcutKeySettingsHandler = async () => {
  info(`Setting: 保存快捷键设置 - 文本:${settings.textKey}, 问答:${settings.questionKey}`);
  // 验证快捷键
  if (!validateShortcutKey(settings.textKey)) {
    error("Setting: 模拟输入快捷键格式不正确");
    ElMessage.error('模拟输入快捷键格式不正确')
    return
  }
  if (!validateShortcutKey(settings.questionKey)) {
    error("Setting: AI问答快捷键格式不正确");
    ElMessage.error('AI 问答快捷键格式不正确')
    return
  }
  if (settings.textKey === settings.questionKey) {
    error("Setting: 两个快捷键相同");
    ElMessage.error('两个快捷键不能相同')
    return
  }
  await setMg.save()
  emit('update-shortcuts')

}

// 组件挂载时检查是否已注入
onMounted(() => {
  info("Setting: 组件挂载");
  checkInjectedFiles()
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