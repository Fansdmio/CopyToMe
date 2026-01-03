/**
 * 快捷键管理 Composable
 * 统一管理全局快捷键的注册和注销
 */
import { ref } from 'vue'
import { register, unregister } from '@tauri-apps/plugin-global-shortcut'
import { ElMessage } from 'element-plus'
import { info, error, warn } from '@tauri-apps/plugin-log';

/**
 * 快捷键管理 Hook
 */
export function useShortcuts() {
  const registered = ref(false)
  const stopKeyRegistered = ref(false)
  const toggleWindowRegistered = ref(false)
  const currentKeys = ref({
    textKey: null,
    questionKey: null,
    toggleWindowKey: null,
    stopKey: 'K'
  })

  /**
   * 注册快捷键 (不包括停止键)
   * @param {string} textKey - 文本快捷键
   * @param {string} questionKey - 问答快捷键
   * @param {function} textHandler - 文本处理回调
   * @param {function} questionHandler - 问答处理回调
   * @param {boolean} textEnabled - 文本功能是否启用
   * @param {boolean} questionEnabled - 问答功能是否启用
   */
  const registerShortcuts = async (textKey, questionKey, textHandler, questionHandler, textEnabled = true, questionEnabled = true) => {
    info(`useShortcuts: 注册快捷键 - 文本:${textKey}(${textEnabled ? '启用' : '禁用'}), 问答:${questionKey}(${questionEnabled ? '启用' : '禁用'})`);
    try {
      // 只有启用时才注册文本处理快捷键
      if (textEnabled) {
        await register(textKey, textHandler)
        info(`useShortcuts: 文本快捷键注册成功: ${textKey}`);
        currentKeys.value.textKey = textKey
      } else {
        info(`useShortcuts: 文本快捷键已禁用，跳过注册: ${textKey}`);
        currentKeys.value.textKey = null
      }
      
      // 只有启用时才注册问答快捷键
      if (questionEnabled) {
        await register(questionKey, questionHandler)
        info(`useShortcuts: 问答快捷键注册成功: ${questionKey}`);
        currentKeys.value.questionKey = questionKey
      } else {
        info(`useShortcuts: 问答快捷键已禁用，跳过注册: ${questionKey}`);
        currentKeys.value.questionKey = null
      }
      
      registered.value = textEnabled || questionEnabled
      
      info('useShortcuts: 快捷键注册完成');
      return true
    } catch (e) {
      error(`useShortcuts: 快捷键注册失败: ${e}`);
      ElMessage.error('快捷键注册失败: ' + e.message)
      return false
    }
  }

  /**
   * 注册显示/隐藏托盘图标快捷键
   */
  const registerToggleWindowKey = async (toggleWindowKey, toggleWindowHandler) => {
    if (toggleWindowRegistered.value) {
      info(`useShortcuts: 显示/隐藏托盘图标快捷键已注册,跳过`);
      return true
    }
    
    info(`useShortcuts: 注册显示/隐藏托盘图标快捷键 ${toggleWindowKey}`);
    try {
      await register(toggleWindowKey, toggleWindowHandler)
      currentKeys.value.toggleWindowKey = toggleWindowKey
      toggleWindowRegistered.value = true
      info(`useShortcuts: 显示/隐藏托盘图标快捷键 ${toggleWindowKey} 已注册`)
      return true
    } catch (e) {
      error(`useShortcuts: 显示/隐藏托盘图标快捷键注册失败: ${e}`);
      ElMessage.error('显示/隐藏托盘图标快捷键注册失败: ' + e.message)
      return false
    }
  }

  /**
   * 注销显示/隐藏托盘图标快捷键
   */
  const unregisterToggleWindowKey = async () => {
    if (!toggleWindowRegistered.value || !currentKeys.value.toggleWindowKey) {
      info(`useShortcuts: 显示/隐藏托盘图标快捷键未注册,无需注销`);
      return true
    }
    
    info(`useShortcuts: 注销显示/隐藏托盘图标快捷键 ${currentKeys.value.toggleWindowKey}`);
    try {
      await unregister(currentKeys.value.toggleWindowKey)
      currentKeys.value.toggleWindowKey = null
      toggleWindowRegistered.value = false
      info(`useShortcuts: 显示/隐藏托盘图标快捷键已注销`)
      return true
    } catch (e) {
      error(`useShortcuts: 显示/隐藏托盘图标快捷键注销失败: ${e}`);
      toggleWindowRegistered.value = false
      return true
    }
  }

  /**
   * 注册停止键 (仅在模拟输入时使用)
   */
  const registerStopKey = async (stopHandler) => {
    if (stopKeyRegistered.value) {
      info("useShortcuts: 停止键已注册,跳过");
      return true
    }
    
    info("useShortcuts: 注册停止快捷键 K");
    try {
      await register('K', stopHandler)
      stopKeyRegistered.value = true
      info('useShortcuts: 停止快捷键 K 已注册')
      return true
    } catch (e) {
      warn(`useShortcuts: 停止快捷键注册失败: ${e}`);
      return false
    }
  }

  /**
   * 注销停止键
   */
  const unregisterStopKey = async () => {
    if (!stopKeyRegistered.value) {
      info("useShortcuts: 停止键未注册,无需注销");
      return true
    }
    
    info("useShortcuts: 注销停止快捷键 K");
    try {
      await unregister('K')
      stopKeyRegistered.value = false
      info('useShortcuts: 停止快捷键 K 已注销')
      return true
    } catch (e) {
      // 可能已经被注销了,忽略错误
      stopKeyRegistered.value = false
      info('useShortcuts: 停止快捷键 K 注销 (可能已注销)')
      return true
    }
  }

  /**
   * 注销快捷键 (不包括停止键)
   */
  const unregisterShortcuts = async () => {
    info("useShortcuts: 注销快捷键");
    try {
      if (currentKeys.value.textKey) {
        try {
          await unregister(currentKeys.value.textKey)
          info(`useShortcuts: 已注销文本快捷键: ${currentKeys.value.textKey}`);
        } catch (e) {
          // 快捷键可能已被注销，忽略错误
          info(`useShortcuts: 文本快捷键可能已被注销: ${currentKeys.value.textKey}`);
        }
      }
      if (currentKeys.value.questionKey) {
        try {
          await unregister(currentKeys.value.questionKey)
          info(`useShortcuts: 已注销问答快捷键: ${currentKeys.value.questionKey}`);
        } catch (e) {
          // 快捷键可能已被注销，忽略错误
          info(`useShortcuts: 问答快捷键可能已被注销: ${currentKeys.value.questionKey}`);
        }
      }
      
      currentKeys.value = { ...currentKeys.value, textKey: null, questionKey: null }
      registered.value = false
      
      info('useShortcuts: 快捷键注销成功')
      return true
    } catch (e) {
      error(`useShortcuts: 快捷键注销失败: ${e}`);
      return false
    }
  }

  /**
   * 更新快捷键
   */
  const updateShortcuts = async (newTextKey, newQuestionKey, textHandler, questionHandler, textEnabled = true, questionEnabled = true) => {
    info(`useShortcuts: 更新快捷键 - 新文本:${newTextKey}(${textEnabled ? '启用' : '禁用'}), 新问答:${newQuestionKey}(${questionEnabled ? '启用' : '禁用'})`);
    // 先注销旧的
    await unregisterShortcuts()
    
    // 注册新的
    return await registerShortcuts(newTextKey, newQuestionKey, textHandler, questionHandler, textEnabled, questionEnabled)
  }

  return {
    registered,
    stopKeyRegistered,
    toggleWindowRegistered,
    currentKeys,
    registerShortcuts,
    unregisterShortcuts,
    updateShortcuts,
    registerStopKey,
    unregisterStopKey,
    registerToggleWindowKey,
    unregisterToggleWindowKey
  }
}
