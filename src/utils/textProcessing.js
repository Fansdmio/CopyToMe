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
 * 去除AI回答中的思考标签内容
 * 支持多种思考标签格式: <think></think>, <thinking></thinking> 等
 * @param {string} text - 待处理的文本
 * @returns {string} 去除思考标签后的文本
 */
export function removeThinkingTags(text) {
  if (!text) return ''
  // 匹配 <think>...</think>, <thinking>...</thinking> 等标签及其内容
  // 使用非贪婪匹配，支持多行内容
  return text.replace(/<think(?:ing)?>[\s\S]*?<\/think(?:ing)?>/gi, '').trim()
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
