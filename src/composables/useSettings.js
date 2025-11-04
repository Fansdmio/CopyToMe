/**
 * 设置管理 Composable
 * 统一管理应用的所有配置项
 */
import { ref, watch } from 'vue'

const STORAGE_KEY = 'copytome_settings'
const AI_CONFIG_KEY = 'copytome_ai_config'

// 默认配置
const DEFAULT_SETTINGS = {
    textKey: 'CmdOrControl+K',
    questionKey: 'CmdOrControl+J',
    wxInputMode: true,
    textProcessEnabled: true,
    aiQAEnabled: true,
    hideWindow: false,
    autoStart: false,
    timeRange: [1, 5]  // 时间范围 [最小值, 最大值] (毫秒)
}

const DEFAULT_AI_CONFIG = {
    deepseekApi: '',
    userName: '',
    cachedApi: ''
}

// 响应式状态
const settings = ref({ ...DEFAULT_SETTINGS })
const aiConfig = ref({ ...DEFAULT_AI_CONFIG })

/**
 * 从 localStorage 加载配置
 */
function loadFromStorage(key, defaultValue) {
    try {
        const saved = localStorage.getItem(key)
        return saved ? { ...defaultValue, ...JSON.parse(saved) } : defaultValue
    } catch (e) {
        console.error(`加载配置失败 [${key}]:`, e)
        return defaultValue
    }
}

/**
 * 保存配置到 localStorage
 */
function saveToStorage(key, data) {
    try {
        const toSave = { ...data, lastUpdated: new Date().toISOString() }
        localStorage.setItem(key, JSON.stringify(toSave))
        return true
    } catch (e) {
        console.error(`保存配置失败 [${key}]:`, e)
        return false
    }
}

/**
 * 设置管理 Hook
 */
export function useSettings() {
    // 初始化加载
    const initSettings = () => {
        settings.value = loadFromStorage(STORAGE_KEY, DEFAULT_SETTINGS)
        aiConfig.value = loadFromStorage(AI_CONFIG_KEY, DEFAULT_AI_CONFIG)
    }

    // 保存设置
    const saveSettings = () => {
        const success = saveToStorage(STORAGE_KEY, settings.value)
        if (success) {
            console.log('设置已保存:', settings.value)
        }
        return success
    }

    // 保存 AI 配置
    const saveAIConfig = () => {
        console.log("保存ai配置", aiConfig.value.deepseekApi, aiConfig.value.userName);

        return saveToStorage(AI_CONFIG_KEY, aiConfig.value)
    }

    // 重置设置
    const resetSettings = () => {
        settings.value = { ...DEFAULT_SETTINGS }
        aiConfig.value = { ...DEFAULT_AI_CONFIG }
    }

    // 获取上次更新时间
    const getLastUpdated = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY)
            if (saved) {
                const data = JSON.parse(saved)
                return data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('zh-CN') : null
            }
        } catch (e) {
            console.error('获取更新时间失败:', e)
        }
        return null
    }

    // 监听变化自动保存
    const enableAutoSave = () => {
        watch(settings, saveSettings, { deep: true })
        watch(aiConfig, saveAIConfig, { deep: true })
    }

    return {
        settings,
        aiConfig,
        initSettings,
        saveSettings,
        saveAIConfig,
        resetSettings,
        getLastUpdated,
        enableAutoSave
    }
}
