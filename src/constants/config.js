/**
 * 应用配置常量
 * 集中管理所有可配置的选项和数据
 */
import {
  Document,
  ChatDotRound,
  Key,
  View
} from '@element-plus/icons-vue'

/**
 * 快捷键字段配置
 */
export const SHORTCUT_FIELDS = [
  {
    key: 'textKey',
    label: '模拟输入快捷键',
    placeholder: '例如: CmdOrControl+K',
    icon: Document,
    enableKey: 'textProcessEnabled', // 关联的功能开关字段
    enableLabel: '模拟输入' // 功能名称
  },
  {
    key: 'questionKey',
    label: 'AI 问答快捷键',
    placeholder: '例如: CmdOrControl+J',
    icon: ChatDotRound,
    enableKey: 'aiQAEnabled',
    enableLabel: 'AI问答'
  },
  {
    key: 'toggleWindowKey',
    label: '显示/隐藏托盘',
    placeholder: '例如: CmdOrControl+Shift+Y',
    icon: View,
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
    icon: Key,
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

/**
 * 快捷键预设
 */
export const SHORTCUT_PRESETS = [
  {
    name: '默认配置',
    textKey: 'CmdOrControl+K',
    questionKey: 'CmdOrControl+J'
  },
  {
    name: '备用配置',
    textKey: 'CmdOrControl+Shift+K',
    questionKey: 'CmdOrControl+Shift+J'
  },
  {
    name: '数字键盘',
    textKey: 'CmdOrControl+1',
    questionKey: 'CmdOrControl+2'
  }
]

/**
 * 键盘帮助数据
 */
export const KEYBOARD_HELP_DATA = [
  {
    key: 'CmdOrControl',
    description: 'Windows 下为 Ctrl, Mac 下为 Cmd',
    example: 'CmdOrControl+K'
  },
  {
    key: 'Alt',
    description: 'Alt 键',
    example: 'Alt+K'
  },
  {
    key: 'Shift',
    description: 'Shift 键',
    example: 'Shift+K'
  },
  {
    key: 'A-Z',
    description: '字母键',
    example: 'CmdOrControl+A'
  },
  {
    key: '0-9',
    description: '数字键',
    example: 'CmdOrControl+1'
  },
  {
    key: 'F1-F12',
    description: '功能键',
    example: 'F5'
  },
  {
    key: '+',
    description: '组合键连接符',
    example: 'Ctrl+Shift+K'
  }
]

/**
 * 使用提示信息
 */
export const USAGE_TIPS = [
  '使用模拟输入时,微信输入法不要在中文模式下',
  '开启AI问答模式,需要去设置页面配置 API Key',
]
