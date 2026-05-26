import { load } from '@tauri-apps/plugin-store';
import { reactive, ref } from 'vue';
import { info, error } from '@tauri-apps/plugin-log';

const STORAGE_KEY = 'copytome_settings'
const VERSION = '200260526v0@0.3.4'
const BASE_URL = "https://cp.uuyo.pw"

// 默认配置
const DEFAULT_SETTINGS = {
    textKey: 'CmdOrControl+K',
    questionKey: 'CmdOrControl+J',
    toggleWindowKey: 'CmdOrControl+Shift+Y',  // 显示/隐藏窗口快捷键
    wxInputMode: true,
    textProcessEnabled: true,
    aiQAEnabled: true,
    toggleWindowEnabled: true,  // 显示/隐藏托盘功能开关
    hideWindow: false,
    autoStart: false,
    runAsAdmin: false,  // 启动时自动请求管理员权限
    autoHideTray: false,  // 自动隐藏托盘图标
    quickInput: true,  // 快速输入模式
    timeRange: [1, 5],  // 时间范围 [最小值, 最大值] (毫秒),
    deepseekApi: '',
    customAIEndpoint: 'https://api.deepseek.com',  // OpenAI 兼容 Base URL
    customAIModel: 'v4-flash',  // 默认模型
    systemPrompt: '你是一个说话极简的答题助手,只给出答案即可,不要使用md语法',  // AI 提示词
    skippedVersions: [],  // 跳过的版本列表
}

const setMg = {
    version: ref(VERSION),
    defaultSetting: {
        ...DEFAULT_SETTINGS
    },
    baseUrl: BASE_URL,
    settings: reactive({
        ...DEFAULT_SETTINGS,
    }),
    store: null,
    async init() {
        info("setMg: 开始初始化设置管理器");
        try {
            this.store = await load('copytome_settings.json', { autoSave: false });
            const settings = await this.store.get(STORAGE_KEY)
            // 只有当设置存在时才合并，避免 undefined/null 覆盖默认值
            if (settings && typeof settings === 'object') {
                Object.assign(this.settings, settings)
                // 旧版本可能保存了空的自定义 AI 字段，这里补齐新的简洁默认值。
                if (!this.settings.customAIEndpoint?.trim()) {
                    this.settings.customAIEndpoint = DEFAULT_SETTINGS.customAIEndpoint
                }
                if (!this.settings.customAIModel?.trim()) {
                    this.settings.customAIModel = DEFAULT_SETTINGS.customAIModel
                }
                info(`setMg: 设置加载完成: ${JSON.stringify(this.settings)}`);
            } else {
                info("setMg: 未找到已保存的设置，使用默认设置");
            }
        } catch (e) {
            error(`setMg: 初始化设置管理器失败: ${e}`);
            info("setMg: 使用默认设置");
        }
    },
    get(key) {
        return this.settings[key]
    },
    /**
     * 需要手动保存
     * @param key
     * @param value
     */
    async set(key, value) {
        info(`setMg: 设置 ${key} = ${JSON.stringify(value)}`);
        this.settings[key] = value
        await this.save()
    },
    async save() {
        info("setMg: 保存设置到存储");
        try {
            await this.store.set(STORAGE_KEY, this.settings)
            info("setMg: 设置保存成功");
        } catch (e) {
            error(`setMg: 设置保存失败: ${e}`);
        }
    },
    async reset() {
        info("setMg: 重置设置为默认值");
        Object.assign(this.settings, this.defaultSetting)
        await this.save()
    }
}

export default setMg;
