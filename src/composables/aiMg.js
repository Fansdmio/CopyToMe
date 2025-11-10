import setMg from './setMg.js';
import { ElMessage } from 'element-plus'
import { decryptGCM } from '../utils/crypto.js'
import { fetch } from '@tauri-apps/plugin-http'
import { info, error } from '@tauri-apps/plugin-log';

const QA_HISTORY_KEY = 'copytome_qa_history'
const MAX_HISTORY = 200

const aiMg = {
    cachedApi: '',
    store: null,
    async init() {
        info("aiMg: 开始初始化");
        try {
            // 初始化设置管理器
            await setMg.init();
            this.store = setMg.store
            info("aiMg: 初始化完成");
        } catch (e) {
            error(`aiMg: 初始化失败: ${e}`);
            throw e; // 抛出错误让调用方知道初始化失败
        }
    },
    /**
     *  使用API Key
     */
    getApiKey() {
        // 1. 优先使用直接配置的 API
        if (setMg.get('deepseekApi')?.trim()) {
            info("aiMg: 使用配置的 DeepSeek API");
            return setMg.get('deepseekApi').trim()
        }
        // 2. 使用缓存的 API
        if (this.cachedApi?.trim()) {
            info("aiMg: 使用缓存的 API Key");
            return this.cachedApi.trim()
        }
        info("aiMg: 未找到可用的 API Key");
        return null
    },
    /**
     * 从服务器获取 API Key
     */
    async fetchAPIFromServer() {
        const userName = setMg.get('userName')?.trim()
        if (!userName) {
            info("aiMg: 未配置用户名");
            ElMessage.warning('请先在设置中配置用户名')
            return false
        }
        info(`aiMg: 从服务器获取 API Key, 用户名: ${userName}`);
        try {
            const response = await fetch(
                `https://cp.uuyo.fun/get_api_key?user_name=${encodeURIComponent(userName)}`,
            )
            const data = await response.json()

            const decryptedApi = await decryptGCM(data.api_key)
            if (!decryptedApi.startsWith("sk-")) {
                error("aiMg: 解密后的 API Key 格式不正确");
                return null;
            }
            this.cachedApi = decryptedApi
            info("aiMg: 成功从服务器获取并缓存 API Key");
            return true;
        } catch (e) {
            error(`aiMg: 获取 API Key 失败: ${e}`);
            return false
        }
    },
    async refreshCachedApi() {
        if (setMg.get('userName')?.trim() && !setMg.get('deepseekApi')?.trim()) {
            info("aiMg: 刷新缓存的 API Key");
            await this.fetchAPIFromServer();
        }
    },
    async checkHealth() {
        info("aiMg: 检查 AI 服务健康状态");
        //尝试刷新缓存的 API Key
        await this.refreshCachedApi();
        const isHealthy = !!(await this.askAi("hello"));
        info(`aiMg: AI 服务健康检查结果: ${isHealthy}`);
        return isHealthy;
    },
    async askAi(question, systemPrompt = '你是一个说话极简的老师,不要使用markdown语法等,回答只需要普通文本即可') {
        info(`aiMg: 发起 AI 请求, 问题长度: ${question.length}`);
        
        const apiKey = this.getApiKey()
        if (!apiKey) {
            error("aiMg: 未获取到 API Key");
            return null
        }
        
        try {
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
                    stream: false,
                    max_tokens: 1500,           // 限制最大token数,让回答更精简
                    temperature: 0.3,          // 降低随机性,回答更准确、更一致
                    top_p: 0.85,              // 采样范围,配合temperature提高准确性
                    frequency_penalty: 0.2,   // 减少重复内容
                    presence_penalty: 0.1     // 鼓励多样性但不过度
                })
            })

            const completion = await response.json()

            if (completion.error) {
                error(`aiMg: AI 请求失败: ${completion.error.message}`);
                ElMessage.error('AI 请求失败: ' + completion.error.message)
                return null
            }
            
            const answer = completion?.choices?.[0]?.message?.content ?? null
            info(`aiMg: AI 返回答案, 长度: ${answer?.length || 0}`);
            return answer
        } catch (e) {
            error(`aiMg: AI 请求异常: ${e}`);
            return null
        }
    },
    async saveQAHistory(question, answer, model = 'deepseek-chat') {
        info(`aiMg: 保存问答记录`);
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
            info(`aiMg: 问答记录保存成功, 当前记录数: ${history.length}`);
        } catch (e) {
            error(`aiMg: 保存问答记录失败: ${e}`);
            return false
        }
    },
    async getQAHistory() {
        try {
            const history = (await this.store?.get(QA_HISTORY_KEY)) || [];
            info(`aiMg: 获取问答历史记录, 数量: ${history.length}`);
            return history;
        } catch (e) {
            error(`aiMg: 获取问答历史失败: ${e}`);
            return [];
        }
    },
    async clearQAHistory() {
        info("aiMg: 清空问答历史记录");
        this.store.set(QA_HISTORY_KEY, [])
        await this.store.save()
    }
}

export default aiMg;