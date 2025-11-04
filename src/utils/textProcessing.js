/**
 * 文本处理工具函数
 */

/**
 * 处理微信输入法模式 - 去除换行符
 * @param {string} text - 待处理的文本
 * @returns {string} 处理后的文本
 */
export function handleWxInput(text) {
  if (!text) return ''
  return text.replace(/(\r?\n|\r)+/g, ' ')
}

/**
 * 创建防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间(毫秒)
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 1000) {
  let timer = null
  let pending = false

  return async function (...args) {
    if (pending) return
    
    pending = true
    try {
      await fn.apply(this, args)
    } finally {
      timer = setTimeout(() => {
        pending = false
      }, delay)
    }
  }
}

/**
 * 验证快捷键格式
 * @param {string} key - 快捷键字符串
 * @returns {boolean} 是否有效
 */
export function validateShortcutKey(key) {
  if (!key) return false
  const pattern = /^(CmdOrControl|Ctrl|Alt|Shift)(\+(CmdOrControl|Ctrl|Alt|Shift))*\+([A-Z]|[0-9]|F[1-9]|F1[0-2])$/i
  return pattern.test(key)
}
