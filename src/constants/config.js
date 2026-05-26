/**
 * 应用配置常量
 * 集中管理当前设置页仍在使用的配置项。
 */

/**
 * 快捷键字段配置
 */
export const SHORTCUT_FIELDS = [
  {
    key: 'textKey',
    label: '模拟输入快捷键',
    placeholder: '例如: CmdOrControl+K',
    enableKey: 'textProcessEnabled', // 关联的功能开关字段
    enableLabel: '模拟输入' // 功能名称
  },
  {
    key: 'questionKey',
    label: 'AI 问答快捷键',
    placeholder: '例如: CmdOrControl+J',
    enableKey: 'aiQAEnabled',
    enableLabel: 'AI问答'
  },
  {
    key: 'toggleWindowKey',
    label: '显示/隐藏托盘',
    placeholder: '例如: CmdOrControl+Shift+Y',
    enableKey: 'toggleWindowEnabled', // 添加功能开关
    enableLabel: '显示/隐藏托盘'
  }
]

/**
 * AI 配置字段
 */
export const AI_CONFIG_FIELDS = [
  {
    key: 'deepseekApi',
    label: 'API Key',
    placeholder: '请输入 OpenAI 兼容接口的 API Key',
    type: 'password',
    showPassword: true,
    hint: '默认使用 DeepSeek Base URL 和 v4-flash 模型'
  }
]

/**
 * 功能开关配置
 */
export const FEATURE_TOGGLES = [
  {
    key: 'textProcessEnabled',
    label: '模拟输入',
    description: '启用后可使用快捷键处理文本'
  },
  {
    key: 'aiQAEnabled',
    label: 'AI 问答',
    description: '启用后可使用快捷键进行 AI 问答'
  },
  {
    key: 'quickInput',
    label: '快速输入模式',
    description: '启用后进入模拟输入模式时自动开始输入'
  },
  {
    key: 'wxInputMode',
    label: '去除换行',
    description: '使用AI问答后，去除回答文本中的所有换行符'
  },
  {
    key: 'hideWindow',
    label: '自动隐藏窗口',
    description: '打开程序时自动隐藏窗口'
  },
  {
    key: 'autoHideTray',
    label: '自动隐藏托盘',
    description: '打开程序时自动隐藏系统托盘图标'
  },
  {
    key: 'autoStart',
    label: '开机自启动',
    description: '开机自启动'
  },
  {
    key: 'runAsAdmin',
    label: '管理员启动',
    description: '启用后每次打开应用都会先请求管理员权限'
  }
]

/**
 * 模拟输入配置
 */
export const TEXT_PROCESSING_CONFIG = {
  timeRange: {
    label: '打字间隔范围',
    description: '用于防检测 (毫秒)',
    min: 0,
    max: 300,
    step: 1,
    marks: {
      0: '0ms',
      50: '50ms',
      100: '100ms',
      150: '150ms',
      200: '200ms',
      250: '250ms',
      300: '300ms'
    }
  }
}

