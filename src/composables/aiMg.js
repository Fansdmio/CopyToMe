import setMg from './setMg.js';
import { ElMessage } from 'element-plus';
import { fetch } from '@tauri-apps/plugin-http';
import { info, error } from '@tauri-apps/plugin-log';

const QA_HISTORY_KEY = 'copytome_qa_history';
const MAX_HISTORY = 2000;

const aiMg = {
    store: null,
    async init() {
        info("aiMg: 开始初始化");
        try {
            // setMg 已在 main.js 中提前初始化，这里只需获取 store 引用
            if (!setMg.store) {
                await setMg.init();
            }
            this.store = setMg.store;
            info("aiMg: 初始化完成");
        } catch (e) {
            error(`aiMg: 初始化失败: ${e}`);
            throw e;
        }
    },

    getApiKey() {
        const apiKey = setMg.get('deepseekApi')?.trim();
        if (!apiKey) {
            info("aiMg: 未配置 API Key");
            return null;
        }
        return apiKey;
    },

    async checkHealth() {
        info("aiMg: 检查 AI 服务健康状态");
        const isHealthy = !!(await this.askAi("hello", null, false));
        info(`aiMg: AI 服务健康检查结果: ${isHealthy}`);
        return isHealthy;
    },

    isDeepSeekEndpoint() {
        const baseUrl = this.completeEndpoint(setMg.get('customAIEndpoint'));
        return /^https:\/\/api\.deepseek\.com\/v1\/?$/i.test(baseUrl);
    },

    async fetchDeepSeekBalance() {
        const apiKey = this.getApiKey();
        if (!apiKey || !this.isDeepSeekEndpoint()) return null;

        info("aiMg: 获取 DeepSeek 账户余额");
        try {
            const response = await fetch('https://api.deepseek.com/user/balance', {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const data = await response.json();
            if (data.error) {
                error(`aiMg: DeepSeek 余额获取失败: ${data.error.message}`);
                return null;
            }

            const balances = data.balance_infos || [];
            const totalBalance = balances.reduce((sum, item) => {
                const amount = Number(item.total_balance || 0);
                return Number.isFinite(amount) ? sum + amount : sum;
            }, 0);

            return {
                currency: balances[0]?.currency || 'CNY',
                totalBalance
            };
        } catch (e) {
            error(`aiMg: DeepSeek 余额获取异常: ${e}`);
            return null;
        }
    },

    async askAi(question, customSystemPrompt = null, saveHistory = true) {
        info(`aiMg: 发起 AI 请求, 问题长度: ${question.length}, 保存记录: ${saveHistory}`);

        const apiKey = this.getApiKey();
        if (!apiKey) {
            error("aiMg: 未获取到 API Key");
            return null;
        }

        const systemPrompt = customSystemPrompt || setMg.get('systemPrompt') || '你是一个说话极简的答题助手,不要使用md语法';
        return await this.callOpenAICompatible(question, systemPrompt, saveHistory, apiKey);
    },

    async callOpenAICompatible(question, systemPrompt, saveHistory, apiKey) {
        const baseUrl = this.completeEndpoint(setMg.get('customAIEndpoint'));
        const model = setMg.get('customAIModel') || 'deepseek-v4-flash';
        const endpoint = `${baseUrl}/chat/completions`;

        info(`aiMg: 使用 OpenAI 兼容接口, 端点: ${endpoint}, 模型: ${model}`);

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    stream: false
                })
            });

            const completion = await response.json();

            if (completion.error) {
                error(`aiMg: AI 请求失败: ${completion.error.message}`);
                ElMessage.error('AI 请求失败: ' + completion.error.message);
                return null;
            }

            const answer = completion?.choices?.[0]?.message?.content ?? null;
            info(`aiMg: AI 返回答案, 长度: ${answer?.length || 0}, 模型: ${model}`);

            if (answer && saveHistory) {
                await this.saveQAHistory(question, answer, model);
            } else if (answer && !saveHistory) {
                info("aiMg: 跳过保存历史记录");
            }

            return answer;
        } catch (e) {
            error(`aiMg: AI 请求异常: ${e}`);
            ElMessage.error('AI 请求失败: ' + (e.message || e));
            return null;
        }
    },

    async saveQAHistory(question, answer, model = 'deepseek-v4-flash') {
        info("aiMg: 保存问答记录");
        try {
            let history = await this.store.get(QA_HISTORY_KEY) || [];
            history.unshift({
                question,
                answer,
                model,
                time: new Date().toLocaleString('zh-CN')
            });

            if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
            this.store.set(QA_HISTORY_KEY, history);
            await this.store.save();
            info(`aiMg: 问答记录保存成功, 当前记录数: ${history.length}`);
        } catch (e) {
            error(`aiMg: 保存问答记录失败: ${e}`);
            return false;
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

    async deleteQAHistoryByIndex(index) {
        info(`aiMg: 删除问答记录, 索引: ${index}`);
        try {
            let history = await this.store.get(QA_HISTORY_KEY) || [];
            if (index >= 0 && index < history.length) {
                history.splice(index, 1);
                this.store.set(QA_HISTORY_KEY, history);
                await this.store.save();
                info(`aiMg: 问答记录删除成功, 剩余记录数: ${history.length}`);
                return true;
            }
            error(`aiMg: 无效的索引: ${index}`);
            return false;
        } catch (e) {
            error(`aiMg: 删除问答记录失败: ${e}`);
            return false;
        }
    },

    completeEndpoint(endpoint) {
        let baseUrl = endpoint?.trim() || 'https://api.deepseek.com';
        baseUrl = baseUrl.replace(/\/+$/, '');
        baseUrl = baseUrl.replace(/\/chat\/completions.*$/, '');
        baseUrl = baseUrl.replace(/\/models.*$/, '');

        if (!baseUrl.endsWith('/v1')) {
            baseUrl += '/v1';
        }
        return baseUrl;
    },

    async fetchAvailableModels() {
        const apiKey = this.getApiKey();
        if (!apiKey) {
            ElMessage.warning('请先填写 API Key');
            return [];
        }

        const modelsUrl = `${this.completeEndpoint(setMg.get('customAIEndpoint'))}/models`;
        info(`aiMg: 获取可用模型列表: ${modelsUrl}`);

        try {
            const response = await fetch(modelsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            const data = await response.json();
            if (data.error) {
                error(`aiMg: 获取模型列表失败: ${data.error.message}`);
                ElMessage.error('获取模型列表失败: ' + data.error.message);
                return [];
            }

            const models = data.data?.map(model => model.id).filter(Boolean) || [];
            info(`aiMg: 获取到 ${models.length} 个可用模型`);
            return models;
        } catch (e) {
            error(`aiMg: 获取模型列表异常: ${e}`);
            ElMessage.error('获取模型列表失败: ' + (e.message || e));
            return [];
        }
    }
};

export default aiMg;
