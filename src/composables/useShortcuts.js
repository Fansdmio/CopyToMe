/**
 * 快捷键管理 Composable
 * 统一管理全局快捷键的注册和注销
 */
import { ref } from 'vue'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { ElMessage } from 'element-plus'

/**
 * 快捷键管理 Hook
 */
export function useShortcuts() {
  const registered = ref(false)
  const stopKeyRegistered = ref(false)
  const currentKeys = ref({
    textKey: null,
    questionKey: null,
    stopKey: 'K'
  })

  /**
   * 注册快捷键 (不包括停止键)
   */
  const registerShortcuts = async (textKey, questionKey, textHandler, questionHandler) => {
    try {
      // 注册文本处理快捷键
      await register(textKey, textHandler)
      
      // 注册问答快捷键
      await register(questionKey, questionHandler)
      
      currentKeys.value = { ...currentKeys.value, textKey, questionKey }
      registered.value = true
      
      console.log('快捷键注册成功:', currentKeys.value)
      return true
    } catch (e) {
      console.error('快捷键注册失败:', e)
      ElMessage.error('快捷键注册失败: ' + e.message)
      return false
    }
  }

  /**
   * 注册停止键 (仅在模拟输入时使用)
   */
  const registerStopKey = async (stopHandler) => {
    if (stopKeyRegistered.value) return true
    
    try {
      await register('K', stopHandler)
      stopKeyRegistered.value = true
      console.log('停止快捷键 K 已注册')
      return true
    } catch (e) {
      console.warn('停止快捷键注册失败:', e)
      return false
    }
  }

  /**
   * 注销停止键
   */
  const unregisterStopKey = async () => {
    if (!stopKeyRegistered.value) {
      return true
    }
    
    try {
      await unregister('K')
      stopKeyRegistered.value = false
      console.log('停止快捷键 K 已注销')
      return true
    } catch (e) {
      // 可能已经被注销了,忽略错误
      stopKeyRegistered.value = false
      console.log('停止快捷键 K 注销 (可能已注销)')
      return true
    }
  }

  /**
   * 注销快捷键 (不包括停止键)
   */
  const unregisterShortcuts = async () => {
    if (!registered.value) return true

    try {
      if (currentKeys.value.textKey) {
        await unregister(currentKeys.value.textKey)
      }
      if (currentKeys.value.questionKey) {
        await unregister(currentKeys.value.questionKey)
      }
      
      currentKeys.value = { ...currentKeys.value, textKey: null, questionKey: null }
      registered.value = false
      
      console.log('快捷键注销成功')
      return true
    } catch (e) {
      console.error('快捷键注销失败:', e)
      return false
    }
  }

  /**
   * 更新快捷键
   */
  const updateShortcuts = async (newTextKey, newQuestionKey, textHandler, questionHandler) => {
    // 先注销旧的
    await unregisterShortcuts()
    
    // 注册新的
    return await registerShortcuts(newTextKey, newQuestionKey, textHandler, questionHandler)
  }

  return {
    registered,
    stopKeyRegistered,
    currentKeys,
    registerShortcuts,
    unregisterShortcuts,
    updateShortcuts,
    registerStopKey,
    unregisterStopKey
  }
}
