/**
 * AI 功能 Composable
 * 统一管理 AI 相关的逻辑
 */
import { ref } from 'vue'
import { fetch } from '@tauri-apps/plugin-http'
import { ElMessage } from 'element-plus'
import { decryptGCM } from '../utils/crypto.js'

const AI_CONFIG_KEY = 'copytome_ai_config'
const QA_HISTORY_KEY = 'copytome_qa_history'
const MAX_HISTORY = 2000

/**
 * AI 功能 Hook
 */
export function useAI() {
  const loading = ref(false)

  /**
   * 获取 API Key (优先级: DeepSeek API > 缓存 API > 从服务器获取)
   */
  const getApiKey = async () => {
    try {
      const saved = localStorage.getItem(AI_CONFIG_KEY)
      if (!saved) {
        ElMessage.warning('请先在设置中配置 DeepSeek API 或用户名')
        return null
      }

      const config = JSON.parse(saved)

      // 1. 优先使用直接配置的 API
      if (config.deepseekApi?.trim()) {
        return config.deepseekApi.trim()
      }

      // 2. 使用缓存的 API
      if (config.cachedApi?.trim()) {
        return config.cachedApi.trim()
      }

      // 3. 从服务器获取
      if (config.userName?.trim()) {
        return await fetchAPIFromServer(config.userName)
      }

      ElMessage.warning('请先在设置中配置 DeepSeek API 或用户名')
      return null
    } catch (e) {
      console.error('获取 API Key 失败:', e)
      return null
    }
  }

  /**
   * 从服务器获取 API Key
   */
  const fetchAPIFromServer = async (userName) => {
    try {
      const response = await fetch(
        `https://cp.uuyo.fun/get_api_key?user_name=${encodeURIComponent(userName)}`,
      )
      const data = await response.json()

      if (data?.api_key) {
        const decryptedApi = await decryptGCM(data.api_key)

        // 更新缓存
        const saved = localStorage.getItem(AI_CONFIG_KEY)
        if (saved) {
          const config = JSON.parse(saved)
          config.cachedApi = decryptedApi
          localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config))
        }

        return decryptedApi
      } else {
        ElMessage.error('获取 API 失败: 服务器未返回 API')
        return null
      }
    } catch (e) {
      console.error('从服务器获取 API 失败:', e)
      ElMessage.error('获取 API 失败: ' + e.message)
      return null
    }
  }

  /**
   * 启动时刷新 API (仅当使用用户名方式)
   */
  const refreshAPIOnStartup = async () => {
    try {
      const saved = localStorage.getItem(AI_CONFIG_KEY)
      if (saved) {
        const config = JSON.parse(saved)
        if (!config.deepseekApi && config.userName?.trim()) {
          console.log('应用启动,刷新 API...')
          await fetchAPIFromServer(config.userName)
        }
      }
    } catch (e) {
      console.error('启动时刷新 API 失败:', e)
    }
  }

  /**
   * 调用 DeepSeek AI
   */
  const askAI = async (question, systemPrompt = '你是一个说话极简的老师,不要使用markdown语法等,回答只需要普通文本即可') => {
    if (!question?.trim()) {
      return null
    }

    loading.value = true
    try {
      const apiKey = await getApiKey()
      if (!apiKey) {
        return null
      }

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

      return completion?.choices?.[0]?.message?.content ?? '暂无返回内容'
    } catch (e) {
      console.error('AI 请求失败:', e)
      ElMessage.error('AI 请求失败: ' + e.message)
      return null
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存问答记录
   */
  const saveQAHistory = (question, answer, model = 'deepseek-chat') => {
    try {
      const history = JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '[]')
      history.unshift({
        question,
        answer,
        model,
        time: new Date().toLocaleString('zh-CN')
      })
      
      // 只保留最近的记录
      if (history.length > MAX_HISTORY) {
        history.length = MAX_HISTORY
      }
      
      localStorage.setItem(QA_HISTORY_KEY, JSON.stringify(history))
      return true
    } catch (e) {
      console.error('保存问答记录失败:', e)
      return false
    }
  }

  /**
   * 获取问答历史
   */
  const getQAHistory = () => {
    try {
      return JSON.parse(localStorage.getItem(QA_HISTORY_KEY) || '[]')
    } catch (e) {
      console.error('获取问答历史失败:', e)
      return []
    }
  }

  /**
   * 清空问答历史
   */
  const clearQAHistory = () => {
    try {
      localStorage.removeItem(QA_HISTORY_KEY)
      return true
    } catch (e) {
      console.error('清空问答历史失败:', e)
      return false
    }
  }

  return {
    loading,
    getApiKey,
    fetchAPIFromServer,
    refreshAPIOnStartup,
    askAI,
    saveQAHistory,
    getQAHistory,
    clearQAHistory
  }
}
