import { load } from '@tauri-apps/plugin-store';
import { reactive, ref } from 'vue';
import { info, error } from '@tauri-apps/plugin-log';

const STORAGE_KEY = 'copytome_settings'
const VERSION = '200251110v3'

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
    targetProgramPath: '',  // 目标程序路径
    dllPath: '',  // DLL 文件路径
    skippedVersions: [],  // 跳过的版本列表
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
        info("setMg: 开始初始化设置管理器");
        try {
            this.store = await load('copytome_settings.json', { autoSave: false });
            const settings = await this.store.get(STORAGE_KEY)
            // 只有当设置存在时才合并，避免 undefined/null 覆盖默认值
            if (settings && typeof settings === 'object') {
                Object.assign(this.settings, settings)
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