import {load} from '@tauri-apps/plugin-store';

const STORAGE_KEY = 'copytome_settings'
const VERSION = '200251104'

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
    version: VERSION,
    defaultSetting: {
        ...DEFAULT_SETTINGS
    },
    settings: {
        ...DEFAULT_SETTINGS,
    },
    store: null,
    async init() {
        this.store = await load('copytome_settings.json', {autoSave: false});
        const settings = await this.store.get(STORAGE_KEY)
        console.log("初始化加载的设置:")
        console.log(settings)
        this.settings = settings ? {...DEFAULT_SETTINGS, ...settings} : {...DEFAULT_SETTINGS}
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
        this.settings = {...DEFAULT_SETTINGS}
        await this.save()
    }
}

export default setMg;