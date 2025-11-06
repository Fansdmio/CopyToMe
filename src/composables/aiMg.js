import setMg from './setMg.js';
import { ElMessage } from 'element-plus'
import { decryptGCM } from '../utils/crypto.js'
import { fetch } from '@tauri-apps/plugin-http'

const QA_HISTORY_KEY = 'copytome_qa_history'
const MAX_HISTORY = 200

const aiMg = {
    cachedApi: '',
    store: null,
    async init() {
        // 初始化设置管理器
        await setMg.init();
        this.store = setMg.store
    },
    /**
     *  使用API Key
     */
    getApiKey() {
        // 1. 优先使用直接配置的 API
        if (setMg.get('deepseekApi')?.trim()) {
            return setMg.get('deepseekApi').trim()
        }
        // 2. 使用缓存的 API
        if (this.cachedApi?.trim()) {
            return this.cachedApi.trim()
        }
        return null
    },
    /**
     * 从服务器获取 API Key
     */
    async fetchAPIFromServer() {
        const userName = setMg.get('userName')?.trim()
        if (!userName) {
            ElMessage.warning('请先在设置中配置用户名')
            return false
        }
        try {
            const response = await fetch(
                `https://cp.uuyo.fun/get_api_key?user_name=${encodeURIComponent(userName)}`,
            )
            const data = await response.json()

            const decryptedApi = await decryptGCM(data.api_key)
            if (!decryptedApi.startsWith("sk-")) return null;
            this.cachedApi = decryptedApi
            return true;
        } catch (e) {
            console.error('获取 API Key 失败:', e)
            return false
        }
    },
    async refreshCachedApi() {
        if (setMg.get('userName')?.trim() && !setMg.get('deepseekApi')?.trim()) {
            await this.fetchAPIFromServer();
        }
    },
    async checkHealth() {
        //尝试刷新缓存的 API Key
        await this.refreshCachedApi();
        return !!(await this.askAi("hello"));
    },
    async askAi(question, systemPrompt = '你是一个说话极简的老师,不要使用markdown语法等,回答只需要普通文本即可') {

        const apiKey = this.getApiKey()
        if (!apiKey) return null
        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'deepseek-chat',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: question }
                ],
                stream: false
            })
        })

        const completion = await response.json()

        if (completion.error) {
            ElMessage.error('AI 请求失败: ' + completion.error.message)
            return null
        }
        return completion?.choices?.[0]?.message?.content ?? null
    },
    async saveQAHistory(question, answer, model = 'deepseek-chat') {
        try {
            let history = await this.store.get(QA_HISTORY_KEY) || [];
            history.unshift({
                question,
                answer,
                model,
                time: new Date().toLocaleString('zh-CN')
            })
            // 只保留最近的记录
            if (history.length > MAX_HISTORY) history.length = MAX_HISTORY
            this.store.set(QA_HISTORY_KEY, history)
            await this.store.save()
        } catch (e) {
            console.error('保存问答记录失败:', e)
            return false
        }
    },
    async getQAHistory() {
        return await this.store.get(QA_HISTORY_KEY)
    },
    async clearQAHistory() {
        this.store.set(QA_HISTORY_KEY, [])
        await this.store.save()
    }
}

export default aiMg;