import { load } from '@tauri-apps/plugin-store';
import { reactive, ref } from 'vue';

const STORAGE_KEY = 'copytome_settings'
const VERSION = '200251107'

// 默认配置
const DEFAULT_SETTINGS = {
    textKey: 'CmdOrControl+K',
    questionKey: 'CmdOrControl+J',
    wxInputMode: true,
    textProcessEnabled: true,
    aiQAEnabled: true,
    hideWindow: false,
    autoStart: false,
    timeRange: [1, 5],  // 时间范围 [最小值, 最大值] (毫秒),
    deepseekApi: '',
    userName: '',
}

const setMg = {
    version: ref(VERSION),
    defaultSetting: {
        ...DEFAULT_SETTINGS
    },
    settings: reactive({
        ...DEFAULT_SETTINGS,
    }),
    store: null,
    async init() {
        this.store = await load('copytome_settings.json', { autoSave: false });
        const settings = await this.store.get(STORAGE_KEY)
        Object.assign(this.settings, settings)
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
        this.settings[key] = value
        await this.save()
    },
    async save() {
        await this.store.set(STORAGE_KEY, this.settings)
    },
    async reset() {
        Object.assign(this.settings, this.defaultSetting)
        await this.save()
    }
}

export default setMg;