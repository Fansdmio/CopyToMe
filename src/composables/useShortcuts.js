/**
 * 快捷键管理 Composable
 * 统一管理全局快捷键的注册和注销
 * 使用 Rust 后端注册以避免按键释放时重复触发
 */
import { ref } from 'vue'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { ElMessage } from 'element-plus'
import { info, error, warn } from '@tauri-apps/plugin-log';

/**
 * 快捷键管理 Hook
 */
export function useShortcuts() {
  const registered = ref(false)
  
  // 统一的注册状态管理
  const registeredKeys = ref({
    stop: false,
    toggleWindow: false,
    j: false,
    k: false,
    l: false
  })
  
  const currentKeys = ref({
    textKey: null,
    questionKey: null,
    toggleWindowKey: null,
    stopKey: 'K'
  })

  // 存储监听器的取消函数
  const listeners = ref({
    text: null,
    question: null,
    toggleWindow: null,
    stop: null,
    j: null,
    k: null,
    l: null
  })

  /**
   * 通用的快捷键注册函数
   * @param {string} id - 快捷键标识
   * @param {string} shortcut - 快捷键组合
   * @param {function} handler - 处理函数
   * @param {string} eventName - 事件名称
   * @param {boolean} showError - 是否显示错误提示
   * @returns {boolean} 注册是否成功
   */
  const registerKey = async (id, shortcut, handler, eventName, showError = false) => {
    if (registeredKeys.value[id]) {
      info(`useShortcuts: ${shortcut} 键已注册,跳过`);
      return true
    }
    
    info(`useShortcuts: 注册快捷键 ${shortcut}`);
    try {
      await invoke('register_shortcut', { id, shortcut })
      if (listeners.value[id]) {
        listeners.value[id]()
      }
      listeners.value[id] = await listen(eventName, handler)
      registeredKeys.value[id] = true
      info(`useShortcuts: 快捷键 ${shortcut} 已注册`)
      return true
    } catch (e) {
      const logFn = showError ? error : warn
      logFn(`useShortcuts: 快捷键 ${shortcut} 注册失败: ${e}`)
      if (showError) {
        ElMessage.error(`快捷键 ${shortcut} 注册失败: ` + e)
      }
      return false
    }
  }

  /**
   * 通用的快捷键注销函数
   * @param {string} id - 快捷键标识
   * @param {string} shortcut - 快捷键组合
   * @returns {boolean} 注销是否成功
   */
  const unregisterKey = async (id, shortcut) => {
    if (!registeredKeys.value[id]) {
      info(`useShortcuts: ${shortcut} 键未注册,无需注销`);
      return true
    }
    
    info(`useShortcuts: 注销快捷键 ${shortcut}`);
    try {
      await invoke('unregister_shortcut', { shortcut })
      if (listeners.value[id]) {
        listeners.value[id]()
        listeners.value[id] = null
      }
      registeredKeys.value[id] = false
      info(`useShortcuts: 快捷键 ${shortcut} 已注销`)
      return true
    } catch (e) {
      registeredKeys.value[id] = false
      info(`useShortcuts: 快捷键 ${shortcut} 注销 (可能已注销)`)
      return true
    }
  }


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
    
    let success = false
    
    try {
      // 只有启用时才注册文本处理快捷键
      if (textEnabled) {
        await invoke('register_shortcut', { id: 'text', shortcut: textKey })
        if (listeners.value.text) {
          listeners.value.text()
        }
        listeners.value.text = await listen('shortcut-text', textHandler)
        info(`useShortcuts: 文本快捷键注册成功: ${textKey}`);
        currentKeys.value.textKey = textKey
        success = true
      } else {
        info(`useShortcuts: 文本快捷键已禁用，跳过注册: ${textKey}`);
        currentKeys.value.textKey = null
      }
      
      // 只有启用时才注册问答快捷键
      if (questionEnabled) {
        await invoke('register_shortcut', { id: 'question', shortcut: questionKey })
        if (listeners.value.question) {
          listeners.value.question()
        }
        listeners.value.question = await listen('shortcut-question', questionHandler)
        info(`useShortcuts: 问答快捷键注册成功: ${questionKey}`);
        currentKeys.value.questionKey = questionKey
        success = true
      } else {
        info(`useShortcuts: 问答快捷键已禁用，跳过注册: ${questionKey}`);
        currentKeys.value.questionKey = null
      }
      
      registered.value = success
      info('useShortcuts: 快捷键注册完成');
      return true
    } catch (e) {
      error(`useShortcuts: 快捷键注册失败: ${e}`);
      ElMessage.error('快捷键注册失败: ' + e)
      return false
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
          await invoke('unregister_shortcut', { shortcut: currentKeys.value.textKey })
          if (listeners.value.text) {
            listeners.value.text()
            listeners.value.text = null
          }
          info(`useShortcuts: 已注销文本快捷键: ${currentKeys.value.textKey}`);
        } catch (e) {
          info(`useShortcuts: 文本快捷键可能已被注销: ${currentKeys.value.textKey}`);
        }
      }
      if (currentKeys.value.questionKey) {
        try {
          await invoke('unregister_shortcut', { shortcut: currentKeys.value.questionKey })
          if (listeners.value.question) {
            listeners.value.question()
            listeners.value.question = null
          }
          info(`useShortcuts: 已注销问答快捷键: ${currentKeys.value.questionKey}`);
        } catch (e) {
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
    await unregisterShortcuts()
    return await registerShortcuts(newTextKey, newQuestionKey, textHandler, questionHandler, textEnabled, questionEnabled)
  }

  /**
   * 注册显示/隐藏托盘图标快捷键
   */
  const registerToggleWindowKey = async (toggleWindowKey, toggleWindowHandler) => {
    const result = await registerKey('toggleWindow', toggleWindowKey, toggleWindowHandler, 'shortcut-toggleWindow', true)
    if (result) {
      currentKeys.value.toggleWindowKey = toggleWindowKey
    }
    return result
  }

  /**
   * 注销显示/隐藏托盘图标快捷键
   */
  const unregisterToggleWindowKey = async () => {
    if (!currentKeys.value.toggleWindowKey) {
      info(`useShortcuts: 显示/隐藏托盘图标快捷键未注册,无需注销`);
      return true
    }
    const result = await unregisterKey('toggleWindow', currentKeys.value.toggleWindowKey)
    if (result) {
      currentKeys.value.toggleWindowKey = null
    }
    return result
  }

  /**
   * 注册停止键 (仅在模拟输入时使用)
   */
  const registerStopKey = async (stopHandler) => {
    return await registerKey('stop', 'K', stopHandler, 'shortcut-stop')
  }

  /**
   * 注销停止键
   */
  const unregisterStopKey = async () => {
    return await unregisterKey('stop', 'K')
  }

  /**
   * 注册 J 键 (开始/停止模拟输入)
   */
  const registerJKey = async (jHandler) => {
    return await registerKey('j', 'J', jHandler, 'shortcut-j')
  }

  /**
   * 注销 J 键
   */
  const unregisterJKey = async () => {
    return await unregisterKey('j', 'J')
  }

  /**
   * 注册 K 键 (暂停并清空缓存)
   */
  const registerKKey = async (kHandler) => {
    return await registerKey('k', 'K', kHandler, 'shortcut-k')
  }

  /**
   * 注销 K 键
   */
  const unregisterKKey = async () => {
    return await unregisterKey('k', 'K')
  }

  /**
   * 注册 L 键 (逐字输出)
   */
  const registerLKey = async (lHandler) => {
    return await registerKey('l', 'L', lHandler, 'shortcut-l')
  }

  /**
   * 注销 L 键
   */
  const unregisterLKey = async () => {
    return await unregisterKey('l', 'L')
  }


  return {
    registered,
    registeredKeys,
    currentKeys,
    registerShortcuts,
    unregisterShortcuts,
    updateShortcuts,
    registerStopKey,
    unregisterStopKey,
    registerToggleWindowKey,
    unregisterToggleWindowKey,
    registerJKey,
    unregisterJKey,
    registerKKey,
    unregisterKKey,
    registerLKey,
    unregisterLKey
  }
}
