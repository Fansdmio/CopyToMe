import setMg from './setMg.js';
import { ElMessage } from 'element-plus'
import { decryptGCM } from '../utils/crypto.js'
import { fetch } from '@tauri-apps/plugin-http'
import { info, error } from '@tauri-apps/plugin-log';

const QA_HISTORY_KEY = 'copytome_qa_history'
const MAX_HISTORY = 2000

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
        const isHealthy = !!(await this.askAi("hello", null, false)); // 不保存健康检查记录
        info(`aiMg: AI 服务健康检查结果: ${isHealthy}`);
        return isHealthy;
    },
    async askAi(question, customSystemPrompt = null, saveHistory = true) {
        info(`aiMg: 发起 AI 请求, 问题长度: ${question.length}, 保存记录: ${saveHistory}`);
        
        const apiKey = this.getApiKey()
        if (!apiKey) {
            error("aiMg: 未获取到 API Key");
            return null
        }
        
        // 使用自定义提示词或用户设置的提示词
        const systemPrompt = customSystemPrompt || setMg.get('systemPrompt') || '你是一个说话极简的答题助手,不要使用md语法';
        
        // 检查是否使用自定义AI
        const useCustomAI = setMg.get('useCustomAI') || false;
        
        if (useCustomAI) {
            return await this.callCustomAI(question, systemPrompt, saveHistory);
        }
        
        // 使用DeepSeek（默认）
        return await this.callDeepSeek(question, systemPrompt, saveHistory, apiKey);
    },
    
    async callDeepSeek(question, systemPrompt, saveHistory, apiKey) {
        // 根据深度思考配置选择模型
        const isDeepThinking = setMg.get('deepThinking') || false;
        const model = isDeepThinking ? 'deepseek-reasoner' : 'deepseek-chat';
        info(`aiMg: 使用DeepSeek模型: ${model}, 深度思考模式: ${isDeepThinking}`);
        
        // 获取高级参数
        const temperature = setMg.get('aiTemperature') || 0.7;
        const topP = setMg.get('aiTopP') || 0.85;
        const maxTokens = setMg.get('aiMaxTokens') || (isDeepThinking ? 4000 : 1500);
        const frequencyPenalty = setMg.get('aiFrequencyPenalty') || 0.2;
        const presencePenalty = setMg.get('aiPresencePenalty') || 0.1;
        
        try {
            const response = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    stream: false,
                    max_tokens: maxTokens,
                    temperature: temperature,
                    top_p: topP,
                    frequency_penalty: frequencyPenalty,
                    presence_penalty: presencePenalty
                })
            })

            const completion = await response.json()

            if (completion.error) {
                error(`aiMg: AI 请求失败: ${completion.error.message}`);
                ElMessage.error('AI 请求失败: ' + completion.error.message)
                return null
            }
            
            const answer = completion?.choices?.[0]?.message?.content ?? null
            const reasoningContent = completion?.choices?.[0]?.message?.reasoning_content ?? null;
            if (reasoningContent) {
                info(`aiMg: AI 深度思考, 推理长度: ${reasoningContent.length}`);
            }
            info(`aiMg: AI 返回答案, 长度: ${answer?.length || 0}, 模型: ${model}`);
            
            // 保存历史记录（如果需要）
            if (answer && saveHistory) {
                await this.saveQAHistory(question, answer, model);
            } else if (answer && !saveHistory) {
                info(`aiMg: 跳过保存历史记录（健康检查或其他不需要保存的请求）`);
            }
            
            return answer
        } catch (e) {
            error(`aiMg: AI 请求异常: ${e}`);
            return null
        }
    },
    
    async callCustomAI(question, systemPrompt, saveHistory) {
        let endpoint = setMg.get('customAIEndpoint');
        const model = setMg.get('customAIModel');
        const format = setMg.get('customAIFormat') || 'openai';
        const customKey = setMg.get('customAIKey');
        
        if (!endpoint || !model) {
            error("aiMg: 自定义AI端点或模型未配置");
            ElMessage.error('请先配置自定义AI端点和模型');
            return null;
        }
        
        // 补全端点URL
        const baseUrl = this.completeEndpoint(endpoint, format);
        if (format === 'openai') {
            endpoint = `${baseUrl}/chat/completions`;
        } else {
            endpoint = baseUrl;
        }
        
        info(`aiMg: 使用自定义AI, 端点: ${endpoint}, 模型: ${model}, 格式: ${format}`);
        
        // 获取高级参数
        const temperature = setMg.get('aiTemperature') || 0.7;
        const topP = setMg.get('aiTopP') || 0.85;
        const maxTokens = setMg.get('aiMaxTokens') || 1500;
        const frequencyPenalty = setMg.get('aiFrequencyPenalty') || 0.2;
        const presencePenalty = setMg.get('aiPresencePenalty') || 0.1;
        
        try {
            let requestBody, headers;
            
            if (format === 'openai') {
                // OpenAI格式
                headers = {
                    'Content-Type': 'application/json',
                };
                if (customKey) {
                    headers['Authorization'] = `Bearer ${customKey}`;
                }
                
                requestBody = {
                    model: model,
                    messages: [
                        { role: 'system', content: systemPrompt },
                        { role: 'user', content: question }
                    ],
                    temperature: temperature,
                    top_p: topP,
                    max_tokens: maxTokens,
                    frequency_penalty: frequencyPenalty,
                    presence_penalty: presencePenalty
                };
            } else {
                // Google格式 (Gemini)
                headers = {
                    'Content-Type': 'application/json',
                };
                
                // Google API使用查询参数传递key
                const url = new URL(endpoint);
                if (customKey) {
                    url.searchParams.set('key', customKey);
                }
                endpoint = url.toString();
                
                requestBody = {
                    contents: [{
                        parts: [{
                            text: `${systemPrompt}\n\n${question}`
                        }]
                    }],
                    generationConfig: {
                        temperature: temperature,
                        topP: topP,
                        maxOutputTokens: maxTokens
                    }
                };
            }
            
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody)
            });

            const completion = await response.json();
            let answer = null;
            
            if (format === 'openai') {
                if (completion.error) {
                    error(`aiMg: 自定义AI请求失败: ${completion.error.message}`);
                    ElMessage.error('AI 请求失败: ' + completion.error.message);
                    return null;
                }
                answer = completion?.choices?.[0]?.message?.content ?? null;
            } else {
                // Google格式
                if (completion.error) {
                    error(`aiMg: 自定义AI请求失败: ${completion.error.message}`);
                    ElMessage.error('AI 请求失败: ' + completion.error.message);
                    return null;
                }
                answer = completion?.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
            }
            
            info(`aiMg: 自定义AI返回答案, 长度: ${answer?.length || 0}`);
            
            // 保存历史记录（如果需要）
            if (answer && saveHistory) {
                await this.saveQAHistory(question, answer, `custom:${model}`);
            } else if (answer && !saveHistory) {
                info(`aiMg: 跳过保存历史记录`);
            }
            
            return answer;
        } catch (e) {
            error(`aiMg: 自定义AI请求异常: ${e}`);
            ElMessage.error('AI 请求失败: ' + e.message);
            return null;
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
    
    /**
     * 补全API端点URL
     */
    completeEndpoint(endpoint, format = 'openai') {
        if (!endpoint) return endpoint;
        
        // 移除末尾的斜杠
        endpoint = endpoint.replace(/\/+$/, '');
        
        // 如果已经包含完整路径，直接返回
        if (endpoint.includes('/chat/completions') || endpoint.includes('/models')) {
            return endpoint;
        }
        
        // 根据格式补全
        if (format === 'openai') {
            // OpenAI格式
            if (!endpoint.endsWith('/v1')) {
                endpoint += '/v1';
            }
            return endpoint;
        } else {
            // Google格式不需要补全
            return endpoint;
        }
    },
    
    /**
     * 获取可用模型列表
     */
    async fetchAvailableModels() {
        const endpoint = setMg.get('customAIEndpoint');
        const format = setMg.get('customAIFormat') || 'openai';
        const customKey = setMg.get('customAIKey');
        
        if (!endpoint) {
            error("aiMg: 未配置自定义AI端点");
            ElMessage.error('请先配置自定义AI端点');
            return [];
        }
        
        info(`aiMg: 获取可用模型列表, 端点: ${endpoint}, 格式: ${format}`);
        
        try {
            if (format === 'openai') {
                // OpenAI格式 - 使用 /v1/models 端点
                const baseUrl = this.completeEndpoint(endpoint, format);
                const modelsUrl = `${baseUrl}/models`;
                
                const headers = {
                    'Content-Type': 'application/json',
                };
                if (customKey) {
                    headers['Authorization'] = `Bearer ${customKey}`;
                }
                
                info(`aiMg: 请求模型列表: ${modelsUrl}`);
                const response = await fetch(modelsUrl, {
                    method: 'GET',
                    headers: headers
                });
                
                const data = await response.json();
                
                if (data.error) {
                    error(`aiMg: 获取模型列表失败: ${data.error.message}`);
                    ElMessage.error('获取模型列表失败: ' + data.error.message);
                    return [];
                }
                
                // OpenAI格式返回 {data: [{id: "model-name"}, ...]}
                const models = data.data?.map(m => m.id) || [];
                info(`aiMg: 获取到 ${models.length} 个可用模型`);
                return models;
            } else {
                // Google格式 - 通常需要不同的API
                // Gemini使用 /v1/models 但返回格式不同
                info(`aiMg: Google格式暂不支持自动获取模型列表`);
                ElMessage.warning('Google格式暂不支持自动获取模型，请手动输入模型名称');
                return [];
            }
        } catch (e) {
            error(`aiMg: 获取模型列表异常: ${e}`);
            ElMessage.error('获取模型列表失败: ' + e.message);
            return [];
        }
    }
}

export default aiMg;